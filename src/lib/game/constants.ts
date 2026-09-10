/** Playable island radius in world units. */
export const WORLD_RADIUS = 16;

export const TURN_SPEED = 1.85;
export const TURN_SPEED_SPRINT = 1.12;
export const BASE_SPEED = 4.15;
export const BASE_BITE = 0.85;
export const MAX_SIZE = 2.35;
export const SIZE_PER_MEAL = 0.07;

/** Walk has inertia — sprint is a short, costly burst. */
export const MOVE_ACCEL = 6.4;
export const MOVE_DECEL = 8.8;
export const YAW_ACCEL = 7.2;
export const SPRINT_MULT = 1.38;
export const STAMINA_DRAIN = 0.36;
export const STAMINA_RECOVER = 0.3;
export const STAMINA_WINDED = 0.62;
export const SPRINT_STICK = 0.84;

/** Audio-cue-ready pulse windows (seconds). */
export const FEEL = {
  eatHitstop: 0.055,
  formHitstop: 0.09,
  claimHitstop: 0.065,
  eatKick: 0.7,
  formKick: 1,
  claimKick: 0.85,
  greetKick: 0.42,
  threatKick: 0.55,
} as const;

export const CAMERA_FOLLOW = 2.15;
export const CAMERA_LOOK = 3.05;

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
/** Max nestmates seeded (Hatchling). Apex keeps 1. */
export const PLAYER_HERD_MAX = 5;
/** Wild flocks stay closer to the original meadow count. */
export const WILD_HERD_MAX = 3;
export const HERD_GRAZE_RADIUS = 6.4;
export const HERD_DETECT_RADIUS = 5.3;
export const HERD_LOSE_RADIUS = 9.6;
export const HERD_NEST_LEASH = 11.2;
/** Stand still this long inside a nest to nestle without a button. */
export const NEST_LINGER_SEC = 1.55;
