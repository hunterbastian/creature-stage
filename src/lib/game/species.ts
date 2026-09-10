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
    weave: "#b89a72",
    moss: "#6a8648",
    egg: "#ead7b4",
  },
  tideglider: {
    id: "tideglider",
    name: "Sauropod",
    nestName: "Tide warren",
    blurb: "Shy long-necks that scatter if you rush them.",
    temperament: "timid",
    size: 0.92,
    parts: starterLoadout("plump"),
    weave: "#7a9a92",
    moss: "#5a7a58",
    egg: "#c8dcc8",
  },
  brambleback: {
    id: "brambleback",
    name: "Stegosaur",
    nestName: "Bramble croft",
    blurb: "Plucky plated herd. They may trot after you, then lose interest.",
    temperament: "bold",
    size: 1.0,
    parts: starterLoadout("spiky"),
    weave: "#8a746e",
    moss: "#5c7040",
    egg: "#e4d0c4",
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
