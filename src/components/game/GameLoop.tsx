"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  NEST_INTERACT_RADIUS,
  NEST_LINGER_SEC,
} from "@/lib/game/constants";
import { bindInput, sampleMove, steer } from "@/lib/game/input";
import { tickLocomotion } from "@/lib/game/locomotion";
import {
  currentObjective,
  nearestFood,
  nearestWildNest,
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

function liveWaypoint(): Waypoint | null {
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

/**
 * Owns WASD / analog locomotion, proximity eating, nestling, and wildlife.
 * Runs inside the R3F tree so it can hook `useFrame` without rendering.
 */
export function GameLoop() {
  const eatLatch = useRef(false);
  const nestleLatch = useRef(false);
  const linger = useRef(0);
  const lingerDone = useRef(false);
  const graceUntil = useRef(2.5);
  const threatArmed = useRef(false);

  useEffect(() => bindInput(), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    tickFeel(dt);
    const { starterChosen, homeNestId, eaten } = useGameStore.getState();
    if (steer.focusTap) {
      sim.focus = !sim.focus;
      steer.focusTap = false;
    }

    if (!starterChosen) {
      sim.moving = false;
      sim.gait = 0;
      tickWildlife(
        dt,
        state.clock.elapsedTime,
        sim.x,
        sim.z,
        homeNestId,
        eaten,
      );
      return;
    }

    const waypoint = liveWaypoint();
    const { throttle, turn, sprint } = sampleMove();
    tickLocomotion(dt, throttle, turn, sprint, waypoint);

    const threat = chaseThreat(sim.x, sim.z);
    if (threat > 0.48 && !threatArmed.current) {
      pulseEncounter("threat");
      threatArmed.current = true;
    }
    if (threat < 0.12) threatArmed.current = false;
    sim.threat += (threat - sim.threat) * (1 - Math.exp(-dt * 3.1));

    tickWildlife(
      dt,
      state.clock.elapsedTime,
      sim.x,
      sim.z,
      homeNestId,
      eaten,
    );
    syncNearbyNest();
    syncWaypoint(waypoint);
    maybeGreet();

    if (steer.eat) {
      if (!eatLatch.current) {
        if (!tryEat(1.55)) tryNestle();
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
    const pastGrace = state.clock.elapsedTime > graceUntil.current;
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
    tryEat(1);
  });

  return null;
}
