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
    weave: "#8a7a58",
    moss: "#4a5238",
    egg: "#c4b496",
  },
  tideglider: {
    id: "tideglider",
    name: "Sauropod",
    nestName: "Tide warren",
    blurb: "Shy long-necks that scatter if you rush them.",
    temperament: "timid",
    size: 0.92,
    parts: starterLoadout("plump"),
    weave: "#6e6a54",
    moss: "#3d4430",
    egg: "#b8ad90",
  },
  brambleback: {
    id: "brambleback",
    name: "Stegosaur",
    nestName: "Bramble croft",
    blurb: "Plucky plated herd. They may trot after you, then lose interest.",
    temperament: "bold",
    size: 1.0,
    parts: starterLoadout("spiky"),
    weave: "#7a6858",
    moss: "#4a4430",
    egg: "#c4a090",
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
