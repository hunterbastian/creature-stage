import { create } from "zustand";
import {
  DEFAULT_PARTS,
  UNLOCK_DEFAULTS,
  isUnlocked,
  randomizeUnlocked,
  slotLabel,
  starterLoadout,
} from "./catalog";
import {
  FOOD_RESPAWN_MS,
  NEST_CLEARING,
  SLOT_UNLOCK_AT,
  STARTING_FOOD,
  WORLD_RADIUS,
} from "./constants";
import { resetSim, sim, syncSimStats } from "./sim";
import { speciesDef } from "./species";
import { computeStats } from "./stats";
import {
  SLOT_IDS,
  assertNever,
  type BodyId,
  type DerivedStats,
  type EquippedParts,
  type FoodBit,
  type FoodKind,
  type NearbyNest,
  type NestSite,
  type PartId,
  type SlotId,
} from "./types";
import { playerSpawnAt, seedMeadow } from "./wildlife";

export type GameStore = {
  parts: EquippedParts;
  eaten: number;
  unlocked: SlotId[];
  foods: FoodBit[];
  nests: NestSite[];
  homeNestId: string;
  nearbyNest: NearbyNest | null;
  meadowEpoch: number;
  stats: DerivedStats;
  toast: string | null;
  starterChosen: boolean;
  chooseStarter: (body: BodyId) => void;
  setPart: (slot: SlotId, id: PartId) => void;
  eat: (foodId: string) => void;
  nestle: (nestId: string) => void;
  setNearbyNest: (nest: NearbyNest | null) => void;
  randomize: () => void;
  reset: () => void;
  clearToast: () => void;
};

let worldGen = 0;
let foodSeq = 0;

const FOOD_KINDS: FoodKind[] = ["berry", "plumpfruit", "sporepod"];

function tooCloseToNests(x: number, z: number, nests: NestSite[]): boolean {
  return nests.some(
    (nest) => Math.hypot(nest.x - x, nest.z - z) < NEST_CLEARING,
  );
}

export function spawnFood(
  avoidX = 0,
  avoidZ = 0,
  nests: NestSite[] = [],
): FoodBit {
  foodSeq += 1;
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 4 + Math.random() * (WORLD_RADIUS - 5.5);
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    if (Math.hypot(x - avoidX, z - avoidZ) < 3) continue;
    if (tooCloseToNests(x, z, nests)) continue;
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
    x: 5.4,
    z: -2.8,
  };
}

function seedFoods(nests: NestSite[]): FoodBit[] {
  return Array.from({ length: STARTING_FOOD }, () => spawnFood(0, 0, nests));
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

function bootMeadow() {
  const meadow = seedMeadow();
  const home = meadow.nests.find((nest) => nest.id === meadow.homeNestId);
  if (home) {
    const spawn = playerSpawnAt(home);
    resetSim(spawn.x, spawn.z, spawn.yaw);
  } else {
    resetSim();
  }
  return meadow;
}

const initialMeadow = bootMeadow();

export const useGameStore = create<GameStore>((set, get) => ({
  ...buildState(DEFAULT_PARTS, 0, seedFoods(initialMeadow.nests)),
  nests: initialMeadow.nests,
  homeNestId: initialMeadow.homeNestId,
  nearbyNest: null,
  meadowEpoch: 0,
  toast: null,
  starterChosen: false,

  chooseStarter: (body) => {
    const nextParts = starterLoadout(body);
    const { eaten } = get();
    const stats = computeStats(nextParts, eaten);
    syncSimStats(stats);
    set({
      parts: nextParts,
      stats,
      starterChosen: true,
      toast: "Walk into fruit. Eat to grow. Nests hold herds.",
    });
  },

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
        foods: [...state.foods, spawnFood(sim.x, sim.z, state.nests)],
      }));
    }, FOOD_RESPAWN_MS);
  },

  nestle: (nestId) => {
    const { nests, homeNestId } = get();
    const nest = nests.find((site) => site.id === nestId);
    if (!nest) return;
    const species = speciesDef(nest.speciesId);
    if (homeNestId === nestId) {
      set({
        toast: `Home nest. ${nest.eggs} eggs warm in the ${nest.name.toLowerCase()}.`,
      });
      return;
    }
    set({
      homeNestId: nestId,
      toast: `Claimed ${nest.name}. The ${species.name.toLowerCase()} herd turns curious.`,
    });
  },

  setNearbyNest: (nest) => {
    const current = get().nearbyNest;
    if (current?.id === nest?.id && current?.isHome === nest?.isHome) return;
    set({ nearbyNest: nest });
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
    const meadow = bootMeadow();
    set({
      ...buildState(DEFAULT_PARTS, 0, seedFoods(meadow.nests)),
      nests: meadow.nests,
      homeNestId: meadow.homeNestId,
      nearbyNest: null,
      meadowEpoch: get().meadowEpoch + 1,
      starterChosen: false,
      toast: null,
    });
  },

  clearToast: () => set({ toast: null }),
}));
