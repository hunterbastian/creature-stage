"use client";

import { useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { TURN_SPEED, WORLD_RADIUS } from "@/lib/game/constants";
import { bindInput, keys } from "@/lib/game/input";
import { sim } from "@/lib/game/sim";
import { useGameStore } from "@/lib/game/store";

/**
 * Owns WASD locomotion and proximity eating. Runs inside the R3F tree so it
 * can hook `useFrame` without rendering anything of its own.
 */
export function GameLoop() {
  useEffect(() => bindInput(), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const turn = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
    sim.yaw += turn * TURN_SPEED * dt;

    const throttle = (keys.forward ? 1 : 0) - (keys.back ? 1 : 0);
    sim.moving = throttle !== 0;

    if (throttle !== 0) {
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

    const reach = sim.bite * sim.size;
    const mouthX = sim.x + Math.sin(sim.yaw) * 0.58 * sim.size;
    const mouthZ = sim.z + Math.cos(sim.yaw) * 0.58 * sim.size;
    const { foods, eat } = useGameStore.getState();
    for (const food of foods) {
      if (Math.hypot(food.x - mouthX, food.z - mouthZ) < reach) {
        eat(food.id);
        break;
      }
    }
  });

  return null;
}
