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
    const back = 3.7 + sim.size * 1.0;
    const height = 1.12 + sim.size * 0.34;
    const side = 2.45 + sim.size * 0.28;
    desired.set(
      sim.x - Math.sin(sim.yaw) * back + Math.cos(sim.yaw) * side,
      height,
      sim.z - Math.cos(sim.yaw) * back - Math.sin(sim.yaw) * side,
    );
    focus.set(
      sim.x + Math.sin(sim.yaw) * 0.7,
      0.58 * sim.size,
      sim.z + Math.cos(sim.yaw) * 0.7,
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
