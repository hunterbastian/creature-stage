"use client";

import { useMemo } from "react";
import { Sky } from "@react-three/drei";
import { WORLD_RADIUS } from "@/lib/game/constants";
import { isCoarsePointer } from "@/lib/game/device";
import { CoastalDress } from "./CoastalDress";

export function World() {
  const coarse = useMemo(() => isCoarsePointer(), []);
  const shadowMap = coarse ? 512 : 1024;

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
        <circleGeometry args={[48, 32]} />
        <meshPhongMaterial color="#3a6e84" shininess={30} specular="#8eb4c0" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.035, 0]}>
        <ringGeometry args={[WORLD_RADIUS + 0.04, WORLD_RADIUS + 0.62, 48]} />
        <meshPhongMaterial color="#c5d0c4" shininess={18} specular="#e0e8dc" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <ringGeometry args={[WORLD_RADIUS - 0.18, WORLD_RADIUS + 1.6, 48]} />
        <meshPhongMaterial color="#c4b48a" shininess={8} specular="#d8c9a4" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} receiveShadow>
        <ringGeometry args={[WORLD_RADIUS - 2.35, WORLD_RADIUS + 0.02, 48]} />
        <meshPhongMaterial color="#c2b080" shininess={12} specular="#d8c9a4" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[WORLD_RADIUS, 48]} />
        <meshPhongMaterial color="#6a8a48" shininess={4} specular="#8a9c64" />
      </mesh>

      <CoastalDress coarse={coarse} />
    </>
  );
}
