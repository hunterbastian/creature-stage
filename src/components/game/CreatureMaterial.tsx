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
          bumpScale={0.045}
          color="#ffffff"
          specular="#e8f2ee"
          shininess={28}
          emissive={color}
          emissiveIntensity={0.04}
        />
      );
    case "keratin":
      return (
        <meshPhongMaterial
          map={maps.map}
          specularMap={maps.specMap}
          bumpMap={maps.bumpMap}
          bumpScale={0.06}
          color="#ffffff"
          specular="#f0e8d8"
          shininess={26}
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
          bumpScale={0.03}
          color="#ffffff"
          specular="#d8ece8"
          shininess={42}
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
          bumpScale={0.055}
          color="#ffffff"
          specular="#f4efe4"
          shininess={22}
          emissive={color}
          emissiveIntensity={0.025}
        />
      );
    default:
      return assertNever(finish, "Unknown finish");
  }
}
