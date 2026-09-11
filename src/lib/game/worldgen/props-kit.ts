/**
 * Blender / Node glTF kit for coastal set dressing.
 *
 * Meshes are authored in the same local space as the primitives they replace
 * (unit dodecahedron / cylinder / cone / torus / icosahedron). Worldgen pose
 * scales and collision cylinders stay as-is — do not retarget radii from
 * mesh bounds.
 *
 * Rebuild: `npm run props:build` or
 * `blender --background --python scripts/blender/build_coastal_props.py`
 */
export const COASTAL_PROPS_URL = "/models/coastal-props.glb";

export const COASTAL_PROP_NODES = {
  dryRocks: "prop_rock_dry",
  wetRocks: "prop_rock_wet",
  shelves: "prop_rock_shelf",
  shells: "prop_shell",
  spirals: "prop_spiral",
  kelp: "prop_kelp",
  driftwood: "prop_driftwood",
  trunks: "prop_trunk",
  crowns: "prop_crown",
  canopies: "prop_canopy",
  scrub: "prop_scrub",
  reeds: "prop_reed",
} as const;

export type CoastalPropNode = (typeof COASTAL_PROP_NODES)[keyof typeof COASTAL_PROP_NODES];
