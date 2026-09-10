import { create } from "zustand";
import {
  DEFAULT_PARTS,
  UNLOCK_DEFAULTS,
  isUnlocked,
  randomizeUnlocked,
  starterLoadout,
} from "./catalog";
import {
  FOOD_RESPAWN_MS,
  NEST_CLEARING,
  SLOT_UNLOCK_AT,
  STARTING_FOOD,
  WORLD_RADIUS,
} from "./constants";
import {
  canClaimNest,
  canMutate,
  FORMS,
  formAt,
  formUpToast,
  hasLesson,
  herdThinLine,
  lessonLine,
  nearestFood,
  withLesson,
  type LessonId,
  type Waypoint,
} from "./progress";
import { pulseClaim, pulseEat, pulseEncounter, resetSim, sim, syncSimStats } from "./sim";
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
import { playerSpawnAt, seedMeadow, syncHerdToForm } from "./wildlife";

export type GameStore = {
  parts: EquippedParts;
  eaten: number;
  unlocked: SlotId[];
  foods: FoodBit[];
  nests: NestSite[];
  originNestId: string;
  homeNestId: string;
  nearbyNest: NearbyNest | null;
  waypoint: Waypoint | null;
  claimedWild: boolean;
  greetedHerd: boolean;
  hasMutated: boolean;
  lessonsSeen: LessonId[];
  editorNudge: boolean;
  meadowEpoch: number;
  stats: DerivedStats;
  toast: string | null;
  starterChosen: boolean;
  chooseStarter: (body: BodyId) => void;
  setPart: (slot: SlotId, id: PartId) => void;
  eat: (foodId: string) => void;
  nestle: (nestId: string) => void;
  greetHerd: () => void;
  setNearbyNest: (nest: NearbyNest | null) => void;
  setWaypoint: (waypoint: Waypoint | null) => void;
  randomize: () => void;
  reset: () => void;
  clearToast: () => void;
  clearEditorNudge: () => void;
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

function clampIsland(x: number, z: number, margin: number): { x: number; z: number } {
  const radius = Math.hypot(x, z);
  const limit = WORLD_RADIUS - margin;
  if (radius <= limit || radius < 0.001) return { x, z };
  const scale = limit / radius;
  return { x: x * scale, z: z * scale };
}

function starterFruit(
  spawnX: number,
  spawnZ: number,
  yaw: number,
  nests: NestSite[],
): FoodBit {
  foodSeq += 1;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const dist = 3.1 + attempt * 0.35;
    const drift = (attempt - 4) * 0.18;
    const x = spawnX + Math.sin(yaw + drift) * dist;
    const z = spawnZ + Math.cos(yaw + drift) * dist;
    const clamped = clampIsland(x, z, 1.4);
    if (tooCloseToNests(clamped.x, clamped.z, nests)) continue;
    if (Math.hypot(clamped.x - spawnX, clamped.z - spawnZ) < 1.6) continue;
    return {
      id: `food-${foodSeq}`,
      kind: "berry",
      x: clamped.x,
      z: clamped.z,
    };
  }
  return {
    id: `food-${foodSeq}`,
    kind: "berry",
    x: spawnX + Math.sin(yaw) * 3.2,
    z: spawnZ + Math.cos(yaw) * 3.2,
  };
}

function seedFoods(
  nests: NestSite[],
  spawn: { x: number; z: number; yaw: number },
): FoodBit[] {
  const first = starterFruit(spawn.x, spawn.z, spawn.yaw, nests);
  const rest = Array.from({ length: STARTING_FOOD - 1 }, () =>
    spawnFood(spawn.x, spawn.z, nests),
  );
  return [first, ...rest];
}

function unlockedSlots(eaten: number): SlotId[] {
  return SLOT_IDS.filter((slot) => eaten >= SLOT_UNLOCK_AT[slot]);
}

