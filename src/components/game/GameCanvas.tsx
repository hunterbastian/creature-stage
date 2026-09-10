"use client";

import { Canvas } from "@react-three/fiber";
import { CameraRig } from "./CameraRig";
import { Creature } from "./Creature";
import { FoodField } from "./Food";
import { GameLoop } from "./GameLoop";
import { World } from "./World";

export function GameCanvas() {
  return (
    <Canvas
      className="h-full w-full"
      shadows
      dpr={[1, 1.75]}
      camera={{ fov: 50, near: 0.1, far: 90, position: [0, 6, -10] }}
      gl={{ antialias: true }}
    >
      <World />
      <Creature />
      <FoodField />
      <CameraRig />
      <GameLoop />
    </Canvas>
  );
}
