"use client";

import { useGLTF } from "@react-three/drei";
import type { Material, Mesh, Object3D } from "three";
import {
  CLAW_GREY,
  EYE_GLASS,
  FACE_CREAM,
  SHELL_CREAM,
  type Finish,
} from "@/lib/game/creature-look";
import { SAURIAN_KIT_URL } from "@/lib/game/saurian-sockets";
import { CreatureMaterial } from "./CreatureMaterial";

type KitGltf = {
  nodes: Record<string, Object3D>;
};

export type KitColors = {
  skin: string;
  accent?: string;
};

function materialName(mesh: Mesh): string {
  const mat = mesh.material;
  if (Array.isArray(mat)) {
    return mat.map((item) => item.name).join(" ");
  }
  return (mat as Material | undefined)?.name ?? "";
}

function isMesh(object: Object3D): object is Mesh {
  return (object as Mesh).isMesh === true;
}

function lookFor(mesh: Mesh, colors: KitColors): { color: string; finish: Finish } {
  const tag = `${materialName(mesh)} ${mesh.name}`.toLowerCase();
  if (tag.includes("pupil")) return { color: "#2a3430", finish: "wet" };
  if (tag.includes("mat_eye") || tag.includes("_globe")) {
    return { color: EYE_GLASS, finish: "wet" };
  }
  if (tag.includes("claw") || tag.includes("_toe") || tag.includes("_dew")) {
    return { color: CLAW_GREY, finish: "keratin" };
  }
  if (
    tag.includes("wet") ||
    tag.includes("sucker") ||
    tag.includes("_pad") ||
    tag.includes("gum") ||
    tag.includes("nostril")
  ) {
    return { color: colors.accent ?? colors.skin, finish: "wet" };
  }
  if (
    tag.includes("keratin") ||
    tag.includes("horn") ||
    tag.includes("beak") ||
    tag.includes("tooth") ||
    tag.includes("sheath")
  ) {
    return { color: colors.accent ?? FACE_CREAM, finish: "keratin" };
  }
  if (
    tag.includes("plate") ||
    tag.includes("cream") ||
    tag.includes("shell") ||
    tag.includes("_ost") ||
    tag.includes("eyerim") ||
    tag.includes("vane") ||
    tag.includes("collar") ||
    tag.includes("club") ||
    tag.includes("_lid")
  ) {
    return { color: colors.accent ?? SHELL_CREAM, finish: "plate" };
  }
  return { color: colors.skin, finish: "skin" };
}

function MappedObject({
  object,
  colors,
  castShadow,
}: {
  object: Object3D;
  colors: KitColors;
  castShadow: boolean;
}) {
  const look = isMesh(object) ? lookFor(object, colors) : null;
  const hasColor =
    isMesh(object) && Boolean(object.geometry.getAttribute("color"));
  return (
    <group
      name={object.name}
      position={[object.position.x, object.position.y, object.position.z]}
      rotation={[object.rotation.x, object.rotation.y, object.rotation.z]}
      scale={[object.scale.x, object.scale.y, object.scale.z]}
    >
      {look && isMesh(object) ? (
        <mesh
          name={object.name}
          geometry={object.geometry}
          castShadow={castShadow}
          dispose={null}
        >
          <CreatureMaterial
            color={look.color}
            finish={look.finish}
            vertexColors={hasColor}
          />
        </mesh>
      ) : null}
      {object.children.map((child) =>
        child.name.startsWith("socket_") ? null : (
          <MappedObject
            key={child.uuid}
            object={child}
            colors={colors}
            castShadow={castShadow}
          />
        ),
      )}
    </group>
  );
}

export function KitNode({
  name,
  colors,
  castShadow,
}: {
  name: string;
  colors: KitColors;
  castShadow: boolean;
}) {
  const { nodes } = useGLTF(SAURIAN_KIT_URL) as unknown as KitGltf;
  const root = nodes[name];
  if (!root) return null;
  return (
    <MappedObject object={root} colors={colors} castShadow={castShadow} />
  );
}

useGLTF.preload(SAURIAN_KIT_URL);
