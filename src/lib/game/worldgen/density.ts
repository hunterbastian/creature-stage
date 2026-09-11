/**
 * Worldgen knobs. Bump `WORLDGEN_SEED` to reshuffle the island; leave it
 * pinned so a session (and every reload) sees the same coastal layout.
 *
 * Counts are instance budgets per prop type — one draw call each in
 * `CoastalDress`. Keep mobile well under the desktop cap for iOS Safari.
 */
export const WORLDGEN_SEED = 0x71def04;

export type DensityTier = "desktop" | "mobile";

export type DensityKnobs = {
  grass: number;
  reeds: number;
  dryRocks: number;
  wetRocks: number;
  shells: number;
  kelp: number;
  driftwood: number;
  spirals: number;
  duneScrub: number;
  foam: number;
  haze: number;
  groveTrees: number;
  extraPools: number;
  shelves: number;
  kelpLines: number;
  extraGroveStrips: number;
};

export const DENSITY: Record<DensityTier, DensityKnobs> = {
  desktop: {
    grass: 68,
    reeds: 26,
    dryRocks: 26,
    wetRocks: 20,
    shells: 54,
    kelp: 22,
    driftwood: 13,
    spirals: 12,
    duneScrub: 14,
    foam: 20,
    haze: 8,
    groveTrees: 6,
    extraPools: 6,
    shelves: 6,
    kelpLines: 5,
    extraGroveStrips: 2,
  },
  mobile: {
    grass: 34,
    reeds: 14,
    dryRocks: 14,
    wetRocks: 12,
    shells: 26,
    kelp: 12,
    driftwood: 7,
    spirals: 7,
    duneScrub: 8,
    foam: 10,
    haze: 4,
    groveTrees: 5,
    extraPools: 3,
    shelves: 4,
    kelpLines: 3,
    extraGroveStrips: 2,
  },
};

export function densityFor(mobile: boolean): DensityKnobs {
  return mobile ? DENSITY.mobile : DENSITY.desktop;
}

/**
 * Radial bands (world units from origin). Grove strips live on the
 * beach–meadow edge only — a full ring would read as a forest wall.
 */
export const BAND = {
  meadowInner: 2.2,
  meadowOuter: 10.1,
  groveInner: 10.0,
  groveOuter: 13.8,
  shoreInner: 13.15,
  shoreOuter: 15.55,
  waterlineInner: 15.2,
  waterlineOuter: 16.45,
} as const;
