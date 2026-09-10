"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import { useGameStore } from "@/lib/game/store";
import { sim } from "@/lib/game/sim";
import {
  assertNever,
  type AccessoryId,
  type ArmId,
  type BodyId,
  type EyeId,
  type LegId,
  type MouthId,
  type TailId,
} from "@/lib/game/types";

const LEG_LAYOUT = [
  { name: "fl", x: 0.28, z: 0.22, phase: 0 },
  { name: "fr", x: -0.28, z: 0.22, phase: Math.PI },
  { name: "bl", x: 0.28, z: -0.22, phase: Math.PI },
  { name: "br", x: -0.28, z: -0.22, phase: 0 },
] as const;

function BodyMesh({ id }: { id: BodyId }) {
  switch (id) {
    case "plump":
      return (
        <mesh position={[0, 0.82, 0]} castShadow>
          <sphereGeometry args={[0.56, 18, 14]} />
          <meshStandardMaterial color="#e39b6c" roughness={0.48} />
        </mesh>
      );
    case "sleek":
      return (
        <mesh position={[0, 0.78, 0.04]} scale={[0.72, 0.82, 1.15]} castShadow>
          <sphereGeometry args={[0.52, 16, 12]} />
          <meshStandardMaterial color="#4ecdc4" roughness={0.4} />
        </mesh>
      );
    case "spiky":
      return (
        <mesh position={[0, 0.84, 0]} castShadow>
          <icosahedronGeometry args={[0.58, 0]} />
          <meshStandardMaterial
            color="#9b72cf"
            roughness={0.55}
            flatShading
          />
        </mesh>
      );
    default:
      return assertNever(id, "Unknown body");
  }
}

function LegMesh({ id }: { id: LegId }) {
  switch (id) {
    case "stubby":
      return (
        <mesh position={[0, -0.22, 0]} castShadow>
          <cylinderGeometry args={[0.11, 0.13, 0.46, 8]} />
          <meshStandardMaterial color="#c97c5d" roughness={0.7} />
        </mesh>
      );
    case "stilts":
      return (
        <mesh position={[0, -0.38, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, 0.82, 7]} />
          <meshStandardMaterial color="#7d5a44" roughness={0.7} />
        </mesh>
      );
    case "paddles":
      return (
        <mesh position={[0, -0.2, 0]} castShadow>
          <boxGeometry args={[0.2, 0.38, 0.1]} />
          <meshStandardMaterial color="#5b8c5a" roughness={0.65} />
        </mesh>
      );
    default:
      return assertNever(id, "Unknown legs");
  }
}

function MouthMesh({ id }: { id: MouthId }) {
  switch (id) {
    case "beak":
      return (
        <mesh
          position={[0, 0.72, 0.58]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <coneGeometry args={[0.16, 0.34, 8]} />
          <meshStandardMaterial color="#f2c14e" roughness={0.45} />
        </mesh>
      );
    case "maw":
      return (
        <group position={[0, 0.7, 0.55]}>
          <mesh castShadow>
            <boxGeometry args={[0.38, 0.2, 0.3]} />
            <meshStandardMaterial color="#c44536" roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.02, 0.06]}>
            <boxGeometry args={[0.3, 0.06, 0.22]} />
            <meshStandardMaterial color="#2b1414" />
          </mesh>
        </group>
      );
    case "sucker":
      return (
        <group position={[0, 0.7, 0.58]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.16, 0.055, 8, 14]} />
            <meshStandardMaterial color="#ff7b9c" roughness={0.35} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.11, 12, 10]} />
            <meshStandardMaterial color="#ff9db6" roughness={0.3} />
          </mesh>
        </group>
      );
    default:
      return assertNever(id, "Unknown mouth");
  }
}

