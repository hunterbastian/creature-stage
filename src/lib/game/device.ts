import { ReinhardToneMapping } from "three";

/** True for phones / tablets where a landscape play layout should win. */
export function isCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    "ontouchstart" in window ||
    /iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
}

/**
 * R3F `dpr` min/max. iPhone Safari reports 2–3; uncapped that is a lot of
 * fillrate for a full-screen shadow-mapped meadow.
 */
export function canvasPixelRatio(): [number, number] {
  return isCoarsePointer() ? [1, 1.25] : [1, 1.75];
}

export function canvasGlOptions(): {
  antialias: boolean;
  alpha: boolean;
  stencil: boolean;
  powerPreference: "high-performance";
  toneMapping: typeof ReinhardToneMapping;
  toneMappingExposure: number;
} {
  const coarse = isCoarsePointer();
  return {
    antialias: !coarse,
    alpha: false,
    stencil: false,
    powerPreference: "high-performance",
    // Washed early-2010s tonemap — not ACES/UE5.
    toneMapping: ReinhardToneMapping,
    toneMappingExposure: 1.12,
  };
}
