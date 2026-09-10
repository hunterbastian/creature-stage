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
    const radius = 3.5 + rand() * (WORLD_RADIUS - 4.5);
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    if (Math.hypot(x, z) < 2.4) continue;
    if (NEST_LAYOUT.some((nest) => Math.hypot(nest.x - x, nest.z - z) < 2.5)) {
      continue;
    }
    clumps.push({
      x,
      z,
      scale: 0.7 + rand() * 0.6,
      rot: rand() * Math.PI * 2,
      color: rand() > 0.55 ? "#5a7a3c" : "#4a6a34",
    });
  }
  return clumps;
}

function MossTuft({ clump }: { clump: Clump }) {
  return (
    <group position={[clump.x, 0, clump.z]} rotation={[0, clump.rot, 0]}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.012, 0]}
        receiveShadow
      >
        <circleGeometry args={[0.16 * clump.scale, 7]} />
        <meshPhongMaterial color={clump.color} shininess={3} specular="#5a6248" />
      </mesh>
      {[0, 0.07, -0.06].map((offset, index) => (
        <mesh
          key={index}
          position={[offset, 0.07 * clump.scale, index * 0.03]}
          castShadow
        >
          <coneGeometry args={[0.035 * clump.scale, 0.14 * clump.scale, 5]} />
          <meshPhongMaterial color={clump.color} shininess={3} specular="#5a6248" />
        </mesh>
      ))}
    </group>
  );
}

function Rock({ clump }: { clump: Clump }) {
  return (
    <mesh
      position={[clump.x, 0.14 * clump.scale, clump.z]}
      rotation={[0.2, clump.rot, 0.1]}
      scale={clump.scale * 0.5}
      castShadow
      receiveShadow
    >
      <dodecahedronGeometry args={[0.45, 0]} />
      <meshPhongMaterial color="#7a7060" shininess={5} specular="#8a8070" />
    </mesh>
  );
}

export function World() {
  const moss = useMemo(() => seededClumps(22, 3), []);
  const rocks = useMemo(() => seededClumps(10, 11), []);
  const shadowMap = useMemo(() => (isCoarsePointer() ? 512 : 1024), []);

  return (
    <>
      <color attach="background" args={["#9bb8c4"]} />
      <fogExp2 attach="fog" args={["#c5d2c8", 0.022]} />
      <Sky
        sunPosition={[16, 6.5, 11]}
        turbidity={9}
        rayleigh={2.1}
        mieCoefficient={0.006}
        mieDirectionalG={0.82}
      />
      <hemisphereLight args={["#f0e2c4", "#5e6e48", 0.78]} />
      <ambientLight color="#ead8b6" intensity={0.4} />
      <directionalLight
        color="#ffd9a8"
        position={[16, 17, 9]}
        intensity={1.12}
        castShadow
        shadow-mapSize-width={shadowMap}
        shadow-mapSize-height={shadowMap}
        shadow-bias={-0.00025}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
      />
      <directionalLight color="#8a908c" position={[-9, 6, -7]} intensity={0.22} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18, 0]}>
        <circleGeometry args={[42, 48]} />
        <meshPhongMaterial color="#3a6e8c" shininess={28} specular="#9ec0cc" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <ringGeometry args={[WORLD_RADIUS - 0.15, WORLD_RADIUS + 1.4, 48]} />
        <meshPhongMaterial color="#cbb48a" shininess={6} specular="#d8c9a4" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[WORLD_RADIUS, 48]} />
        <meshPhongMaterial color="#6b8c4a" shininess={4} specular="#8a9c64" />
      </mesh>

      {moss.map((clump, index) => (
        <MossTuft key={`g-${index}`} clump={clump} />
      ))}
      {rocks.map((clump, index) => (
        <Rock key={`r-${index}`} clump={clump} />
      ))}
    </>
  );
}
