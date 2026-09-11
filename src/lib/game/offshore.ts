import { WORLD_RADIUS } from "./constants";
import { assertNever } from "./types";

/**
 * Distant deep-sea fauna — majestic orbit that can escalate into a
 * shore encounter. Danger never enters the meadow.
 *
 * Knobs:
 * - `OCEAN_RADIUS` — deep-water disk (playable island stays `WORLD_RADIUS`)
 * - `OFFSHORE_LANE_INNER` / `OFFSHORE_LANE_OUTER` — swim corridor
 * - `OFFSHORE_BEASTS` — count, orbit, combat (hp / strike / maw)
 * - `SHORE_*` / `TIDE_*` — aggro, telegraph, bite, cooldown
 * Mobile drops the farthest beast so Safari keeps three-or-fewer entities.
 * Only one beast is AI-active at a time.
 */

/** Deep ocean disk. Larger than the old near-shore puddle so the lane reads. */
export const OCEAN_RADIUS = 58;

/** Darker water starts here — beyond the beach, shy of the swim ring. */
export const OFFSHORE_LANE_INNER = WORLD_RADIUS + 10;

/** Outer swim bound. Beasts stay inside the ocean disk. */
export const OFFSHORE_LANE_OUTER = 52;

/** Mean breach height. Chase cam is ~1.1 up, so they must rise off the waterline. */
export const OFFSHORE_WATER_Y = 0.55;

export const OFFSHORE_KINDS = ["serpent", "ray", "leviathan"] as const;
export type OffshoreKind = (typeof OFFSHORE_KINDS)[number];

export type OffshoreSpec = {
  id: string;
  name: string;
  kind: OffshoreKind;
  /** Orbit radius from island center. */
  radius: number;
  /** Radians per second. Full lap ≈ 2π / speed. */
  speed: number;
  phase: number;
  clockwise: boolean;
  /** Depth-bob amplitude. */
  bob: number;
  bobHz: number;
  /** Radial wobble so paths are gentle ovals, not a carousel. */
  wobble: number;
  scale: number;
  hp: number;
  /** Damage on a landed shore slam. */
  strike: number;
  /** Local +Z distance from the group origin to the readable maw. */
  maw: number;
};

/** Player radial ≥ this (near the beach) can draw a notice. */
export const SHORE_DANGER_RADIUS = WORLD_RADIUS - 2.35;
/** Player radial ≤ this and the engaged beast gives up (meadow is safe). */
export const SHORE_SAFE_RADIUS = WORLD_RADIUS - 5.15;
/** Max distance from player to a beast that may notice. */
export const TIDE_AGGRO_RANGE = 34;
/** Half-angle (rad) of the notice cone around the player's shore bearing. */
export const TIDE_AGGRO_ARC = 0.92;
export const TIDE_NOTICE_SEC = 0.82;
export const TIDE_SURGE_SEC = 3.35;
export const TIDE_WINDUP_SEC = 0.74;
export const TIDE_STRIKE_SEC = 0.16;
export const TIDE_RECOVER_SEC = 1.85;
export const TIDE_RETREAT_SEC = 3.6;
export const TIDE_COOLDOWN_SEC = 11;
export const TIDE_DOWN_SEC = 22;
export const TIDE_STRIKE_RADIUS = 4.9;
export const TIDE_BITE_RADIUS = 3.55;
export const TIDE_IFRAMES = 0.88;
export const TIDE_HARVEST_MEALS = 2;
export const TIDE_KNOCKBACK = 7.4;

export const TIDE_MOODS = [
  "ambient",
  "notice",
  "surge",
  "windup",
  "strike",
  "recover",
  "retreat",
  "down",
] as const;
export type TideMood = (typeof TIDE_MOODS)[number];

export type OffshorePose = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
};

/**
 * Three readable silhouettes, plus a smaller distant serpent on desktop.
 * Speeds are slow on purpose — huge things should take minutes to cross.
 */
export const OFFSHORE_BEASTS: readonly OffshoreSpec[] = [
  {
    id: "coil",
    name: "Coil",
    kind: "serpent",
    radius: 36.2,
    speed: 0.036,
    phase: 0.42,
    clockwise: true,
    bob: 0.42,
    bobHz: 0.42,
    wobble: 1.15,
    scale: 1.22,
    hp: 3,
    strike: 1,
    maw: 5.9,
  },
  {
    id: "veil",
    name: "Veil",
    kind: "ray",
    radius: 35.2,
    speed: 0.024,
    phase: 2.55,
    clockwise: false,
    bob: 0.28,
    bobHz: 0.33,
    wobble: 0.85,
    scale: 1.35,
    hp: 3,
    strike: 1,
    maw: 1.45,
  },
  {
    id: "keel",
    name: "Keel",
    kind: "leviathan",
    radius: 41.6,
    speed: 0.018,
    phase: 4.18,
    clockwise: true,
    bob: 0.36,
    bobHz: 0.28,
    wobble: 1.35,
    scale: 1.42,
    hp: 4,
    strike: 2,
    maw: 3.35,
  },
  {
    id: "rift",
    name: "Rift",
    kind: "serpent",
    radius: 47.4,
    speed: 0.015,
    phase: 5.4,
    clockwise: false,
    bob: 0.3,
    bobHz: 0.36,
    wobble: 1.05,
    scale: 0.92,
    hp: 2,
    strike: 1,
    maw: 5.4,
  },
];

