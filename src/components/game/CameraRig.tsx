"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { CAMERA_FOLLOW, CAMERA_LOOK } from "@/lib/game/constants";
import { sim } from "@/lib/game/sim";

const desired = new Vector3();
const lookDesired = new Vector3();
const look = new Vector3();
const shake = new Vector3();

/** Third-person chase cam: heavy follow, damped look, punch on hits. */
export function CameraRig() {
  const { camera } = useThree();
  const initialized = useRef(false);

  useFrame((state, delta) => {
    const settle = sim.formFlash;
    const kick = sim.camKick;
    const claim = sim.claimFlash;
    const back =
      5.55 +
      sim.size * 1.28 +
      settle * 1.55 +
      kick * 0.28 -
      claim * 0.22;
    const height = 1.12 + sim.size * 0.2 + settle * 0.35;
    const side = 3.55 + sim.size * 0.36;
    desired.set(
      sim.x - Math.sin(sim.yaw) * back - Math.cos(sim.yaw) * side,
      height,
      sim.z - Math.cos(sim.yaw) * back + Math.sin(sim.yaw) * side,
    );
    lookDesired.set(
      sim.x + Math.sin(sim.yaw) * 0.42,
      0.58 * sim.size,
      sim.z + Math.cos(sim.yaw) * 0.42,
    );
    if (sim.focus && sim.hasFocusTarget) {
      lookDesired.x += (sim.focusX - lookDesired.x) * 0.22;
      lookDesired.z += (sim.focusZ - lookDesired.z) * 0.22;
    }

    const t = state.clock.elapsedTime;
    const rumble = kick * 0.055 + sim.threat * 0.04;
    shake.set(
      Math.sin(t * 31) * rumble,
      Math.cos(t * 27) * rumble * 0.65,
      Math.sin(t * 19) * rumble * 0.4,
    );
    desired.add(shake);

    if (!initialized.current) {
      camera.position.copy(desired);
      look.copy(lookDesired);
      camera.lookAt(look);
      initialized.current = true;
      return;
    }

    const follow = 1 - Math.exp(-delta * CAMERA_FOLLOW);
    const glance = 1 - Math.exp(-delta * CAMERA_LOOK);
    camera.position.lerp(desired, follow);
    look.lerp(lookDesired, glance);
    camera.lookAt(look);
  });

  return null;
}
