"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Object3D } from "three";
import {
  createAnimClock,
  gaitKind,
  saltFromId,
  tickAnim,
  type AnimLocomotion,
} from "@/lib/game/anim";
import type { BodyPlan } from "@/lib/game/creature-look";
import type { BodyId } from "@/lib/game/types";

export type AnimLegSlot = {
  name: string;
  x: number;
  z: number;
  fore: boolean;
};

function bindJaw(
  mouth: Group | null,
  jaw: { current: Object3D | null },
  rest: { current: number },
): void {
  if (!mouth) {
    jaw.current = null;
    return;
  }
  if (jaw.current?.parent) return;
  const hits: Object3D[] = [];
  mouth.traverse((node) => {
    if (hits.length > 0 || node === mouth) return;
    const tag = node.name.toLowerCase();
    if (tag.includes("_lower") || tag.includes("_pad")) hits.push(node);
  });
  const found = hits[0] ?? null;
  jaw.current = found;
  rest.current = found?.rotation.x ?? 0;
}

/**
 * Applies `tickAnim` poses onto kit groups. Math stays in `anim.ts` so
 * locomotion/sim files do not grow a second walk solver.
 */
export function useCreatureAnim({
  locomotion,
  bodyId,
  plan,
  hipY,
  slots,
}: {
  locomotion: AnimLocomotion;
  bodyId: BodyId;
  plan: BodyPlan;
  hipY: number;
  slots: AnimLegSlot[];
}) {
  const bodyRef = useRef<Group>(null);
  const mouthRef = useRef<Group>(null);
  const tailRef = useRef<Group>(null);
  const armRefs = useRef<(Group | null)[]>([null, null]);
  const legRefs = useRef<(Group | null)[]>([]);
  const jawNode = useRef<Object3D | null>(null);
  const jawRest = useRef(0);
  const clock = useRef(createAnimClock(saltFromId(locomotion.id)));
  const kind = gaitKind(bodyId);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const pose = tickAnim(
      clock.current,
      dt,
      state.clock.elapsedTime,
      locomotion,
      kind,
    );

    const body = bodyRef.current;
    if (body) {
      body.position.y = hipY + pose.bodyY;
      body.rotation.x = plan.pitch + pose.bodyPitch;
      body.rotation.y = pose.bodySway;
      body.rotation.z = pose.bodyRoll;
    }

    const mouth = mouthRef.current;
    bindJaw(mouth, jawNode, jawRest);
    if (mouth) {
      mouth.rotation.x = pose.neckPitch * 0.4;
    }
    if (jawNode.current) {
      jawNode.current.rotation.x = jawRest.current + pose.jaw;
    }

    const tail = tailRef.current;
    if (tail) {
      tail.rotation.x = plan.tailRoot.rotation[0] + pose.tailPitch;
      tail.rotation.y = plan.tailRoot.rotation[1] + pose.tailYaw;
      tail.rotation.z = plan.tailRoot.rotation[2];
    }

    const armRest = plan.arm.rotation;
    const left = armRefs.current[0];
    const right = armRefs.current[1];
    if (left) {
      left.rotation.x = armRest[0] + pose.armSwing;
      left.rotation.z = armRest[2] * -1;
    }
    if (right) {
      right.rotation.x = armRest[0] - pose.armSwing;
      right.rotation.z = armRest[2];
    }

    for (let i = 0; i < slots.length; i += 1) {
      const leg = legRefs.current[i];
      if (!leg) continue;
      const slot = slots[i];
      const limb = pose.legs[i];
      if (!slot || !limb) continue;
      leg.position.y = hipY + limb.lift;
      leg.rotation.x = limb.swing;
      leg.rotation.z = limb.roll * Math.sign(slot.x || 1);
    }
  });

  return { bodyRef, mouthRef, tailRef, armRefs, legRefs };
}
