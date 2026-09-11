import { SLOT_UNLOCK_AT } from "./constants";
import { slotLabel } from "./catalog";
import {
  assertNever,
  type FoodBit,
  type NestSite,
  type SlotId,
} from "./types";

export const FORM_IDS = [
  "hatchling",
  "fledgling",
  "wanderer",
  "tideborn",
  "elder",
  "apex",
] as const;

export type FormId = (typeof FORM_IDS)[number];

export const RESPECT_TIERS = ["wary", "known", "honored", "apex"] as const;
export type RespectTier = (typeof RESPECT_TIERS)[number];

export const LESSON_IDS = [
  "graze",
  "grow",
  "claim",
  "herd",
  "edit",
  "mutate",
  "deep",
] as const;
export type LessonId = (typeof LESSON_IDS)[number];

export const OBJECTIVE_IDS = [
  "eat",
  "grow",
  "claim",
  "greet",
  "mutate",
  "roam",
] as const;
export type ObjectiveId = (typeof OBJECTIVE_IDS)[number];

export const WAYPOINT_KINDS = ["food", "nest", "herd", "beast"] as const;
export type WaypointKind = (typeof WAYPOINT_KINDS)[number];

export type Waypoint = {
  kind: WaypointKind;
  id: string;
  x: number;
  z: number;
};

export type FormDef = {
  id: FormId;
  name: string;
  meals: number;
  blurb: string;
  sizeBonus: number;
  respect: RespectTier;
  /** Other creatures in the player's flock (not counting the player). */
  herdMates: number;
  canClaimNest: boolean;
  canMutate: boolean;
  unlockSlot: SlotId | null;
  levelToast: string;
};

export const FORMS: Record<FormId, FormDef> = {
  hatchling: {
    id: "hatchling",
    name: "Hatchling",
    meals: 0,
    blurb: "Small, hungry, and new to the tide. The hollow is crowded.",
    sizeBonus: 0,
    respect: "wary",
    herdMates: 5,
    canClaimNest: false,
    canMutate: false,
    unlockSlot: null,
    levelToast: "Hatchling. Follow the glow — fruit grows you.",
  },
  fledgling: {
    id: "fledgling",
    name: "Fledgling",
    meals: SLOT_UNLOCK_AT.arms,
    blurb: "First new limbs. A nestmate has already drifted off.",
    sizeBonus: 0.1,
    respect: "known",
    herdMates: 4,
    canClaimNest: true,
    canMutate: true,
    unlockSlot: "arms",
    levelToast: "Fledgling! Arms unlocked — claim a nest or open the editor.",
  },
  wanderer: {
    id: "wanderer",
    name: "Wanderer",
    meals: SLOT_UNLOCK_AT.tail,
    blurb: "A counterweight tail, a longer stride, a quieter flock.",
    sizeBonus: 0.16,
    respect: "known",
    herdMates: 3,
    canClaimNest: true,
    canMutate: true,
    unlockSlot: "tail",
    levelToast: "Wanderer! Tail unlocked — mutate if you want a new silhouette.",
  },
  tideborn: {
    id: "tideborn",
    name: "Tideborn",
    meals: SLOT_UNLOCK_AT.accessory,
    blurb: "Fully dressed. The flock is thinning on purpose.",
    sizeBonus: 0.22,
    respect: "known",
    herdMates: 2,
    canClaimNest: true,
    canMutate: true,
    unlockSlot: "accessory",
    levelToast: "Tideborn! Accessory unlocked — you look like a real Tideform.",
  },
  elder: {
    id: "elder",
    name: "Elder",
    meals: 12,
    blurb: "Honored by the meadow. Two nestmates still walk with you.",
    sizeBonus: 0.28,
    respect: "honored",
    herdMates: 2,
    canClaimNest: true,
    canMutate: true,
    unlockSlot: null,
    levelToast: "Elder. The meadow honors you — the flock stays thin.",
  },
  apex: {
    id: "apex",
    name: "Apex",
    meals: 16,
    blurb: "Session peak: large, decorated — and nearly alone.",
    sizeBonus: 0.36,
    respect: "apex",
    herdMates: 1,
    canClaimNest: true,
    canMutate: true,
    unlockSlot: null,
    levelToast: "Apex. One nestmate remains. The tide is yours.",
  },
};

export type LoopBeat = {
  id: ObjectiveId;
  label: string;
  hint: string;
};

export type ObjectiveInput = {
  eaten: number;
  claimedWild: boolean;
  greetedHerd: boolean;
  hasMutated: boolean;
};

export function formAt(eaten: number): FormDef {
  let current = FORMS.hatchling;
  for (const id of FORM_IDS) {
    const form = FORMS[id];
    if (eaten >= form.meals) current = form;
  }
  return current;
}

export function nextForm(eaten: number): FormDef | null {
  const current = formAt(eaten);
  const index = FORM_IDS.indexOf(current.id);
  if (index < 0 || index >= FORM_IDS.length - 1) return null;
  const nextId = FORM_IDS[index + 1];
  return nextId ? FORMS[nextId] : null;
}

export function formProgress(eaten: number): number {
  const upcoming = nextForm(eaten);
  if (!upcoming) return 1;
  const current = formAt(eaten);
  const span = upcoming.meals - current.meals;
  if (span <= 0) return 1;
  return (eaten - current.meals) / span;
}

export function mealsUntilNextForm(eaten: number): number {
  const upcoming = nextForm(eaten);
  if (!upcoming) return 0;
  return upcoming.meals - eaten;
}

export function canClaimNest(eaten: number): boolean {
  return formAt(eaten).canClaimNest;
}

export function canMutate(eaten: number): boolean {
  return formAt(eaten).canMutate;
}

