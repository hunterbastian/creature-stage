"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { findPart } from "@/lib/game/catalog";
import {
  BELLY_CREAM,
  CLAW_GREY,
  EYE_GLASS,
  FACE_CREAM,
  SHELL_CREAM,
  bodyPlan,
  hipHeight,
  liftHex,
  shadeHex,
  type BodyPlan,
  type Finish,
  type SpiralSpec,
  type Vec3,
} from "@/lib/game/creature-look";
import { useGameStore } from "@/lib/game/store";
import { sim } from "@/lib/game/sim";
import {
  assertNever,
  type AccessoryId,
  type ArmId,
  type BodyId,
  type EquippedParts,
  type EyeId,
  type LegId,
  type MouthId,
  type PartId,
  type SlotId,
  type TailId,
} from "@/lib/game/types";
import { CreatureMaterial } from "./CreatureMaterial";

function tint(slot: SlotId, id: PartId): string {
  return findPart(slot, id).color;
}

function Ball({
  position,
  rotation,
  scale,
  radius = 0.22,
  color,
  finish = "skin",
  castShadow = true,
  segments = 12,
}: {
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
  radius?: number;
  color: string;
  finish?: Finish;
  castShadow?: boolean;
  segments?: number;
}) {
  return (
    <mesh
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow={castShadow}
    >
      <sphereGeometry args={[radius, segments, Math.max(8, segments - 2)]} />
      <CreatureMaterial color={color} finish={finish} />
    </mesh>
  );
}

function Capsule({
  position,
  rotation,
  scale,
  radius,
  length,
  color,
  finish = "skin",
  castShadow = true,
}: {
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
  radius: number;
  length: number;
  color: string;
  finish?: Finish;
  castShadow?: boolean;
}) {
  return (
    <mesh
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow={castShadow}
    >
      <capsuleGeometry args={[radius, length, 4, 8]} />
      <CreatureMaterial color={color} finish={finish} />
    </mesh>
  );
}

function SpiralShell({
  spec,
  color,
  castShadow,
  facing = "up",
}: {
  spec: SpiralSpec;
  color: string;
  castShadow: boolean;
  facing?: "up" | "side";
}) {
  const torusRot: Vec3 = facing === "up" ? [Math.PI / 2, 0, 0] : [0, Math.PI / 2, 0];
  return (
    <group
      position={spec.position}
      rotation={spec.rotation}
      scale={spec.scale}
    >
      <mesh rotation={torusRot} castShadow={castShadow}>
        <torusGeometry args={[0.078, 0.022, 8, 12]} />
        <CreatureMaterial color={color} finish="plate" />
      </mesh>
      <mesh rotation={torusRot} position={facing === "up" ? [0, 0.006, 0] : [0.006, 0, 0]}>
        <torusGeometry args={[0.048, 0.016, 7, 10]} />
        <CreatureMaterial color={shadeHex(color, 0.06)} finish="plate" />
      </mesh>
      <mesh rotation={torusRot} position={facing === "up" ? [0, 0.01, 0] : [0.01, 0, 0]}>
        <torusGeometry args={[0.024, 0.012, 6, 8]} />
        <CreatureMaterial color={liftHex(color, 0.06)} finish="plate" />
      </mesh>
      <Ball
        position={facing === "up" ? [0, 0.014, 0] : [0.014, 0, 0]}
        radius={0.022}
        color={liftHex(color, 0.1)}
        finish="plate"
        castShadow={castShadow}
        segments={8}
      />
    </group>
  );
}

function SailPlate({
  spec,
  cream,
  castShadow,
}: {
  spec: SpiralSpec;
  cream: string;
  castShadow: boolean;
}) {
  return (
    <group
      position={spec.position}
      rotation={spec.rotation}
      scale={spec.scale}
    >
      <Ball
        scale={[0.1, 3.2, 0.58]}
        radius={0.15}
        color={cream}
        finish="plate"
        castShadow={castShadow}
        segments={10}
      />
      <mesh position={[0, 0.52, 0]} castShadow={castShadow}>
        <coneGeometry args={[0.05, 0.28, 6]} />
        <CreatureMaterial color={cream} finish="plate" />
      </mesh>
      <SpiralShell
        spec={{
          position: [0.032, 0.08, 0],
          rotation: [0, 0, 0],
          scale: 1.18,
        }}
        color={cream}
        castShadow={castShadow}
        facing="side"
      />
    </group>
  );
}

