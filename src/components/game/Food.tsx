"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useGameStore } from "@/lib/game/store";
import { assertNever, type FoodKind } from "@/lib/game/types";

function foodColor(kind: FoodKind): string {
  switch (kind) {
    case "berry":
      return "#d66a68";
    case "plumpfruit":
      return "#e8c86a";
    case "sporepod":
      return "#b8c8c4";
    default:
      return assertNever(kind, "Unknown food");
  }
}

function FoodMesh({
  kind,
  x,
  z,
  aimed,
}: {
  kind: FoodKind;
  x: number;
  z: number;
  aimed: boolean;
}) {
  const group = useRef<Group>(null);
  // Stable per-fruit bob offset from world position (no render-time Math.random).
  const phase = useRef(x * 1.7 + z * 0.9);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime + phase.current;
    const bob = aimed ? 0.16 : 0.1;
    group.current.position.y = 0.42 + Math.sin(t * (aimed ? 2.8 : 2.2)) * bob;
    group.current.rotation.y = t * 0.8;
    group.current.scale.setScalar(aimed ? 1.12 : 1);
  });

  const color = foodColor(kind);

  return (
    <group ref={group} position={[x, 0.42, z]}>
      <mesh castShadow>
        <sphereGeometry args={[0.22, 10, 8]} />
        <meshPhongMaterial
          color={color}
          emissive={color}
          emissiveIntensity={aimed ? 0.18 : 0.04}
          shininess={18}
          specular="#f0e8d8"
        />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <coneGeometry args={[0.05, 0.1, 5]} />
        <meshPhongMaterial color="#8a9a6a" shininess={8} specular="#c8d4a8" />
      </mesh>
      {aimed ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.38, 0]}>
          <ringGeometry args={[0.34, 0.42, 18]} />
          <meshBasicMaterial color="#e8c86a" transparent opacity={0.55} />
        </mesh>
      ) : null}
    </group>
  );
}

export function FoodField() {
  const foods = useGameStore((state) => state.foods);
  const waypoint = useGameStore((state) => state.waypoint);
  return (
    <>
      {foods.map((food) => (
        <FoodMesh
          key={food.id}
          kind={food.kind}
          x={food.x}
          z={food.z}
          aimed={waypoint?.kind === "food" && waypoint.id === food.id}
        />
      ))}
    </>
  );
}
