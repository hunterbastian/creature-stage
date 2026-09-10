"use client";

import { useMemo } from "react";
import { Sky } from "@react-three/drei";
import { WORLD_RADIUS } from "@/lib/game/constants";

type Clump = {
  x: number;
  z: number;
  scale: number;
  rot: number;
  color: string;
};

function seededClumps(count: number, salt: number): Clump[] {
  const clumps: Clump[] = [];
  // Simple LCG so decor is stable across hot reloads in a session.
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
    clumps.push({
      x,
      z,
      scale: 0.7 + rand() * 0.6,
      rot: rand() * Math.PI * 2,
      color: rand() > 0.5 ? "#6d8f3e" : "#507a32",
    });
  }
  return clumps;
}

function GrassTuft({ clump }: { clump: Clump }) {
  return (
    <group position={[clump.x, 0, clump.z]} rotation={[0, clump.rot, 0]}>
      {[0, 0.08, -0.07].map((offset, index) => (
        <mesh
          key={index}
          position={[offset, 0.1 * clump.scale, index * 0.03]}
          castShadow
        >
          <coneGeometry args={[0.045 * clump.scale, 0.2 * clump.scale, 4]} />
          <meshStandardMaterial color={clump.color} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Rock({ clump }: { clump: Clump }) {
  return (
    <mesh
      position={[clump.x, 0.16 * clump.scale, clump.z]}
      rotation={[0.2, clump.rot, 0.1]}
      scale={clump.scale * 0.55}
      castShadow
      receiveShadow
    >
      <dodecahedronGeometry args={[0.45, 0]} />
      <meshStandardMaterial color="#8d8678" roughness={1} />
    </mesh>
  );
}

function Mushroom({ clump }: { clump: Clump }) {
  return (
    <group position={[clump.x, 0, clump.z]}>
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 0.36, 6]} />
        <meshStandardMaterial color="#f3e6c8" />
      </mesh>
      <mesh position={[0, 0.38, 0]} castShadow>
        <sphereGeometry args={[0.16 * clump.scale, 10, 8, 0, Math.PI * 2, 0, 1.3]} />
        <meshStandardMaterial
          color={clump.scale > 0.9 ? "#e85d5d" : "#d9a441"}
          roughness={0.55}
        />
      </mesh>
    </group>
  );
}

export function World() {
  const grass = useMemo(() => seededClumps(20, 3), []);
  const rocks = useMemo(() => seededClumps(9, 11), []);
  const shrooms = useMemo(() => seededClumps(6, 19), []);

  return (
    <>
      <color attach="background" args={["#8ec5e8"]} />
      <fog attach="fog" args={["#b7d4ee", 22, 52]} />
      <Sky
        sunPosition={[18, 8, 12]}
        turbidity={6}
        rayleigh={1.4}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
      <hemisphereLight args={["#fff1d6", "#3d6b3a", 0.85]} />
      <ambientLight intensity={0.28} />
      <directionalLight
        position={[14, 18, 8]}
        intensity={1.55}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
      />

      {/* Surrounding shallows — sells the tiny island read. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18, 0]}>
        <circleGeometry args={[42, 48]} />
        <meshStandardMaterial color="#3d7ea6" roughness={0.35} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <ringGeometry args={[WORLD_RADIUS - 0.15, WORLD_RADIUS + 1.4, 64]} />
        <meshStandardMaterial color="#d7c18a" roughness={0.9} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[WORLD_RADIUS, 64]} />
        <meshStandardMaterial color="#7cae4a" roughness={0.92} />
      </mesh>

      {grass.map((clump, index) => (
        <GrassTuft key={`g-${index}`} clump={clump} />
      ))}
      {rocks.map((clump, index) => (
        <Rock key={`r-${index}`} clump={clump} />
      ))}
      {shrooms.map((clump, index) => (
        <Mushroom key={`m-${index}`} clump={clump} />
      ))}
    </>
  );
}
