import {
  CanvasTexture,
  LinearFilter,
  LinearSRGBColorSpace,
  SRGBColorSpace,
  type ColorSpace,
} from "three";
import { assertNever, type BodyId, type LegId } from "./types";

export type Finish = "skin" | "keratin" | "wet" | "plate";

export type Vec3 = [number, number, number];

/** Ivory modules + gold eye from the new Skyrim coastal Spore targets. */
export const SHELL_CREAM = "#eee4d0";
export const BELLY_CREAM = "#eadfca";
export const FACE_CREAM = "#e6dcc6";
export const CLAW_GREY = "#3f3c38";
export const EYE_GLASS = "#c4a24a";

export type SpiralSpec = {
  position: Vec3;
  rotation: Vec3;
  scale: number;
};

export type BodyPlan = {
  stance: "biped" | "quad";
  pitch: number;
  hip: { x: number; z: number };
  shoulder: { x: number; z: number };
  torso: { position: Vec3; scale: Vec3 };
  chest: { position: Vec3; scale: Vec3 };
  belly: { position: Vec3; scale: Vec3 };
  neckJoints: { position: Vec3; scale: Vec3 }[];
  neckCream: { position: Vec3; scale: Vec3 }[];
  head: { position: Vec3; scale: Vec3 };
  face: { position: Vec3; scale: Vec3 };
  snout: { position: Vec3; scale: Vec3 };
  jaw: Vec3;
  eye: { x: number; y: number; z: number };
  brow: { x: number; y: number; z: number };
  faceSpiralScale: number;
  arm: { position: Vec3; rotation: Vec3 };
  tailRoot: { position: Vec3; rotation: Vec3 };
  tailLength: number;
  spirals: SpiralSpec[];
  nubs: Vec3[];
  crest: Vec3[];
  sails: SpiralSpec[];
  creamFace: boolean;
};

export type CoastalMaps = {
  map: CanvasTexture;
  specMap: CanvasTexture;
  bumpMap: CanvasTexture;
};

const MAP_CACHE = new Map<string, CoastalMaps>();

export function liftHex(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount,
  );
}

