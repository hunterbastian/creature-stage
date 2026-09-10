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

const PUDDLES = [
  { x: 3.4, z: -2.8, sx: 1.55, sz: 0.52 },
  { x: -4.6, z: 1.6, sx: 1.15, sz: 0.42 },
  { x: 5.8, z: 3.4, sx: 0.95, sz: 0.38 },
] as const;

function seededClumps(
  count: number,
  salt: number,
  colors: [string, string],
): Clump[] {
  const clumps: Clump[] = [];
  let seed = (salt * 9301 + 49297) % 233280;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  while (clumps.length < count) {
    const angle = rand() * Math.PI * 2;
    const radius = 2.8 + rand() * (WORLD_RADIUS - 3.8);
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    if (Math.hypot(x, z) < 2.0) continue;
    if (NEST_LAYOUT.some((nest) => Math.hypot(nest.x - x, nest.z - z) < 2.3)) {
      continue;
    }
    if (PUDDLES.some((puddle) => Math.hypot(puddle.x - x, puddle.z - z) < 1.4)) {
      continue;
    }
    clumps.push({
      x,
      z,
      scale: 0.55 + rand() * 0.85,
      rot: rand() * Math.PI * 2,
      color: rand() > 0.5 ? colors[0] : colors[1],
    });
  }
  return clumps;
}

function GrassTuft({ clump }: { clump: Clump }) {
  return (
    <group position={[clump.x, 0, clump.z]} rotation={[0, clump.rot, 0]}>
      {[0, 0.06, -0.05].map((offset, index) => (
        <mesh
          key={index}
          position={[offset, 0.08 * clump.scale, index * 0.025]}
          castShadow
        >
          <coneGeometry args={[0.032 * clump.scale, 0.16 * clump.scale, 5]} />
          <meshPhongMaterial
            color={clump.color}
            shininess={4}
            specular="#8a9c64"
          />
        </mesh>
      ))}
    </group>
  );
}

function CoastalRock({ clump }: { clump: Clump }) {
  return (
    <mesh
      position={[clump.x, 0.1 * clump.scale, clump.z]}
      rotation={[0.18, clump.rot, 0.1]}
      scale={clump.scale * 0.42}
      castShadow
      receiveShadow
    >
      <dodecahedronGeometry args={[0.42, 0]} />
      <meshPhongMaterial
        color={clump.color}
        shininess={6}
        specular="#9a9488"
      />
    </mesh>
  );
}

function Puddle({
  x,
  z,
  sx,
  sz,
}: {
  x: number;
  z: number;
  sx: number;
  sz: number;
}) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0.2]}
      position={[x, 0.012, z]}
      scale={[sx, sz, 1]}
      receiveShadow
    >
      <circleGeometry args={[0.55, 16]} />
      <meshPhongMaterial color="#4a6a68" shininess={36} specular="#9ec4c0" />
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
      <mesh
        position={[0, scale * 0.55, 0]}
        scale={[scale, scale * 1.15, scale * 0.72]}
        castShadow
      >
        <dodecahedronGeometry args={[1.1, 0]} />
        <meshPhongMaterial color="#8a8478" shininess={5} specular="#b0aaa0" />
      </mesh>
      <mesh
        position={[scale * 0.55, scale * 0.34, -scale * 0.2]}
        scale={[scale * 0.55, scale * 0.72, scale * 0.45]}
      >
        <dodecahedronGeometry args={[1, 0]} />
        <meshPhongMaterial color="#7a7468" shininess={4} specular="#a8a298" />
      </mesh>
    </group>
  );
}

export function World() {
  const coarse = useMemo(() => isCoarsePointer(), []);
  const grass = useMemo(
    () => seededClumps(coarse ? 20 : 34, 3, ["#5c7a38", "#6a8a40"]),
    [coarse],
  );
  const rocks = useMemo(
    () => seededClumps(coarse ? 11 : 18, 11, ["#7a7468", "#6a6860"]),
    [coarse],
  );
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
      <color attach="background" args={["#9bb0b8"]} />
      <fogExp2 attach="fog" args={["#c5d0c8", 0.018]} />
      <Sky
        sunPosition={[18, 9.5, 12]}
        turbidity={6.5}
        rayleigh={1.8}
        mieCoefficient={0.0045}
        mieDirectionalG={0.78}
      />
      <hemisphereLight args={["#d8e4ec", "#5a6a40", 0.88]} />
      <ambientLight color="#e4d8bc" intensity={0.42} />
      <directionalLight
        color="#ffd4a0"
        position={[16, 15, 10]}
        intensity={1.18}
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
      <directionalLight color="#8a9aa0" position={[-10, 7, -8]} intensity={0.28} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
        <circleGeometry args={[48, 48]} />
        <meshPhongMaterial color="#3a6e84" shininess={30} specular="#8eb4c0" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <ringGeometry args={[WORLD_RADIUS - 0.18, WORLD_RADIUS + 1.6, 48]} />
        <meshPhongMaterial color="#c4b48a" shininess={8} specular="#d8c9a4" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[WORLD_RADIUS, 48]} />
        <meshPhongMaterial color="#6a8a48" shininess={4} specular="#8a9c64" />
      </mesh>

      {PUDDLES.map((puddle) => (
        <Puddle key={`${puddle.x}-${puddle.z}`} {...puddle} />
      ))}
      {grass.map((clump, index) => (
        <GrassTuft key={`g-${index}`} clump={clump} />
      ))}
      {rocks.map((clump, index) => (
        <CoastalRock key={`r-${index}`} clump={clump} />
      ))}
      {cliffs.map((cliff) => (
        <DistantCliff key={`${cliff.x}-${cliff.z}`} {...cliff} />
      ))}
    </>
  );
}
