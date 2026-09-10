import { create } from "zustand";
import {
  DEFAULT_PARTS,
  UNLOCK_DEFAULTS,
  isUnlocked,
  randomizeUnlocked,
  slotLabel,
} from "./catalog";
import {
  FOOD_RESPAWN_MS,
  SLOT_UNLOCK_AT,
  STARTING_FOOD,
  WORLD_RADIUS,
} from "./constants";
import { resetSim, sim, syncSimStats } from "./sim";
import { computeStats } from "./stats";
import {
  SLOT_IDS,
  assertNever,
  type DerivedStats,
  type EquippedParts,
  type FoodBit,
  type FoodKind,
  type PartId,
  type SlotId,
} from "./types";

export type GameStore = {
  parts: EquippedParts;
  eaten: number;
  unlocked: SlotId[];
  foods: FoodBit[];
  stats: DerivedStats;
  toast: string | null;
  setPart: (slot: SlotId, id: PartId) => void;
  eat: (foodId: string) => void;
  randomize: () => void;
  reset: () => void;
  clearToast: () => void;
};

let worldGen = 0;
let foodSeq = 0;

const FOOD_KINDS: FoodKind[] = ["berry", "plumpfruit", "sporepod"];

export function spawnFood(avoidX = 0, avoidZ = 0): FoodBit {
  foodSeq += 1;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 4 + Math.random() * (WORLD_RADIUS - 5.5);
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    if (Math.hypot(x - avoidX, z - avoidZ) < 3) continue;
    return {
      id: `food-${foodSeq}`,
      kind: FOOD_KINDS[Math.floor(Math.random() * FOOD_KINDS.length)],
      x,
      z,
    };
  }
  return {
    id: `food-${foodSeq}`,
    kind: "berry",
    x: 6,
    z: 4,
  };
}

function seedFoods(): FoodBit[] {
  return Array.from({ length: STARTING_FOOD }, () => spawnFood());
}

function unlockedSlots(eaten: number): SlotId[] {
  return SLOT_IDS.filter((slot) => eaten >= SLOT_UNLOCK_AT[slot]);
}

function buildState(parts: EquippedParts, eaten: number, foods: FoodBit[]) {
  const stats = computeStats(parts, eaten);
  syncSimStats(stats);
  return {
    parts,
    eaten,
    unlocked: unlockedSlots(eaten),
    foods,
    stats,
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...buildState(DEFAULT_PARTS, 0, seedFoods()),
  toast: "Walk into glowing fruit. Eat to grow and unlock parts.",

  setPart: (slot, id) => {
    const { unlocked, parts, eaten } = get();
    if (!unlocked.includes(slot)) return;
    if (!isUnlocked(slot, eaten)) return;
    if (parts[slot] === id) return;
    const nextParts = { ...parts, [slot]: id } as EquippedParts;
    const stats = computeStats(nextParts, eaten);
    syncSimStats(stats);
    set({ parts: nextParts, stats });
  },

  eat: (foodId) => {
    const { foods, eaten, parts, unlocked } = get();
    const morsel = foods.find((food) => food.id === foodId);
    if (!morsel) return;

    const nextEaten = eaten + 1;
    const nextUnlocked = unlockedSlots(nextEaten);
    const newly = nextUnlocked.filter((slot) => !unlocked.includes(slot));
    const nextParts = { ...parts };
    for (const slot of newly) {
      switch (slot) {
        case "arms":
          nextParts.arms = UNLOCK_DEFAULTS.arms;
          break;
        case "tail":
          nextParts.tail = UNLOCK_DEFAULTS.tail;
          break;
        case "accessory":
          nextParts.accessory = UNLOCK_DEFAULTS.accessory;
          break;
        case "body":
        case "legs":
        case "mouth":
        case "eyes":
          break;
        default:
          assertNever(slot, "Unknown slot");
      }
    }

    const remaining = foods.filter((food) => food.id !== foodId);
    const stats = computeStats(nextParts, nextEaten);
    syncSimStats(stats);

    const toast = newly.length
      ? `${slotLabel(newly[0])} unlocked — check the editor.`
      : nextEaten % 2 === 0
        ? "You grew a little."
        : "Nom.";

    set({
      foods: remaining,
      eaten: nextEaten,
      unlocked: nextUnlocked,
      parts: nextParts,
      stats,
      toast,
    });

    const gen = worldGen;
    window.setTimeout(() => {
      if (gen !== worldGen) return;
      set((state) => ({
        foods: [...state.foods, spawnFood(sim.x, sim.z)],
      }));
    }, FOOD_RESPAWN_MS);
  },

  randomize: () => {
    const { parts, eaten } = get();
    const nextParts = randomizeUnlocked(parts, eaten);
    const stats = computeStats(nextParts, eaten);
    syncSimStats(stats);
    set({ parts: nextParts, stats, toast: "Mutated." });
  },

  reset: () => {
    worldGen += 1;
    foodSeq = 0;
    resetSim();
    set({
      ...buildState(DEFAULT_PARTS, 0, seedFoods()),
      toast: "Back to a fresh sporling.",
    });
  },

  clearToast: () => set({ toast: null }),
}));
