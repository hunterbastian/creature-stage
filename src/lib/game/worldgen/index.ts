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
  INSTANCE_BUDGET,
  WORLDGEN_SEED,
  countInstancedPoses,
  densityFor,
  type DensityKnobs,
  type DensityTier,
} from "./density";
export { isWaterline, sampleGroundY, setGroundSampler } from "./ground";
export {
  GROVE_OVERLOOK,
  TIDE_SHELF,
  overlookLift,
} from "./landmarks";
export {
  TIDE_POOLS,
  getTidePools,
  seedLayout,
  type WorldLayout,
} from "./layout";
export { isWorldgenOccupied, worldgenKeepOut } from "./occupancy";
export {
  COASTAL_PROPS_URL,
  COASTAL_PROP_NODES,
  type CoastalPropNode,
} from "./props-kit";
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
