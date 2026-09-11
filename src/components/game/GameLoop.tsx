"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { groundHeight } from "@/lib/game/collision";
import {
  NEST_INTERACT_RADIUS,
  NEST_LINGER_SEC,
} from "@/lib/game/constants";
import { bindInput, sampleMove, steer } from "@/lib/game/input";
import { tickLocomotion } from "@/lib/game/locomotion";
import {
  forceTideRetreat,
  nearbyTide,
  stageShoreHunt,
  tickTide,
  tideBiteTarget,
  tideThreat,
  tideWaypoint,
  woundTide,
} from "@/lib/game/offshore-ai";
import {
  currentObjective,
  nearestFood,
  nearestWildNest,
  playerBiteDamage,
  type Waypoint,
} from "@/lib/game/progress";
import { pulseEncounter, sim, tickFeel } from "@/lib/game/sim";
import { speciesDef } from "@/lib/game/species";
import { useGameStore } from "@/lib/game/store";
import { assertNever } from "@/lib/game/types";
import {
  chaseThreat,
  homeHerdNear,
  nearestHomeHerd,
  NEST_LAYOUT,
  nestNear,
  tickWildlife,
} from "@/lib/game/wildlife";

function tryEat(reachBoost = 1): boolean {
  const reach = (sim.bite + 0.65) * sim.size * reachBoost;
  const { foods, eat } = useGameStore.getState();
  for (const food of foods) {
    if (Math.hypot(food.x - sim.x, food.z - sim.z) < reach) {
      eat(food.id);
      return true;
    }
  }
  return false;
}

function tryBite(elapsed: number, reachBoost = 1): boolean {
  if (sim.biteLock > 0) return false;
  const reach = (sim.bite + 1.05) * sim.size * reachBoost;
  const target = tideBiteTarget(sim.x, sim.z, reach);
  if (!target) return false;
  const { eaten, harvestDeep } = useGameStore.getState();
  const killed = woundTide(target.spec.id, playerBiteDamage(eaten), elapsed);
  sim.biteLock = 0.58;
  sim.eatFlash = 1;
  if (killed) {
    harvestDeep(target.spec.name);
    return true;
  }
  pulseEncounter("greet");
  return true;
}

function tryNestle(): boolean {
  const nest = nestNear(sim.x, sim.z, NEST_INTERACT_RADIUS);
  if (!nest) return false;
  useGameStore.getState().nestle(nest.id);
  return true;
}

function syncNearbyNest(): void {
  const nest = nestNear(sim.x, sim.z, NEST_INTERACT_RADIUS);
  const { homeNestId, setNearbyNest } = useGameStore.getState();
  if (!nest) {
    setNearbyNest(null);
    return;
  }
  const species = speciesDef(nest.speciesId);
  setNearbyNest({
    id: nest.id,
    name: nest.name,
    speciesName: species.name,
    isHome: nest.id === homeNestId,
    temperament:
      nest.id === homeNestId ? "curious" : species.temperament,
  });
}

function syncNearbyThreat(): void {
  const near = nearbyTide(sim.x, sim.z);
  useGameStore.getState().setNearbyThreat(
    near
      ? { id: near.id, name: near.name, canBite: near.canBite }
      : null,
  );
}

function liveWaypoint(): Waypoint | null {
  const beast = tideWaypoint(sim.x, sim.z);
  if (beast) {
    return { kind: "beast", id: beast.id, x: beast.x, z: beast.z };
  }

  const state = useGameStore.getState();
  const beat = currentObjective({
    eaten: state.eaten,
    claimedWild: state.claimedWild,
    greetedHerd: state.greetedHerd,
    hasMutated: state.hasMutated,
  });

  let next: Waypoint | null = null;
  switch (beat.id) {
    case "eat":
    case "grow":
      next = nearestFood(sim.x, sim.z, state.foods);
      break;
    case "claim":
      next = nearestWildNest(sim.x, sim.z, state.nests, state.homeNestId);
      break;
    case "greet": {
      const herd = nearestHomeHerd(sim.x, sim.z, state.homeNestId);
      next = herd
        ? { kind: "herd", id: herd.id, x: herd.x, z: herd.z }
        : null;
      break;
    }
    case "mutate":
    case "roam":
      next = null;
      break;
    default:
      assertNever(beat.id, "Unknown objective");
  }
  return next;
}

function syncWaypoint(next: Waypoint | null): void {
  useGameStore.getState().setWaypoint(next);
}

function maybeGreet(): void {
  const { claimedWild, greetedHerd, homeNestId, greetHerd } =
    useGameStore.getState();
  if (!claimedWild || greetedHerd) return;
  if (homeHerdNear(sim.x, sim.z, homeNestId, 3.4)) greetHerd();
}

