"use client";

import { Suspense, useEffect, useMemo } from "react";
import { Sky } from "@react-three/drei";
import { atmosphereFor } from "@/lib/game/atmosphere";
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
  const look = atmosphereFor(coarse);
  const shadowMap = coarse ? 512 : 1024;
  const [sunX, sunY, sunZ] = look.sunPosition;

  return (
    <>
      <color attach="background" args={[look.background]} />
      <fog attach="fog" args={[look.fog.color, look.fog.near, look.fog.far]} />
      <Sky
        sunPosition={look.sunPosition}
        turbidity={look.turbidity}
        rayleigh={look.rayleigh}
        mieCoefficient={look.mieCoefficient}
        mieDirectionalG={look.mieDirectionalG}
      />
      <hemisphereLight
        args={[look.hemiSky, look.hemiGround, look.hemiIntensity]}
      />
      <ambientLight color={look.ambient} intensity={look.ambientIntensity} />
      <directionalLight
        color={look.key}
        position={[sunX, sunY, sunZ]}
        intensity={look.keyIntensity}
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
        color={look.fill}
        position={[-sunX * 0.55, 7, -sunZ * 0.55]}
        intensity={look.fillIntensity}
      />

      <ShoreWater coarse={coarse} />
      <IslandMesh coarse={coarse} />
      <Suspense fallback={null}>
        <CoastalDress coarse={coarse} />
      </Suspense>
    </>
  );
}
