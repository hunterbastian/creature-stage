/**
 * Authored coastal places — not scatter. Collision uses the overlook lift
 * so the grove actually sits on a hill; dress uses the same pins.
 */
export type LandmarkKind = "groveOverlook" | "tideShelf";

export type LandmarkPin = {
  kind: LandmarkKind;
  x: number;
  z: number;
  radius: number;
  yaw: number;
  /** Extra meadow lift at the grove overlook. 0 for the tide shelf. */
  lift: number;
};

/** Wind-bent pines on a low rise, looking seaward (NE grove). */
export const GROVE_OVERLOOK: LandmarkPin = {
  kind: "groveOverlook",
  x: 4.2,
  z: 9.4,
  radius: 3.45,
  yaw: Math.atan2(4.2, 9.4),
  lift: 0.18,
};

/**
 * Wet-rock terrace on the east shore — the tide-pool photo, not a random
 * puddle. Satellite pools are authored next to the hero disc.
 */
export const TIDE_SHELF: LandmarkPin = {
  kind: "tideShelf",
  x: 12.6,
  z: 3.4,
  radius: 3.9,
  yaw: 0.35,
  lift: 0,
};

export const LANDMARKS: readonly LandmarkPin[] = [GROVE_OVERLOOK, TIDE_SHELF];

/** Satellite bowls around the east terrace. Counted as layout pools, not scatter. */
export const TIDE_SHELF_SATELLITES = [
  { x: 14.35, z: 4.35, sx: 1.12, sz: 0.68, yaw: 0.92 },
  { x: 11.15, z: 5.05, sx: 0.98, sz: 0.58, yaw: -0.28 },
] as const;

export function isGroveOverlook(salt: number): boolean {
  return salt === 1;
}

/**
 * Smooth hill under the overlook grove. Safe to add into `surfaceHeight`:
 * origin / beach test points sit well outside this radius.
 */
export function overlookLift(x: number, z: number): number {
  const dx = x - GROVE_OVERLOOK.x;
  const dz = z - GROVE_OVERLOOK.z;
  const radius = GROVE_OVERLOOK.radius;
  const d2 = dx * dx + dz * dz;
  const r2 = radius * radius;
  if (d2 >= r2) return 0;
  const t = 1 - Math.sqrt(d2) / radius;
  return GROVE_OVERLOOK.lift * t * t * (3 - 2 * t);
}
