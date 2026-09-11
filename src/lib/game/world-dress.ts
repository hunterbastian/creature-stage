/**
 * Compatibility shim. New dressing lives in `src/lib/game/worldgen/`.
 * Collision work should hook `sampleGroundY` rather than rewrite scatter here.
 */
export {
  sampleGroundY,
  seedWorldDress,
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