export function shadeHex(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

export function bodyPlan(id: BodyId): BodyPlan {
  switch (id) {
    case "sleek":
      return theropodPlan();
    case "plump":
      return sauropodPlan();
    case "spiky":
      return stegosaurPlan();
    default:
      return assertNever(id, "Unknown body");
  }
}

/** Target A — cream-faced cliff theropod with face spirals and osteoderms. */
function theropodPlan(): BodyPlan {
  return {
    stance: "biped",
    pitch: -0.08,
    hip: { x: 0.2, z: -0.02 },
    shoulder: { x: 0.28, z: 0.48 },
    torso: { position: [0, 0.08, -0.1], scale: [0.64, 0.74, 0.9] },
    chest: { position: [0, 0.18, 0.36], scale: [0.74, 0.88, 1.1] },
    belly: { position: [0, -0.02, 0.16], scale: [0.64, 0.5, 0.96] },
    neckJoints: [{ position: [0, 0.3, 0.82], scale: [0.42, 0.44, 0.54] }],
    neckCream: [{ position: [0, 0.18, 0.84], scale: [0.34, 0.28, 0.48] }],
    head: { position: [0, 0.44, 1.14], scale: [0.56, 0.48, 0.98] },
    face: { position: [0, 0.42, 1.28], scale: [0.58, 0.46, 0.64] },
    snout: { position: [0, 0.38, 1.46], scale: [0.36, 0.26, 0.42] },
    jaw: [0, 0.3, 1.6],
    eye: { x: 0.2, y: 0.5, z: 1.26 },
    brow: { x: 0.14, y: 0.62, z: 1.1 },
    faceSpiralScale: 1.02,
    arm: { position: [0.28, 0.14, 0.48], rotation: [0.82, 0, 0.92] },
    tailRoot: { position: [0, 0.16, -0.5], rotation: [-0.18, 0, 0] },
    tailLength: 1.4,
    spirals: [
      { position: [0, 0.54, 0.88], rotation: [-0.55, 0, 0], scale: 0.7 },
      { position: [0.1, 0.5, 0.7], rotation: [-0.48, 0.42, 0], scale: 0.78 },
      { position: [-0.1, 0.5, 0.7], rotation: [-0.48, -0.42, 0], scale: 0.78 },
      { position: [0.12, 0.5, 0.5], rotation: [-0.4, 0.48, 0], scale: 0.92 },
      { position: [-0.12, 0.5, 0.5], rotation: [-0.4, -0.48, 0], scale: 0.92 },
      { position: [0.1, 0.48, 0.3], rotation: [-0.32, 0.4, 0], scale: 0.8 },
      { position: [-0.1, 0.48, 0.3], rotation: [-0.32, -0.4, 0], scale: 0.8 },
      { position: [0, 0.46, 0.12], rotation: [-0.22, 0, 0], scale: 0.7 },
      { position: [0, 0.4, -0.08], rotation: [-0.14, 0, 0], scale: 0.56 },
    ],
    nubs: [
      [0, 0.52, 0.62],
      [0, 0.5, 0.42],
      [0, 0.48, 0.24],
      [0, 0.44, 0.06],
      [0, 0.38, -0.14],
      [0, 0.32, -0.3],
    ],
    crest: [
      [0.07, 0.64, 1.06],
      [-0.07, 0.64, 1.06],
      [0, 0.62, 0.94],
    ],
    sails: [],
    creamFace: true,
  };
}

/** Long-neck grazer — locked sauropod. Neck reads forward, not giraffe-up. */
function sauropodPlan(): BodyPlan {
  return {
    stance: "quad",
    pitch: 0.03,
    hip: { x: 0.32, z: -0.4 },
    shoulder: { x: 0.3, z: 0.52 },
    torso: { position: [0, 0.14, -0.12], scale: [1.08, 0.88, 1.38] },
    chest: { position: [0, 0.18, 0.46], scale: [0.98, 0.82, 1.18] },
    belly: { position: [0, -0.04, 0.08], scale: [0.96, 0.66, 1.38] },
    neckJoints: [
      { position: [0, 0.28, 0.88], scale: [0.4, 0.38, 0.56] },
      { position: [0, 0.38, 1.26], scale: [0.32, 0.32, 0.52] },
      { position: [0, 0.46, 1.62], scale: [0.26, 0.26, 0.48] },
      { position: [0, 0.52, 1.96], scale: [0.22, 0.22, 0.42] },
      { position: [0, 0.56, 2.26], scale: [0.2, 0.2, 0.36] },
    ],
    neckCream: [
      { position: [0, 0.16, 0.9], scale: [0.32, 0.26, 0.52] },
      { position: [0, 0.26, 1.28], scale: [0.26, 0.22, 0.48] },
      { position: [0, 0.34, 1.64], scale: [0.2, 0.18, 0.44] },
      { position: [0, 0.4, 1.98], scale: [0.16, 0.16, 0.38] },
      { position: [0, 0.46, 2.26], scale: [0.14, 0.14, 0.32] },
    ],
    head: { position: [0, 0.6, 2.52], scale: [0.38, 0.32, 0.58] },
    face: { position: [0, 0.58, 2.62], scale: [0.44, 0.3, 0.48] },
    snout: { position: [0, 0.54, 2.74], scale: [0.34, 0.22, 0.38] },
    jaw: [0, 0.5, 2.82],
    eye: { x: 0.13, y: 0.66, z: 2.56 },
    brow: { x: 0.1, y: 0.72, z: 2.42 },
    faceSpiralScale: 0.72,
    arm: { position: [0.5, 0.2, 0.44], rotation: [0.18, 0, 0.38] },
    tailRoot: { position: [0, 0.16, -0.72], rotation: [-0.26, 0, 0] },
    tailLength: 1.58,
    spirals: [
      { position: [0, 0.5, 0.96], rotation: [-0.48, 0, 0], scale: 0.7 },
      { position: [0, 0.58, 1.24], rotation: [-0.38, 0, 0], scale: 0.6 },
      { position: [0, 0.64, 1.52], rotation: [-0.28, 0, 0], scale: 0.5 },
      { position: [0, 0.68, 1.8], rotation: [-0.2, 0, 0], scale: 0.42 },
      { position: [0, 0.7, 2.06], rotation: [-0.14, 0, 0], scale: 0.36 },
      { position: [0, 0.58, 0.42], rotation: [-0.35, 0, 0], scale: 1.08 },
      { position: [0.14, 0.52, 0.28], rotation: [-0.28, 0.5, 0], scale: 0.82 },
      { position: [-0.14, 0.52, 0.28], rotation: [-0.28, -0.5, 0], scale: 0.82 },
      { position: [0, 0.56, 0.14], rotation: [-0.22, 0, 0], scale: 0.95 },
      { position: [0.12, 0.5, 0.0], rotation: [-0.16, 0.45, 0], scale: 0.72 },
      { position: [-0.12, 0.5, 0.0], rotation: [-0.16, -0.45, 0], scale: 0.72 },
      { position: [0, 0.52, -0.12], rotation: [-0.12, 0, 0], scale: 0.82 },
      { position: [0, 0.46, -0.28], rotation: [-0.08, 0, 0], scale: 0.64 },
    ],
    nubs: [
      [0, 0.5, 0.32],
      [0, 0.46, 0.08],
      [0, 0.4, -0.16],
    ],
    crest: [
      [0, 0.72, 2.42],
      [0, 0.68, 2.28],
    ],
    sails: [],
    creamFace: true,
  };
}

/** Target B — bone-plated quad: sails plus flank spiral shells. */
function stegosaurPlan(): BodyPlan {
  return {
    stance: "quad",
    pitch: 0.04,
    hip: { x: 0.34, z: -0.4 },
    shoulder: { x: 0.3, z: 0.5 },
    torso: { position: [0, 0.12, -0.08], scale: [1.02, 0.78, 1.42] },
    chest: { position: [0, 0.14, 0.42], scale: [0.88, 0.68, 1.06] },
    belly: { position: [0, -0.04, 0.1], scale: [0.86, 0.5, 1.24] },
    neckJoints: [
      { position: [0, 0.2, 0.82], scale: [0.36, 0.32, 0.48] },
      { position: [0, 0.26, 1.1], scale: [0.28, 0.26, 0.4] },
      { position: [0, 0.32, 1.34], scale: [0.24, 0.22, 0.34] },
    ],
    neckCream: [{ position: [0, 0.12, 1.0], scale: [0.24, 0.16, 0.46] }],
    head: { position: [0, 0.36, 1.54], scale: [0.32, 0.28, 0.5] },
    face: { position: [0, 0.34, 1.66], scale: [0.28, 0.24, 0.36] },
    snout: { position: [0, 0.3, 1.78], scale: [0.2, 0.16, 0.26] },
    jaw: [0, 0.26, 1.88],
    eye: { x: 0.11, y: 0.4, z: 1.58 },
    brow: { x: 0.08, y: 0.46, z: 1.44 },
    faceSpiralScale: 0,
    arm: { position: [0.46, 0.14, 0.4], rotation: [0.1, 0, 0.26] },
    tailRoot: { position: [0, 0.14, -0.76], rotation: [-0.12, 0, 0] },
    tailLength: 1.48,
    spirals: [
      { position: [0.28, 0.4, 0.28], rotation: [-0.2, 1.05, 0.15], scale: 1.15 },
      { position: [-0.28, 0.4, 0.28], rotation: [-0.2, -1.05, -0.15], scale: 1.15 },
      { position: [0.24, 0.38, 0.06], rotation: [-0.12, 1.0, 0.1], scale: 0.95 },
      { position: [-0.24, 0.38, 0.06], rotation: [-0.12, -1.0, -0.1], scale: 0.95 },
      { position: [0.2, 0.34, -0.16], rotation: [-0.08, 0.95, 0.08], scale: 0.78 },
      { position: [-0.2, 0.34, -0.16], rotation: [-0.08, -0.95, -0.08], scale: 0.78 },
    ],
    nubs: [
      [0, 0.48, 0.36],
      [0, 0.46, 0.16],
      [0, 0.42, -0.04],
      [0, 0.36, -0.24],
    ],
    crest: [
      [0.06, 0.5, 1.42],
      [-0.06, 0.5, 1.42],
    ],
    sails: [
      { position: [0, 0.5, 0.52], rotation: [0.12, 0, 0], scale: 0.42 },
      { position: [0, 0.64, 0.32], rotation: [0.08, 0, 0], scale: 0.7 },
      { position: [0, 0.78, 0.12], rotation: [0.04, 0, 0], scale: 0.98 },
      { position: [0, 0.86, -0.08], rotation: [0, 0, 0], scale: 1.18 },
      { position: [0, 0.84, -0.28], rotation: [-0.04, 0, 0], scale: 1.08 },
      { position: [0, 0.7, -0.48], rotation: [-0.1, 0, 0], scale: 0.82 },
      { position: [0, 0.52, -0.66], rotation: [-0.16, 0, 0], scale: 0.54 },
      { position: [0, 0.36, -0.84], rotation: [-0.22, 0, 0], scale: 0.34 },
    ],
    creamFace: false,
  };
}

export function hipHeight(id: LegId): number {
  switch (id) {
    case "stubby":
      return 0.56;
    case "stilts":
      return 0.94;
    case "paddles":
      return 0.54;
    default:
      return assertNever(id, "Unknown legs");
  }
}

export function getCoastalMaps(hex: string, finish: Finish): CoastalMaps {
  const key = `skyrim:${finish}:${hex}`;
  const hit = MAP_CACHE.get(key);
  if (hit) return hit;

  const maps = paintMaps(hex, finish);
  MAP_CACHE.set(key, maps);
  return maps;
}

function paintMaps(hex: string, finish: Finish): CoastalMaps {
  // PS3 Skyrim coastal hide: readable scale, no dirt, no sponge grit.
  const size = 64;
  const albedo = makeCanvas(size);
  const spec = makeCanvas(size);
  const bump = makeCanvas(size);
  const a = albedo.getContext("2d");
  const s = spec.getContext("2d");
  const b = bump.getContext("2d");
  if (!a || !s || !b) {
    throw new Error("Canvas 2D unavailable");
  }

  const base = hexToRgb(hex);
  const rand = mulberry32(hashSeed(`skyrim:${finish}:${hex}`));
  const blotch = valueNoise(size, 5, rand);
  const grain = valueNoise(size, 11, rand);

  const contrast =
    finish === "plate" ? 0.07 : finish === "keratin" ? 0.055 : 0.05;
  const pitAmt = finish === "wet" ? 0.05 : finish === "plate" ? 0.07 : 0.06;

  const aData = a.createImageData(size, size);
  const sData = s.createImageData(size, size);
  const bData = b.createImageData(size, size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = y * size + x;
      const p = i * 4;
      const mottle = (blotch[i] - 0.5) * contrast;
      const grainN = (grain[i] - 0.5) * 0.045;
      const pit = poreHint(x, y, size) * pitAmt;
      const scales = poreHint(x, y, size) * (finish === "wet" ? 0 : 0.07);

      const lift = mottle + grainN - pit * 0.25 + scales * 0.18;
      const r = base[0] * (1 + lift);
      const g = base[1] * (1 + lift * 0.96);
      const bch = base[2] * (1 + lift * 0.9);

      aData.data[p] = clampByte(r);
      aData.data[p + 1] = clampByte(g);
      aData.data[p + 2] = clampByte(bch);
      aData.data[p + 3] = 255;

      const gloss =
        finish === "wet" ? 0.62 : finish === "keratin" ? 0.4 : 0.34;
      const specV = clamp01(gloss - pit * 0.15 + mottle * 0.08);
      const sv = Math.round(specV * 255);
      sData.data[p] = sv;
      sData.data[p + 1] = sv;
      sData.data[p + 2] = sv;
      sData.data[p + 3] = 255;

      const bumpV = Math.round(
        clamp01(0.5 + grainN * 0.35 - pit * 0.2 + scales * 0.45 + mottle * 0.15) *
          255,
      );
      bData.data[p] = bumpV;
      bData.data[p + 1] = bumpV;
      bData.data[p + 2] = bumpV;
      bData.data[p + 3] = 255;
    }
  }

  blurInPlace(bData.data, size, 1);

  a.putImageData(aData, 0, 0);
  s.putImageData(sData, 0, 0);
  b.putImageData(bData, 0, 0);

  return {
    map: eraTexture(albedo, SRGBColorSpace),
    specMap: eraTexture(spec, LinearSRGBColorSpace),
    bumpMap: eraTexture(bump, LinearSRGBColorSpace),
  };
}

