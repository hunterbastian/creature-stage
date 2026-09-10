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
    group.current.position.y = 0.56 + Math.sin(t * 1.6) * 0.025;
    group.current.rotation.y = Math.sin(t * 0.35) * 0.12;
  });

  return (
    <group ref={group} position={[x, 0.56, z]} scale={[0.82, 1.12, 0.82]}>
      <mesh castShadow>
        <sphereGeometry args={[0.15, 10, 8]} />
        <meshPhongMaterial color={color} shininess={22} specular="#efe4d0" />
      </mesh>
      <mesh position={[0.045, 0.02, 0.04]}>
        <sphereGeometry args={[0.035, 6, 6]} />
        <meshPhongMaterial color="#f2eadc" shininess={18} specular="#fff6ea" />
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
      x: Math.sin(angle) * 0.22,
      z: Math.cos(angle) * 0.22,
      phase: nest.x + index * 1.7,
    };
  });

  return (
    <group position={[nest.x, 0, nest.z]} rotation={[0, nest.yaw, 0]}>
      <mesh
        position={[0, 0.1, 0]}
        scale={[1.65, 0.3, 1.65]}
        receiveShadow
        castShadow
      >
        <sphereGeometry args={[0.7, 12, 8]} />
        <meshPhongMaterial color="#6a5a40" shininess={6} specular="#a09070" />
      </mesh>
      <mesh
        position={[0, 0.44, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
        receiveShadow
      >
        <torusGeometry args={[0.68, 0.2, 8, 16]} />
        <meshPhongMaterial color={species.weave} shininess={5} specular="#c4b090" />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.36, 0]}
        receiveShadow
      >
        <circleGeometry args={[0.56, 14]} />
        <meshPhongMaterial color="#5a4a34" shininess={4} specular="#8a7a60" />
      </mesh>
      <mesh
        position={[0, 0.6, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <torusGeometry args={[0.78, 0.09, 8, 14]} />
        <meshPhongMaterial
          color={species.moss}
          shininess={4}
          specular="#6a6a50"
          emissive={isHome ? "#8a7a50" : "#000000"}
          emissiveIntensity={isHome ? 0.06 : 0}
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
          <meshPhongMaterial color="#7a5c3e" shininess={4} specular="#a08060" />
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
            <meshPhongMaterial color="#c8c090" shininess={8} specular="#d8d0a8" />
          </mesh>
          <mesh position={[0, 0.52, 0]} castShadow>
            <sphereGeometry args={[0.12, 10, 8]} />
            <meshPhongMaterial
              color="#b8a070"
              emissive="#8a7850"
              emissiveIntensity={0.08}
              shininess={8}
              specular="#a09070"
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