function buildState(
  parts: EquippedParts,
  eaten: number,
  foods: FoodBit[],
) {
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

function spawnPose() {
  const meadow = seedMeadow();
  const home = meadow.nests.find((nest) => nest.id === meadow.homeNestId);
  const spawn = home
    ? playerSpawnAt(home)
    : { x: 0, z: 0, yaw: 0 };
  resetSim(spawn.x, spawn.z, spawn.yaw);
  return { meadow, spawn };
}

function bootWorld() {
  const { meadow, spawn } = spawnPose();
  return {
    meadow,
    foods: seedFoods(meadow.nests, spawn),
    spawn,
  };
}

function faceNearestFruit(foods: FoodBit[]): void {
  const target = nearestFood(sim.x, sim.z, foods);
  if (!target) return;
  sim.yaw = Math.atan2(target.x - sim.x, target.z - sim.z);
}

function teach(
  seen: readonly LessonId[],
  id: LessonId,
): { lessonsSeen: LessonId[]; line: string | null } {
  if (hasLesson(seen, id)) {
    return { lessonsSeen: [...seen], line: null };
  }
  return { lessonsSeen: withLesson(seen, id), line: lessonLine(id) };
}

const initialWorld = bootWorld();

export const useGameStore = create<GameStore>((set, get) => ({
  ...buildState(DEFAULT_PARTS, 0, initialWorld.foods),
  nests: initialWorld.meadow.nests,
  originNestId: initialWorld.meadow.homeNestId,
  homeNestId: initialWorld.meadow.homeNestId,
  nearbyNest: null,
  waypoint: null,
  claimedWild: false,
  greetedHerd: false,
  hasMutated: false,
  lessonsSeen: [],
  editorNudge: false,
  meadowEpoch: 0,
  toast: null,
  starterChosen: false,

  chooseStarter: (body) => {
    const nextParts = starterLoadout(body);
    const { eaten, foods, lessonsSeen } = get();
    const stats = computeStats(nextParts, eaten);
    syncSimStats(stats);
    faceNearestFruit(foods);
    const lesson = teach(lessonsSeen, "graze");
    set({
      parts: nextParts,
      stats,
      starterChosen: true,
      lessonsSeen: lesson.lessonsSeen,
      toast: lesson.line ?? formAt(eaten).levelToast,
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
    set({ parts: nextParts, stats, editorNudge: false });
  },

  eat: (foodId) => {
    const { foods, eaten, parts, unlocked, lessonsSeen } = get();
    const morsel = foods.find((food) => food.id === foodId);
    if (!morsel) return;

    const nextEaten = eaten + 1;
    const prevForm = formAt(eaten);
    const nextFormDef = formAt(nextEaten);
    const formedUp = nextFormDef.id !== prevForm.id;
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
    pulseEat(formedUp);

    let nextLessons = lessonsSeen;
    let toast: string | null = null;
    let editorNudge = get().editorNudge;

    if (formedUp) {
      const { homeNestId } = get();
      const { playerThinned } = syncHerdToForm(nextEaten, homeNestId);
      const thin = playerThinned > 0 ? herdThinLine(nextFormDef) : "";
      toast = thin ? `${formUpToast(nextFormDef)} ${thin}` : formUpToast(nextFormDef);
      if (newly.length) {
        const edit = teach(nextLessons, "edit");
        nextLessons = edit.lessonsSeen;
        editorNudge = true;
      }
      if (nextFormDef.canMutate && !prevForm.canMutate) {
        const mutate = teach(nextLessons, "mutate");
        nextLessons = mutate.lessonsSeen;
      }
    } else if (nextEaten === 1) {
      const grow = teach(nextLessons, "grow");
      nextLessons = grow.lessonsSeen;
      toast = grow.line;
    }

    set({
      foods: remaining,
      eaten: nextEaten,
      unlocked: nextUnlocked,
      parts: nextParts,
      stats,
      toast,
      lessonsSeen: nextLessons,
      editorNudge,
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
    const { nests, homeNestId, eaten, lessonsSeen, originNestId } = get();
    const nest = nests.find((site) => site.id === nestId);
    if (!nest) return;
    const species = speciesDef(nest.speciesId);

    if (homeNestId === nestId) {
      pulseClaim(false);
      const rest = teach(lessonsSeen, "herd");
      set({
        lessonsSeen: rest.lessonsSeen,
        toast: rest.line
          ? rest.line
          : `Home nest. ${nest.eggs} eggs warm in the ${nest.name.toLowerCase()}.`,
      });
      return;
    }

    if (!canClaimNest(eaten)) {
      const claim = teach(lessonsSeen, "claim");
      set({
        lessonsSeen: claim.lessonsSeen,
        toast:
          claim.line ??
          `Grow to ${FORMS.fledgling.name} to claim a nest.`,
      });
      return;
    }

    const herd = teach(lessonsSeen, "herd");
    const firstWild = nestId !== originNestId;
    pulseClaim(true);
    syncHerdToForm(eaten, nestId);
    set({
      homeNestId: nestId,
      claimedWild: get().claimedWild || firstWild,
      lessonsSeen: herd.lessonsSeen,
      toast: `Claimed ${nest.name}. The ${species.name.toLowerCase()} herd turns curious.`,
    });
  },

  greetHerd: () => {
    const { greetedHerd, lessonsSeen } = get();
    if (greetedHerd) return;
    pulseEncounter("greet");
    const herd = teach(lessonsSeen, "herd");
    set({
      greetedHerd: true,
      lessonsSeen: herd.lessonsSeen,
      toast: herd.line ?? "The herd knows your scent.",
    });
  },

  setNearbyNest: (nest) => {
    const current = get().nearbyNest;
    if (current?.id === nest?.id && current?.isHome === nest?.isHome) return;
    const { lessonsSeen, eaten } = get();
    const extras: Partial<GameStore> = { nearbyNest: nest };
    if (nest && !nest.isHome && canClaimNest(eaten)) {
      const claim = teach(lessonsSeen, "claim");
      extras.lessonsSeen = claim.lessonsSeen;
      if (claim.line && !get().toast) extras.toast = claim.line;
    }
    set(extras);
  },

  setWaypoint: (waypoint) => {
    const current = get().waypoint;
    if (!current && !waypoint) return;
    if (
      current &&
      waypoint &&
      current.kind === waypoint.kind &&
      current.id === waypoint.id
    ) {
      if (waypoint.kind === "herd") return;
      if (current.x === waypoint.x && current.z === waypoint.z) return;
    }
    set({ waypoint });
  },

  randomize: () => {
    const { parts, eaten, lessonsSeen } = get();
    if (!canMutate(eaten)) {
      const mutate = teach(lessonsSeen, "mutate");
      set({
        lessonsSeen: mutate.lessonsSeen,
        toast: mutate.line ?? `Grow to ${FORMS.fledgling.name} to mutate.`,
      });
      return;
    }
    const nextParts = randomizeUnlocked(parts, eaten);
    const stats = computeStats(nextParts, eaten);
    syncSimStats(stats);
    const first = !get().hasMutated;
    pulseClaim(false);
    set({
      parts: nextParts,
      stats,
      hasMutated: true,
      editorNudge: false,
      toast: first
        ? "Mutated — a new Tideform. Nestmates wear it too."
        : "Mutated.",
    });
  },

  reset: () => {
    worldGen += 1;
    foodSeq = 0;
    const world = bootWorld();
    set({
      ...buildState(DEFAULT_PARTS, 0, world.foods),
      nests: world.meadow.nests,
      originNestId: world.meadow.homeNestId,
      homeNestId: world.meadow.homeNestId,
      nearbyNest: null,
      waypoint: null,
      claimedWild: false,
      greetedHerd: false,
      hasMutated: false,
      lessonsSeen: [],
      editorNudge: false,
      meadowEpoch: get().meadowEpoch + 1,
      starterChosen: false,
      toast: null,
    });
  },

  clearToast: () => set({ toast: null }),
  clearEditorNudge: () => set({ editorNudge: false }),
}));

