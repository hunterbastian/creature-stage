import {
  HERD_DETECT_RADIUS,
  HERD_GRAZE_RADIUS,
  HERD_LOSE_RADIUS,
  HERD_NEST_LEASH,
  HERD_SIZE,
  WORLD_RADIUS,
} from "./constants";
import { respectFor, type RespectTier } from "./progress";
import { SPECIES, speciesDef } from "./species";
import {
  assertNever,
  type EquippedParts,
  type HerdMood,
  type NestSite,
  type SpeciesId,
  type Temperament,
} from "./types";

export type WildlifeAgent = {
  id: string;
  herdId: string;
  nestId: string;
  speciesId: SpeciesId;
  /** When true, the mesh follows the player's current parts (your nestmates). */
  mirrorsPlayer: boolean;
  parts: EquippedParts;
  size: number;
  x: number;
  z: number;
  yaw: number;
  moving: boolean;
  ox: number;
  oz: number;
};

export type HerdBrain = {
  id: string;
  nestId: string;
  speciesId: SpeciesId;
  temperament: Temperament;
  mood: HerdMood;
  targetX: number;
  targetZ: number;
  moodUntil: number;
  parts: EquippedParts;
  size: number;
};

export type MeadowSeed = {
  nests: NestSite[];
  homeNestId: string;
};

type NestAnchor = {
  speciesId: SpeciesId;
  x: number;
  z: number;
  yaw: number;
  eggs: number;
};

export const NEST_LAYOUT: NestAnchor[] = [
  { speciesId: "sporling", x: 0.9, z: 4.35, yaw: 0.35, eggs: 3 },
  { speciesId: "tideglider", x: -8.2, z: -3.4, yaw: 2.05, eggs: 3 },
  { speciesId: "brambleback", x: 7.8, z: -6.6, yaw: -0.72, eggs: 2 },
];

export const fauna = {
  agents: [] as WildlifeAgent[],
  herds: [] as HerdBrain[],
  nests: [] as NestSite[],
};

function clampToIsland(x: number, z: number, margin: number): {
  x: number;
  z: number;
} {
  const radius = Math.hypot(x, z);
  const limit = WORLD_RADIUS - margin;
  if (radius <= limit || radius < 0.001) return { x, z };
  const scale = limit / radius;
  return { x: x * scale, z: z * scale };
}

function wrapAngle(angle: number): number {
  let next = angle;
  while (next > Math.PI) next -= Math.PI * 2;
  while (next < -Math.PI) next += Math.PI * 2;
  return next;
}

function lerpAngle(from: number, to: number, t: number): number {
  return from + wrapAngle(to - from) * t;
}

function moodSpeed(mood: HerdMood): number {
  switch (mood) {
    case "graze":
      return 1.55;
    case "home":
      return 1.9;
    case "curious":
      return 2.35;
    case "chase":
      return 3.35;
    case "flee":
      return 4.55;
    default:
      return assertNever(mood, "Unknown herd mood");
  }
}

function pickOffset(index: number, salt: number): { ox: number; oz: number } {
  const angle = (index / HERD_SIZE) * Math.PI * 2 + salt * 0.7;
  const radius = 0.72 + (index % 2) * 0.22;
  return {
    ox: Math.sin(angle) * radius,
    oz: Math.cos(angle) * radius,
  };
}

function pickGraze(nest: NestSite, leash: number): { x: number; z: number } {
  const angle = Math.random() * Math.PI * 2;
  const radius = 2.6 + Math.random() * Math.max(1.2, leash - 2.6);
  return clampToIsland(
    nest.x + Math.sin(angle) * radius,
    nest.z + Math.cos(angle) * radius,
    1.45,
  );
}

function pickNestRing(nest: NestSite): { x: number; z: number } {
  const angle = Math.random() * Math.PI * 2;
  const radius = 2.35 + Math.random() * 0.7;
  return clampToIsland(
    nest.x + Math.sin(angle) * radius,
    nest.z + Math.cos(angle) * radius,
    1.45,
  );
}

function nestById(nestId: string): NestSite | undefined {
  return fauna.nests.find((nest) => nest.id === nestId);
}

function herdCentroid(herdId: string): { x: number; z: number } {
  let x = 0;
  let z = 0;
  let count = 0;
  for (const agent of fauna.agents) {
    if (agent.herdId !== herdId) continue;
    x += agent.x;
    z += agent.z;
    count += 1;
  }
  if (count === 0) return { x: 0, z: 0 };
  return { x: x / count, z: z / count };
}

function arrived(x: number, z: number, tx: number, tz: number, slack: number): boolean {
  return Math.hypot(tx - x, tz - z) < slack;
}

function temperamentFromRespect(
  herd: HerdBrain,
  respect: RespectTier,
): Temperament {
  switch (respect) {
    case "apex":
    case "honored":
    case "known":
      return "curious";
    case "wary":
      return herd.temperament;
    default:
      return assertNever(respect, "Unknown respect");
  }
}

