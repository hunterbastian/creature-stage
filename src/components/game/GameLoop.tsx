"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { TURN_SPEED, WORLD_RADIUS } from "@/lib/game/constants";
import { bindInput, sampleMove, steer } from "@/lib/game/input";
import { sim } from "@/lib/game/sim";
import { useGameStore } from "@/lib/game/store";

function tryEat(reachBoost = 1): void {
  const reach = (sim.bite + 0.65) * sim.size * reachBoost;
  const { foods, eat } = useGameStore.getState();
  for (const food of foods) {
    if (Math.hypot(food.x - sim.x, food.z - sim.z) < reach) {
      eat(food.id);
      return;
    }
  }
}

/**
 * Owns WASD / analog locomotion and proximity eating. Runs inside the R3F
 * tree so it can hook `useFrame` without rendering anything of its own.
 */
export function GameLoop() {
  const eatLatch = useRef(false);

  useEffect(() => bindInput(), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
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

    if (steer.eat) {
      if (!eatLatch.current) tryEat(1.55);
      eatLatch.current = true;
    } else {
      eatLatch.current = false;
    }

    // Body-centered nibble so fruit does not require a pixel-perfect mouth poke.
    tryEat(1);
  });

  return null;
}
