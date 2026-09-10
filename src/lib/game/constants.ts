/** Playable island radius in world units. */
export const WORLD_RADIUS = 16;

export const TURN_SPEED = 2.4;
export const BASE_SPEED = 4.6;
export const BASE_BITE = 0.85;
export const MAX_SIZE = 2.35;
export const SIZE_PER_MEAL = 0.07;

/** Bites required before each slot becomes editable. Aligned with forms. */
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

/** Walk-in radius for claiming / nestling. */
export const NEST_INTERACT_RADIUS = 2.7;
/** Fruit and decor keep a little air around nest bowls. */
export const NEST_CLEARING = 3.1;
export const HERD_SIZE = 3;
export const HERD_GRAZE_RADIUS = 6.4;
export const HERD_DETECT_RADIUS = 5.3;
export const HERD_LOSE_RADIUS = 9.6;
export const HERD_NEST_LEASH = 11.2;
/** Stand still this long inside a nest to nestle without a button. */
export const NEST_LINGER_SEC = 1.55;
