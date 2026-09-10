import { SLOT_UNLOCK_AT } from "./constants";
import {
  ACCESSORY_IDS,
  ARM_IDS,
  BODY_IDS,
  EYE_IDS,
  LEG_IDS,
  MOUTH_IDS,
  TAIL_IDS,
  assertNever,
  type AccessoryId,
  type ArmId,
  type BodyId,
  type EquippedParts,
  type EyeId,
  type LegId,
  type MouthId,
  type PartDef,
  type PartId,
  type SlotId,
  type TailId,
} from "./types";

export const PARTS: PartDef[] = [
  {
    id: "plump",
    slot: "body",
    name: "Sauropod",
    blurb: "Long-neck grazer. Four pillar legs, spiral nape.",
    color: "#7a9e90",
    speed: 0,
    bite: 0,
  },
  {
    id: "sleek",
    slot: "body",
    name: "Theropod",
    blurb: "Bipedal hunter. Quick on the cliff.",
    color: "#6a9a8c",
    speed: 0.55,
    bite: 0,
  },
  {
    id: "spiky",
    slot: "body",
    name: "Stegosaur",
    blurb: "Plated walker. Spiral sails along the back.",
    color: "#73988a",
    speed: -0.2,
    bite: 0.12,
  },
  {
    id: "stubby",
    slot: "legs",
    name: "Stubby",
    blurb: "Short saurian walkers. Stable and slow-ish.",
    color: "#c2a07c",
    speed: 0,
    bite: 0,
  },
  {
    id: "stilts",
    slot: "legs",
    name: "Stilts",
    blurb: "Long theropod striders. Noticeably faster.",
    color: "#a08868",
    speed: 1.35,
    bite: 0,
  },
  {
    id: "paddles",
    slot: "legs",
    name: "Paddles",
    blurb: "Wide plantigrade feet. Cute, not swift.",
    color: "#889870",
    speed: -0.35,
    bite: 0,
  },
  {
    id: "beak",
    slot: "mouth",
    name: "Beak",
    blurb: "Keratin snout. A tidy nibble.",
    color: "#d0ae6c",
    speed: 0,
    bite: 0.08,
  },
  {
    id: "maw",
    slot: "mouth",
    name: "Maw",
    blurb: "Saurian jaws. Wider nibble radius.",
    color: "#b48478",
    speed: 0,
    bite: 0.28,
  },
  {
    id: "sucker",
    slot: "mouth",
    name: "Sucker",
    blurb: "Spore siphon on a dino snout. Easiest fruit vacuuming.",
    color: "#c49488",
    speed: -0.12,
    bite: 0.5,
  },
  {
    id: "beads",
    slot: "eyes",
    name: "Beads",
    blurb: "Small inset eyes.",
    color: "#ece4d6",
    speed: 0,
    bite: 0,
  },
  {
    id: "stalks",
    slot: "eyes",
    name: "Stalks",
    blurb: "Spore periscopes on a saurian skull.",
    color: "#9aaa78",
    speed: 0,
    bite: 0,
  },
  {
    id: "wide",
    slot: "eyes",
    name: "Wide",
    blurb: "Large discs with fleshy lids.",
    color: "#7e96a0",
    speed: 0,
    bite: 0,
  },
  {
    id: "none",
    slot: "arms",
    name: "None",
    blurb: "Vestigial nubs on theropods; unused on quads.",
    color: "#8a8680",
    speed: 0,
    bite: 0,
  },
  {
    id: "grabbers",
    slot: "arms",
    name: "Grabbers",
    blurb: "Small theropod hands. Helps a nibble land.",
    color: "#c09878",
    speed: 0,
    bite: 0.1,
  },
  {
    id: "fins",
    slot: "arms",
    name: "Fins",
    blurb: "Modular side paddles. A touch more speed.",
    color: "#6e8e86",
    speed: 0.35,
    bite: 0,
  },
  {
    id: "none",
    slot: "tail",
    name: "None",
    blurb: "Short stock tail only.",
    color: "#8a8680",
    speed: 0,
    bite: 0,
  },
  {
    id: "whip",
    slot: "tail",
    name: "Whip",
    blurb: "Long counterweight for quicker trots.",
    color: "#c49a88",
    speed: 0.25,
    bite: 0,
  },
  {
    id: "club",
    slot: "tail",
    name: "Club",
    blurb: "Bulb tip. Better bite, worse hustle.",
    color: "#b49674",
    speed: -0.15,
    bite: 0.12,
  },
  {
    id: "fan",
    slot: "tail",
    name: "Fan",
    blurb: "Display vanes. Light and lively.",
    color: "#d0a882",
    speed: 0.4,
    bite: 0,
  },
  {
    id: "none",
    slot: "accessory",
    name: "None",
    blurb: "Unadorned chassis.",
    color: "#8a8680",
    speed: 0,
    bite: 0,
  },
  {
    id: "spikes",
    slot: "accessory",
    name: "Spikes",
    blurb: "Soft osteoderm cluster. Bites a hair better.",
    color: "#b09084",
    speed: 0,
    bite: 0.06,
  },
  {
    id: "frill",
    slot: "accessory",
    name: "Frill",
    blurb: "Ceratopsian-style collar, Spore-soft.",
    color: "#c49a82",
    speed: 0.1,
    bite: 0,
  },
  {
    id: "antenna",
    slot: "accessory",
    name: "Antenna",
    blurb: "Feelers from the brow. For the aesthetic.",
    color: "#9aaa76",
    speed: 0.08,
    bite: 0,
  },
];

