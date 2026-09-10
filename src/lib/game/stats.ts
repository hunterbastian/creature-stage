import { BASE_BITE, BASE_SPEED, MAX_SIZE, SIZE_PER_MEAL } from "./constants";
import { findPart } from "./catalog";
import { SLOT_IDS, type DerivedStats, type EquippedParts } from "./types";

export function computeStats(
  parts: EquippedParts,
  eaten: number,
): DerivedStats {
  let speed = BASE_SPEED;
  let bite = BASE_BITE;

  for (const slot of SLOT_IDS) {
    const part = findPart(slot, parts[slot]);
    speed += part.speed;
    bite += part.bite;
  }

  const size = Math.min(MAX_SIZE, 1 + eaten * SIZE_PER_MEAL);
  // Bigger critters lumber a little unless their parts pay for it.
  speed = Math.max(2.15, speed - (size - 1) * 1.15);

  return { speed, bite, size };
}