function EyesMesh({ id }: { id: EyeId }) {
  switch (id) {
    case "beads":
      return (
        <group>
          {[-1, 1].map((side) => (
            <group key={side} position={[0.2 * side, 1.02, 0.38]}>
              <mesh>
                <sphereGeometry args={[0.09, 10, 8]} />
                <meshStandardMaterial color="#f4efe6" />
              </mesh>
              <mesh position={[0, 0, 0.055]}>
                <sphereGeometry args={[0.045, 8, 8]} />
                <meshStandardMaterial color="#1b1b1b" />
              </mesh>
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
              position={[0.22 * side, 1.05, 0.22]}
              rotation={[0.35, 0, -0.25 * side]}
            >
              <mesh position={[0, 0.16, 0]} castShadow>
                <cylinderGeometry args={[0.035, 0.045, 0.34, 6]} />
                <meshStandardMaterial color="#d7f27a" />
              </mesh>
              <mesh position={[0, 0.36, 0.02]}>
                <sphereGeometry args={[0.1, 10, 8]} />
                <meshStandardMaterial color="#f7fff0" />
              </mesh>
              <mesh position={[0, 0.36, 0.08]}>
                <sphereGeometry args={[0.045, 8, 8]} />
                <meshStandardMaterial color="#142814" />
              </mesh>
            </group>
          ))}
        </group>
      );
    case "wide":
      return (
        <group>
          {[-1, 1].map((side) => (
            <group key={side} position={[0.24 * side, 1.0, 0.4]}>
              <mesh scale={[1.15, 1, 0.7]}>
                <sphereGeometry args={[0.14, 12, 10]} />
                <meshStandardMaterial color="#74c0e8" />
              </mesh>
              <mesh position={[0, 0, 0.08]}>
                <sphereGeometry args={[0.06, 8, 8]} />
                <meshStandardMaterial color="#102030" />
              </mesh>
            </group>
          ))}
        </group>
      );
    default:
      return assertNever(id, "Unknown eyes");
  }
}

function ArmsMesh({ id }: { id: ArmId }) {
  switch (id) {
    case "none":
      return null;
    case "grabbers":
      return (
        <group>
          {[-1, 1].map((side) => (
            <group
              key={side}
              position={[0.52 * side, 0.78, 0.05]}
              rotation={[0.2, 0, 0.55 * side]}
            >
              <mesh position={[0, -0.16, 0]} castShadow>
                <cylinderGeometry args={[0.05, 0.07, 0.34, 6]} />
                <meshStandardMaterial color="#d9896a" />
              </mesh>
              <mesh position={[0, -0.34, 0.04]} rotation={[0.6, 0, 0]} castShadow>
                <coneGeometry args={[0.07, 0.16, 5]} />
                <meshStandardMaterial color="#c44536" />
              </mesh>
            </group>
          ))}
        </group>
      );
    case "fins":
      return (
        <group>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[0.58 * side, 0.78, 0]}
              rotation={[0.1, 0, 0.9 * side]}
              castShadow
            >
              <boxGeometry args={[0.08, 0.28, 0.22]} />
              <meshStandardMaterial color="#3d9ea0" roughness={0.4} />
            </mesh>
          ))}
        </group>
      );
    default:
      return assertNever(id, "Unknown arms");
  }
}

function TailMesh({ id }: { id: TailId }) {
  switch (id) {
    case "none":
      return null;
    case "whip":
      return (
        <mesh
          position={[0, 0.7, -0.62]}
          rotation={[-0.9, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.03, 0.08, 0.7, 6]} />
          <meshStandardMaterial color="#c96b8c" />
        </mesh>
      );
    case "club":
      return (
        <group position={[0, 0.68, -0.55]}>
          <mesh rotation={[-0.75, 0, 0]} position={[0, 0, -0.18]} castShadow>
            <cylinderGeometry args={[0.05, 0.09, 0.46, 6]} />
            <meshStandardMaterial color="#8d6e4e" />
          </mesh>
          <mesh position={[0, -0.12, -0.42]} castShadow>
            <sphereGeometry args={[0.14, 10, 8]} />
            <meshStandardMaterial color="#6f5340" />
          </mesh>
        </group>
      );
    case "fan":
      return (
        <mesh
          position={[0, 0.78, -0.55]}
          rotation={[Math.PI / 2.4, 0, 0]}
          castShadow
        >
          <coneGeometry args={[0.32, 0.18, 8]} />
          <meshStandardMaterial color="#f0a868" roughness={0.5} />
        </mesh>
      );
    default:
      return assertNever(id, "Unknown tail");
  }
}

