/**
 * Tideform look knobs — salt light, soft bloom, warm-cool coastal day.
 *
 * Locked by ART_DIRECTION.md: Skyrim-PS3 mood, not grimdark, not candy,
 * not dense forest. Chase-cam / iPhone landscape is the beauty shot.
 *
 * Tune here, not in JSX. Water / wet sand / foam live in `shore-look.ts`.
 * Nest bowls live in `nest-look.ts`. Collision height (`surfaceHeight`) is
 * independent except the grove-overlook lift in `worldgen/landmarks.ts`.
 *
 * Post stack (EraLook): Reinhard on the renderer → capped Unreal bloom →
 * one coastal grade blit. Desktop runs both passes; mobile keeps the same
 * two passes with a smaller bloom pyramid and gentler grade (no vignette).
 */
import { Vector3 } from "three";

export type AtmosphereTier = "desktop" | "mobile";

export type Rgb = readonly [number, number, number];

export type BloomKnobs = {
  /**
   * Longest-edge cap (px) fed to UnrealBloomPass.setSize. The bright extract
   * is half of this. Composer would otherwise bloom at half the canvas —
   * too expensive on iOS, and the constructor size is ignored after resize.
   */
  resolution: number;
  strength: number;
  /** UnrealBloomPass radius in 0–1. Higher = hazier salt smear. */
  radius: number;
  /**
   * Luma gate. Keep this *above* `SHORE.foam` albedo luma so the waterline
   * lace does not bloom nuclear. Water specular glints are allowed through.
   */
  threshold: number;
};

export type GradeKnobs = {
  /** Extra fullscreen blit. Cheap vs bloom mips; mobile still runs a light one. */
  enabled: boolean;
  /** Cool multiply in the dirt / wet sand. */
  shadows: Rgb;
  /** Cream multiply around meadow-green luma. */
  mids: Rgb;
  /** Warm multiply in sky / water highlights. */
  highlights: Rgb;
  shadowAmount: number;
  midAmount: number;
  highlightAmount: number;
  /** Luma below this is fully shadow-toned. */
  shadowEnd: number;
  /** Luma above this is fully highlight-toned. */
  highlightStart: number;
  /** 1 = linear. Mild S around `contrastPivot` so grass does not muddy. */
  contrast: number;
  contrastPivot: number;
  /** Corner darken, 0 = off (mobile). */
  vignette: number;
  vignetteInner: number;
  vignetteOuter: number;
  /** Soft shoulder so foam / sky do not clip to candy white after warm gain. */
  shoulderTint: Rgb;
  shoulderStart: number;
  shoulderAmount: number;
  /** How far the shoulder mixes toward `shoulderTint` (0–1). */
  shoulderMix: number;
};

export type FogKnobs = {
  color: string;
  /** Linear fog near (world units). Island stays readable from the chase cam. */
  near: number;
  /** Linear fog far. Horizon melts; ocean fill still draws. */
  far: number;
};

export type Atmosphere = {
  background: string;
  fog: FogKnobs;
  sunPosition: [number, number, number];
  turbidity: number;
  rayleigh: number;
  mieCoefficient: number;
  mieDirectionalG: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  ambient: string;
  ambientIntensity: number;
  key: string;
  keyIntensity: number;
  fill: string;
  fillIntensity: number;
  bloom: BloomKnobs;
  grade: GradeKnobs;
  exposure: number;
};

/** Shared split-tone — amounts differ per tier, tints do not. */
const SALT_SHADOWS = [0.88, 0.96, 1.08] as const;
const SALT_MIDS = [1.05, 1.016, 0.93] as const;
const SALT_HIGHLIGHTS = [1.1, 1.034, 0.9] as const;
const SALT_SHOULDER = [0.96, 0.92, 0.84] as const;

/**
 * Morning salt-light: sun sits a little low so the waterline rims,
 * not a noon blast. Fill is cool ocean bounce.
 */
