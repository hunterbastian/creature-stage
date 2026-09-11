"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { AnimLocomotion } from "@/lib/game/anim";
import { findPart } from "@/lib/game/catalog";
import { bodyPlan, hipHeight } from "@/lib/game/creature-look";
import { sim } from "@/lib/game/sim";
import { useGameStore } from "@/lib/game/store";
import type {
  AccessoryId,
  ArmId,
  EquippedParts,
  EyeId,
  MouthId,
  PartId,
  SlotId,
  TailId,
} from "@/lib/game/types";
import { KitNode } from "./SaurianKit";
import { useCreatureAnim } from "./useCreatureAnim";

function tint(slot: SlotId, id: PartId): string {
  return findPart(slot, id).color;
}

function MouthMesh({
  id,
  jaw,
  castShadow,
  mouthRef,
}: {
  id: MouthId;
  jaw: [number, number, number];
  castShadow: boolean;
  mouthRef: MutableRefObject<Group | null>;
}) {
  const color = tint("mouth", id);
  return (
    <group ref={mouthRef} position={jaw}>
      <KitNode
        name={`mouth_${id}`}
        colors={{ skin: color, accent: color }}
        castShadow={castShadow}
      />
    </group>
  );
}

function EyesMesh({
  id,
  eye,
  stalkColor,
  castShadow,
}: {
  id: EyeId;
  eye: { x: number; y: number; z: number };
  stalkColor: string;
  castShadow: boolean;
}) {
  const skin = id === "stalks" ? stalkColor : tint("eyes", id);
  return (
    <>
      {([-1, 1] as const).map((side) => (
        <group
          key={side}
          position={[eye.x * side, eye.y, eye.z]}
          scale={[side, 1, 1]}
        >
          <KitNode
            name={`eyes_${id}`}
            colors={{ skin }}
            castShadow={castShadow}
          />
        </group>
      ))}
    </>
  );
}

function ArmsMesh({
  id,
  arm,
  stance,
  castShadow,
  armRefs,
}: {
  id: ArmId;
  arm: {
    position: [number, number, number];
    rotation: [number, number, number];
  };
  stance: "biped" | "quad";
  castShadow: boolean;
  armRefs: MutableRefObject<(Group | null)[]>;
}) {
  if (id === "none" && stance !== "biped") return null;
  const color = tint("arms", id);
  return (
    <>
      {([-1, 1] as const).map((side, index) => (
        <group
          key={side}
          ref={(node) => {
            armRefs.current[index] = node;
          }}
          position={[
            arm.position[0] * side,
            arm.position[1],
            arm.position[2],
          ]}
          rotation={[
            arm.rotation[0],
            0,
            arm.rotation[2] * side,
          ]}
        >
          <KitNode
            name={`arms_${id}`}
            colors={{ skin: color }}
            castShadow={castShadow}
          />
        </group>
      ))}
    </>
  );
}

function TailMesh({
  id,
  bodyColor,
  tailRoot,
  castShadow,
  tailRef,
}: {
  id: TailId;
  bodyColor: string;
  tailRoot: {
    position: [number, number, number];
    rotation: [number, number, number];
  };
  castShadow: boolean;
  tailRef: MutableRefObject<Group | null>;
}) {
  const color = id === "none" ? bodyColor : tint("tail", id);
  return (
    <group
      ref={tailRef}
      position={tailRoot.position}
      rotation={tailRoot.rotation}
    >
      <KitNode
        name={`tail_${id}`}
        colors={{ skin: bodyColor, accent: color }}
        castShadow={castShadow}
      />
    </group>
  );
}

function AccessoryMesh({
  id,
  position,
  castShadow,
}: {
  id: AccessoryId;
  position: [number, number, number];
  castShadow: boolean;
}) {
  if (id === "none") return null;
  const color = tint("accessory", id);
  return (
    <group position={position}>
      <KitNode
        name={`accessory_${id}`}
        colors={{ skin: color, accent: color }}
        castShadow={castShadow}
      />
    </group>
  );
}

