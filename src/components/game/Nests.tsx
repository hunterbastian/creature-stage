"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { speciesDef } from "@/lib/game/species";
import { useGameStore } from "@/lib/game/store";
import type { NestSite } from "@/lib/game/types";

const TWIGS = [
  { x: 0.72, z: 0.18, rot: 0.4, lean: 0.55 },
  { x: -0.64, z: 0.32, rot: 1.1, lean: -0.45 },
  { x: 0.12, z: -0.78, rot: -0.6, lean: 0.7 },
  { x: -0.28, z: 0.74, rot: 2.2, lean: -0.35 },
  { x: 0.58, z: -0.48, rot: -1.4, lean: 0.5 },
] as const;

function Egg({
  x,
  z,
  color,
  phase,
}: {
  x: number;
  z: number;
  color: string;
  phase: number;
}) {
  const group = useRef<Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime + phase;
    group.current.position.y = 0.42 + Math.sin(t * 1.6) * 0.03;
    group.current.rotation.y = Math.sin(t * 0.35) * 0.12;
  });

  return (
    <group ref={group} position={[x, 0.42, z]} scale={[0.78, 1, 0.78]}>
      <mesh castShadow>
        <sphereGeometry args={[0.16, 10, 8]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      <mesh position={[0.04, 0.02, 0.05]} scale={0.35}>
        <sphereGeometry args={[0.08, 6, 6]} />
        <meshStandardMaterial color="#d9b48c" roughness={0.55} />
      </mesh>
    </group>
  );
}

function NestMesh({
  nest,
  isHome,
}: {
  nest: NestSite;
  isHome: boolean;
}) {
  const species = speciesDef(nest.speciesId);
  const eggs = Array.from({ length: nest.eggs }, (_, index) => {
    const angle = (index / nest.eggs) * Math.PI * 2 + 0.4;
    return {
      x: Math.sin(angle) * 0.28,
      z: Math.cos(angle) * 0.28,
      phase: nest.x + index * 1.7,
    };
  });

  return (
    <group position={[nest.x, 0, nest.z]} rotation={[0, nest.yaw, 0]}>
      <mesh
        position={[0, 0.08, 0]}
        scale={[1.55, 0.28, 1.55]}
        receiveShadow
        castShadow
      >
        <sphereGeometry args={[0.7, 12, 8]} />
        <meshStandardMaterial color="#6b5a3e" roughness={1} />
      </mesh>
      <mesh
        position={[0, 0.34, 0]}
        scale={[1.15, 0.55, 1.15]}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[0.72, 14, 10]} />
        <meshStandardMaterial color={species.weave} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.52, 0]} scale={[0.72, 0.22, 0.72]}>
        <sphereGeometry args={[0.7, 12, 8]} />
        <meshStandardMaterial color="#4a3a28" roughness={0.95} />
      </mesh>
      <mesh
        position={[0, 0.58, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <torusGeometry args={[0.72, 0.11, 8, 18]} />
        <meshStandardMaterial
          color={species.moss}
          roughness={0.8}
          emissive={isHome ? "#9be564" : "#000000"}
          emissiveIntensity={isHome ? 0.22 : 0}
        />
      </mesh>
      {TWIGS.map((twig) => (
        <mesh
          key={`${twig.x}-${twig.z}`}
          position={[twig.x, 0.55, twig.z]}
          rotation={[twig.lean, twig.rot, 0.15]}
          castShadow
        >
          <cylinderGeometry args={[0.03, 0.045, 0.55, 5]} />
          <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
        </mesh>
      ))}
      {eggs.map((egg) => (
        <Egg
          key={`${egg.x}-${egg.z}`}
          x={egg.x}
          z={egg.z}
          color={species.egg}
          phase={egg.phase}
        />
      ))}
      {isHome ? (
        <group position={[0.02, 0.92, -0.08]}>
          <mesh position={[0, 0.22, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.04, 0.55, 5]} />
            <meshStandardMaterial color="#d7e8a0" />
          </mesh>
          <mesh position={[0, 0.52, 0]} castShadow>
            <sphereGeometry args={[0.12, 10, 8]} />
            <meshStandardMaterial
              color="#c6ff7a"
              emissive="#8dff6b"
              emissiveIntensity={0.45}
            />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

export function NestField() {
  const nests = useGameStore((state) => state.nests);
  const homeNestId = useGameStore((state) => state.homeNestId);

  return (
    <>
      {nests.map((nest) => (
        <NestMesh
          key={nest.id}
          nest={nest}
          isHome={nest.id === homeNestId}
        />
      ))}
    </>
  );
}