function Crest({
  position,
  castShadow,
}: {
  position: Vec3;
  castShadow: boolean;
}) {
  return (
    <mesh position={position} rotation={[0.2, 0, 0]} castShadow={castShadow}>
      <coneGeometry args={[0.036, 0.11, 6]} />
      <CreatureMaterial color={FACE_CREAM} finish="keratin" />
    </mesh>
  );
}

function FaceSpirals({
  plan,
  castShadow,
}: {
  plan: BodyPlan;
  castShadow: boolean;
}) {
  if (plan.faceSpiralScale <= 0) return null;
  return (
    <>
      {[-1, 1].map((side) => (
        <SpiralShell
          key={side}
          spec={{
            position: [
              plan.eye.x * side * 1.12,
              plan.eye.y + 0.02,
              plan.eye.z - 0.06,
            ],
            rotation: [0.12, side * 1.05, 0.08 * side],
            scale: plan.faceSpiralScale,
          }}
          color={SHELL_CREAM}
          castShadow={castShadow}
        />
      ))}
    </>
  );
}

function Chassis({
  id,
  color,
  castShadow,
}: {
  id: BodyId;
  color: string;
  castShadow: boolean;
}) {
  const plan = bodyPlan(id);
  const faceColor = plan.creamFace ? FACE_CREAM : color;
  return (
    <>
      <Ball
        position={plan.torso.position}
        scale={plan.torso.scale}
        radius={0.38}
        color={color}
        castShadow={castShadow}
        segments={12}
      />
      <Ball
        position={plan.chest.position}
        scale={plan.chest.scale}
        radius={0.36}
        color={color}
        castShadow={castShadow}
        segments={12}
      />
      <Ball
        position={plan.belly.position}
        scale={plan.belly.scale}
        radius={0.34}
        color={BELLY_CREAM}
        castShadow={castShadow}
        segments={12}
      />
      {plan.neckJoints.map((joint) => (
        <Ball
          key={`neck-${joint.position[1]}-${joint.position[2]}`}
          position={joint.position}
          scale={joint.scale}
          radius={0.32}
          color={color}
          castShadow={castShadow}
        />
      ))}
      {plan.neckCream.map((joint) => (
        <Ball
          key={`ncream-${joint.position[1]}-${joint.position[2]}`}
          position={joint.position}
          scale={joint.scale}
          radius={0.3}
          color={BELLY_CREAM}
          castShadow={castShadow}
          segments={10}
        />
      ))}
      <Ball
        position={plan.head.position}
        scale={plan.head.scale}
        radius={0.34}
        color={color}
        castShadow={castShadow}
        segments={12}
      />
      <Ball
        position={plan.face.position}
        scale={plan.face.scale}
        radius={0.28}
        color={faceColor}
        finish={plan.creamFace ? "plate" : "skin"}
        castShadow={castShadow}
        segments={12}
      />
      <Ball
        position={plan.snout.position}
        scale={plan.snout.scale}
        radius={0.22}
        color={faceColor}
        finish={plan.creamFace ? "plate" : "skin"}
        castShadow={castShadow}
        segments={10}
      />
      {plan.crest.map((pos) => (
        <Crest
          key={`crest-${pos[0]}-${pos[1]}-${pos[2]}`}
          position={pos}
          castShadow={castShadow}
        />
      ))}
      <FaceSpirals plan={plan} castShadow={castShadow} />
      {plan.spirals.map((spec) => (
        <SpiralShell
          key={`sp-${spec.position[0]}-${spec.position[2]}-${spec.scale}`}
          spec={spec}
          color={SHELL_CREAM}
          castShadow={castShadow}
        />
      ))}
      {plan.nubs.map((pos) => (
        <Ball
          key={`nub-${pos[0]}-${pos[2]}`}
          position={pos}
          radius={0.09}
          color={SHELL_CREAM}
          finish="plate"
          castShadow={castShadow}
          segments={8}
        />
      ))}
      {plan.sails.map((spec) => (
        <SailPlate
          key={`sail-${spec.position[2]}`}
          spec={spec}
          cream={SHELL_CREAM}
          castShadow={castShadow}
        />
      ))}
    </>
  );
}

