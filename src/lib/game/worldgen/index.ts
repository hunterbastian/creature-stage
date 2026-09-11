/**
 * Coastal world generation / set dressing.
 *
 * Layout is seeded (`WORLDGEN_SEED`) and stable across reloads. Collision is a
 * parallel track — sample ground Y through `sampleGroundY` so a later heightmap
 * can hook in without rewriting scatter.
 */
export { PROP_CATALOG } from "./catalog";
export {
  BAND,
  DENSITY,
  WORLDGEN_SEED,
  densityFor,
  type DensityKnobs,
  type DensityTier,
} from "./density";
export { isWaterline, sampleGroundY } from "./ground";
export { seedLayout, type WorldLayout } from "./layout";
export { isWorldgenOccupied, worldgenKeepOut } from "./occupancy";
export { seedWorldDress } from "./seed";
export type {
  ClearingSpec,
  GroveSpec,
  HazeSpec,
  KeepOut,
  LandformKind,
  LandformSpec,
  PropPose,
  ShoreSector,
  ShoreSectorKind,
  TidePoolSpec,
  WorldDress,
} from "./types";
