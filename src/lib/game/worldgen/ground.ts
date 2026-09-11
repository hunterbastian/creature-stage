import { WORLD_RADIUS } from "../constants";

/**
 * Visual ground height for dress props.
 *
 * Today the playable island is a flat disk: meadow at y=0, a slightly raised
 * sand ring in `World.tsx`, and the waterline shelf a hair below. Collision is
 * landing a heightmap in a parallel PR — when something like
 * `samplePlayableHeight(x, z)` appears, **rebind this function to it** so
 * props follow terrain without rewriting scatter.
 *
 * Do not bake locomotion clamps in here.
 */
export function sampleGroundY(x: number, z: number): number {
  const radius = Math.hypot(x, z);
  if (radius > WORLD_RADIUS + 0.08) return -0.04;
  if (radius > WORLD_RADIUS - 2.35) return 0.004;
  return 0;
}

/** Sand / waterline band used by shore biomes and foam. */
export function isWaterline(x: number, z: number): boolean {
  const radius = Math.hypot(x, z);
  return radius >= WORLD_RADIUS - 2.4 && radius <= WORLD_RADIUS + 0.55;
}