export const ATMOSPHERE: Record<AtmosphereTier, Atmosphere> = {
  desktop: {
    background: "#c9d0c8",
    fog: { color: "#d6cfc2", near: 16, far: 76 },
    sunPosition: [20, 6.8, 13],
    turbidity: 8.4,
    rayleigh: 2.15,
    mieCoefficient: 0.0052,
    mieDirectionalG: 0.82,
    hemiSky: "#e4eef4",
    hemiGround: "#6e6248",
    hemiIntensity: 0.94,
    ambient: "#f0e4c8",
    ambientIntensity: 0.34,
    key: "#ffd4a4",
    keyIntensity: 1.32,
    fill: "#8aa6b0",
    fillIntensity: 0.34,
    bloom: {
      resolution: 720,
      strength: 0.58,
      radius: 0.86,
      threshold: 0.8,
    },
    grade: {
      enabled: true,
      shadows: SALT_SHADOWS,
      mids: SALT_MIDS,
      highlights: SALT_HIGHLIGHTS,
      shadowAmount: 0.4,
      midAmount: 0.24,
      highlightAmount: 0.36,
      shadowEnd: 0.34,
      highlightStart: 0.62,
      contrast: 1.11,
      contrastPivot: 0.48,
      vignette: 0.16,
      vignetteInner: 0.42,
      vignetteOuter: 1.62,
      shoulderTint: SALT_SHOULDER,
      shoulderStart: 0.84,
      shoulderAmount: 0.32,
      shoulderMix: 0.55,
    },
    exposure: 1.05,
  },
  mobile: {
    background: "#c9d0c8",
    fog: { color: "#d4cdc0", near: 14, far: 62 },
    sunPosition: [20, 6.8, 13],
    turbidity: 8.2,
    rayleigh: 2.05,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.8,
    hemiSky: "#e4eef4",
    hemiGround: "#6e6248",
    hemiIntensity: 0.9,
    ambient: "#f0e4c8",
    ambientIntensity: 0.36,
    key: "#ffd4a4",
    keyIntensity: 1.22,
    fill: "#8aa6b0",
    fillIntensity: 0.3,
    bloom: {
      resolution: 180,
      strength: 0.4,
      radius: 0.68,
      threshold: 0.83,
    },
    grade: {
      enabled: true,
      shadows: SALT_SHADOWS,
      mids: SALT_MIDS,
      highlights: SALT_HIGHLIGHTS,
      shadowAmount: 0.26,
      midAmount: 0.16,
      highlightAmount: 0.22,
      shadowEnd: 0.34,
      highlightStart: 0.64,
      contrast: 1.06,
      contrastPivot: 0.49,
      vignette: 0,
      vignetteInner: 0.42,
      vignetteOuter: 1.62,
      shoulderTint: SALT_SHOULDER,
      shoulderStart: 0.84,
      shoulderAmount: 0.4,
      shoulderMix: 0.55,
    },
    exposure: 1.03,
  },
};

export function atmosphereFor(mobile: boolean): Atmosphere {
  return mobile ? ATMOSPHERE.mobile : ATMOSPHERE.desktop;
}

export const DRESS = {
  grass: "#64824a",
  reeds: "#5e6c4c",
  dryRock: "#8c8478",
  wetRock: "#556660",
  shelf: "#6e6a62",
  shell: "#e8dcc8",
  spiral: "#ece0cc",
  kelp: "#4a5c46",
  driftwood: "#9a8a70",
  trunk: "#7a6a52",
  crown: "#5c6c4a",
  canopy: "#627250",
  scrub: "#61684c",
  mist: "#d8d4c8",
} as const;

/**
 * Cap UnrealBloomPass.setSize so the mip chain does not track canvas DPR.
 * Does not upscale a smaller buffer.
 */
export function bloomPassSize(
  width: number,
  height: number,
  cap: number,
): [number, number] {
  const longest = Math.max(width, height, 1);
  const scale = Math.min(1, cap / longest);
  return [
    Math.max(1, Math.round(width * scale)),
    Math.max(1, Math.round(height * scale)),
  ];
}