function eraTexture(canvas: HTMLCanvasElement, space: ColorSpace): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = space;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = 1;
  texture.needsUpdate = true;
  return texture;
}

function blurInPlace(data: Uint8ClampedArray, size: number, radius: number): void {
  const copy = new Uint8ClampedArray(data);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let oy = -radius; oy <= radius; oy += 1) {
        for (let ox = -radius; ox <= radius; ox += 1) {
          const ix = Math.min(size - 1, Math.max(0, x + ox));
          const iy = Math.min(size - 1, Math.max(0, y + oy));
          const p = (iy * size + ix) * 4;
          r += copy[p];
          g += copy[p + 1];
          b += copy[p + 2];
          n += 1;
        }
      }
      const p = (y * size + x) * 4;
      data[p] = r / n;
      data[p + 1] = g / n;
      data[p + 2] = b / n;
    }
  }
}

function poreHint(x: number, y: number, size: number): number {
  const cells = 9;
  const u = (x / size) * cells;
  const v = (y / size) * cells;
  const row = Math.floor(v);
  const hx = u + (row % 2) * 0.5;
  const cx = hx - Math.floor(hx) - 0.5;
  const cy = v - row - 0.5;
  const d = Math.sqrt(cx * cx + cy * cy);
  return Math.max(0, 1 - d / 0.28) ** 2;
}

function valueNoise(
  size: number,
  cells: number,
  rand: () => number,
): Float32Array {
  const corners: number[] = [];
  for (let i = 0; i < (cells + 1) * (cells + 1); i += 1) {
    corners.push(rand());
  }
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const gx = (x / size) * cells;
      const gy = (y / size) * cells;
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const tx = fade(gx - x0);
      const ty = fade(gy - y0);
      const i00 = corners[y0 * (cells + 1) + x0];
      const i10 = corners[y0 * (cells + 1) + x0 + 1];
      const i01 = corners[(y0 + 1) * (cells + 1) + x0];
      const i11 = corners[(y0 + 1) * (cells + 1) + x0 + 1];
      out[y * size + x] =
        i00 * (1 - tx) * (1 - ty) +
        i10 * tx * (1 - ty) +
        i01 * (1 - tx) * ty +
        i11 * tx * ty;
    }
  }
  return out;
}

function makeCanvas(size: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) =>
    Math.round(clampByte(v)).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function fade(t: number): number {
  return t * t * (3 - 2 * t);
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function clampByte(v: number): number {
  return Math.min(255, Math.max(0, v));
}

function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
