export const SLOT_IDS = [
  "body",
  "legs",
  "mouth",
  "eyes",
  "arms",
  "tail",
  "accessory",
] as const;

export type SlotId = (typeof SLOT_IDS)[number];

export const BODY_IDS = ["plump", "sleek", "spiky"] as const;
export const LEG_IDS = ["stubby", "stilts", "paddles"] as const;
export const MOUTH_IDS = ["beak", "maw", "sucker"] as const;
export const EYE_IDS = ["beads", "stalks", "wide"] as const;
export const ARM_IDS = ["none", "grabbers", "fins"] as const;
export const TAIL_IDS = ["none", "whip", "club", "fan"] as const;
export const ACCESSORY_IDS = ["none", "spikes", "frill", "antenna"] as const;

export type BodyId = (typeof BODY_IDS)[number];
export type LegId = (typeof LEG_IDS)[number];
export type MouthId = (typeof MOUTH_IDS)[number];
export type EyeId = (typeof EYE_IDS)[number];
export type ArmId = (typeof ARM_IDS)[number];
export type TailId = (typeof TAIL_IDS)[number];
export type AccessoryId = (typeof ACCESSORY_IDS)[number];

export type PartId =
  | BodyId
  | LegId
  | MouthId
  | EyeId
  | ArmId
  | TailId
  | AccessoryId;

export type EquippedParts = {
  body: BodyId;
  legs: LegId;
  mouth: MouthId;
  eyes: EyeId;
  arms: ArmId;
  tail: TailId;
  accessory: AccessoryId;
};

export type PartDef = {
  id: PartId;
  slot: SlotId;
  name: string;
  blurb: string;
  color: string;
  /** Additive walk speed. */
  speed: number;
  /** Additive mouth reach for eating. */
  bite: number;
};

export type FoodKind = "berry" | "plumpfruit" | "sporepod";

export type FoodBit = {
  id: string;
  kind: FoodKind;
  x: number;
  z: number;
};

export type DerivedStats = {
  speed: number;
  bite: number;
  size: number;
};

export function assertNever(value: never, message: string): never {
  throw new Error(`${message}: ${String(value)}`);
}