export function lumaRgb(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function mix(a: number, b: number, t: number): number {
  return a * (1 - t) + b * t;
}

/** GLSL smoothstep. */
export function gradeSmoothstep(
  edge0: number,
  edge1: number,
  x: number,
): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * CPU twin of the coastal grade fragment shader. Used by tests so the
 * split-tone / shoulder / vignette stay honest when knobs move.
 */
export function applyCoastalGrade(
  rgb: Rgb,
  uv: readonly [number, number],
  grade: GradeKnobs,
): [number, number, number] {
  let r = rgb[0];
  let g = rgb[1];
  let b = rgb[2];
  const y = lumaRgb(r, g, b);
  const shadowW = 1 - gradeSmoothstep(0, grade.shadowEnd, y);
  const highW = gradeSmoothstep(grade.highlightStart, 1, y);
  const midW = Math.max(0, 1 - shadowW - highW);

  const shadowMix = shadowW * grade.shadowAmount;
  const midMix = midW * grade.midAmount;
  const highMix = highW * grade.highlightAmount;
  r *= mix(1, grade.shadows[0], shadowMix);
  g *= mix(1, grade.shadows[1], shadowMix);
  b *= mix(1, grade.shadows[2], shadowMix);
  r *= mix(1, grade.mids[0], midMix);
  g *= mix(1, grade.mids[1], midMix);
  b *= mix(1, grade.mids[2], midMix);
  r *= mix(1, grade.highlights[0], highMix);
  g *= mix(1, grade.highlights[1], highMix);
  b *= mix(1, grade.highlights[2], highMix);

  const y2 = lumaRgb(r, g, b);
  const shaped = grade.contrastPivot + (y2 - grade.contrastPivot) * grade.contrast;
  if (y2 > 1e-5) {
    const scale = shaped / y2;
    r *= scale;
    g *= scale;
    b *= scale;
  }

  const y3 = lumaRgb(r, g, b);
  const shoulder = gradeSmoothstep(grade.shoulderStart, 1, y3);
  const shoulderW = shoulder * grade.shoulderAmount;
  r = mix(r, mix(r, grade.shoulderTint[0], grade.shoulderMix), shoulderW);
  g = mix(g, mix(g, grade.shoulderTint[1], grade.shoulderMix), shoulderW);
  b = mix(b, mix(b, grade.shoulderTint[2], grade.shoulderMix), shoulderW);

  const qx = uv[0] * 2 - 1;
  const qy = uv[1] * 2 - 1;
  const rad = qx * qx + qy * qy;
  const vig = gradeSmoothstep(grade.vignetteInner, grade.vignetteOuter, rad);
  const dim = 1 - grade.vignette * vig;
  r *= dim;
  g *= dim;
  b *= dim;

  return [clamp01(r), clamp01(g), clamp01(b)];
}

export const GRADE_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const GRADE_FRAGMENT = `
  uniform sampler2D tDiffuse;
  uniform vec3 shadowTint;
  uniform vec3 midTint;
  uniform vec3 highlightTint;
  uniform float shadowAmount;
  uniform float midAmount;
  uniform float highlightAmount;
  uniform float shadowEnd;
  uniform float highlightStart;
  uniform float contrast;
  uniform float contrastPivot;
  uniform float vignette;
  uniform float vignetteInner;
  uniform float vignetteOuter;
  uniform vec3 shoulderTint;
  uniform float shoulderStart;
  uniform float shoulderAmount;
  uniform float shoulderMix;
  varying vec2 vUv;

  float luma(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
  }

  void main() {
    vec4 src = texture2D(tDiffuse, vUv);
    vec3 c = src.rgb;
    float y = luma(c);

    float shadowW = 1.0 - smoothstep(0.0, shadowEnd, y);
    float highW = smoothstep(highlightStart, 1.0, y);
    float midW = max(0.0, 1.0 - shadowW - highW);

    c *= mix(vec3(1.0), shadowTint, shadowW * shadowAmount);
    c *= mix(vec3(1.0), midTint, midW * midAmount);
    c *= mix(vec3(1.0), highlightTint, highW * highlightAmount);

    float y2 = luma(c);
    float shaped = contrastPivot + (y2 - contrastPivot) * contrast;
    c *= y2 > 1e-5 ? (shaped / y2) : 1.0;

    float y3 = luma(c);
    float shoulder = smoothstep(shoulderStart, 1.0, y3);
    float shoulderW = shoulder * shoulderAmount;
    c = mix(c, mix(c, shoulderTint, shoulderMix), shoulderW);

    vec2 q = vUv * 2.0 - 1.0;
    float rad = dot(q, q);
    float vig = smoothstep(vignetteInner, vignetteOuter, rad);
    c *= 1.0 - vignette * vig;

    gl_FragColor = vec4(clamp(c, 0.0, 1.0), src.a);
  }
`;

export function coastalGradeUniforms(grade: GradeKnobs) {
  return {
    tDiffuse: { value: null },
    shadowTint: { value: new Vector3(...grade.shadows) },
    midTint: { value: new Vector3(...grade.mids) },
    highlightTint: { value: new Vector3(...grade.highlights) },
    shadowAmount: { value: grade.shadowAmount },
    midAmount: { value: grade.midAmount },
    highlightAmount: { value: grade.highlightAmount },
    shadowEnd: { value: grade.shadowEnd },
    highlightStart: { value: grade.highlightStart },
    contrast: { value: grade.contrast },
    contrastPivot: { value: grade.contrastPivot },
    vignette: { value: grade.vignette },
    vignetteInner: { value: grade.vignetteInner },
    vignetteOuter: { value: grade.vignetteOuter },
    shoulderTint: { value: new Vector3(...grade.shoulderTint) },
    shoulderStart: { value: grade.shoulderStart },
    shoulderAmount: { value: grade.shoulderAmount },
    shoulderMix: { value: grade.shoulderMix },
  };
}

/**
 * One ShaderPass: cool shadows, cream mids, warm highlights, soft shoulder,
 * optional vignette. PS3-era, not ACES. Same shader on mobile with lighter
 * uniforms (vignette 0).
 */
export function coastalGradeShader(grade: GradeKnobs) {
  return {
    uniforms: coastalGradeUniforms(grade),
    vertexShader: GRADE_VERTEX,
    fragmentShader: GRADE_FRAGMENT,
  };
}
