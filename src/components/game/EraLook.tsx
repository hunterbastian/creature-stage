"use client";

import { useMemo } from "react";
import { extend, type ThreeElement } from "@react-three/fiber";
import { Effects } from "@react-three/drei";
import { UnsignedByteType, Vector2 } from "three";
import { ShaderPass, UnrealBloomPass } from "three-stdlib";
import {
  atmosphereFor,
  bloomPassSize,
  coastalGradeShader,
} from "@/lib/game/atmosphere";
import { isCoarsePointer } from "@/lib/game/device";

/**
 * UnrealBloomPass.setSize tracks the composer (half the canvas). The look
 * table's `bloom.resolution` is a longest-edge cap so desktop stays soft
 * without going 1080p-mip-expensive, and iOS stays a cheap glow.
 */
class CappedBloomPass extends UnrealBloomPass {
  cap: number;

  constructor(
    resolution: Vector2,
    strength: number,
    radius: number,
    threshold: number,
  ) {
    super(resolution, strength, radius, threshold);
    this.cap = Math.max(1, resolution.x, resolution.y);
  }

  setSize(width: number, height: number) {
    const [w, h] = bloomPassSize(width, height, this.cap);
    super.setSize(w, h);
  }
}

extend({ CappedBloomPass, ShaderPass });

declare module "@react-three/fiber" {
  interface ThreeElements {
    cappedBloomPass: ThreeElement<typeof CappedBloomPass>;
    shaderPass: ThreeElement<typeof ShaderPass>;
  }
}

/** Soft highlight bloom + coastal grade — early-2010s console, not HDR glare. */
export function EraLook() {
  const coarse = useMemo(() => isCoarsePointer(), []);
  const look = atmosphereFor(coarse);
  const resolution = useMemo(
    () => new Vector2(look.bloom.resolution, look.bloom.resolution),
    [look.bloom.resolution],
  );
  const grade = useMemo(
    () => coastalGradeShader(look.grade),
    [look.grade],
  );

  return (
    <Effects disableGamma multisamping={0} type={UnsignedByteType}>
      <cappedBloomPass
        args={[
          resolution,
          look.bloom.strength,
          look.bloom.radius,
          look.bloom.threshold,
        ]}
      />
      {look.grade.enabled ? <shaderPass args={[grade]} /> : null}
    </Effects>
  );
}