function standoffFor(respect: RespectTier): number {
  switch (respect) {
    case "apex":
      return 1.4;
    case "honored":
      return 1.85;
    case "known":
      return 2.2;
    case "wary":
      return 2.35;
    default:
      return assertNever(respect, "Unknown respect");
  }
}

function nextMoodForApproach(temperament: Temperament): HerdMood {
  switch (temperament) {
    case "timid":
      return "flee";
    case "curious":
      return "curious";
    case "bold":
      return "chase";
    default:
      return assertNever(temperament, "Unknown temperament");
  }
}

function steerHerd(
  herd: HerdBrain,
  elapsed: number,
  playerX: number,
  playerZ: number,
  homeNestId: string,
  eaten: number,
): void {
  const nest = nestById(herd.nestId);
  if (!nest) return;

  const center = herdCentroid(herd.id);
  const distPlayer = Math.hypot(center.x - playerX, center.z - playerZ);
  const respect = respectFor(eaten, herd.nestId === homeNestId);
  const temperament = temperamentFromRespect(herd, respect);

  if (distPlayer < HERD_DETECT_RADIUS) {
    const mood = nextMoodForApproach(temperament);
    herd.mood = mood;
    herd.moodUntil = elapsed + (mood === "flee" ? 2.4 : 1.8);

    if (mood === "flee") {
      const dx = center.x - playerX;
      const dz = center.z - playerZ;
      const mag = Math.hypot(dx, dz) || 1;
      const away = clampToIsland(
        center.x + (dx / mag) * 6.2 + (nest.x - center.x) * 0.28,
        center.z + (dz / mag) * 6.2 + (nest.z - center.z) * 0.28,
        1.5,
      );
      herd.targetX = away.x;
      herd.targetZ = away.z;
    } else if (mood === "curious") {
      const dx = playerX - center.x;
      const dz = playerZ - center.z;
      const mag = Math.hypot(dx, dz) || 1;
      const standoff = standoffFor(respect);
      herd.targetX = playerX - (dx / mag) * standoff;
      herd.targetZ = playerZ - (dz / mag) * standoff;
    } else {
      herd.targetX = playerX;
      herd.targetZ = playerZ;
    }
    return;
  }

  if (distPlayer > HERD_LOSE_RADIUS && herd.mood !== "graze" && herd.mood !== "home") {
    herd.mood = "graze";
    herd.moodUntil = elapsed + 2.5 + Math.random() * 3;
    const graze = pickGraze(nest, HERD_GRAZE_RADIUS);
    herd.targetX = graze.x;
    herd.targetZ = graze.z;
    return;
  }

  if (elapsed < herd.moodUntil) return;

  if (herd.mood === "home" || Math.random() < 0.22) {
    if (herd.mood === "home" && arrived(center.x, center.z, nest.x, nest.z, 2.4)) {
      herd.mood = "graze";
      herd.moodUntil = elapsed + 3 + Math.random() * 3.5;
      const graze = pickGraze(nest, HERD_GRAZE_RADIUS * 0.7);
      herd.targetX = graze.x;
      herd.targetZ = graze.z;
      return;
    }
    herd.mood = "home";
    herd.moodUntil = elapsed + 3.2;
    const ring = pickNestRing(nest);
    herd.targetX = ring.x;
    herd.targetZ = ring.z;
    return;
  }

  herd.mood = "graze";
  herd.moodUntil = elapsed + 2.8 + Math.random() * 4;
  const graze = pickGraze(nest, HERD_GRAZE_RADIUS);
  herd.targetX = graze.x;
  herd.targetZ = graze.z;
}

function leashToNest(agent: WildlifeAgent, nest: NestSite): void {
  const dist = Math.hypot(agent.x - nest.x, agent.z - nest.z);
  if (dist <= HERD_NEST_LEASH) return;
  const scale = HERD_NEST_LEASH / dist;
  agent.x = nest.x + (agent.x - nest.x) * scale;
  agent.z = nest.z + (agent.z - nest.z) * scale;
}

export function playerSpawnAt(nest: NestSite): { x: number; z: number; yaw: number } {
  const outward = Math.hypot(nest.x, nest.z) || 1;
  const nx = nest.x / outward;
  const nz = nest.z / outward;
  const tx = -nz;
  const tz = nx;
  const spawn = clampToIsland(
    nest.x + nx * 1.35 + tx * 2.35,
    nest.z + nz * 1.35 + tz * 2.35,
    1.3,
  );
  return {
    x: spawn.x,
    z: spawn.z,
    yaw: Math.atan2(tx, tz),
  };
}

