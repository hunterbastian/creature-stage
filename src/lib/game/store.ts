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
import { isCoarsePointer } from "./device";
import { resetTide } from "./offshore-ai";
import { TIDE_HARVEST_MEALS, TIDE_IFRAMES, TIDE_KNOCKBACK } from "./offshore";
import {
  canClaimNest,
  canMutate,
  FORMS,
  formAt,
  formUpToast,
  formVitality,
  hasLesson,
  herdThinLine,
  lessonLine,
  nearestFood,
  withLesson,
  type LessonId,
  type Waypoint,
} from "./progress";
import {
  pulseClaim,
  pulseEat,
  pulseEncounter,
  pulseHurt,
  resetSim,
  sim,
  syncSimStats,
  syncSimVitality,
} from "./sim";
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
import { fauna, playerSpawnAt, seedMeadow, syncHerdToForm } from "./wildlife";
import { isWorldgenOccupied } from "./worldgen";

export type NearbyThreat = {
  id: string;
  name: string;
  canBite: boolean;
};

export type GameStore = {
  parts: EquippedParts;
  eaten: number;
  unlocked: SlotId[];
  foods: FoodBit[];
  nests: NestSite[];
  originNestId: string;
  homeNestId: string;
  nearbyNest: NearbyNest | null;
  nearbyThreat: NearbyThreat | null;
  waypoint: Waypoint | null;
  claimedWild: boolean;
  greetedHerd: boolean;
  hasMutated: boolean;
  harvestedDeep: boolean;
  lessonsSeen: LessonId[];
  editorNudge: boolean;
  meadowEpoch: number;
  stats: DerivedStats;
  toast: string | null;
  starterChosen: boolean;
  chooseStarter: (body: BodyId) => void;
  setPart: (slot: SlotId, id: PartId) => void;
  eat: (foodId: string) => void;
  harvestDeep: (name: string) => void;
  applyWound: (damage: number, name: string) => "ignored" | "hurt" | "down";
  noticeDeep: (name: string) => void;
  nestle: (nestId: string) => void;
  greetHerd: () => void;
  setNearbyNest: (nest: NearbyNest | null) => void;
  setNearbyThreat: (threat: NearbyThreat | null) => void;
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

function buriedByDress(x: number, z: number): boolean {
  return isWorldgenOccupied(x, z, isCoarsePointer());
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
    if (buriedByDress(x, z)) continue;
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
    x: 2.6,
    z: 0.4,
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
    if (buriedByDress(clamped.x, clamped.z)) continue;
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
  syncSimVitality(formVitality(formAt(eaten).id), true);
  return {
    parts,
    eaten,
    unlocked: unlockedSlots(eaten),
    foods,
    stats,
  };
}

function wakeAtHome(homeNestId: string): void {
  const nest = fauna.nests.find((site) => site.id === homeNestId);
  if (!nest) {
    sim.hp = sim.maxHp;
    sim.x = 0;
    sim.z = 0;
    return;
  }
  const spawn = playerSpawnAt(nest);
  sim.x = spawn.x;
  sim.z = spawn.z;
  sim.yaw = spawn.yaw;
  sim.vx = 0;
  sim.vz = 0;
  sim.hp = sim.maxHp;
  sim.hurtFlash = 0;
  sim.iFrames = 0.4;
}

function knockInland(): void {
  const radius = Math.hypot(sim.x, sim.z) || 1;
  sim.vx -= (sim.x / radius) * TIDE_KNOCKBACK;
  sim.vz -= (sim.z / radius) * TIDE_KNOCKBACK;
}

function spawnPose() {
  const meadow = seedMeadow();
  resetTide(typeof window !== "undefined" && isCoarsePointer());
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

function unlockNewParts(
  parts: EquippedParts,
  newly: SlotId[],
): EquippedParts {
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
  return nextParts;
}

function grantMeals(
  eaten: number,
  parts: EquippedParts,
  unlocked: SlotId[],
  lessonsSeen: LessonId[],
  editorNudge: boolean,
  homeNestId: string,
  meals: number,
  firstMealLesson: boolean,
): {
  eaten: number;
  parts: EquippedParts;
  unlocked: SlotId[];
  stats: ReturnType<typeof computeStats>;
  toast: string | null;
  lessonsSeen: LessonId[];
  editorNudge: boolean;
  formedUp: boolean;
} {
  const nextEaten = eaten + meals;
  const prevForm = formAt(eaten);
  const nextFormDef = formAt(nextEaten);
  const formedUp = nextFormDef.id !== prevForm.id;
  const nextUnlocked = unlockedSlots(nextEaten);
  const newly = nextUnlocked.filter((slot) => !unlocked.includes(slot));
  const nextParts = unlockNewParts(parts, newly);
  const stats = computeStats(nextParts, nextEaten);
  syncSimStats(stats);
  syncSimVitality(formVitality(nextFormDef.id));
  if (formedUp) {
    sim.hp = Math.min(sim.maxHp, sim.hp + 1);
  }

  let nextLessons = lessonsSeen;
  let toast: string | null = null;
  let nudge = editorNudge;

  if (formedUp) {
    const { playerThinned } = syncHerdToForm(nextEaten, homeNestId);
    const thin = playerThinned > 0 ? herdThinLine(nextFormDef) : "";
    toast = thin ? `${formUpToast(nextFormDef)} ${thin}` : formUpToast(nextFormDef);
    if (newly.length) {
      const edit = teach(nextLessons, "edit");
      nextLessons = edit.lessonsSeen;
      nudge = true;
    }
    if (nextFormDef.canMutate && !prevForm.canMutate) {
      const mutate = teach(nextLessons, "mutate");
      nextLessons = mutate.lessonsSeen;
    }
  } else if (firstMealLesson && eaten === 0) {
    const grow = teach(nextLessons, "grow");
    nextLessons = grow.lessonsSeen;
    toast = grow.line;
  }

  return {
    eaten: nextEaten,
    parts: nextParts,
    unlocked: nextUnlocked,
    stats,
    toast,
    lessonsSeen: nextLessons,
    editorNudge: nudge,
    formedUp,
  };
}

const initialWorld = bootWorld();

export const useGameStore = create<GameStore>((set, get) => ({
  ...buildState(DEFAULT_PARTS, 0, initialWorld.foods),
  nests: initialWorld.meadow.nests,
  originNestId: initialWorld.meadow.homeNestId,
  homeNestId: initialWorld.meadow.homeNestId,
  nearbyNest: null,
  nearbyThreat: null,
  waypoint: null,
  claimedWild: false,
  greetedHerd: false,
  hasMutated: false,
  harvestedDeep: false,
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
    syncSimVitality(formVitality(formAt(eaten).id), true);
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
    const { foods, eaten, parts, unlocked, lessonsSeen, homeNestId } = get();
    const morsel = foods.find((food) => food.id === foodId);
    if (!morsel) return;

    const remaining = foods.filter((food) => food.id !== foodId);
    const gain = grantMeals(
      eaten,
      parts,
      unlocked,
      lessonsSeen,
      get().editorNudge,
      homeNestId,
      1,
      true,
    );
    pulseEat(gain.formedUp);

    set({
      foods: remaining,
      eaten: gain.eaten,
      unlocked: gain.unlocked,
      parts: gain.parts,
      stats: gain.stats,
      toast: gain.toast,
      lessonsSeen: gain.lessonsSeen,
      editorNudge: gain.editorNudge,
    });

    const gen = worldGen;
    window.setTimeout(() => {
      if (gen !== worldGen) return;
      set((state) => ({
        foods: [...state.foods, spawnFood(sim.x, sim.z, state.nests)],
      }));
    }, FOOD_RESPAWN_MS);
  },

  harvestDeep: (name) => {
    const { eaten, parts, unlocked, lessonsSeen, homeNestId } = get();
    const gain = grantMeals(
      eaten,
      parts,
      unlocked,
      lessonsSeen,
      get().editorNudge,
      homeNestId,
      TIDE_HARVEST_MEALS,
      false,
    );
    pulseEat(gain.formedUp);
    const marrow = `${name} driven off. Deep marrow — ${TIDE_HARVEST_MEALS} meals.`;
    set({
      eaten: gain.eaten,
      unlocked: gain.unlocked,
      parts: gain.parts,
      stats: gain.stats,
      toast: gain.formedUp ? `${gain.toast} ${marrow}` : marrow,
      lessonsSeen: gain.lessonsSeen,
      editorNudge: gain.editorNudge,
      harvestedDeep: true,
    });
  },

  applyWound: (damage, name) => {
    if (sim.iFrames > 0 || damage <= 0) return "ignored";
    sim.hp = Math.max(0, sim.hp - damage);
    sim.iFrames = TIDE_IFRAMES;
    pulseHurt();
    knockInland();
    const { homeNestId, lessonsSeen } = get();
    if (sim.hp <= 0) {
      wakeAtHome(homeNestId);
      set({
        toast: `The ${name.toLowerCase()} took you. Wake at the hollow.`,
      });
      return "down";
    }
    const lesson = teach(lessonsSeen, "deep");
    if (lesson.line) {
      set({
        lessonsSeen: lesson.lessonsSeen,
        toast: lesson.line,
      });
    }
    return "hurt";
  },

  noticeDeep: (name) => {
    const { lessonsSeen } = get();
    const lesson = teach(lessonsSeen, "deep");
    pulseEncounter("threat");
    if (!lesson.line) return;
    set({
      lessonsSeen: lesson.lessonsSeen,
      toast: `${name} turns toward the shore. ${lesson.line}`,
    });
  },

  setNearbyThreat: (threat) => {
    const current = get().nearbyThreat;
    if (current?.id === threat?.id && current?.canBite === threat?.canBite) {
      return;
    }
    set({ nearbyThreat: threat });
  },

  nestle: (nestId) => {
    const { nests, homeNestId, eaten, lessonsSeen, originNestId } = get();
    const nest = nests.find((site) => site.id === nestId);
    if (!nest) return;
    const species = speciesDef(nest.speciesId);

    if (homeNestId === nestId) {
      pulseClaim(false);
      const hurt = sim.hp < sim.maxHp;
      sim.hp = sim.maxHp;
      const rest = teach(lessonsSeen, "herd");
      set({
        lessonsSeen: rest.lessonsSeen,
        toast: rest.line
          ? rest.line
          : hurt
            ? `Home nest. Breath returns. ${nest.eggs} eggs warm in the ${nest.name.toLowerCase()}.`
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
      nearbyThreat: null,
      waypoint: null,
      claimedWild: false,
      greetedHerd: false,
      hasMutated: false,
      harvestedDeep: false,
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

