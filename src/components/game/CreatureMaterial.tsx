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
          bumpScale={0.085}
          color="#ffffff"
          specular="#c8d4c4"
          shininess={18}
          emissive={color}
          emissiveIntensity={0.03}
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
        />
      );
    default:
      return assertNever(finish, "Unknown finish");
  }
}