function AccessoryMesh({ id }: { id: AccessoryId }) {
  switch (id) {
    case "none":
      return null;
    case "spikes":
      return (
        <group>
          {[-0.18, 0, 0.18].map((x, index) => (
            <mesh
              key={x}
              position={[x, 1.28, -0.08 * (index - 1)]}
              rotation={[0.15, 0, 0]}
              castShadow
            >
              <coneGeometry args={[0.07, 0.28, 5]} />
              <meshStandardMaterial color="#b565d9" flatShading />
            </mesh>
          ))}
        </group>
      );
    case "frill":
      return (
        <mesh position={[0, 0.95, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.42, 0.07, 8, 18]} />
          <meshStandardMaterial color="#ff8fab" roughness={0.45} />
        </mesh>
      );
    case "antenna":
      return (
        <group>
          {[-1, 1].map((side) => (
            <group
              key={side}
              position={[0.12 * side, 1.28, 0.05]}
              rotation={[0.15, 0, 0.35 * side]}
            >
              <mesh position={[0, 0.16, 0]}>
                <cylinderGeometry args={[0.02, 0.03, 0.34, 5]} />
                <meshStandardMaterial color="#9be564" />
              </mesh>
              <mesh position={[0, 0.34, 0]}>
                <sphereGeometry args={[0.05, 8, 8]} />
                <meshStandardMaterial
                  color="#d7ff8a"
                  emissive="#7cff6b"
                  emissiveIntensity={0.35}
                />
              </mesh>
            </group>
          ))}
        </group>
      );
    default:
      return assertNever(id, "Unknown accessory");
  }
}

export function Creature() {
  const parts = useGameStore((state) => state.parts);
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const legRefs = useRef<(Mesh | Group | null)[]>([]);

  const legHeight = useMemo(() => {
    switch (parts.legs) {
      case "stubby":
        return 0.46;
      case "stilts":
        return 0.78;
      case "paddles":
        return 0.4;
      default:
        return assertNever(parts.legs, "Unknown legs");
    }
  }, [parts.legs]);

  useFrame((state) => {
    const group = root.current;
    if (!group) return;
    group.position.set(sim.x, 0, sim.z);
    group.rotation.y = sim.yaw;
    group.scale.setScalar(sim.size);

    const t = state.clock.elapsedTime;
    const swing = sim.moving ? Math.sin(t * 10) * 0.5 : 0;
    if (body.current) {
      body.current.position.y = sim.moving ? Math.abs(Math.sin(t * 10)) * 0.05 : 0;
    }
    for (let i = 0; i < LEG_LAYOUT.length; i += 1) {
      const leg = legRefs.current[i];
      if (!leg) continue;
      const phase = LEG_LAYOUT[i].phase;
      leg.rotation.x = sim.moving ? Math.sin(t * 10 + phase) * 0.55 : swing * 0.05;
    }
  });

  return (
    <group ref={root}>
      <group ref={body}>
        <BodyMesh id={parts.body} />
        <MouthMesh id={parts.mouth} />
        <EyesMesh id={parts.eyes} />
        <ArmsMesh id={parts.arms} />
        <TailMesh id={parts.tail} />
        <AccessoryMesh id={parts.accessory} />
      </group>
      {LEG_LAYOUT.map((leg, index) => (
        <group
          key={leg.name}
          ref={(node) => {
            legRefs.current[index] = node;
          }}
          position={[leg.x, legHeight * 0.55, leg.z]}
        >
          <LegMesh id={parts.legs} />
        </group>
      ))}
    </group>
  );
}
