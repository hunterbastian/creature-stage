"use client";

import { useMemo } from "react";
import { getCoastalMaps, type Finish } from "@/lib/game/creature-look";
import { assertNever } from "@/lib/game/types";

export function CreatureMaterial({
  color,
  finish = "skin",
  vertexColors = false,
}: {
  color: string;
  finish?: Finish;
  vertexColors?: boolean;
}) {
  const maps = useMemo(() => getCoastalMaps(color, finish), [color, finish]);

  switch (finish) {
    case "skin":
      return (
        <meshPhongMaterial
          map={maps.map}
          specularMap={maps.specMap}
          bumpMap={maps.bumpMap}
          bumpScale={0.11}
          color="#ffffff"
          specular="#c8d4c4"
          shininess={16}
          emissive={color}
          emissiveIntensity={0.035}
          vertexColors={vertexColors}
        />
      );
    case "keratin":
      return (
        <meshPhongMaterial
          map={maps.map}
          specularMap={maps.specMap}
          bumpMap={maps.bumpMap}
          bumpScale={0.1}
          color="#ffffff"
          specular="#d4c8b0"
          shininess={18}
          emissive={color}
          emissiveIntensity={0.02}
          vertexColors={vertexColors}
        />
      );
    case "wet":
      return (
        <meshPhongMaterial
          map={maps.map}
          specularMap={maps.specMap}
          bumpMap={maps.bumpMap}
          bumpScale={0.05}
          color="#ffffff"
          specular="#b8c8c4"
          shininess={32}
          emissive={color}
          emissiveIntensity={0.03}
          vertexColors={vertexColors}
        />
      );
    case "plate":
      return (
        <meshPhongMaterial
          map={maps.map}
          specularMap={maps.specMap}
          bumpMap={maps.bumpMap}
          bumpScale={0.09}
          color="#ffffff"
          specular="#d8d0c0"
          shininess={14}
          emissive={color}
          emissiveIntensity={0.025}
          vertexColors={vertexColors}
        />
      );
    default:
      return assertNever(finish, "Unknown finish");
  }
}
