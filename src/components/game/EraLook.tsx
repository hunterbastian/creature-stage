"use client";

import { useMemo } from "react";
import { extend, type ThreeElement } from "@react-three/fiber";
import { Effects } from "@react-three/drei";
import { UnsignedByteType, Vector2 } from "three";
import { ShaderPass, UnrealBloomPass } from "three-stdlib";
import { atmosphereFor, COASTAL_GRADE } from "@/lib/game/atmosphere";
import { isCoarsePointer } from "@/lib/game/device";

extend({ UnrealBloomPass, ShaderPass });

declare module "@react-three/fiber" {
  interface ThreeElements {
    unrealBloomPass: ThreeElement<typeof UnrealBloomPass>;
    shaderPass: ThreeElement<typeof ShaderPass>;
  }
}

/** Soft highlight bloom in the early-2010s console range — not modern HDR glare. */
export function EraLook() {
  const coarse = useMemo(() => isCoarsePointer(), []);
  const look = atmosphereFor(coarse);
  const resolution = useMemo(
    () => new Vector2(look.bloom.resolution, look.bloom.resolution),
    [look.bloom.resolution],
  );

  return (
    <Effects disableGamma multisamping={0} type={UnsignedByteType}>
      <unrealBloomPass
        args={[
          resolution,
          look.bloom.strength,
          look.bloom.radius,
          look.bloom.threshold,
        ]}
      />
      {look.bloom.grade ? <shaderPass args={[COASTAL_GRADE]} /> : null}
    </Effects>
  );
}
