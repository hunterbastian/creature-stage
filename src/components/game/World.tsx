"use client";

import { useMemo } from "react";
import { Sky } from "@react-three/drei";
import { WORLD_RADIUS } from "@/lib/game/constants";
import { isCoarsePointer } from "@/lib/game/device";
import { NEST_LAYOUT } from "@/lib/game/wildlife";

type Clump = {
  x: number;
  z: number;
  scale: number;
  rot: number;
  color: string;
};

function seededClumps(count: number, salt: number): Clump[] {
  const clumps: Clump[] = [];
  let seed = (salt * 9301 + 49297) % 233280;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  while (clumps.length < count) {
    const angle = rand() * Math.PI * 2;
    const radius = 3.2 + rand() * (WORLD_RADIUS - 4.2);
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    if (Math.hypot(x, z) < 2.2) continue;
    if (NEST_LAYOUT.some((nest) => Math.hypot(nest.x - x, nest.z - z) < 2.4)) {
      continue;
    }
    clumps.push({
      x,
      z,
      scale: 0.45 + rand() * 0.7,
      rot: rand() * Math.PI * 2,
      color: rand() > 0.5 ? "#efe6d2" : "#e8dcc4",
    });
  }
  return clumps;
}

function Pebble({ clump }: { clump: Clump }) {
  return (
    <mesh
      position={[clump.x, 0.03 * clump.scale, clump.z]}
      rotation={[0.15, clump.rot, 0.08]}
      scale={clump.scale * 0.28}
      castShadow
      receiveShadow
    >
      <dodecahedronGeometry args={[0.28, 0]} />
      <meshPhongMaterial
        color={clump.color}
        shininess={10}
        specular="#f4eee0"
      />
    </mesh>
  );
}

function DistantCliff({
  x,
  z,
  scale,
  rot,
}: {
  x: number;
  z: number;
  scale: number;
  rot: number;
}) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, scale * 0.55, 0]} scale={[scale, scale * 1.1, scale * 0.7]} castShadow>
        <dodecahedronGeometry args={[1.1, 0]} />
        <meshPhongMaterial color="#d8d2c4" shininess={6} specular="#eee8dc" />
      </mesh>
      <mesh
        position={[scale * 0.55, scale * 0.32, -scale * 0.2]}
        scale={[scale * 0.55, scale * 0.7, scale * 0.45]}
      >
        <dodecahedronGeometry args={[1, 0]} />
        <meshPhongMaterial color="#cfc8ba" shininess={5} specular="#e8e2d6" />
      </mesh>
    </group>
  );
}

export function World() {
  const pebbles = useMemo(() => seededClumps(26, 7), []);
  const shadowMap = useMemo(() => (isCoarsePointer() ? 512 : 1024), []);
  const cliffs = useMemo(
    () =>
      [
        { x: 24, z: -10, scale: 4.4, rot: 0.4 },
        { x: 20, z: 18, scale: 3.6, rot: -0.55 },
        { x: -22, z: 16, scale: 4.0, rot: 0.9 },
        { x: -18, z: -20, scale: 3.2, rot: -0.2 },
      ] as const,
    [],
  );

  return (
    <>
      <color attach="background" args={["#d6e8f2"]} />
      <fogExp2 attach="fog" args={["#e6f0f6", 0.012]} />
      <Sky
        sunPosition={[10, 22, 8]}
        turbidity={2.8}
        rayleigh={1.15}
        mieCoefficient={0.0024}
        mieDirectionalG={0.68}
      />
      <hemisphereLight args={["#eef6fb", "#f0e4c4", 1.05]} />
      <ambientLight color="#fff8ee" intensity={0.68} />
      <directionalLight
        color="#fff6e4"
        position={[12, 24, 9]}
        intensity={1.42}
        castShadow
        shadow-mapSize-width={shadowMap}
        shadow-mapSize-height={shadowMap}
        shadow-bias={-0.0002}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
      />
      <directionalLight color="#c5e0ec" position={[-14, 10, -8]} intensity={0.48} />
      <directionalLight color="#f2e4c0" position={[1, 2.4, 10]} intensity={0.32} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
        <circleGeometry args={[48, 48]} />
        <meshPhongMaterial color="#4fb3c8" shininess={52} specular="#dff6fa" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <ringGeometry args={[WORLD_RADIUS - 0.2, WORLD_RADIUS + 2.1, 48]} />
        <meshPhongMaterial color="#e8d4a8" shininess={14} specular="#f4e8c8" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[WORLD_RADIUS, 48]} />
        <meshPhongMaterial color="#efe6cc" shininess={8} specular="#f8f0dc" />
      </mesh>

      {pebbles.map((clump, index) => (
        <Pebble key={`p-${index}`} clump={clump} />
      ))}
      {cliffs.map((cliff) => (
        <DistantCliff key={`${cliff.x}-${cliff.z}`} {...cliff} />
      ))}
    </>
  );
}
