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
    if (
      NEST_LAYOUT.some((nest) => Math.hypot(nest.x - x, nest.z - z) < 2.5)
    ) {
      continue;
    }
    clumps.push({
      x,
      z,
      scale: 0.7 + rand() * 0.6,
      rot: rand() * Math.PI * 2,
      color: rand() > 0.5 ? "#628444" : "#547038",
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
          <coneGeometry args={[0.045 * clump.scale, 0.2 * clump.scale, 5]} />
          <meshPhongMaterial color={clump.color} shininess={4} specular="#8a9a6a" />
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
      <meshPhongMaterial color="#8a8170" shininess={6} specular="#b0a890" />
    </mesh>
  );
}

function Mushroom({ clump }: { clump: Clump }) {
  return (
    <group position={[clump.x, 0, clump.z]}>
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 0.36, 6]} />
        <meshPhongMaterial color="#e6d3ae" shininess={8} specular="#dcc8a4" />
      </mesh>
      <mesh position={[0, 0.38, 0]} castShadow>
        <sphereGeometry args={[0.16 * clump.scale, 10, 8, 0, Math.PI * 2, 0, 1.3]} />
        <meshPhongMaterial
          color={clump.scale > 0.9 ? "#c46a5c" : "#c9a056"}
          shininess={12}
          specular="#dcc8a4"
        />
      </mesh>
    </group>
  );
}

export function World() {
  const grass = useMemo(() => seededClumps(20, 3), []);
  const rocks = useMemo(() => seededClumps(9, 11), []);
  const shrooms = useMemo(() => seededClumps(6, 19), []);
  const shadowMap = useMemo(() => (isCoarsePointer() ? 512 : 1024), []);

  return (
    <>
      <color attach="background" args={["#9bb8c4"]} />
      <fogExp2 attach="fog" args={["#c5d2c8", 0.024]} />
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
      <directionalLight
        color="#aebcc0"
        position={[-10, 7, -8]}
        intensity={0.32}
      />

      {/* Cheap sun-shaft volume — Skyrim-era godray stand-in. */}
      <mesh
        position={[10, 11, 7]}
        rotation={[0.55, 0.35, 0.08]}
        renderOrder={-1}
      >
        <coneGeometry args={[7.5, 24, 10, 1, true]} />
        <meshBasicMaterial
          color="#f0ddb4"
          transparent
          opacity={0.05}
          depthWrite={false}
        />
      </mesh>

      {/* Surrounding shallows — sells the tiny island read. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18, 0]}>
        <circleGeometry args={[42, 48]} />
        <meshPhongMaterial color="#3a6e8c" shininess={28} specular="#9ec0cc" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <ringGeometry args={[WORLD_RADIUS - 0.15, WORLD_RADIUS + 1.4, 48]} />
        <meshPhongMaterial color="#cbb48a" shininess={6} specular="#d8c9a4" />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[WORLD_RADIUS, 48]} />
        <meshPhongMaterial color="#6b8c4a" shininess={4} specular="#8a9c64" />
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
