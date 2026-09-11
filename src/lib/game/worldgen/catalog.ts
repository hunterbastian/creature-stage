/**
 * Named coastal props and the band they belong to. Rendering (geometry /
 * materials) stays in `CoastalDress` so this catalog can stay Three-free.
 *
 * `instance` means one shared mesh + material; keep new kinds on that path
 * for iOS. Hero kinds load unit meshes from `coastal-props.glb` (see
 * `props-kit.ts`). Landforms stay unique meshes because they are few and
 * offshore. Collision cylinders still use pose scale, not mesh bounds.
 */
export const PROP_CATALOG = {
  grass: { band: "meadow", instance: true, shadows: false },
  reeds: { band: "shore", instance: true, shadows: false },
  dryRocks: { band: "meadow", instance: true, shadows: true },
  wetRocks: { band: "shore", instance: true, shadows: true },
  shells: { band: "waterline", instance: true, shadows: false },
  spirals: { band: "waterline", instance: true, shadows: false },
  kelp: { band: "waterline", instance: true, shadows: false },
  driftwood: { band: "shore", instance: true, shadows: true },
  trunks: { band: "grove", instance: true, shadows: true },
  crowns: { band: "grove", instance: true, shadows: true },
  canopies: { band: "grove", instance: true, shadows: true },
  scrub: { band: "grove", instance: true, shadows: false },
  foam: { band: "waterline", instance: true, shadows: false },
  shelves: { band: "shore", instance: true, shadows: true },
  haze: { band: "waterline", instance: true, shadows: false },
  tidePools: { band: "shore", instance: true, shadows: false },
  clearings: { band: "meadow", instance: false, shadows: false },
  landforms: { band: "offshore", instance: false, shadows: true },
} as const;

export type PropKind = keyof typeof PROP_CATALOG;
