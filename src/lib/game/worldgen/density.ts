import type { WorldDress } from "./types";

/**
 * Worldgen knobs. Bump `WORLDGEN_SEED` to reshuffle the island; leave it
 * pinned so a session (and every reload) sees the same coastal layout.
 *
 * Counts are instance budgets per prop type — one draw call each in
 * `CoastalDress`. Keep mobile well under the desktop cap for iOS Safari.
 * Hero meshes live in `coastal-props.glb`; swapping kits must not raise
 * these caps.
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
  groveMist: number;
  mistWalls: number;
  groveTrees: number;
  extraPools: number;
  shelves: number;
  kelpLines: number;
  extraGroveStrips: number;
};

export const DENSITY: Record<DensityTier, DensityKnobs> = {
  desktop: {
    grass: 60,
    reeds: 26,
    dryRocks: 26,
    wetRocks: 18,
    shells: 50,
    kelp: 22,
    driftwood: 13,
    spirals: 12,
    duneScrub: 14,
    foam: 18,
    haze: 6,
    groveMist: 5,
    mistWalls: 8,
    groveTrees: 6,
    extraPools: 4,
    shelves: 6,
    kelpLines: 5,
    extraGroveStrips: 2,
  },
  mobile: {
    grass: 26,
    reeds: 10,
    dryRocks: 10,
    wetRocks: 10,
    shells: 20,
    kelp: 8,
    driftwood: 6,
    spirals: 6,
    duneScrub: 6,
    foam: 8,
    haze: 3,
    groveMist: 3,
    mistWalls: 0,
    groveTrees: 5,
    extraPools: 2,
    shelves: 4,
    kelpLines: 3,
    extraGroveStrips: 2,
  },
};

/**
 * Instanced pose cap (grass + rocks + trees + haze + pool discs…).
 * Unique landforms / nest bowls sit outside this. Mobile is the iOS budget.
 */
export const INSTANCE_BUDGET: Record<DensityTier, number> = {
  desktop: 560,
  mobile: 280,
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

/** All instanced prop poses CoastalDress will submit (including pool/hollow discs). */
export function countInstancedPoses(dress: WorldDress): number {
  return (
    dress.grass.length +
    dress.reeds.length +
    dress.dryRocks.length +
    dress.wetRocks.length +
    dress.shells.length +
    dress.kelp.length +
    dress.driftwood.length +
    dress.trunks.length +
    dress.crowns.length +
    dress.canopies.length +
    dress.scrub.length +
    dress.spirals.length +
    dress.foam.length +
    dress.shelves.length +
    dress.mistWalls.length +
    dress.haze.length +
    dress.tidePools.length * 4
  );
}
