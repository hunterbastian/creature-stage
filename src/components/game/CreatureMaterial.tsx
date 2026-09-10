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
          bumpScale={0.1}
          color="#ffffff"
          specular="#c4b49a"
          shininess={16}
          emissive={color}
          emissiveIntensity={0.05}
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
          bumpScale={0.14}
          color="#ffffff"
          specular="#c4b49a"
          shininess={12}
          emissive={color}
          emissiveIntensity={0.03}
        />
      );
    default:
      return assertNever(finish, "Unknown finish");
  }
}
