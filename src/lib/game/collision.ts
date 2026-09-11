/**
 * Lightweight world collision — height field + capsule vs cylinders.
 * No physics engine: iOS Safari cannot afford one, and the island is small.
 *
 * Knobs:
 * - `MEADOW_HEIGHT` / `WATER_Y` / `BEACH_INNER_RADIUS` — meadow → beach slope
 * - `SHORE_LIP_RADIUS` / `SHORE_BODY_PAD` — solid playable edge
 * - `NEST_*` — walkable bowl floor + rim (claim radius is unchanged)
 * - `PROP_ROCK_MIN` / `capsuleRadius` — major rocks & driftwood only
 *   (kit meshes in `coastal-props.glb` stay unit-primitive aligned; radii
 *   come from pose scale, never mesh bounds)
 * - `SETTLE_*` / `GRAVITY` — stick uphill, fall off rims
 * - Grove overlook lift — `overlookLift` in `worldgen/landmarks.ts`
 *
 * Shore-danger radii stay in `offshore.ts`. `SHORE_DANGER_RADIUS` equals
 * `BEACH_INNER_RADIUS` so leviathan aggro still reads raw xz radial, not
 * height. The lip is *outside* that band so you can still stand on the sand.
 */
import {
  BEACH_INNER_RADIUS,
  MAX_SIZE,
  WORLD_RADIUS,
} from "./constants";
import { isCoarsePointer } from "./device";
import { assertNever } from "./types";
import { NEST_LAYOUT } from "./wildlife";
import {
  seedLayout,
  seedWorldDress,
  setGroundSampler,
  type PropPose,
  type TidePoolSpec,
  type WorldDress,
} from "./world-dress";
import { overlookLift } from "./worldgen/landmarks";

export { BEACH_INNER_RADIUS };

/** Meadow plateau (world y). Beach slopes down from here. */
export const MEADOW_HEIGHT = 0.07;
/** Ocean surface. Matches the ocean disc in `ShoreWater`. */
export const WATER_Y = -0.22;
/** Radial where the sand shelf meets the sea. */
export const WATERLINE_RADIUS = WORLD_RADIUS + 0.1;
/** Displaced island mesh extends this far so the wet sand reads. */
export const ISLAND_MESH_RADIUS = WORLD_RADIUS + 1.55;
/**
 * Solid playable lip — feet stay on the sand, not in the swim lane.
 * Larger forms used to be clamped inland of `SHORE_DANGER_RADIUS`; the pad
 * is now small enough that Apex still reaches the beach.
 */
export const SHORE_LIP_RADIUS = WORLD_RADIUS - 0.55;
/** Extra radial padding so a grown body does not hang over the water. */
export const SHORE_BODY_PAD = 0.42;
/** Inward kick when the capsule hits the lip. */
export const SHORE_BOUNCE = 0.55;

/** Inner sand floor of a nest bowl (shared with authored lining in Nests.tsx). */
export const NEST_FLOOR_RADIUS = 0.5;
/** Moss/weave rim crest (outer torus major radius). */
export const NEST_RIM_RADIUS = 0.78;
/** Outer slope blends into the meadow. */
export const NEST_BLEND_RADIUS = 1.42;
/** Walkable floor lift above `surfaceHeight` at the nest origin. */
export const NEST_FLOOR_LIFT = 0.34;
/** Walkable rim lift above `surfaceHeight`. */
export const NEST_RIM_LIFT = 0.58;

/** Skip pebbles; only block on chunky coastal rocks. */
export const PROP_ROCK_MIN = 0.15;
export const PROP_WOOD_MIN = 0.12;

/** Catch the ground when walking up a slope / nest rim. */
export const SETTLE_UP = 22;
/** Soft stick while grounded on small height deltas. */
export const SETTLE_HOLD = 12;
/** Fall off a rim instead of snapping down. */
export const GRAVITY = 16;
/** Still “on” the ground if we are this close from above. */
export const GROUND_SNAP = 0.05;

export type PropKind = "rock" | "wood";

export type PropCollider = {
  kind: PropKind;
  x: number;
  z: number;
  radius: number;
};

export type BodyState = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
};

let colliderCache: { mobile: boolean; list: PropCollider[] } | null = null;

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function meadowMask(radius: number): number {
  return 1 - smoothstep(BEACH_INNER_RADIUS - 2.2, BEACH_INNER_RADIUS, radius);
}

