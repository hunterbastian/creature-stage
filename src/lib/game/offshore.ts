import { WORLD_RADIUS } from "./constants";

/**
 * Distant deep-sea fauna — ambient horizon presence, not gameplay.
 *
 * Knobs:
 * - `OCEAN_RADIUS` — deep-water disk (playable island stays `WORLD_RADIUS`)
 * - `OFFSHORE_LANE_INNER` / `OFFSHORE_LANE_OUTER` — swim corridor
 * - `OFFSHORE_BEASTS` — count, orbit radius, rad/s speed, bob, scale
 * Mobile drops the farthest beast so Safari keeps three-or-fewer entities.
 */

/** Deep ocean disk. Larger than the old near-shore puddle so the lane reads. */
export const OCEAN_RADIUS = 58;

/** Darker water starts here — beyond the beach, shy of the swim ring. */
export const OFFSHORE_LANE_INNER = WORLD_RADIUS + 10;

/** Outer swim bound. Beasts stay inside the ocean disk. */
export const OFFSHORE_LANE_OUTER = 52;

/** Mean breach height (water mesh sits near y = -0.2). */
export const OFFSHORE_WATER_Y = -0.06;

export const OFFSHORE_KINDS = ["serpent", "ray", "leviathan"] as const;
export type OffshoreKind = (typeof OFFSHORE_KINDS)[number];

export type OffshoreSpec = {
  id: string;
  kind: OffshoreKind;
  /** Orbit radius from island center. */
  radius: number;
  /** Radians per second. Full lap ≈ 2π / speed. */
  speed: number;
  phase: number;
  clockwise: boolean;
  /** Depth-bob amplitude. */
  bob: number;
  bobHz: number;
  /** Radial wobble so paths are gentle ovals, not a carousel. */
  wobble: number;
  scale: number;
};

export type OffshorePose = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
};

/**
 * Three readable silhouettes, plus a smaller distant serpent on desktop.
 * Speeds are slow on purpose — huge things should take minutes to cross.
 */
export const OFFSHORE_BEASTS: readonly OffshoreSpec[] = [
  {
    id: "coil",
    kind: "serpent",
    radius: 38.8,
    speed: 0.036,
    phase: 0.42,
    clockwise: true,
    bob: 0.28,
    bobHz: 0.42,
    wobble: 1.15,
    scale: 1,
  },
  {
    id: "veil",
    kind: "ray",
    radius: 35.4,
    speed: 0.024,
    phase: 2.55,
    clockwise: false,
    bob: 0.16,
    bobHz: 0.33,
    wobble: 0.85,
    scale: 1,
  },
  {
    id: "keel",
    kind: "leviathan",
    radius: 43.8,
    speed: 0.018,
    phase: 4.18,
    clockwise: true,
    bob: 0.22,
    bobHz: 0.28,
    wobble: 1.35,
    scale: 1.06,
  },
  {
    id: "rift",
    kind: "serpent",
    radius: 49.2,
    speed: 0.015,
    phase: 5.4,
    clockwise: false,
    bob: 0.18,
    bobHz: 0.36,
    wobble: 1.05,
    scale: 0.68,
  },
];

export function offshoreRoster(mobile: boolean): readonly OffshoreSpec[] {
  return mobile ? OFFSHORE_BEASTS.slice(0, 3) : OFFSHORE_BEASTS;
}

/** Time-only orbit. No player chase, no sim coupling. */
export function offshorePose(spec: OffshoreSpec, time: number): OffshorePose {
  const dir = spec.clockwise ? 1 : -1;
  const angle = spec.phase + time * spec.speed * dir;
  const radius =
    spec.radius + Math.sin(time * 0.19 + spec.phase) * spec.wobble;
  const bob = Math.sin(time * spec.bobHz + spec.phase) * spec.bob;
  const tangentX = dir * Math.cos(angle);
  const tangentZ = dir * -Math.sin(angle);

  return {
    x: Math.sin(angle) * radius,
    y: OFFSHORE_WATER_Y + spec.bob * 0.4 + bob,
    z: Math.cos(angle) * radius,
    yaw: Math.atan2(tangentX, tangentZ),
    pitch: Math.cos(time * spec.bobHz + spec.phase) * spec.bob * 0.16,
  };
}

