/** Playable island radius in world units. */
export const WORLD_RADIUS = 16;

export const TURN_SPEED = 2.4;
export const BASE_SPEED = 4.6;
export const BASE_BITE = 0.85;
export const MAX_SIZE = 2.35;
export const SIZE_PER_MEAL = 0.07;

/** Bites required before each slot becomes editable. */
export const SLOT_UNLOCK_AT = {
  body: 0,
  legs: 0,
  mouth: 0,
  eyes: 0,
  arms: 3,
  tail: 6,
  accessory: 9,
} as const;

export const STARTING_FOOD = 8;
export const FOOD_RESPAWN_MS = 1600;