function meadowUndulation(x: number, z: number): number {
  return (
    Math.sin(x * 0.37 + z * 0.21) * Math.cos(x * 0.19 - z * 0.33) * 0.065 +
    Math.sin(x * 0.91 + z * 0.64) * 0.028
  );
}

function radialShelf(radius: number): number {
  if (radius >= WATERLINE_RADIUS) return WATER_Y;
  const start = BEACH_INNER_RADIUS - 1.15;
  if (radius <= start) return MEADOW_HEIGHT;
  const t = smoothstep(start, WATERLINE_RADIUS, radius);
  return mix(MEADOW_HEIGHT, WATER_Y, t * t);
}

function poolDip(x: number, z: number, pool: TidePoolSpec): number {
  const dx = x - pool.x;
  const dz = z - pool.z;
  const ca = Math.cos(-pool.yaw);
  const sa = Math.sin(-pool.yaw);
  const lx = (dx * ca - dz * sa) / (pool.sx * 0.55 + 0.22);
  const lz = (dx * sa + dz * ca) / (pool.sz * 0.55 + 0.22);
  const d = lx * lx + lz * lz;
  if (d >= 1) return 0;
  const w = 1 - d;
  return -0.045 * w * w;
}

/**
 * Height of the authored nest bowl above `surfaceHeight`.
 * Nests.tsx lathes this same profile so feet and weave share one bowl.
 */
export function nestBowlHeight(distance: number): number {
  if (distance >= NEST_BLEND_RADIUS) return 0;
  if (distance <= NEST_FLOOR_RADIUS) {
    const t = distance / NEST_FLOOR_RADIUS;
    return NEST_FLOOR_LIFT + t * t * 0.05;
  }
  if (distance <= NEST_RIM_RADIUS) {
    const t = smoothstep(NEST_FLOOR_RADIUS, NEST_RIM_RADIUS, distance);
    return mix(NEST_FLOOR_LIFT + 0.05, NEST_RIM_LIFT, t);
  }
  const t = smoothstep(NEST_RIM_RADIUS, NEST_BLEND_RADIUS, distance);
  return mix(NEST_RIM_LIFT, 0, t);
}

function nestLift(x: number, z: number): number {
  let best = 0;
  for (const nest of NEST_LAYOUT) {
    const d = Math.hypot(x - nest.x, z - nest.z);
    if (d >= NEST_BLEND_RADIUS) continue;
    const h = nestBowlHeight(d);
    if (h > best) best = h;
  }
  return best;
}

function tideDip(x: number, z: number): number {
  const mobile = typeof window !== "undefined" && isCoarsePointer();
  let dip = 0;
  for (const pool of seedLayout(mobile).tidePools) {
    const next = poolDip(x, z, pool);
    if (next < dip) dip = next;
  }
  return dip;
}

/**
 * Walkable / render height without nest bowls. Props, fruit, and nest meshes
 * sit on this so bowls stay authored geometry instead of a dirt crater.
 */
export function surfaceHeight(x: number, z: number): number {
  const radius = Math.hypot(x, z);
  const hills = meadowUndulation(x, z) * meadowMask(radius);
  return radialShelf(radius) + hills + tideDip(x, z) + overlookLift(x, z);
}

/** Footing for creatures: surface plus walkable nest bowls. */
export function groundHeight(x: number, z: number): number {
  return surfaceHeight(x, z) + nestLift(x, z);
}

setGroundSampler(surfaceHeight);

export function playableRadius(size: number): number {
  const body = Math.min(MAX_SIZE, Math.max(0.7, size));
  return SHORE_LIP_RADIUS - SHORE_BODY_PAD * body;
}

export function capsuleRadius(size: number): number {
  return 0.32 * Math.max(0.7, size) + 0.06;
}

function colliderRadius(kind: PropKind, pose: PropPose): number {
  switch (kind) {
    case "rock":
      return Math.max(pose.sx, pose.sz) * 0.78;
    case "wood":
      return Math.max(pose.sy * 0.38, pose.sx * 2.4);
    default:
      return assertNever(kind, "Unknown prop collider");
  }
}

function maybeCollider(kind: PropKind, pose: PropPose, min: number): PropCollider | null {
  const radius = colliderRadius(kind, pose);
  if (radius < min) return null;
  return { kind, x: pose.x, z: pose.z, radius };
}

