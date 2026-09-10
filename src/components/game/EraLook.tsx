"use client";

import { useMemo } from "react";
import { extend, type ThreeElement } from "@react-three/fiber";
import { Effects } from "@react-three/drei";
import { UnsignedByteType, Vector2 } from "three";
import { UnrealBloomPass } from "three-stdlib";
import { isCoarsePointer } from "@/lib/game/device";

extend({ UnrealBloomPass });

declare module "@react-three/fiber" {
  interface ThreeElements {
    unrealBloomPass: ThreeElement<typeof UnrealBloomPass>;
  }
}

/** Soft highlight bloom in the early-2010s console range — not modern HDR glare. */
export function EraLook() {
  const coarse = useMemo(() => isCoarsePointer(), []);
  const resolution = useMemo(() => new Vector2(256, 256), []);
  const strength = coarse ? 0.14 : 0.22;
  const radius = coarse ? 0.48 : 0.58;
  const threshold = 0.78;

  return (
    <Effects disableGamma multisamping={0} type={UnsignedByteType}>
      <unrealBloomPass args={[resolution, strength, radius, threshold]} />
    </Effects>
  );
}