function MouthMesh({
  id,
  plan,
  castShadow,
}: {
  id: MouthId;
  plan: BodyPlan;
  castShadow: boolean;
}) {
  const color = tint("mouth", id);
  const [x, y, z] = plan.jaw;

  switch (id) {
    case "beak":
      return (
        <group position={[x, y, z]}>
          <Capsule
            position={[0, -0.012, 0.055]}
            rotation={[Math.PI / 2.02, 0, 0]}
            radius={0.034}
            length={0.1}
            color={shadeHex(SHELL_CREAM, 0.1)}
            finish="keratin"
            castShadow={castShadow}
          />
          <Ball
            position={[0, -0.018, 0.12]}
            scale={[0.72, 0.42, 1.2]}
            radius={0.032}
            color={shadeHex(SHELL_CREAM, 0.16)}
            finish="keratin"
            castShadow={castShadow}
            segments={8}
          />
        </group>
      );
    case "maw":
      return (
        <group position={[x, y, z]}>
          <Ball
            position={[0, 0.02, 0.05]}
            scale={[0.85, 0.42, 1.05]}
            radius={0.09}
            color={FACE_CREAM}
            finish="skin"
            castShadow={castShadow}
          />
          <Ball
            position={[0, -0.03, 0.04]}
            scale={[0.78, 0.32, 0.9]}
            radius={0.075}
            color={shadeHex(FACE_CREAM, 0.04)}
            castShadow={castShadow}
          />
        </group>
      );
    case "sucker":
      return (
        <group position={[x, y, z]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.06]}>
            <torusGeometry args={[0.08, 0.03, 8, 14]} />
            <CreatureMaterial color={color} finish="wet" />
          </mesh>
          <Ball
            position={[0, 0, 0.02]}
            radius={0.06}
            color={liftHex(color, 0.1)}
            finish="wet"
            castShadow={castShadow}
            segments={10}
          />
        </group>
      );
    default:
      return assertNever(id, "Unknown mouth");
  }
}

function EyesMesh({
  id,
  plan,
  stalkColor,
}: {
  id: EyeId;
  plan: BodyPlan;
  stalkColor: string;
}) {
  switch (id) {
    case "beads":
      return (
        <group>
          {[-1, 1].map((side) => (
            <group
              key={side}
              position={[plan.eye.x * side, plan.eye.y, plan.eye.z]}
            >
              <mesh rotation={[0, 0, 0]} position={[0, 0, 0.01]}>
                <torusGeometry args={[0.058, 0.016, 8, 14]} />
                <CreatureMaterial color={SHELL_CREAM} finish="plate" />
              </mesh>
              <Ball
                radius={0.05}
                color={EYE_GLASS}
                finish="wet"
                castShadow={false}
                segments={10}
              />
              <Ball
                position={[0, 0, 0.026]}
                radius={0.024}
                color="#2a3430"
                finish="wet"
                castShadow={false}
                segments={8}
              />
              <Ball
                position={[0.01, 0.012, 0.044]}
                radius={0.01}
                color="#e8f2ee"
                finish="wet"
                castShadow={false}
                segments={8}
              />
            </group>
          ))}
        </group>
      );
    case "stalks":
      return (
        <group>
          {[-1, 1].map((side) => (
            <group
              key={side}
              position={[
                plan.eye.x * side * 0.75,
                plan.eye.y + 0.05,
                plan.eye.z - 0.06,
              ]}
              rotation={[0.25, 0, -0.3 * side]}
            >
              <Capsule
                position={[0, 0.14, 0]}
                radius={0.028}
                length={0.2}
                color={stalkColor}
                castShadow
              />
              <Ball
                position={[0, 0.3, 0.02]}
                radius={0.08}
                color={EYE_GLASS}
                finish="wet"
                segments={10}
              />
              <Ball
                position={[0, 0.3, 0.05]}
                radius={0.035}
                color="#2a241c"
                finish="wet"
                castShadow={false}
                segments={8}
              />
            </group>
          ))}
        </group>
      );
    case "wide":
      return (
        <group>
          {[-1, 1].map((side) => (
            <group
              key={side}
              position={[plan.eye.x * side, plan.eye.y, plan.eye.z]}
            >
              <Ball
                scale={[1.25, 1, 0.7]}
                radius={0.1}
                color={EYE_GLASS}
                finish="wet"
                segments={10}
              />
              <Ball
                position={[0, 0, 0.05]}
                radius={0.045}
                color="#2a241c"
                finish="wet"
                castShadow={false}
                segments={8}
              />
            </group>
          ))}
        </group>
      );
    default:
      return assertNever(id, "Unknown eyes");
  }
}