export function offshoreRoster(mobile: boolean): readonly OffshoreSpec[] {
  return mobile ? OFFSHORE_BEASTS.slice(0, 3) : OFFSHORE_BEASTS;
}

/** Time-only orbit used while ambient, and as the retreat target. */
export function offshorePose(spec: OffshoreSpec, time: number): OffshorePose {
  const dir = spec.clockwise ? 1 : -1;
  const angle = spec.phase + time * spec.speed * dir;
  const radius =
    spec.radius + Math.sin(time * 0.19 + spec.phase) * spec.wobble;
  const bob = Math.sin(time * spec.bobHz + spec.phase) * spec.bob;
  const tangentX = dir * Math.cos(angle);
  const tangentZ = dir * -Math.sin(angle);

  return {
    x: Math.sin(angle) * radius,
    y: OFFSHORE_WATER_Y + spec.bob * 0.55 + bob,
    z: Math.cos(angle) * radius,
    yaw: Math.atan2(tangentX, tangentZ),
    pitch: Math.cos(time * spec.bobHz + spec.phase) * spec.bob * 0.16,
  };
}

export function mawLength(spec: OffshoreSpec): number {
  return spec.maw * spec.scale;
}

export function mawPoint(
  x: number,
  z: number,
  yaw: number,
  spec: OffshoreSpec,
): { x: number; z: number } {
  const reach = mawLength(spec);
  return {
    x: x + Math.sin(yaw) * reach,
    z: z + Math.cos(yaw) * reach,
  };
}

export function wrapAngle(angle: number): number {
  let next = angle;
  while (next > Math.PI) next -= Math.PI * 2;
  while (next < -Math.PI) next += Math.PI * 2;
  return next;
}

export function lerpAngle(from: number, to: number, t: number): number {
  return from + wrapAngle(to - from) * t;
}

export function lerpPose(
  from: OffshorePose,
  to: OffshorePose,
  t: number,
): OffshorePose {
  const k = Math.min(1, Math.max(0, t));
  return {
    x: from.x + (to.x - from.x) * k,
    y: from.y + (to.y - from.y) * k,
    z: from.z + (to.z - from.z) * k,
    yaw: lerpAngle(from.yaw, to.yaw, k),
    pitch: from.pitch + (to.pitch - from.pitch) * k,
  };
}

/** Body origin just beyond the playable edge, maw aimed at the player. */
export function shoreEngagePose(
  spec: OffshoreSpec,
  playerX: number,
  playerZ: number,
): OffshorePose {
  const pr = Math.hypot(playerX, playerZ) || 1;
  const nx = playerX / pr;
  const nz = playerZ / pr;
  const originR = Math.max(
    WORLD_RADIUS + 0.72,
    Math.min(pr + mawLength(spec) * 0.78, OFFSHORE_LANE_OUTER - 2.4),
  );
  return {
    x: nx * originR,
    z: nz * originR,
    y: OFFSHORE_WATER_Y + spec.bob * 0.7 + 0.85,
    yaw: Math.atan2(-nx, -nz),
    pitch: -0.08,
  };
}

export function playerOnShore(playerX: number, playerZ: number): boolean {
  return Math.hypot(playerX, playerZ) >= SHORE_DANGER_RADIUS;
}

export function playerInlandSafe(playerX: number, playerZ: number): boolean {
  return Math.hypot(playerX, playerZ) <= SHORE_SAFE_RADIUS;
}

export function tideMoodLift(mood: TideMood): number {
  switch (mood) {
    case "ambient":
      return 0;
    case "notice":
      return 0.45;
    case "surge":
      return 0.72;
    case "windup":
      return 1.15;
    case "strike":
      return 0.18;
    case "recover":
      return 0.72;
    case "retreat":
      return 0.4;
    case "down":
      return -1.8;
    default:
      return assertNever(mood, "Unknown tide mood");
  }
}

export function tideMoodGlow(mood: TideMood): number {
  switch (mood) {
    case "ambient":
    case "down":
      return 0;
    case "notice":
      return 0.32;
    case "surge":
      return 0.52;
    case "windup":
      return 1;
    case "strike":
      return 0.7;
    case "recover":
      return 0.22;
    case "retreat":
      return 0.08;
    default:
      return assertNever(mood, "Unknown tide mood");
  }
}

export function engagedMood(mood: TideMood): boolean {
  switch (mood) {
    case "ambient":
    case "down":
      return false;
    case "notice":
    case "surge":
    case "windup":
    case "strike":
    case "recover":
    case "retreat":
      return true;
    default:
      return assertNever(mood, "Unknown tide mood");
  }
}

export function biteableMood(mood: TideMood): boolean {
  switch (mood) {
    case "recover":
      return true;
    case "ambient":
    case "notice":
    case "surge":
    case "windup":
    case "strike":
    case "retreat":
    case "down":
      return false;
    default:
      return assertNever(mood, "Unknown tide mood");
  }
}