export const DEFAULT_PARTS: EquippedParts = {
  body: "sleek",
  legs: "stilts",
  mouth: "maw",
  eyes: "beads",
  arms: "none",
  tail: "none",
  accessory: "none",
};

export const STARTER_CHOICES: {
  id: BodyId;
  title: string;
  blurb: string;
}[] = [
  {
    id: "sleek",
    title: "Theropod",
    blurb: "Bipedal hunter. Fast on the rocks.",
  },
  {
    id: "plump",
    title: "Sauropod",
    blurb: "Long-neck grazer. Steady stride.",
  },
  {
    id: "spiky",
    title: "Stegosaur",
    blurb: "Plated walker. Spiral sails.",
  },
];

export function starterLoadout(body: BodyId): EquippedParts {
  switch (body) {
    case "sleek":
      return {
        body: "sleek",
        legs: "stilts",
        mouth: "maw",
        eyes: "beads",
        arms: "none",
        tail: "none",
        accessory: "none",
      };
    case "plump":
      return {
        body: "plump",
        legs: "stubby",
        mouth: "beak",
        eyes: "beads",
        arms: "none",
        tail: "none",
        accessory: "none",
      };
    case "spiky":
      return {
        body: "spiky",
        legs: "stubby",
        mouth: "beak",
        eyes: "beads",
        arms: "none",
        tail: "none",
        accessory: "none",
      };
    default:
      return assertNever(body, "Unknown body");
  }
}

/** First non-empty part to auto-equip when a slot unlocks. */
export const UNLOCK_DEFAULTS: EquippedParts = {
  body: "sleek",
  legs: "stilts",
  mouth: "maw",
  eyes: "beads",
  arms: "grabbers",
  tail: "whip",
  accessory: "spikes",
};

export function partsForSlot(slot: SlotId): PartDef[] {
  return PARTS.filter((part) => part.slot === slot);
}

export function findPart(slot: SlotId, id: PartId): PartDef {
  const found = PARTS.find((part) => part.slot === slot && part.id === id);
  if (!found) {
    throw new Error(`Unknown part ${id} for slot ${slot}`);
  }
  return found;
}

export function slotLabel(slot: SlotId): string {
  switch (slot) {
    case "body":
      return "Body";
    case "legs":
      return "Legs";
    case "mouth":
      return "Mouth";
    case "eyes":
      return "Eyes";
    case "arms":
      return "Arms";
    case "tail":
      return "Tail";
    case "accessory":
      return "Accessory";
    default:
      return assertNever(slot, "Unknown slot");
  }
}

export function idsForSlot(slot: SlotId): readonly PartId[] {
  switch (slot) {
    case "body":
      return BODY_IDS;
    case "legs":
      return LEG_IDS;
    case "mouth":
      return MOUTH_IDS;
    case "eyes":
      return EYE_IDS;
    case "arms":
      return ARM_IDS;
    case "tail":
      return TAIL_IDS;
    case "accessory":
      return ACCESSORY_IDS;
    default:
      return assertNever(slot, "Unknown slot");
  }
}

export function isUnlocked(slot: SlotId, eaten: number): boolean {
  return eaten >= SLOT_UNLOCK_AT[slot];
}

export function nextUnlock(eaten: number): { slot: SlotId; remaining: number } | null {
  const upcoming = (["arms", "tail", "accessory"] as const).find(
    (slot) => eaten < SLOT_UNLOCK_AT[slot],
  );
  if (!upcoming) return null;
  return { slot: upcoming, remaining: SLOT_UNLOCK_AT[upcoming] - eaten };
}

/** 0–1 progress through the current unlock segment (not lifetime meals). */
export function unlockProgress(eaten: number): number {
  const upcoming = nextUnlock(eaten);
  if (!upcoming) return 1;
  const target = SLOT_UNLOCK_AT[upcoming.slot];
  const previous =
    target === SLOT_UNLOCK_AT.arms
      ? 0
      : target === SLOT_UNLOCK_AT.tail
        ? SLOT_UNLOCK_AT.arms
        : SLOT_UNLOCK_AT.tail;
  return (eaten - previous) / (target - previous);
}

export function asEquippedId(slot: SlotId, id: PartId): EquippedParts[SlotId] {
  const allowed = idsForSlot(slot);
  if (!allowed.includes(id)) {
    throw new Error(`Part ${id} does not belong on ${slot}`);
  }
  return id as EquippedParts[SlotId];
}

export function randomizeUnlocked(
  current: EquippedParts,
  eaten: number,
): EquippedParts {
  const next = { ...current };
  const slots: SlotId[] = [
    "body",
    "legs",
    "mouth",
    "eyes",
    "arms",
    "tail",
    "accessory",
  ];
  for (const slot of slots) {
    if (!isUnlocked(slot, eaten)) continue;
    const options = partsForSlot(slot);
    const pick = options[Math.floor(Math.random() * options.length)];
    assignPart(next, slot, pick.id);
  }
  return next;
}

function assignPart(parts: EquippedParts, slot: SlotId, id: PartId): void {
  switch (slot) {
    case "body":
      parts.body = id as BodyId;
      break;
    case "legs":
      parts.legs = id as LegId;
      break;
    case "mouth":
      parts.mouth = id as MouthId;
      break;
    case "eyes":
      parts.eyes = id as EyeId;
      break;
    case "arms":
      parts.arms = id as ArmId;
      break;
    case "tail":
      parts.tail = id as TailId;
      break;
    case "accessory":
      parts.accessory = id as AccessoryId;
      break;
    default:
      assertNever(slot, "Unknown slot");
  }
}
