/**
 * Tideform look knobs — salt light, soft bloom, warm-cool coastal day.
 *
 * Locked by ART_DIRECTION.md: Skyrim-PS3 mood, not grimdark, not candy,
 * not dense forest. Chase-cam / iPhone landscape is the beauty shot.
 *
 * Tune here, not in JSX. Water / wet sand / foam live in `shore-look.ts`.
 * Nest bowls live in `nest-look.ts`. Collision height (`surfaceHeight`) is
 * independent except the grove-overlook lift in `worldgen/landmarks.ts`.
 */
import { Vector3 } from "three";

export type AtmosphereTier = "desktop" | "mobile";

export type BloomKnobs = {
  resolution: number;
  strength: number;
  radius: number;
  threshold: number;
  /** Extra fullscreen grade pass. Skip on iOS (fillrate). */
  grade: boolean;
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
  exposure: number;
};

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
      resolution: 256,
      strength: 0.36,
      radius: 0.68,
      threshold: 0.64,
      grade: true,
    },
    exposure: 1.08,
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
      resolution: 128,
      strength: 0.22,
      radius: 0.48,
      threshold: 0.68,
      grade: false,
    },
    exposure: 1.05,
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
 * Cheap highlight grade: cool lift in the dirt, warm gain in the sky/water.
 * PS3-era, not ACES. Applied as one ShaderPass on desktop only.
 */
export const COASTAL_GRADE = {
  uniforms: {
    tDiffuse: { value: null },
    lift: { value: new Vector3(0.018, 0.028, 0.042) },
    gain: { value: new Vector3(1.07, 1.02, 0.95) },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec3 lift;
    uniform vec3 gain;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec3 graded = color.rgb * gain + lift * (1.0 - color.rgb);
      gl_FragColor = vec4(graded, color.a);
    }
  `,
};

