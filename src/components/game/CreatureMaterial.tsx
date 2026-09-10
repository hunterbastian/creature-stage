"use client";

import { useMemo } from "react";
import { getCoastalMaps, type Finish } from "@/lib/game/creature-look";
import { assertNever } from "@/lib/game/types";

export function CreatureMaterial({
  color,
  finish = "skin",
}: {
  color: string;
  finish?: Finish;
}) {
  const maps = useMemo(() => getCoastalMaps(color, finish), [color, finish]);

  switch (finish) {
    case "skin":
      return (
        <meshPhongMaterial
          map={maps.map}
          specularMap={maps.specMap}
          bumpMap={maps.bumpMap}
          bumpScale={0.42}
          color="#ffffff"
          specular="#6e6558"
          shininess={9}
          emissive={color}
          emissiveIntensity={0.015}
        />
      );
    case "keratin":
      return (
        <meshPhongMaterial
          map={maps.map}
          specularMap={maps.specMap}
          bumpMap={maps.bumpMap}
          bumpScale={0.14}
          color="#ffffff"
          specular="#7a7060"
          shininess={16}
          emissive={color}
          emissiveIntensity={0.01}
        />
      );
    case "wet":
      return (
        <meshPhongMaterial
          map={maps.map}
          specularMap={maps.specMap}
          bumpMap={maps.bumpMap}
          bumpScale={0.08}
          color="#ffffff"
          specular="#8a8478"
          shininess={28}
          emissive={color}
          emissiveIntensity={0.02}
        />
      );
    case "plate":
      return (
        <meshPhongMaterial
          map={maps.map}
          specularMap={maps.specMap}
          bumpMap={maps.bumpMap}
          bumpScale={0.48}
          color="#ffffff"
          specular="#6a6256"
          shininess={7}
          emissive={color}
          emissiveIntensity={0.01}
        />
      );
    default:
      return assertNever(finish, "Unknown finish");
  }
}
