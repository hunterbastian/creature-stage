import { WORLD_RADIUS } from "../constants";
import { sampleGroundY } from "./ground";
import type { PropPose, TidePoolSpec } from "./types";
import { nearNest, nearPool } from "./layout";

export function pose(
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  rz: number,
  sx: number,
  sy: number,
  sz: number,
): PropPose {
  return { x, y, z, rx, ry, rz, sx, sy, sz };
}

export function grounded(
  x: number,
  lift: number,
  z: number,
  rx: number,
  ry: number,
  rz: number,
  sx: number,
  sy: number,
  sz: number,
): PropPose {
  return pose(x, sampleGroundY(x, z) + lift, z, rx, ry, rz, sx, sy, sz);
}

export function blocked(
  pools: TidePoolSpec[],
  x: number,
  z: number,
  nestMin: number,
  poolExtra = 0,
  maxR = WORLD_RADIUS - 0.35,
): boolean {
  const r = Math.hypot(x, z);
  if (r < 2.0 || r > maxR) return true;
  if (nearNest(x, z, nestMin)) return true;
  if (nearPool(pools, x, z, poolExtra)) return true;
  return false;
}

export function scatter(
  count: number,
  rand: () => number,
  nestMin: number,
  pools: TidePoolSpec[],
  pick: (rand: () => number) => { x: number; z: number } | null,
  toPose: (x: number, z: number, rand: () => number) => PropPose,
  options: { poolExtra?: number; maxR?: number } = {},
): PropPose[] {
  const poolExtra = options.poolExtra ?? 0;
  const maxR = options.maxR ?? WORLD_RADIUS - 0.35;
  const out: PropPose[] = [];
  let guard = 0;
  while (out.length < count && guard < count * 18) {
    guard += 1;
    const at = pick(rand);
    if (!at || blocked(pools, at.x, at.z, nestMin, poolExtra, maxR)) continue;
    out.push(toPose(at.x, at.z, rand));
  }
  return out;
}

export function ringPick(
  rand: () => number,
  inner: number,
  outer: number,
): { x: number; z: number } {
  const angle = rand() * Math.PI * 2;
  const radius = inner + rand() * Math.max(0.2, outer - inner);
  return {
    x: Math.sin(angle) * radius,
    z: Math.cos(angle) * radius,
  };
}

export function sectorPick(
  rand: () => number,
  angle: number,
  span: number,
  inner: number,
  outer: number,
): { x: number; z: number } {
  const a = angle + (rand() - 0.5) * span;
  const radius = inner + rand() * Math.max(0.2, outer - inner);
  return {
    x: Math.sin(a) * radius,
    z: Math.cos(a) * radius,
  };
}
