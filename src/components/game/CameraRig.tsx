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
    const back = 6.4 + sim.size * 1.8;
    const height = 3.2 + sim.size * 1.05;
    desired.set(
      sim.x - Math.sin(sim.yaw) * back,
      height,
      sim.z - Math.cos(sim.yaw) * back,
    );
    focus.set(sim.x, 0.75 * sim.size, sim.z);

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
