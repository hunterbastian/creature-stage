"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useGameStore } from "@/lib/game/store";
import { assertNever, type FoodKind } from "@/lib/game/types";

function foodColor(kind: FoodKind): string {
  switch (kind) {
    case "berry":
      return "#8a4a48";
    case "plumpfruit":
      return "#a88848";
    case "sporepod":
      return "#7a6a70";
    default:
      return assertNever(kind, "Unknown food");
  }
}

function FoodMesh({
  kind,
  x,
  z,
}: {
  kind: FoodKind;
  x: number;
  z: number;
}) {
  const group = useRef<Group>(null);
  // Stable per-fruit bob offset from world position (no render-time Math.random).
  const phase = useRef(x * 1.7 + z * 0.9);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime + phase.current;
    group.current.position.y = 0.42 + Math.sin(t * 2.2) * 0.1;
    group.current.rotation.y = t * 0.8;
  });

  const color = foodColor(kind);

  return (
    <group ref={group} position={[x, 0.42, z]}>
      <mesh castShadow>
        <sphereGeometry args={[0.22, 10, 8]} />
        <meshPhongMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.04}
          shininess={10}
          specular="#8a7e6c"
        />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <coneGeometry args={[0.05, 0.1, 5]} />
        <meshPhongMaterial color="#4a4430" shininess={4} specular="#6a5e48" />
      </mesh>
    </group>
  );
}

export function FoodField() {
  const foods = useGameStore((state) => state.foods);
  return (
    <>
      {foods.map((food) => (
        <FoodMesh key={food.id} kind={food.kind} x={food.x} z={food.z} />
      ))}
    </>
  );
}
