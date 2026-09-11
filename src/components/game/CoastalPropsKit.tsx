"use client";

import { useGLTF } from "@react-three/drei";
import type { BufferGeometry, Mesh, Object3D } from "three";
import {
  COASTAL_PROP_NODES,
  COASTAL_PROPS_URL,
} from "@/lib/game/worldgen/props-kit";

type KitGltf = {
  nodes: Record<string, Object3D>;
};

function isMesh(object: Object3D): object is Mesh {
  return (object as Mesh).isMesh === true;
}

function meshGeometry(object: Object3D | undefined): BufferGeometry | null {
  if (!object) return null;
  if (isMesh(object)) return object.geometry;
  for (const child of object.children) {
    const geo = meshGeometry(child);
    if (geo) return geo;
  }
  return null;
}

export type CoastalPropGeometries = {
  -readonly [K in keyof typeof COASTAL_PROP_NODES]: BufferGeometry | null;
};

export function useCoastalPropGeometries(): CoastalPropGeometries {
  const { nodes } = useGLTF(COASTAL_PROPS_URL) as unknown as KitGltf;
  const out = {} as CoastalPropGeometries;
  for (const key of Object.keys(COASTAL_PROP_NODES) as Array<
    keyof typeof COASTAL_PROP_NODES
  >) {
    out[key] = meshGeometry(nodes[COASTAL_PROP_NODES[key]]);
  }
  return out;
}

useGLTF.preload(COASTAL_PROPS_URL);