function ArmsMesh({
  id,
  plan,
  castShadow,
}: {
  id: ArmId;
  plan: BodyPlan;
  castShadow: boolean;
}) {
  const color = id === "none" ? FACE_CREAM : tint("arms", id);

  switch (id) {
    case "none":
      if (plan.stance !== "biped") return null;
      return (
        <group>
          {[-1, 1].map((side) => (
            <group
              key={side}
              position={[
                plan.arm.position[0] * side,
                plan.arm.position[1],
                plan.arm.position[2],
              ]}
              rotation={[
                plan.arm.rotation[0],
                0,
                plan.arm.rotation[2] * side,
              ]}
            >
              <Capsule
                position={[0, -0.1, 0]}
                radius={0.04}
                length={0.12}
                color={color}
                castShadow={castShadow}
              />
              <Ball
                position={[0, -0.2, 0.02]}
                radius={0.045}
                color={FACE_CREAM}
                castShadow={castShadow}
                segments={8}
              />
            </group>
          ))}
        </group>
      );
    case "grabbers":
      return (
        <group>
          {[-1, 1].map((side) => (
            <group
              key={side}
              position={[
                plan.arm.position[0] * side,
                plan.arm.position[1],
                plan.arm.position[2],
              ]}
              rotation={[
                plan.arm.rotation[0] * 0.65,
                0,
                plan.arm.rotation[2] * side * 0.7,
              ]}
            >
              <Capsule
                position={[0, -0.14, 0]}
                radius={0.05}
                length={0.18}
                color={color}
                castShadow={castShadow}
              />
              <Ball
                position={[0, -0.28, 0.02]}
                radius={0.065}
                color={FACE_CREAM}
                castShadow={castShadow}
                segments={8}
              />
              {[-0.04, 0.04].map((offset) => (
                <Ball
                  key={offset}
                  position={[offset, -0.36, 0.04]}
                  radius={0.022}
                  color={CLAW_GREY}
                  finish="keratin"
                  castShadow={castShadow}
                  segments={8}
                />
              ))}
            </group>
          ))}
        </group>
      );
    case "fins":
      return (
        <group>
          {[-1, 1].map((side) => (
            <group
              key={side}
              position={[
                plan.arm.position[0] * side * 1.1,
                plan.arm.position[1],
                plan.arm.position[2],
              ]}
              rotation={[0.1, 0, 0.9 * side]}
            >
              <Ball
                scale={[0.32, 1.1, 0.8]}
                radius={0.15}
                color={color}
                castShadow={castShadow}
              />
            </group>
          ))}
        </group>
      );
    default:
      return assertNever(id, "Unknown arms");
  }
}