function handleTideEvents(
  events: ReturnType<typeof tickTide>,
  elapsed: number,
): void {
  const { noticeDeep, applyWound } = useGameStore.getState();
  for (const event of events) {
    switch (event.kind) {
      case "notice":
        noticeDeep(event.name);
        break;
      case "strike":
        if (event.hit) {
          const result = applyWound(event.damage, event.name);
          if (result === "down") forceTideRetreat(elapsed);
        }
        break;
      case "down":
        break;
      default:
        assertNever(event, "Unknown tide event");
    }
  }
}

/**
 * Owns WASD / analog locomotion, proximity eating, nestling, wildlife,
 * and the one active offshore threat.
 * Runs inside the R3F tree so it can hook `useFrame` without rendering.
 */
export function GameLoop() {
  const eatLatch = useRef(false);
  const nestleLatch = useRef(false);
  const linger = useRef(0);
  const lingerDone = useRef(false);
  const graceUntil = useRef(2.5);
  const threatArmed = useRef(false);
  const huntStaged = useRef(false);
  const nestLookStaged = useRef(false);

  useEffect(() => bindInput(), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const elapsed = state.clock.elapsedTime;
    tickFeel(dt);
    const { starterChosen, homeNestId, eaten } = useGameStore.getState();
    if (steer.focusTap) {
      sim.focus = !sim.focus;
      steer.focusTap = false;
    }

    if (!starterChosen) {
      sim.moving = false;
      sim.gait = 0;
      tickWildlife(dt, elapsed, sim.x, sim.z, homeNestId, eaten);
      tickTide(dt, elapsed, sim.x, sim.z, false);
      return;
    }

    if (!huntStaged.current && window.location.hash === "#hunt") {
      stageShoreHunt();
      sim.x = 0;
      sim.z = 14.85;
      sim.y = groundHeight(0, 14.85);
      sim.yaw = 0;
      sim.vx = 0;
      sim.vy = 0;
      sim.vz = 0;
      huntStaged.current = true;
    }

    if (!nestLookStaged.current) {
      const nestIndex =
        window.location.hash === "#hollow" || window.location.hash === "#home"
          ? 0
          : window.location.hash === "#warren"
            ? 1
            : window.location.hash === "#croft"
              ? 2
              : -1;
      if (nestIndex >= 0) {
        const nest = NEST_LAYOUT[nestIndex];
        // Per-nest yaw keeps the chase cam off nearby groves.
        sim.x = nest.x;
        sim.z = nest.z;
        sim.y = groundHeight(sim.x, sim.z);
        sim.yaw = nestIndex === 1 ? Math.PI : 0;
        sim.vx = 0;
        sim.vy = 0;
        sim.vz = 0;
      }
      nestLookStaged.current = true;
    }

    const waypoint = liveWaypoint();
    const { throttle, turn, sprint } = sampleMove();
    tickLocomotion(dt, throttle, turn, sprint, waypoint);

    const events = tickTide(dt, elapsed, sim.x, sim.z, true);
    handleTideEvents(events, elapsed);

    const threat = Math.max(chaseThreat(sim.x, sim.z), tideThreat(sim.x, sim.z));
    if (threat > 0.48 && !threatArmed.current) {
      pulseEncounter("threat");
      threatArmed.current = true;
    }
    if (threat < 0.12) threatArmed.current = false;
    sim.threat += (threat - sim.threat) * (1 - Math.exp(-dt * 3.1));

    tickWildlife(dt, elapsed, sim.x, sim.z, homeNestId, eaten);
    syncNearbyNest();
    syncNearbyThreat();
    sim.shoreThreat = nearbyTide(sim.x, sim.z) ? 1 : 0;
    syncWaypoint(waypoint);
    maybeGreet();

    if (steer.eat) {
      if (!eatLatch.current) {
        if (!tryEat(1.55) && !tryBite(elapsed, 1.55)) tryNestle();
      }
      eatLatch.current = true;
    } else {
      eatLatch.current = false;
    }

    if (steer.nestle) {
      if (!nestleLatch.current) tryNestle();
      nestleLatch.current = true;
    } else {
      nestleLatch.current = false;
    }

    const nest = nestNear(sim.x, sim.z, NEST_INTERACT_RADIUS);
    const pastGrace = elapsed > graceUntil.current;
    if (!nest) {
      linger.current = 0;
      lingerDone.current = false;
    } else if (!sim.moving && pastGrace) {
      linger.current += dt;
      if (linger.current >= NEST_LINGER_SEC && !lingerDone.current) {
        tryNestle();
        lingerDone.current = true;
      }
    } else {
      linger.current = 0;
    }

    // Body-centered nibble so fruit does not require a pixel-perfect mouth poke.
    if (!tryEat(1)) tryBite(elapsed, 1);
  });

  return null;
}