function legSlots(plan: ReturnType<typeof bodyPlan>): {
  name: string;
  x: number;
  z: number;
  fore: boolean;
}[] {
  if (plan.stance === "biped") {
    return [
      { name: "l", x: plan.hip.x, z: plan.hip.z, fore: false },
      { name: "r", x: -plan.hip.x, z: plan.hip.z, fore: false },
    ];
  }
  return [
    { name: "fl", x: plan.shoulder.x, z: plan.shoulder.z, fore: true },
    { name: "fr", x: -plan.shoulder.x, z: plan.shoulder.z, fore: true },
    { name: "bl", x: plan.hip.x, z: plan.hip.z, fore: false },
    { name: "br", x: -plan.hip.x, z: plan.hip.z, fore: false },
  ];
}

export type GaitDriver = AnimLocomotion;

/** Shared saurian mesh + walk/idle/eat pose. World x/z/yaw/scale stay on the parent. */
export function CreatureVisual({
  parts,
  locomotion,
  castShadow = true,
}: {
  parts: EquippedParts;
  locomotion: GaitDriver;
  castShadow?: boolean;
}) {
  const plan = useMemo(() => bodyPlan(parts.body), [parts.body]);
  const hipY = useMemo(() => hipHeight(parts.legs), [parts.legs]);
  const slots = useMemo(() => legSlots(plan), [plan]);
  const { bodyRef, mouthRef, tailRef, armRefs, legRefs } = useCreatureAnim({
    locomotion,
    bodyId: parts.body,
    plan,
    hipY,
    slots,
  });
  const bodyColor = tint("body", parts.body);
  const legColor = tint("legs", parts.legs);

  return (
    <>
      <group ref={bodyRef} position={[0, hipY, 0]} rotation={[plan.pitch, 0, 0]}>
        <KitNode
          name={`chassis_${parts.body}`}
          colors={{ skin: bodyColor }}
          castShadow={castShadow}
        />
        <MouthMesh
          id={parts.mouth}
          jaw={plan.jaw}
          castShadow={castShadow}
          mouthRef={mouthRef}
        />
        <EyesMesh
          id={parts.eyes}
          eye={plan.eye}
          stalkColor={
            parts.eyes === "stalks" ? tint("eyes", parts.eyes) : bodyColor
          }
          castShadow={castShadow}
        />
        <ArmsMesh
          id={parts.arms}
          arm={plan.arm}
          stance={plan.stance}
          castShadow={castShadow}
          armRefs={armRefs}
        />
        <TailMesh
          id={parts.tail}
          bodyColor={bodyColor}
          tailRoot={plan.tailRoot}
          castShadow={castShadow}
          tailRef={tailRef}
        />
        <AccessoryMesh
          id={parts.accessory}
          position={plan.accessory}
          castShadow={castShadow}
        />
      </group>
      {slots.map((leg, index) => (
        <group
          key={leg.name}
          ref={(node) => {
            legRefs.current[index] = node;
          }}
          position={[leg.x, hipY, leg.z]}
          scale={
            leg.fore
              ? [leg.x < 0 ? -1 : 1, 0.9, 0.92]
              : [leg.x < 0 ? -1 : 1, 1, 1]
          }
        >
          <KitNode
            name={`legs_${parts.legs}`}
            colors={{ skin: legColor }}
            castShadow={castShadow}
          />
        </group>
      ))}
    </>
  );
}

export function Creature() {
  const parts = useGameStore((state) => state.parts);
  const root = useRef<Group>(null);

  useFrame(() => {
    const group = root.current;
    if (!group) return;
    // sim.y is collision-settled footing (surfaceHeight + nests/props/lip).
    group.position.set(sim.x, sim.y, sim.z);
    group.rotation.y = sim.yaw;
    const squash = 1 + sim.eatFlash * 0.16 - sim.eatFlash * sim.eatFlash * 0.05;
    const swell = 1 + sim.formFlash * 0.22 + sim.claimFlash * 0.08;
    const flinch = 1 - sim.hurtFlash * 0.14;
    group.scale.setScalar(sim.size * squash * swell * flinch);
  });

  return (
    <group ref={root}>
      <CreatureVisual parts={parts} locomotion={sim} />
    </group>
  );
}