export function playerHerdMates(formId: FormId): number {
  return FORMS[formId].herdMates;
}

/** Wild flocks echo solitude lightly — never as sparse as Apex nestmates. */
export function wildHerdMates(formId: FormId): number {
  switch (formId) {
    case "hatchling":
    case "fledgling":
    case "wanderer":
      return 3;
    case "tideborn":
      return 3;
    case "elder":
    case "apex":
      return 2;
    default:
      return assertNever(formId, "Unknown form");
  }
}

export function herdThinLine(form: FormDef): string {
  switch (form.id) {
    case "apex":
      return "One nestmate remains.";
    case "elder":
      return "The flock thins. Solitude suits an Elder.";
    case "tideborn":
      return "Another nestmate drifted toward the tide.";
    case "wanderer":
    case "fledgling":
      return "A nestmate drifted toward the tide.";
    case "hatchling":
      return "";
    default:
      return assertNever(form.id, "Unknown form");
  }
}

export function respectFor(eaten: number, isHomeHerd: boolean): RespectTier {
  const form = formAt(eaten);
  if (form.respect === "honored" || form.respect === "apex") {
    return form.respect;
  }
  if (isHomeHerd) return "known";
  return "wary";
}

export function currentObjective(input: ObjectiveInput): LoopBeat {
  const upcoming = nextForm(input.eaten);
  const form = formAt(input.eaten);

  if (input.eaten === 0) {
    return {
      id: "eat",
      label: "Find fruit",
      hint: "Walk into the glow",
    };
  }

  if (form.id === "hatchling" && upcoming) {
    return {
      id: "grow",
      label: `Grow to ${upcoming.name}`,
      hint: `${upcoming.meals - input.eaten} more meals`,
    };
  }

  if (!input.claimedWild) {
    return {
      id: "claim",
      label: "Claim a nest",
      hint: "Nestle at a wild hollow",
    };
  }

  if (!input.greetedHerd) {
    return {
      id: "greet",
      label: "Meet the herd",
      hint: "Walk near your flock",
    };
  }

  if (!input.hasMutated && form.canMutate) {
    return {
      id: "mutate",
      label: "Mutate",
      hint: "A reward — try a new shape",
    };
  }

  if (upcoming) {
    return {
      id: "grow",
      label: `Grow to ${upcoming.name}`,
      hint: `${upcoming.meals - input.eaten} more meals`,
    };
  }

  return {
    id: "roam",
    label: "Apex Tideform",
    hint: "Wander, nestle, or mutate",
  };
}

export function hasLesson(seen: readonly LessonId[], id: LessonId): boolean {
  return seen.includes(id);
}

export function withLesson(
  seen: readonly LessonId[],
  id: LessonId,
): LessonId[] {
  if (seen.includes(id)) return [...seen];
  return [...seen, id];
}

export function lessonLine(id: LessonId): string {
  switch (id) {
    case "graze":
      return "Walk toward the glow. Fruit grows you.";
    case "grow":
      return "Keep grazing — new parts unlock as you grow.";
    case "claim":
      return "This hollow can be home. Nestle to claim it.";
    case "herd":
      return "Your flock watches you. Walk close — they copy your morph.";
    case "edit":
      return "Editor is live. Swap parts, or Mutate for a surprise.";
    case "mutate":
      return "Mutate is a reward now — randomize your unlocked parts.";
    case "deep":
      return "The deep hunts the far shore. When it slams, bite — or flee inland.";
    default:
      return assertNever(id, "Unknown lesson");
  }
}

/** Breath the leviathans can take from you. Scales with form, not parts. */
export function formVitality(formId: FormId): number {
  switch (formId) {
    case "hatchling":
    case "fledgling":
      return 3;
    case "wanderer":
    case "tideborn":
      return 4;
    case "elder":
      return 5;
    case "apex":
      return 6;
    default:
      return assertNever(formId, "Unknown form");
  }
}

/** Elder / Apex bite harder — weight, not twitch DPS. */
export function playerBiteDamage(eaten: number): number {
  const form = formAt(eaten);
  switch (form.respect) {
    case "honored":
    case "apex":
      return 2;
    case "wary":
    case "known":
      return 1;
    default:
      return assertNever(form.respect, "Unknown respect");
  }
}

export function formUpToast(form: FormDef): string {
  if (form.unlockSlot) {
    return `${form.name}! ${slotLabel(form.unlockSlot)} unlocked.`;
  }
  return form.levelToast;
}

export function nearestFood(
  x: number,
  z: number,
  foods: readonly FoodBit[],
): Waypoint | null {
  let best: FoodBit | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const food of foods) {
    const dist = Math.hypot(food.x - x, food.z - z);
    if (dist < bestDist) {
      best = food;
      bestDist = dist;
    }
  }
  if (!best) return null;
  return { kind: "food", id: best.id, x: best.x, z: best.z };
}

export function nearestWildNest(
  x: number,
  z: number,
  nests: readonly NestSite[],
  homeNestId: string,
): Waypoint | null {
  let best: NestSite | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const nest of nests) {
    if (nest.id === homeNestId) continue;
    const dist = Math.hypot(nest.x - x, nest.z - z);
    if (dist < bestDist) {
      best = nest;
      bestDist = dist;
    }
  }
  if (!best) return null;
  return { kind: "nest", id: best.id, x: best.x, z: best.z };
}

export function waypointEquals(
  a: Waypoint | null,
  b: Waypoint | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.kind === b.kind && a.id === b.id && a.x === b.x && a.z === b.z;
}

export function bearingTo(
  fromX: number,
  fromZ: number,
  yaw: number,
  toX: number,
  toZ: number,
): number {
  const desired = Math.atan2(toX - fromX, toZ - fromZ);
  let delta = desired - yaw;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}
