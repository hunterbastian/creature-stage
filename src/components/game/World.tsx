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

type Puddle = {
  x: number;
  z: number;
  sx: number;
  sz: number;
  rot: number;
};

const PUDDLES: Puddle[] = [
  { x: 1.8, z: -2.2, sx: 3.6, sz: 0.62, rot: 0.18 },
  { x: -5.4, z: 2.6, sx: 2.8, sz: 0.5, rot: -0.42 },
  { x: 6.2, z: 4.1, sx: 2.2, sz: 0.42, rot: 0.7 },
  { x: -2.8, z: -6.4, sx: 3.1, sz: 0.48, rot: -0.15 },
  { x: 8.4, z: -5.2, sx: 2.4, sz: 0.4, rot: 0.35 },
];

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
      color: rand() > 0.55 ? "#4a5238" : "#3d4430",
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

function Scrub({ clump }: { clump: Clump }) {
  const blush = clump.scale > 0.95 ? "#b89078" : "#c4a090";
  return (
    <group position={[clump.x, 0, clump.z]} rotation={[0, clump.rot, 0]}>
      {[-0.04, 0, 0.05].map((x, index) => (
        <mesh
          key={x}
          position={[x, 0.14 * clump.scale, index * 0.02]}
          rotation={[0.15 * (index - 1), 0, 0.2 * (index - 1)]}
          castShadow
        >
          <cylinderGeometry
            args={[0.012, 0.02, 0.28 * clump.scale, 5]}
          />
          <meshPhongMaterial color="#8a7a68" shininess={4} specular="#7a6e5c" />
        </mesh>
      ))}
      {[-0.05, 0.02, 0.06].map((x) => (
        <mesh key={`tip-${x}`} position={[x, 0.28 * clump.scale, 0]} castShadow>
          <sphereGeometry args={[0.035 * clump.scale, 6, 5]} />
          <meshPhongMaterial color={blush} shininess={6} specular="#8a7a6c" />
        </mesh>
      ))}
    </group>
  );
}

function TidePuddle({ puddle }: { puddle: Puddle }) {
  return (
    <group position={[puddle.x, 0.02, puddle.z]} rotation={[0, puddle.rot, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1, 20]} />
        <meshPhongMaterial
          color="#4a5348"
          shininess={3}
          specular="#6a7060"
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.008, 0]}
        scale={[puddle.sx * 0.28, 1, puddle.sz * 1.15]}
      >
        <circleGeometry args={[1, 22]} />
        <meshPhongMaterial
          color="#3a4644"
          shininess={62}
          specular="#9aa8a0"
          transparent
          opacity={0.78}
        />
      </mesh>
    </group>
  );
}

export function World() {
  const moss = useMemo(() => seededClumps(22, 3), []);
  const rocks = useMemo(() => seededClumps(10, 11), []);
  const scrub = useMemo(() => seededClumps(14, 19), []);
  const shadowMap = useMemo(() => (isCoarsePointer() ? 512 : 1024), []);

  return (
    <>
      <color attach="background" args={["#b4aea4"]} />
      <fogExp2 attach="fog" args={["#b8b2a6", 0.028]} />
      <Sky
        sunPosition={[10, 4.2, 8]}
        turbidity={14}
        rayleigh={1.1}
        mieCoefficient={0.008}
        mieDirectionalG={0.7}
      />
      <hemisphereLight args={["#d0c8b8", "#5a5448", 0.62]} />
      <ambientLight color="#c4b8a4" intensity={0.32} />
      <directionalLight
        color="#e6d8c0"
        position={[14, 15, 8]}
        intensity={0.88}
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
        <meshPhongMaterial color="#4a5856" shininess={18} specular="#7a8884" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <ringGeometry args={[WORLD_RADIUS - 0.15, WORLD_RADIUS + 1.4, 48]} />
        <meshPhongMaterial color="#8a7c64" shininess={5} specular="#9a8c74" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[WORLD_RADIUS, 48]} />
        <meshPhongMaterial color="#8a7c62" shininess={4} specular="#7a6e58" />
      </mesh>

      {PUDDLES.map((puddle) => (
        <TidePuddle key={`${puddle.x}-${puddle.z}`} puddle={puddle} />
      ))}
      {moss.map((clump, index) => (
        <MossTuft key={`g-${index}`} clump={clump} />
      ))}
      {rocks.map((clump, index) => (
        <Rock key={`r-${index}`} clump={clump} />
      ))}
      {scrub.map((clump, index) => (
        <Scrub key={`s-${index}`} clump={clump} />
      ))}
    </>
  );
}