export function seedMeadow(): MeadowSeed {
  fauna.agents = [];
  fauna.herds = [];
  fauna.nests = NEST_LAYOUT.map((anchor, index) => {
    const species = SPECIES[anchor.speciesId];
    const nest: NestSite = {
      id: `nest-${index}-${species.id}`,
      speciesId: species.id,
      name: species.nestName,
      x: anchor.x,
      z: anchor.z,
      yaw: anchor.yaw,
      eggs: anchor.eggs,
    };
    return nest;
  });

  for (const nest of fauna.nests) {
    const species = speciesDef(nest.speciesId);
    const herdId = `herd-${nest.id}`;
    const graze = pickGraze(nest, 3.4);
    fauna.herds.push({
      id: herdId,
      nestId: nest.id,
      speciesId: species.id,
      temperament: species.temperament,
      mood: "graze",
      targetX: graze.x,
      targetZ: graze.z,
      moodUntil: 2 + Math.random() * 2,
      parts: species.parts,
      size: species.size,
    });

    for (let i = 0; i < HERD_SIZE; i += 1) {
      const offset = pickOffset(i, nest.x + nest.z);
      const start = clampToIsland(
        nest.x + offset.ox * 3.8,
        nest.z + offset.oz * 3.8,
        1.4,
      );
      fauna.agents.push({
        id: `${herdId}-${i}`,
        herdId,
        nestId: nest.id,
        speciesId: species.id,
        mirrorsPlayer: species.id === "sporling",
        parts: species.parts,
        size: species.size * (0.94 + i * 0.04),
        x: start.x,
        z: start.z,
        yaw: nest.yaw + i * 0.7,
        moving: false,
        ox: offset.ox,
        oz: offset.oz,
      });
    }
  }

  const home = fauna.nests[0];
  return { nests: fauna.nests, homeNestId: home.id };
}

export function tickWildlife(
  dt: number,
  elapsed: number,
  playerX: number,
  playerZ: number,
  homeNestId: string,
  eaten = 0,
): void {
  for (const herd of fauna.herds) {
    steerHerd(herd, elapsed, playerX, playerZ, homeNestId, eaten);
  }

  const byHerd = new Map<string, WildlifeAgent[]>();
  for (const agent of fauna.agents) {
    const list = byHerd.get(agent.herdId);
    if (list) list.push(agent);
    else byHerd.set(agent.herdId, [agent]);
  }

  for (const agent of fauna.agents) {
    const herd = fauna.herds.find((item) => item.id === agent.herdId);
    const nest = nestById(agent.nestId);
    if (!herd || !nest) continue;

    let desiredX = herd.targetX + agent.ox;
    let desiredZ = herd.targetZ + agent.oz;

    const mates = byHerd.get(agent.herdId) ?? [];
    for (const mate of mates) {
      if (mate.id === agent.id) continue;
      const dx = agent.x - mate.x;
      const dz = agent.z - mate.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.02 || dist > 0.95) continue;
      const push = (0.95 - dist) / 0.95;
      desiredX += (dx / dist) * push * 0.85;
      desiredZ += (dz / dist) * push * 0.85;
    }

    const nestDx = agent.x - nest.x;
    const nestDz = agent.z - nest.z;
    const nestDist = Math.hypot(nestDx, nestDz);
    if (nestDist < 1.75 && nestDist > 0.02) {
      desiredX += (nestDx / nestDist) * 1.15;
      desiredZ += (nestDz / nestDist) * 1.15;
    }

    const dx = desiredX - agent.x;
    const dz = desiredZ - agent.z;
    const dist = Math.hypot(dx, dz);
    const speed = moodSpeed(herd.mood);
    if (dist < 0.18) {
      agent.moving = false;
      continue;
    }

    agent.moving = true;
    const step = Math.min(dist, speed * dt);
    agent.x += (dx / dist) * step;
    agent.z += (dz / dist) * step;
    const island = clampToIsland(agent.x, agent.z, 1.2 * agent.size);
    agent.x = island.x;
    agent.z = island.z;
    leashToNest(agent, nest);
    agent.yaw = lerpAngle(agent.yaw, Math.atan2(dx, dz), 1 - Math.exp(-dt * 6));
  }
}

export function homeHerdNear(
  x: number,
  z: number,
  homeNestId: string,
  radius: number,
): boolean {
  return fauna.agents.some(
    (agent) =>
      agent.nestId === homeNestId &&
      Math.hypot(agent.x - x, agent.z - z) < radius,
  );
}

export function nearestHomeHerd(
  x: number,
  z: number,
  homeNestId: string,
): { id: string; x: number; z: number } | null {
  let best: WildlifeAgent | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const agent of fauna.agents) {
    if (agent.nestId !== homeNestId) continue;
    const dist = Math.hypot(agent.x - x, agent.z - z);
    if (dist < bestDist) {
      best = agent;
      bestDist = dist;
    }
  }
  if (!best) return null;
  return { id: best.id, x: best.x, z: best.z };
}

export function nestNear(
  x: number,
  z: number,
  radius: number,
): NestSite | null {
  let best: NestSite | null = null;
  let bestDist = radius;
  for (const nest of fauna.nests) {
    const dist = Math.hypot(nest.x - x, nest.z - z);
    if (dist < bestDist) {
      best = nest;
      bestDist = dist;
    }
  }
  return best;
}