function TailMesh({
  id,
  plan,
  bodyColor,
  castShadow,
}: {
  id: TailId;
  plan: BodyPlan;
  bodyColor: string;
  castShadow: boolean;
}) {
  const color = id === "none" ? bodyColor : tint("tail", id);
  const extra = id === "whip" ? 0.2 : 0;

  return (
    <group
      position={plan.tailRoot.position}
      rotation={plan.tailRoot.rotation}
    >
      <Capsule
        position={[0, 0, -plan.tailLength * 0.22]}
        rotation={[Math.PI / 2, 0, 0]}
        radius={0.11}
        length={plan.tailLength * 0.38}
        color={bodyColor}
        castShadow={castShadow}
      />
      <Capsule
        position={[0, -0.03, -plan.tailLength * 0.55]}
        rotation={[Math.PI / 2.08, 0, 0]}
        radius={0.07}
        length={plan.tailLength * 0.34 + extra}
        color={id === "none" ? bodyColor : color}
        castShadow={castShadow}
      />
      <Capsule
        position={[0, -0.06, -plan.tailLength * 0.85]}
        rotation={[Math.PI / 2.04, 0, 0]}
        radius={0.04}
        length={plan.tailLength * 0.24 + extra * 0.4}
        color={id === "none" ? shadeHex(bodyColor, 0.04) : color}
        castShadow={castShadow}
      />
      {plan.sails.length === 0
        ? [0.18, 0.34, 0.5, 0.66, 0.82].map((t) => (
            <Ball
              key={`osteoderm-${t}`}
              position={[0, 0.07 - t * 0.07, -plan.tailLength * t]}
              radius={0.042 * (1 - t * 0.35)}
              color={SHELL_CREAM}
              finish="plate"
              castShadow={castShadow}
              segments={8}
            />
          ))
        : [0.68, 0.78, 0.88, 0.97].map((t) => (
            <mesh
              key={`thorn-${t}`}
              position={[0, 0.06 - t * 0.04, -plan.tailLength * t]}
              rotation={[0.42, 0, 0]}
              castShadow={castShadow}
            >
              <coneGeometry args={[0.03 * (1.15 - t), 0.14 * (1.2 - t), 5]} />
              <CreatureMaterial color={SHELL_CREAM} finish="keratin" />
            </mesh>
          ))}
      {id === "club" ? (
        <Ball
          position={[0, -0.08, -plan.tailLength * 1.02]}
          radius={0.15}
          color={color}
          finish="plate"
          castShadow={castShadow}
        />
      ) : null}
      {id === "fan" ? (
        <group position={[0, 0, -plan.tailLength * 0.92]}>
          {[-0.16, -0.08, 0, 0.08, 0.16].map((x) => (
            <Ball
              key={x}
              position={[x, 0.04, -0.04]}
              scale={[0.28, 0.9, 0.5]}
              radius={0.11}
              color={SHELL_CREAM}
              finish="plate"
              castShadow={castShadow}
              segments={8}
            />
          ))}
        </group>
      ) : null}
      {id === "whip" || id === "none" || id === "club" || id === "fan"
        ? null
        : assertNever(id, "Unknown tail")}
    </group>
  );
}

function AccessoryMesh({
  id,
  plan,
  castShadow,
}: {
  id: AccessoryId;
  plan: BodyPlan;
  castShadow: boolean;
}) {
  switch (id) {
    case "none":
      return null;
    case "spikes":
      return (
        <group>
          {[-0.12, 0, 0.12].map((x, index) => (
            <SpiralShell
              key={x}
              spec={{
                position: [x, 0.54, 0.18 - index * 0.12],
                rotation: [-0.45, 0, 0],
                scale: 0.85,
              }}
              color={SHELL_CREAM}
              castShadow={castShadow}
            />
          ))}
        </group>
      );
    case "frill":
      return (
        <group
          position={[
            plan.head.position[0],
            plan.head.position[1],
            plan.head.position[2] - 0.18,
          ]}
        >
          <mesh rotation={[Math.PI / 2.5, 0, 0]}>
            <torusGeometry args={[0.3, 0.06, 8, 14]} />
            <CreatureMaterial color={SHELL_CREAM} finish="plate" />
          </mesh>
          {[-0.18, 0, 0.18].map((x) => (
            <SpiralShell
              key={x}
              spec={{
                position: [x, 0.14, -0.06],
                rotation: [-0.3, 0, 0],
                scale: 0.7,
              }}
              color={SHELL_CREAM}
              castShadow={castShadow}
            />
          ))}
        </group>
      );
    case "antenna":
      return (
        <group>
          {[-1, 1].map((side) => (
            <group
              key={side}
              position={[plan.brow.x * side, plan.brow.y, plan.brow.z]}
              rotation={[0.1, 0, 0.25 * side]}
            >
              <Capsule
                position={[0, 0.14, 0]}
                radius={0.016}
                length={0.22}
                color={SHELL_CREAM}
                castShadow={castShadow}
              />
              <SpiralShell
                spec={{
                  position: [0, 0.28, 0],
                  rotation: [0, 0, 0],
                  scale: 0.55,
                }}
                color={SHELL_CREAM}
                castShadow={castShadow}
              />
            </group>
          ))}
        </group>
      );
    default:
      return assertNever(id, "Unknown accessory");
  }
}

