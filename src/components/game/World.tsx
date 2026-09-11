"use client";

import { Suspense, useEffect, useMemo } from "react";
import { Sky } from "@react-three/drei";
import { isCoarsePointer } from "@/lib/game/device";
import { createIslandGeometry } from "@/lib/game/island-mesh";
import { SHORE } from "@/lib/game/shore-look";
import { CoastalDress } from "./CoastalDress";
import { ShoreWater } from "./ShoreWater";

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
        shininess={SHORE.islandShininess}
        specular={SHORE.islandSpecular}
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

      <ShoreWater coarse={coarse} />
      <IslandMesh coarse={coarse} />
      <Suspense fallback={null}>
        <CoastalDress coarse={coarse} />
      </Suspense>
    </>
  );
}
