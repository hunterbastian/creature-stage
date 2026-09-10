"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { sim } from "@/lib/game/sim";

const desired = new Vector3();
const focus = new Vector3();

/** Third-person chase cam: sits behind the creature and looks at its torso. */
export function CameraRig() {
  const { camera } = useThree();
  const initialized = useRef(false);

  useFrame((_, delta) => {
    const back = 4.15 + sim.size * 1.15;
    const height = 1.72 + sim.size * 0.52;
    const side = 1.55 + sim.size * 0.2;
    desired.set(
      sim.x - Math.sin(sim.yaw) * back + Math.cos(sim.yaw) * side,
      height,
      sim.z - Math.cos(sim.yaw) * back - Math.sin(sim.yaw) * side,
    );
    focus.set(
      sim.x + Math.sin(sim.yaw) * 0.55,
      0.72 * sim.size,
      sim.z + Math.cos(sim.yaw) * 0.55,
    );

    if (!initialized.current) {
      camera.position.copy(desired);
      camera.lookAt(focus);
      initialized.current = true;
      return;
    }

    const follow = 1 - Math.exp(-delta * 4.2);
    camera.position.lerp(desired, follow);
    camera.lookAt(focus);
  });

  return null;
}
