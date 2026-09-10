import { DEFAULT_PARTS, starterLoadout } from "./catalog";
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
    name: "Nestmate",
    nestName: "Home hollow",
    blurb: "Your starting flock — they wear whatever you built.",
    temperament: "curious",
    size: 0.9,
    parts: DEFAULT_PARTS,
    weave: "#ddd2b8",
    moss: "#c8d4b0",
    egg: "#f4ead4",
  },
  tideglider: {
    id: "tideglider",
    name: "Sauropod",
    nestName: "Tide warren",
    blurb: "Shy long-necks that scatter if you rush them.",
    temperament: "timid",
    size: 0.92,
    parts: starterLoadout("plump"),
    weave: "#c5d8d0",
    moss: "#b8d0c4",
    egg: "#e4f0e8",
  },
  brambleback: {
    id: "brambleback",
    name: "Stego",
    nestName: "Bramble croft",
    blurb: "Plucky plated herd. They may trot after you, then lose interest.",
    temperament: "bold",
    size: 1.0,
    parts: starterLoadout("spiky"),
    weave: "#d8cfc4",
    moss: "#c8d4b8",
    egg: "#f0e6d8",
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
