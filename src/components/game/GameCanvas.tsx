"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  canvasGlOptions,
  canvasPixelRatio,
} from "@/lib/game/device";
import { CameraRig } from "./CameraRig";
import { Creature } from "./Creature";
import { EraLook } from "./EraLook";
import { FoodField } from "./Food";
import { GameLoop } from "./GameLoop";
import { NestField } from "./Nests";
import { OffshoreFauna } from "./OffshoreFauna";
import { WildlifeField } from "./Wildlife";
import { World } from "./World";

export function GameCanvas() {
  const dpr = useMemo(() => canvasPixelRatio(), []);
  const gl = useMemo(() => canvasGlOptions(), []);

  return (
    <Canvas
      className="h-full w-full touch-none"
      style={{ touchAction: "none" }}
      shadows
      dpr={dpr}
      camera={{ fov: 46, near: 0.12, far: 130, position: [3.2, 2.1, 5.4] }}
      gl={gl}
      onContextMenu={(event) => event.preventDefault()}
    >
      <World />
      <OffshoreFauna />
      <NestField />
      <Suspense fallback={null}>
        <WildlifeField />
        <Creature />
      </Suspense>
      <FoodField />
      <CameraRig />
      <GameLoop />
      <EraLook />
    </Canvas>
  );
}
