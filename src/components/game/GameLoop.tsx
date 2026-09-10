"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  NEST_INTERACT_RADIUS,
  NEST_LINGER_SEC,
  TURN_SPEED,
  WORLD_RADIUS,
} from "@/lib/game/constants";
import { bindInput, sampleMove, steer } from "@/lib/game/input";
import { sim } from "@/lib/game/sim";
import { speciesDef } from "@/lib/game/species";
import { useGameStore } from "@/lib/game/store";
import { nestNear, tickWildlife } from "@/lib/game/wildlife";

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

  useEffect(() => bindInput(), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const { starterChosen, homeNestId } = useGameStore.getState();
    if (!starterChosen) {
      sim.moving = false;
      tickWildlife(dt, state.clock.elapsedTime, sim.x, sim.z, homeNestId);
      return;
    }

    const { throttle, turn } = sampleMove();
    sim.yaw += turn * TURN_SPEED * dt;
    sim.moving = Math.abs(throttle) > 0.04;

    if (sim.moving) {
      const dist = throttle * sim.speed * dt;
      sim.x += Math.sin(sim.yaw) * dist;
      sim.z += Math.cos(sim.yaw) * dist;

      const limit = WORLD_RADIUS - 1.15 * sim.size;
      const radius = Math.hypot(sim.x, sim.z);
      if (radius > limit) {
        const scale = limit / radius;
        sim.x *= scale;
        sim.z *= scale;
      }
    }

    tickWildlife(dt, state.clock.elapsedTime, sim.x, sim.z, homeNestId);
    syncNearbyNest();

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
