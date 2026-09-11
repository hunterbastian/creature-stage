/**
 * Coastal water + wet-sand look. PS3 Skyrim-era shoreline, iOS-safe:
 * stacked phong ocean discs, one transparent shallows ring, foam lace,
 * darker wet-sand vertex colors. No custom shaders, particles, or extra shadows.
 *
 * Knobs:
 * - `SHORE.deepWater` / `midWater` / `shallowsWater` — ocean gradient
 * - `SHORE.drySand` / `dampSand` / `wetSand` / `submergedSand` — beach strip
 * - `SHORE.foam*` — waterline lace (World rings + dress patches)
 * - `SHORE.pool*` — tide-pool bed / rim / clear water
 * - `SHORE_BAND` — radii in world units from origin
 *
 * Collision `WATER_Y` / `WATERLINE_RADIUS` stay authoritative for height.
 * This file only tints and overlays — do not change playable lip math here.
 */
import { Color } from "three";
import { BEACH_INNER_RADIUS, WORLD_RADIUS } from "./constants";
import { WATERLINE_RADIUS } from "./collision";
import { OFFSHORE_LANE_INNER, OCEAN_RADIUS } from "./offshore";

export const SHORE = {
  meadow: "#5f7a48",
  drySand: "#c4b486",
  dampSand: "#9a8b68",
  /** Distinctly darker than dry sand so the waterline reads wet. */
  wetSand: "#5a5346",
  /** Cool stain on the underwater shelf (seen through shallows). */
  submergedSand: "#4a524c",

  deepWater: "#1c4654",
  midWater: "#2d6878",
  shallowsWater: "#4e8f94",
  /** Transparent overlay so wet sand shows through near shore. */
  shallowsOverlay: "#5a9aa0",

  foam: "#d2e0da",
  foamShadow: "#b8ccc6",

  poolBed: "#6e6758",
  poolRim: "#5a564c",
  poolWater: "#4a8a88",

  islandShininess: 7,
  islandSpecular: "#9aaa78",
  deepShininess: 24,
  midShininess: 36,
  shallowsShininess: 48,
  poolWaterShininess: 78,
  poolBedShininess: 18,
  poolRimShininess: 22,

  waterSpecularDeep: "#6a9aa8",
  waterSpecularMid: "#8ec4cc",
  waterSpecularShallow: "#d0f0ee",
  poolSpecular: "#d8f6f0",
  wetSpecular: "#c4d4cc",
  foamShininess: 12,
  foamSpecular: "#dce8e4",

  shallowsOpacity: 0.28,
  foamInnerOpacity: 0.18,
  foamOuterOpacity: 0.09,
  foamPatchOpacity: 0.14,
  foamPulse: 0.03,
  foamHz: 0.22,
  poolWaterOpacity: 0.5,
  poolFoamOpacity: 0.12,
} as const;

/**
 * Radial bands for water overlays. Inner foam sits on the playable lip;
 * shallows reach past the island mesh so the shelf grades into mid-water.
 */
export const SHORE_BAND = {
  dampStart: BEACH_INNER_RADIUS + 0.15,
  wetStart: WORLD_RADIUS - 1.35,
  wetPeak: WORLD_RADIUS - 0.12,
  submergedStart: WATERLINE_RADIUS - 0.18,
  shallowsInner: WORLD_RADIUS - 0.1,
  shallowsOuter: WORLD_RADIUS + 3.7,
  foamInner: WORLD_RADIUS - 0.05,
  foamMid: WORLD_RADIUS + 0.36,
  foamOuter: WORLD_RADIUS + 1.08,
  midRadius: OFFSHORE_LANE_INNER,
  oceanRadius: OCEAN_RADIUS,
} as const;

const MEADOW = new Color(SHORE.meadow);
const DRY = new Color(SHORE.drySand);
const DAMP = new Color(SHORE.dampSand);
const WET = new Color(SHORE.wetSand);
const SUBMERGED = new Color(SHORE.submergedSand);
const SHALLOWS = new Color(SHORE.shallowsWater);
const MID = new Color(SHORE.midWater);
const DEEP = new Color(SHORE.deepWater);

export function smooth01(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Island vertex tint. Meadow stays the existing coastal green; the beach
 * darkens into a wet strip, then a cool submerged shelf past the waterline.
 */
export function terrainColor(radius: number, target: Color): Color {
  const beach = smooth01(
    BEACH_INNER_RADIUS - 1.8,
    BEACH_INNER_RADIUS + 0.35,
    radius,
  );
  target.copy(MEADOW).lerp(DRY, beach);
  const damp = smooth01(SHORE_BAND.dampStart, SHORE_BAND.wetStart, radius);
  target.lerp(DAMP, damp * 0.62);
  const wet = smooth01(SHORE_BAND.wetStart, SHORE_BAND.wetPeak, radius);
  target.lerp(WET, wet);
  const submerged = smooth01(
    SHORE_BAND.submergedStart,
    WATERLINE_RADIUS + 0.85,
    radius,
  );
  target.lerp(SUBMERGED, submerged);
  return target;
}

/**
 * Ocean disc tint. Near the island = clear coastal teal; the swim lane
 * and horizon fall to deeper teal-navy. `angle` adds a cheap chop so the
 * rings are not a perfect bullseye.
 */
export function waterColor(
  radius: number,
  angle: number,
  target: Color,
): Color {
  target.copy(SHALLOWS);
  const toMid = smooth01(WORLD_RADIUS + 1.1, SHORE_BAND.midRadius - 0.8, radius);
  target.lerp(MID, toMid);
  const toDeep = smooth01(
    SHORE_BAND.midRadius - 1.6,
    SHORE_BAND.oceanRadius * 0.84,
    radius,
  );
  target.lerp(DEEP, toDeep);
  const chop = 0.04 * Math.sin(angle * 4 + radius * 0.16);
  if (chop > 0) target.lerp(SHALLOWS, chop);
  else target.lerp(MID, -chop);
  return target;
}

export function luma(color: Color): number {
  return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}
