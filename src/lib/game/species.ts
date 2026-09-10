import { DEFAULT_PARTS } from "./catalog";
import {
  assertNever,
  type EquippedParts,
  type SpeciesId,
  type Temperament,
} from "./types";

export type SpeciesDef = {
  id: SpeciesId;
  name: string;
  nestName: string;
  blurb: string;
  temperament: Temperament;
  size: number;
  parts: EquippedParts;
  weave: string;
  moss: string;
  egg: string;
};

export const SPECIES: Record<SpeciesId, SpeciesDef> = {
  sporling: {
    id: "sporling",
    name: "Sporling",
    nestName: "Home hollow",
    blurb: "Soft meadow kin — your starting flock.",
    temperament: "curious",
    size: 0.9,
    parts: DEFAULT_PARTS,
    weave: "#c4a07a",
    moss: "#6f9a45",
    egg: "#f3e0c8",
  },
  tideglider: {
    id: "tideglider",
    name: "Tideglider",
    nestName: "Tide warren",
    blurb: "Shy sleek flock that skitters if you rush them.",
    temperament: "timid",
    size: 0.84,
    parts: {
      body: "sleek",
      legs: "stilts",
      mouth: "sucker",
      eyes: "stalks",
      arms: "fins",
      tail: "fan",
      accessory: "antenna",
    },
    weave: "#7eb8b0",
    moss: "#4f8f6e",
    egg: "#d7f4e8",
  },
  brambleback: {
    id: "brambleback",
    name: "Brambleback",
    nestName: "Bramble croft",
    blurb: "Plucky thorn herd. They may trot after you, then lose interest.",
    temperament: "bold",
    size: 1.02,
    parts: {
      body: "spiky",
      legs: "paddles",
      mouth: "maw",
      eyes: "wide",
      arms: "grabbers",
      tail: "club",
      accessory: "spikes",
    },
    weave: "#8b6b8f",
    moss: "#5d7a3a",
    egg: "#e6d0f2",
  },
};

export function speciesDef(id: SpeciesId): SpeciesDef {
  return SPECIES[id];
}

export function temperamentLabel(value: Temperament): string {
  switch (value) {
    case "timid":
      return "shy";
    case "curious":
      return "curious";
    case "bold":
      return "plucky";
    default:
      return assertNever(value, "Unknown temperament");
  }
}