function DinoLeg({
  id,
  color,
  castShadow,
}: {
  id: LegId;
  color: string;
  castShadow: boolean;
}) {
  switch (id) {
    case "stubby":
      return (
        <group>
          <Capsule
            position={[0, -0.16, 0]}
            radius={0.12}
            length={0.16}
            color={color}
            castShadow={castShadow}
          />
          <Capsule
            position={[0, -0.38, 0.02]}
            radius={0.1}
            length={0.14}
            color={color}
            castShadow={castShadow}
          />
          <Ball
            position={[0, -0.5, 0.08]}
            scale={[1.15, 0.42, 1.4]}
            radius={0.13}
            color={FACE_CREAM}
            finish="keratin"
            castShadow={castShadow}
            segments={10}
          />
          {[-0.06, 0, 0.06].map((x) => (
            <Ball
              key={x}
              position={[x, -0.52, 0.18]}
              radius={0.028}
              color={CLAW_GREY}
              finish="keratin"
              castShadow={castShadow}
              segments={8}
            />
          ))}
        </group>
      );
    case "stilts":
      return (
        <group>
          <Capsule
            position={[0, -0.2, 0.04]}
            rotation={[0.22, 0, 0]}
            radius={0.13}
            length={0.28}
            color={color}
            castShadow={castShadow}
          />
          <Ball
            position={[0, -0.38, 0.08]}
            radius={0.1}
            color={liftHex(color, 0.08)}
            castShadow={castShadow}
            segments={10}
          />
          <Capsule
            position={[0, -0.6, 0.04]}
            rotation={[-0.18, 0, 0]}
            radius={0.08}
            length={0.28}
            color={FACE_CREAM}
            castShadow={castShadow}
          />
          <Ball
            position={[0, -0.82, 0.12]}
            scale={[0.9, 0.38, 1.55]}
            radius={0.13}
            color={FACE_CREAM}
            finish="keratin"
            castShadow={castShadow}
            segments={10}
          />
          {[-0.055, 0, 0.055].map((x) => (
            <Ball
              key={x}
              position={[x, -0.84, 0.24]}
              scale={[0.65, 0.4, 1.25]}
              radius={0.032}
              color={CLAW_GREY}
              finish="keratin"
              castShadow={castShadow}
              segments={8}
            />
          ))}
        </group>
      );
    case "paddles":
      return (
        <group>
          <Capsule
            position={[0, -0.15, 0]}
            radius={0.13}
            length={0.14}
            color={color}
            castShadow={castShadow}
          />
          <Capsule
            position={[0, -0.36, 0.02]}
            radius={0.11}
            length={0.16}
            color={color}
            castShadow={castShadow}
          />
          <Ball
            position={[0, -0.5, 0.1]}
            scale={[1.4, 0.36, 1.65]}
            radius={0.14}
            color={FACE_CREAM}
            castShadow={castShadow}
          />
          {[-0.09, 0, 0.09].map((x) => (
            <Ball
              key={x}
              position={[x, -0.5, 0.22]}
              radius={0.03}
              color={CLAW_GREY}
              finish="keratin"
              castShadow={castShadow}
              segments={8}
            />
          ))}
        </group>
      );
    default:
      return assertNever(id, "Unknown legs");
  }
}

function legSlots(plan: BodyPlan): {
  name: string;
  x: number;
  z: number;
  phase: number;
}[] {
  if (plan.stance === "biped") {
    return [
      { name: "l", x: plan.hip.x, z: plan.hip.z, phase: 0 },
      { name: "r", x: -plan.hip.x, z: plan.hip.z, phase: Math.PI },
    ];
  }
  return [
    { name: "fl", x: plan.shoulder.x, z: plan.shoulder.z, phase: 0 },
    { name: "fr", x: -plan.shoulder.x, z: plan.shoulder.z, phase: Math.PI },
    { name: "bl", x: plan.hip.x, z: plan.hip.z, phase: Math.PI },
    { name: "br", x: -plan.hip.x, z: plan.hip.z, phase: 0 },
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
        <Chassis id={parts.body} color={bodyColor} castShadow={castShadow} />
        <MouthMesh id={parts.mouth} plan={plan} castShadow={castShadow} />
        <EyesMesh
          id={parts.eyes}
          plan={plan}
          stalkColor={
            parts.eyes === "stalks" ? tint("eyes", parts.eyes) : bodyColor
          }
        />
        <ArmsMesh
          id={parts.arms}
          plan={plan}
          castShadow={castShadow}
        />
        <TailMesh
          id={parts.tail}
          plan={plan}
          bodyColor={bodyColor}
          castShadow={castShadow}
        />
        <AccessoryMesh
          id={parts.accessory}
          plan={plan}
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
        >
          <DinoLeg id={parts.legs} color={legColor} castShadow={castShadow} />
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
