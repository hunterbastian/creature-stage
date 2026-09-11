/**
 * Compatibility shim. Dressing lives in `src/lib/game/worldgen/`.
 * Collision binds `setGroundSampler(surfaceHeight)` so props sit on terrain.
 */
export {
  TIDE_POOLS,
  getTidePools,
  sampleGroundY,
  seedLayout,
  seedWorldDress,
  setGroundSampler,
  WORLDGEN_SEED,
} from "./worldgen";
export type {
  ClearingSpec,
  GroveSpec,
  HazeSpec,
  LandformKind,
  LandformSpec,
  PropPose,
  TidePoolSpec,
  WorldDress,
} from "./worldgen";
