import { BEACH_INNER_RADIUS, WORLD_RADIUS } from "../constants";

/**
 * Visual ground height for dress props.
 *
 * Default is 0 so worldgen can seed poses as *lifts* above the dirt.
 * Collision binds the real height field with `setGroundSampler(surfaceHeight)`
 * (see `collision.ts`) — do not import collision from here (cycle).
 *
 * Instanced props add `sampleGroundY(x, z)` at draw time. Pose `y` is local
 * lift, not world height.
 */
export type GroundSampler = (x: number, z: number) => number;

let sampler: GroundSampler = () => 0;

export function setGroundSampler(next: GroundSampler): void {
  sampler = next;
}

export function sampleGroundY(x: number, z: number): number {
  return sampler(x, z);
}

/** Sand / waterline band used by shore biomes and foam. */
export function isWaterline(x: number, z: number): boolean {
  const radius = Math.hypot(x, z);
  return radius >= BEACH_INNER_RADIUS - 0.05 && radius <= WORLD_RADIUS + 0.55;
}
