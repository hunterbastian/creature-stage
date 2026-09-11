import { NEST_CLEARING } from "../constants";
import { NEST_LAYOUT } from "../wildlife";
import { poolRadius, seedLayout } from "./layout";
import type { KeepOut } from "./types";

const occupancyCache = new Map<boolean, KeepOut[]>();

function discsFor(mobile: boolean): KeepOut[] {
  const layout = seedLayout(mobile);
  const discs: KeepOut[] = NEST_LAYOUT.map((nest) => ({
    x: nest.x,
    z: nest.z,
    radius: NEST_CLEARING,
    reason: "nest",
  }));
  for (const pool of layout.tidePools) {
    discs.push({
      x: pool.x,
      z: pool.z,
      radius: poolRadius(pool) + 0.35,
      reason: "pool",
    });
  }
  for (const shelf of layout.shelves) {
    discs.push({
      x: shelf.x,
      z: shelf.z,
      radius: Math.max(shelf.sx, shelf.sz) * 0.55 + 0.28,
      reason: "shelf",
    });
  }
  return discs;
}

/** Keep-out discs so fruit does not spawn inside pools or rock shelves. */
export function worldgenKeepOut(mobile: boolean): KeepOut[] {
  const hit = occupancyCache.get(mobile);
  if (hit) return hit;
  const discs = discsFor(mobile);
  occupancyCache.set(mobile, discs);
  return discs;
}

export function isWorldgenOccupied(
  x: number,
  z: number,
  mobile: boolean,
  extra = 0,
): boolean {
  return worldgenKeepOut(mobile).some(
    (disc) => Math.hypot(disc.x - x, disc.z - z) < disc.radius + extra,
  );
}
