/**
 * Coastal world generation / set dressing.
 *
 * Layout is seeded (`WORLDGEN_SEED`) and stable across reloads. Collision
 * binds `sampleGroundY` to `surfaceHeight` via `setGroundSampler`.
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
export { isWaterline, sampleGroundY, setGroundSampler } from "./ground";
export {
  TIDE_POOLS,
  getTidePools,
  seedLayout,
  type WorldLayout,
} from "./layout";
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
