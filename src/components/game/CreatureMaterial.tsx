"use client";

import { useMemo } from "react";
import { DoubleSide } from "three";
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
          bumpScale={0.14}
          color="#ffffff"
          specular="#d4e2dc"
          shininess={20}
          emissive={color}
          emissiveIntensity={0.04}
          vertexColors={vertexColors}
          side={DoubleSide}
        />
      );
    case "keratin":
      return (
        <meshPhongMaterial
          map={maps.map}
          specularMap={maps.specMap}
          bumpMap={maps.bumpMap}
          bumpScale={0.11}
          color="#ffffff"
          specular="#e0d4bc"
          shininess={22}
          emissive={color}
          emissiveIntensity={0.022}
          vertexColors={vertexColors}
          side={DoubleSide}
        />
      );
    case "wet":
      return (
        <meshPhongMaterial
          map={maps.map}
          specularMap={maps.specMap}
          bumpMap={maps.bumpMap}
          bumpScale={0.045}
          color="#ffffff"
          specular="#c4ddd8"
          shininess={42}
          emissive={color}
          emissiveIntensity={0.032}
          vertexColors={vertexColors}
          side={DoubleSide}
        />
      );
    case "plate":
      return (
        <meshPhongMaterial
          map={maps.map}
          specularMap={maps.specMap}
          bumpMap={maps.bumpMap}
          bumpScale={0.12}
          color="#ffffff"
          specular="#ece6d4"
          shininess={18}
          emissive={color}
          emissiveIntensity={0.028}
          vertexColors={vertexColors}
          side={DoubleSide}
        />
      );
    default:
      return assertNever(finish, "Unknown finish");
  }
}
