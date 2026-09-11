import { WORLD_RADIUS } from "../constants";
import { assertNever } from "../types";
import { NEST_LAYOUT } from "../wildlife";
import { BAND, WORLDGEN_SEED, densityFor } from "./density";
import { createRng, saltSeed } from "./rng";
import type {
  ClearingSpec,
  GroveSpec,
  HazeSpec,
  LandformSpec,
  PropPose,
  ShoreSector,
  TidePoolSpec,
} from "./types";

export type WorldLayout = {
  tidePools: TidePoolSpec[];
  groves: GroveSpec[];
  shelves: PropPose[];
  sectors: ShoreSector[];
  haze: HazeSpec[];
  landforms: LandformSpec[];
  clearings: ClearingSpec[];
};

/**
 * Authored tide pockets — two meadow seeps plus three shore pools, kept off
 * nest bowls so herds still have a clearing.
 */
const BASE_TIDE_POOLS: TidePoolSpec[] = [
  { x: 12.6, z: 3.4, sx: 1.75, sz: 1.05, yaw: 0.35 },
  { x: -11.4, z: 7.2, sx: 1.45, sz: 0.88, yaw: -0.4 },
  { x: 3.4, z: -2.8, sx: 1.45, sz: 0.62, yaw: 0.2 },
  { x: -4.6, z: 1.6, sx: 1.12, sz: 0.5, yaw: 0.55 },
  { x: 10.6, z: -10.1, sx: 1.55, sz: 0.82, yaw: 1.05 },
];

/**
 * Pocket groves on the beach–meadow edge only. Turned into short wind-bent
 * strips (see `span`) rather than a temperate forest wall.
 */
const BASE_GROVES: GroveSpec[] = [
  { x: 4.2, z: 9.4, count: 5, salt: 1, span: 0.42 },
  { x: -9.6, z: 8.8, count: 4, salt: 3, span: 0.38 },
  { x: -11.1, z: -5.9, count: 5, salt: 4, span: 0.44 },
  { x: 10.8, z: -7.3, count: 5, salt: 5, span: 0.4 },
  { x: -11.2, z: 1.6, count: 4, salt: 7, span: 0.36 },
];

const EXTRA_GROVES: GroveSpec[] = [
  { x: 9.1, z: 8.2, count: 5, salt: 9, span: 0.4 },
  { x: -3.4, z: -12.6, count: 5, salt: 11, span: 0.46 },
  { x: 6.2, z: -12.1, count: 4, salt: 13, span: 0.34 },
];

const BASE_HAZE: HazeSpec[] = [
  { x: 17.4, y: 0.42, z: 2.2, radius: 5.1 },
  { x: -16.6, y: 0.48, z: 6.4, radius: 4.7 },
  { x: 5.4, y: 0.4, z: -17.6, radius: 5.0 },
  { x: -7.2, y: 0.46, z: 16.8, radius: 4.5 },
  { x: 28.6, y: 0.62, z: 10.4, radius: 7.4 },
  { x: -24.8, y: 0.66, z: -16.2, radius: 6.8 },
  { x: 12.2, y: 0.38, z: -16.4, radius: 4.2 },
  { x: -18.8, y: 0.44, z: -4.6, radius: 4.8 },
];

const LANDFORMS: LandformSpec[] = [
  { x: 24, z: -10, scale: 4.4, rot: 0.4, kind: "cliff" },
  { x: 20, z: 18, scale: 3.6, rot: -0.55, kind: "cliff" },
  { x: -22, z: 16, scale: 4.0, rot: 0.9, kind: "cliff" },
  { x: -18, z: -20, scale: 3.2, rot: -0.2, kind: "cliff" },
  { x: 31, z: 6, scale: 2.8, rot: 0.7, kind: "isle" },
  { x: -29, z: -8, scale: 3.1, rot: -0.9, kind: "isle" },
  { x: 16.9, z: -18.2, scale: 1.55, rot: 0.3, kind: "stack" },
  { x: -17.6, z: 14.4, scale: 1.35, rot: 1.1, kind: "stack" },
];

const SHORE_SECTORS: ShoreSector[] = [
  { kind: "tideTerrace", angle: 0.52, span: 0.72, inner: 13.3, outer: 15.45 },
  { kind: "kelpWrack", angle: 1.38, span: 0.62, inner: 14.6, outer: 16.2 },
  { kind: "rockShelf", angle: 2.05, span: 0.5, inner: 13.4, outer: 15.2 },
  { kind: "shellFan", angle: 2.72, span: 0.48, inner: 14.4, outer: 16.05 },
  { kind: "tideTerrace", angle: 3.35, span: 0.7, inner: 13.25, outer: 15.5 },
  { kind: "kelpWrack", angle: 4.22, span: 0.68, inner: 14.5, outer: 16.25 },
  { kind: "rockShelf", angle: 5.05, span: 0.52, inner: 13.35, outer: 15.15 },
  { kind: "shellFan", angle: 5.72, span: 0.55, inner: 14.35, outer: 16.1 },
];

export function poolRadius(pool: TidePoolSpec): number {
  return Math.max(pool.sx, pool.sz) * 0.55 + 0.32;
}

export function nearNest(x: number, z: number, min: number): boolean {
  return NEST_LAYOUT.some((nest) => Math.hypot(nest.x - x, nest.z - z) < min);
}

export function nearPool(
  pools: TidePoolSpec[],
  x: number,
  z: number,
  extra = 0,
): boolean {
  return pools.some(
    (pool) => Math.hypot(pool.x - x, pool.z - z) < poolRadius(pool) + extra,
  );
}

