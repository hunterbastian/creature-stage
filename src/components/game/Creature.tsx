"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
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

function tint(slot: SlotId, id: PartId): string {
  return findPart(slot, id).color;
}

function MouthMesh({
  id,
  jaw,
  castShadow,
}: {
  id: MouthId;
  jaw: [number, number, number];
  castShadow: boolean;
}) {
  const color = tint("mouth", id);
  return (
    <group position={jaw}>
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
}: {
  id: ArmId;
  arm: {
    position: [number, number, number];
    rotation: [number, number, number];
  };
  stance: "biped" | "quad";
  castShadow: boolean;
}) {
  if (id === "none" && stance !== "biped") return null;
  const color = tint("arms", id);
  return (
    <>
      {([-1, 1] as const).map((side) => (
        <group
          key={side}
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
}: {
  id: TailId;
  bodyColor: string;
  tailRoot: {
    position: [number, number, number];
    rotation: [number, number, number];
  };
  castShadow: boolean;
}) {
  const color = id === "none" ? bodyColor : tint("tail", id);
  return (
    <group position={tailRoot.position} rotation={tailRoot.rotation}>
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
  phase: number;
  fore: boolean;
}[] {
  if (plan.stance === "biped") {
    return [
      { name: "l", x: plan.hip.x, z: plan.hip.z, phase: 0, fore: false },
      { name: "r", x: -plan.hip.x, z: plan.hip.z, phase: Math.PI, fore: false },
    ];
  }
  return [
    { name: "fl", x: plan.shoulder.x, z: plan.shoulder.z, phase: 0, fore: true },
    {
      name: "fr",
      x: -plan.shoulder.x,
      z: plan.shoulder.z,
      phase: Math.PI,
      fore: true,
    },
    { name: "bl", x: plan.hip.x, z: plan.hip.z, phase: Math.PI, fore: false },
    { name: "br", x: -plan.hip.x, z: plan.hip.z, phase: 0, fore: false },
  ];
}

export type GaitDriver = {
  moving: boolean;
  /** 0–1 stride intensity. Heavier forms walk slower when omitted. */
  gait?: number;
};

/** Shared saurian mesh + walk cycle. Pose (x/z/yaw/scale) belongs on the parent. */
export function CreatureVisual({
  parts,
  locomotion,
  castShadow = true,
}: {
  parts: EquippedParts;
  locomotion: GaitDriver;
  castShadow?: boolean;
}) {
  const body = useRef<Group>(null);
  const legRefs = useRef<(Group | null)[]>([]);
  const plan = useMemo(() => bodyPlan(parts.body), [parts.body]);
  const hipY = useMemo(() => hipHeight(parts.legs), [parts.legs]);
  const slots = useMemo(() => legSlots(plan), [plan]);
  const bodyColor = tint("body", parts.body);
  const legColor = tint("legs", parts.legs);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const gait = locomotion.gait ?? (locomotion.moving ? 1 : 0);
    const moving = gait > 0.05;
    const tempo = (plan.stance === "biped" ? 6.4 : 5.5) * (0.62 + 0.38 * gait);
    const swing = moving
      ? (plan.stance === "biped" ? 0.52 : 0.36) * (0.72 + 0.28 * gait)
      : 0;
    if (body.current) {
      body.current.position.y = moving
        ? Math.abs(Math.sin(t * tempo)) * (0.026 + gait * 0.028)
        : Math.sin(t * 1.35) * 0.01;
    }
    for (let i = 0; i < slots.length; i += 1) {
      const leg = legRefs.current[i];
      if (!leg) continue;
      leg.rotation.x = moving
        ? Math.sin(t * tempo + slots[i].phase) * swing
        : 0;
    }
  });

  return (
    <>
      <group ref={body} position={[0, hipY, 0]} rotation={[plan.pitch, 0, 0]}>
        <KitNode
          name={`chassis_${parts.body}`}
          colors={{ skin: bodyColor }}
          castShadow={castShadow}
        />
        <MouthMesh id={parts.mouth} jaw={plan.jaw} castShadow={castShadow} />
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
        />
        <TailMesh
          id={parts.tail}
          bodyColor={bodyColor}
          tailRoot={plan.tailRoot}
          castShadow={castShadow}
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
    group.position.set(sim.x, 0, sim.z);
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
