"use client";

import { useEffect, useMemo } from "react";
import { Sky } from "@react-three/drei";
import { WATER_Y } from "@/lib/game/collision";
import { WORLD_RADIUS } from "@/lib/game/constants";
import { isCoarsePointer } from "@/lib/game/device";
import { createIslandGeometry } from "@/lib/game/island-mesh";
import { OFFSHORE_LANE_INNER, OCEAN_RADIUS } from "@/lib/game/offshore";
import { CoastalDress } from "./CoastalDress";

function IslandMesh({ coarse }: { coarse: boolean }) {
  const geometry = useMemo(
    () => createIslandGeometry(coarse ? 20 : 28, coarse ? 48 : 64),
    [coarse],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshPhongMaterial
        vertexColors
        shininess={6}
        specular="#9aaa70"
      />
    </mesh>
  );
}

export function World() {
  const coarse = useMemo(() => isCoarsePointer(), []);
  const shadowMap = coarse ? 512 : 1024;

  return (
    <>
      <color attach="background" args={["#a3b6b8"]} />
      <fogExp2 attach="fog" args={["#c8d4cc", 0.017]} />
      <Sky
        sunPosition={[18, 9.5, 12]}
        turbidity={6.5}
        rayleigh={1.8}
        mieCoefficient={0.0045}
        mieDirectionalG={0.78}
      />
      <hemisphereLight args={["#d8e4ec", "#5a6a40", 0.88]} />
      <ambientLight color="#e8dcc4" intensity={0.46} />
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

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_Y - 0.02, 0]}>
        <circleGeometry args={[OCEAN_RADIUS, 32]} />
        <meshPhongMaterial color="#245868" shininess={20} specular="#7aadb8" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_Y, 0]}>
        <circleGeometry args={[OFFSHORE_LANE_INNER, 32]} />
        <meshPhongMaterial color="#3d7288" shininess={28} specular="#9ec8d0" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_Y + 0.018, 0]}>
        <ringGeometry args={[WORLD_RADIUS + 0.04, WORLD_RADIUS + 0.62, 48]} />
        <meshPhongMaterial color="#c5d0c4" shininess={18} specular="#e0e8dc" />
      </mesh>

      <IslandMesh coarse={coarse} />
      <CoastalDress coarse={coarse} />
    </>
  );
}