function nestClearings(): ClearingSpec[] {
  return [
    { x: NEST_LAYOUT[0].x, z: NEST_LAYOUT[0].z, radius: 2.2, color: "#5c6844" },
    { x: NEST_LAYOUT[1].x, z: NEST_LAYOUT[1].z, radius: 2.28, color: "#7a7358" },
    { x: NEST_LAYOUT[2].x, z: NEST_LAYOUT[2].z, radius: 2.16, color: "#6a6848" },
  ];
}

function extraPools(mobile: boolean, base: TidePoolSpec[]): TidePoolSpec[] {
  const knobs = densityFor(mobile);
  const rand = createRng(saltSeed(WORLDGEN_SEED, 101));
  const terraces = SHORE_SECTORS.filter((sector) => sector.kind === "tideTerrace");
  const out: TidePoolSpec[] = [];
  let guard = 0;
  while (out.length < knobs.extraPools && guard < knobs.extraPools * 22) {
    guard += 1;
    const sector = terraces[Math.floor(rand() * terraces.length)];
    const angle = sector.angle + (rand() - 0.5) * sector.span;
    const radius =
      sector.inner + rand() * Math.max(0.3, sector.outer - sector.inner);
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    if (nearNest(x, z, 3.2)) continue;
    if (nearPool(base, x, z, 1.15) || nearPool(out, x, z, 1.15)) continue;
    const r = Math.hypot(x, z);
    if (r < BAND.shoreInner - 0.2 || r > WORLD_RADIUS - 0.45) continue;
    out.push({
      x,
      z,
      sx: 1.05 + rand() * 0.7,
      sz: 0.52 + rand() * 0.42,
      yaw: rand() * Math.PI,
    });
  }
  return out;
}

function extraGroveStrips(mobile: boolean): GroveSpec[] {
  const knobs = densityFor(mobile);
  return EXTRA_GROVES.slice(0, knobs.extraGroveStrips).map((grove) => ({
    ...grove,
    count: mobile ? Math.max(3, grove.count - 1) : grove.count,
  }));
}

function seedShelves(mobile: boolean, pools: TidePoolSpec[]): PropPose[] {
  const knobs = densityFor(mobile);
  const rand = createRng(saltSeed(WORLDGEN_SEED, 131));
  const shelves: PropPose[] = [];
  const sectors = SHORE_SECTORS.filter((sector) => sector.kind === "rockShelf");
  let guard = 0;
  while (shelves.length < knobs.shelves && guard < knobs.shelves * 20) {
    guard += 1;
    const sector = sectors[Math.floor(rand() * sectors.length)];
    const angle = sector.angle + (rand() - 0.5) * sector.span * 0.85;
    const radius =
      sector.inner + rand() * Math.max(0.25, sector.outer - sector.inner);
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    if (nearNest(x, z, 3.35)) continue;
    if (nearPool(pools, x, z, 0.7)) continue;
    if (shelves.some((shelf) => Math.hypot(shelf.x - x, shelf.z - z) < 2.1)) {
      continue;
    }
    const len = 1.15 + rand() * 0.95;
    const wid = 0.55 + rand() * 0.42;
    const thick = 0.16 + rand() * 0.12;
    shelves.push({
      x,
      y: thick * 0.42,
      z,
      rx: 0.12 + rand() * 0.1,
      ry: angle + Math.PI / 2,
      rz: (rand() - 0.5) * 0.08,
      sx: len,
      sy: thick,
      sz: wid,
    });
  }
  return shelves;
}

const layoutCache = new Map<boolean, WorldLayout>();

export function seedLayout(mobile: boolean): WorldLayout {
  const cached = layoutCache.get(mobile);
  if (cached) return cached;
  const knobs = densityFor(mobile);
  const groves = (mobile
    ? BASE_GROVES.filter((grove) => grove.salt !== 3)
    : BASE_GROVES
  )
    .map((grove) => ({
      ...grove,
      count: Math.min(grove.count + (mobile ? 0 : 1), knobs.groveTrees),
    }))
    .concat(extraGroveStrips(mobile));

  const tidePools = BASE_TIDE_POOLS.concat(extraPools(mobile, BASE_TIDE_POOLS));
  const haze = BASE_HAZE.slice(0, knobs.haze);
  const sectors = mobile
    ? SHORE_SECTORS.filter((_, index) => index % 2 === 0)
    : SHORE_SECTORS;

  const layout: WorldLayout = {
    tidePools,
    groves,
    shelves: seedShelves(mobile, tidePools),
    sectors,
    haze,
    landforms: LANDFORMS,
    clearings: nestClearings(),
  };
  layoutCache.set(mobile, layout);
  return layout;
}

export function sectorsOf(
  layout: WorldLayout,
  kind: ShoreSector["kind"],
): ShoreSector[] {
  return layout.sectors.filter((sector) => sector.kind === kind);
}

export function getTidePools(mobile = false): TidePoolSpec[] {
  return seedLayout(mobile).tidePools;
}

/** Desktop pool snapshot for `import { TIDE_POOLS }` (collision / tests). */
export const TIDE_POOLS: TidePoolSpec[] = seedLayout(false).tidePools;

export function sectorSitsOnWaterline(kind: ShoreSector["kind"]): boolean {
  switch (kind) {
    case "kelpWrack":
    case "shellFan":
      return true;
    case "tideTerrace":
    case "rockShelf":
      return false;
    default:
      return assertNever(kind, "Unknown shore sector");
  }
}