export function buildPropColliders(dress: WorldDress): PropCollider[] {
  const out: PropCollider[] = [];
  const push = (kind: PropKind, pose: PropPose, min: number) => {
    const hit = maybeCollider(kind, pose, min);
    if (hit) out.push(hit);
  };
  for (const pose of dress.dryRocks) push("rock", pose, PROP_ROCK_MIN);
  for (const pose of dress.wetRocks) push("rock", pose, PROP_ROCK_MIN);
  for (const pose of dress.shelves) push("rock", pose, PROP_ROCK_MIN);
  for (const pose of dress.driftwood) push("wood", pose, PROP_WOOD_MIN);
  return out;
}

export function propColliders(mobile: boolean): readonly PropCollider[] {
  if (colliderCache && colliderCache.mobile === mobile) return colliderCache.list;
  colliderCache = {
    mobile,
    list: buildPropColliders(seedWorldDress(mobile)),
  };
  return colliderCache.list;
}

function liveColliders(): readonly PropCollider[] {
  const mobile = typeof window !== "undefined" && isCoarsePointer();
  return propColliders(mobile);
}

export function resolveProps(
  x: number,
  z: number,
  vx: number,
  vz: number,
  radius: number,
  colliders: readonly PropCollider[],
): { x: number; z: number; vx: number; vz: number } {
  let px = x;
  let pz = z;
  let pvx = vx;
  let pvz = vz;
  for (let pass = 0; pass < 2; pass += 1) {
    for (const hit of colliders) {
      const dx = px - hit.x;
      const dz = pz - hit.z;
      const dist = Math.hypot(dx, dz);
      const min = radius + hit.radius;
      if (dist >= min) continue;
      const nx = dist < 1e-5 ? 1 : dx / dist;
      const nz = dist < 1e-5 ? 0 : dz / dist;
      const pen = min - (dist < 1e-5 ? 0 : dist);
      px += nx * pen;
      pz += nz * pen;
      const outward = pvx * nx + pvz * nz;
      if (outward < 0) {
        pvx -= outward * nx;
        pvz -= outward * nz;
      }
    }
  }
  return { x: px, z: pz, vx: pvx, vz: pvz };
}

export function clampToShore(
  x: number,
  z: number,
  vx: number,
  vz: number,
  size: number,
): { x: number; z: number; vx: number; vz: number; hit: boolean } {
  const limit = playableRadius(size);
  const radius = Math.hypot(x, z);
  if (radius <= limit || radius < 1e-5) {
    return { x, z, vx, vz, hit: false };
  }
  const nx = x / radius;
  const nz = z / radius;
  const px = nx * limit;
  const pz = nz * limit;
  const outward = vx * nx + vz * nz;
  let pvx = vx;
  let pvz = vz;
  if (outward > 0) {
    pvx -= outward * nx;
    pvz -= outward * nz;
  }
  pvx -= nx * SHORE_BOUNCE;
  pvz -= nz * SHORE_BOUNCE;
  return { x: px, z: pz, vx: pvx, vz: pvz, hit: true };
}

export function settleFooting(
  y: number,
  vy: number,
  ground: number,
  dt: number,
): { y: number; vy: number } {
  const err = ground - y;
  if (err >= -GROUND_SNAP) {
    const rate = err > 0.1 ? SETTLE_UP : SETTLE_HOLD;
    return {
      y: y + err * (1 - Math.exp(-dt * rate)),
      vy: 0,
    };
  }
  const nextVy = vy - GRAVITY * dt;
  const nextY = y + nextVy * dt;
  if (nextY <= ground) {
    return { y: ground, vy: 0 };
  }
  return { y: nextY, vy: nextVy };
}

export function collidePlayer(
  body: BodyState,
  dt: number,
  colliders: readonly PropCollider[] = liveColliders(),
): BodyState {
  const radius = capsuleRadius(body.size);
  const props = resolveProps(body.x, body.z, body.vx, body.vz, radius, colliders);
  const shore = clampToShore(props.x, props.z, props.vx, props.vz, body.size);
  const tucked =
    shore.hit && colliders.length > 0
      ? resolveProps(shore.x, shore.z, shore.vx, shore.vz, radius, colliders)
      : shore;
  const ground = groundHeight(tucked.x, tucked.z);
  const foot = settleFooting(body.y, body.vy, ground, dt);
  return {
    x: tucked.x,
    y: foot.y,
    z: tucked.z,
    vx: tucked.vx,
    vy: foot.vy,
    vz: tucked.vz,
    size: body.size,
  };
}
