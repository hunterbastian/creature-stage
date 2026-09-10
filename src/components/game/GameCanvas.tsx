"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  canvasGlOptions,
  canvasPixelRatio,
} from "@/lib/game/device";
import { CameraRig } from "./CameraRig";
import { Creature } from "./Creature";
import { FoodField } from "./Food";
import { GameLoop } from "./GameLoop";
import { NestField } from "./Nests";
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
      camera={{ fov: 50, near: 0.1, far: 90, position: [0, 6, -10] }}
      gl={gl}
      onContextMenu={(event) => event.preventDefault()}
    >
      <World />
      <NestField />
      <WildlifeField />
      <Creature />
      <FoodField />
      <CameraRig />
      <GameLoop />
    </Canvas>
  );
}
