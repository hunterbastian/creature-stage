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

/** Seafoam / ivory from the locked coastal saurian keyart. */
export const SHELL_CREAM = "#e8dcc4";
export const BELLY_CREAM = "#eadfc8";
export const FACE_CREAM = "#e6d4b8";
export const CLAW_GREY = "#5a5650";
export const EYE_AMBER = "#8a6a38";

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

/** Bipedal hunter — locked cliff theropod. */
function theropodPlan(): BodyPlan {
  return {
    stance: "biped",
    pitch: -0.1,
    hip: { x: 0.2, z: -0.02 },
    shoulder: { x: 0.28, z: 0.48 },
    torso: { position: [0, 0.08, -0.1], scale: [0.64, 0.74, 0.88] },
    chest: { position: [0, 0.18, 0.36], scale: [0.74, 0.9, 1.12] },
    belly: { position: [0, -0.02, 0.16], scale: [0.66, 0.52, 0.98] },
    neckJoints: [{ position: [0, 0.3, 0.82], scale: [0.44, 0.46, 0.58] }],
    neckCream: [{ position: [0, 0.18, 0.86], scale: [0.36, 0.28, 0.5] }],
    head: { position: [0, 0.42, 1.16], scale: [0.58, 0.5, 1.08] },
    face: { position: [0, 0.4, 1.3], scale: [0.62, 0.48, 0.7] },
    snout: { position: [0, 0.36, 1.46], scale: [0.4, 0.28, 0.46] },
    jaw: [0, 0.28, 1.62],
    eye: { x: 0.2, y: 0.5, z: 1.28 },
    brow: { x: 0.16, y: 0.6, z: 1.12 },
    faceSpiralScale: 1.08,
    arm: { position: [0.28, 0.14, 0.48], rotation: [0.82, 0, 0.92] },
    tailRoot: { position: [0, 0.16, -0.5], rotation: [-0.2, 0, 0] },
    tailLength: 1.38,
    spirals: [
      { position: [0, 0.54, 0.92], rotation: [-0.55, 0, 0], scale: 0.72 },
      { position: [0, 0.52, 0.74], rotation: [-0.48, 0, 0], scale: 0.82 },
      { position: [0, 0.54, 0.52], rotation: [-0.42, 0, 0], scale: 1.12 },
      { position: [0.1, 0.48, 0.4], rotation: [-0.35, 0.45, 0], scale: 0.88 },
      { position: [-0.1, 0.48, 0.4], rotation: [-0.35, -0.45, 0], scale: 0.88 },
      { position: [0, 0.52, 0.28], rotation: [-0.3, 0, 0], scale: 1.02 },
      { position: [0.12, 0.46, 0.16], rotation: [-0.22, 0.5, 0], scale: 0.78 },
      { position: [-0.12, 0.46, 0.16], rotation: [-0.22, -0.5, 0], scale: 0.78 },
      { position: [0, 0.48, 0.04], rotation: [-0.18, 0, 0], scale: 0.9 },
      { position: [0, 0.42, -0.14], rotation: [-0.12, 0, 0], scale: 0.72 },
      { position: [0, 0.36, -0.32], rotation: [-0.06, 0, 0], scale: 0.58 },
    ],
    nubs: [
      [0, 0.44, 0.36],
      [0, 0.4, 0.12],
      [0, 0.34, -0.1],
    ],
    crest: [
      [0, 0.6, 1.08],
      [0, 0.56, 0.94],
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
    faceSpiralScale: 0.78,
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

/** Locked Stego (head E) — small beaked herbivore, cream spiral plates. */
function stegosaurPlan(): BodyPlan {
  return {
    stance: "quad",
    pitch: 0.02,
    hip: { x: 0.32, z: -0.44 },
    shoulder: { x: 0.28, z: 0.54 },
    torso: { position: [0, 0.1, -0.1], scale: [0.9, 0.68, 1.52] },
    chest: { position: [0, 0.12, 0.44], scale: [0.78, 0.6, 1.08] },
    belly: { position: [0, -0.06, 0.08], scale: [0.76, 0.44, 1.32] },
    neckJoints: [
      { position: [0, 0.16, 0.84], scale: [0.32, 0.28, 0.5] },
      { position: [0, 0.18, 1.16], scale: [0.24, 0.22, 0.44] },
      { position: [0, 0.18, 1.44], scale: [0.2, 0.18, 0.36] },
    ],
    neckCream: [{ position: [0, 0.08, 1.04], scale: [0.22, 0.14, 0.52] }],
    head: { position: [0, 0.22, 1.64], scale: [0.34, 0.28, 0.56] },
    face: { position: [0, 0.2, 1.78], scale: [0.28, 0.22, 0.4] },
    snout: { position: [0, 0.16, 1.92], scale: [0.18, 0.14, 0.28] },
    jaw: [0, 0.12, 2.02],
    eye: { x: 0.11, y: 0.28, z: 1.68 },
    brow: { x: 0.08, y: 0.32, z: 1.54 },
    faceSpiralScale: 0,
    arm: { position: [0.42, 0.12, 0.42], rotation: [0.1, 0, 0.26] },
    tailRoot: { position: [0, 0.12, -0.82], rotation: [-0.1, 0, 0] },
    tailLength: 1.66,
    spirals: [],
    nubs: [],
    crest: [],
    sails: [
      { position: [0, 0.38, 0.72], rotation: [0.16, 0, 0], scale: 0.28 },
      { position: [0, 0.48, 0.54], rotation: [0.12, 0, 0], scale: 0.46 },
      { position: [0, 0.6, 0.36], rotation: [0.08, 0, 0], scale: 0.68 },
      { position: [0, 0.74, 0.18], rotation: [0.05, 0, 0], scale: 0.92 },
      { position: [0, 0.86, 0.02], rotation: [0.02, 0, 0], scale: 1.16 },
      { position: [0, 0.94, -0.14], rotation: [0, 0, 0], scale: 1.34 },
      { position: [0, 0.96, -0.3], rotation: [-0.02, 0, 0], scale: 1.4 },
      { position: [0, 0.9, -0.46], rotation: [-0.05, 0, 0], scale: 1.22 },
      { position: [0, 0.78, -0.62], rotation: [-0.08, 0, 0], scale: 0.98 },
      { position: [0, 0.62, -0.76], rotation: [-0.12, 0, 0], scale: 0.74 },
      { position: [0, 0.46, -0.9], rotation: [-0.16, 0, 0], scale: 0.52 },
      { position: [0, 0.34, -1.04], rotation: [-0.2, 0, 0], scale: 0.36 },
      { position: [0, 0.24, -1.16], rotation: [-0.24, 0, 0], scale: 0.24 },
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
  const key = `${finish}:${hex}`;
  const hit = MAP_CACHE.get(key);
  if (hit) return hit;

  const maps = paintMaps(hex, finish);
  MAP_CACHE.set(key, maps);
  return maps;
}

function paintMaps(hex: string, finish: Finish): CoastalMaps {
  // Skyrim-coastal hides: mild scale, light salt, no sponge-crab grit.
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
  const dirtRgb: [number, number, number] = [74, 62, 48];
  const rand = mulberry32(hashSeed(`${finish}:${hex}`));
  const blotch = valueNoise(size, 5, rand);
  const grain = valueNoise(size, 11, rand);
  const stain = valueNoise(size, 3, rand);

  const contrast =
    finish === "plate" ? 0.1 : finish === "keratin" ? 0.07 : 0.06;
  const pitAmt = finish === "wet" ? 0.08 : finish === "plate" ? 0.12 : 0.1;

  const aData = a.createImageData(size, size);
  const sData = s.createImageData(size, size);
  const bData = b.createImageData(size, size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = y * size + x;
      const p = i * 4;
      const mottle = (blotch[i] - 0.5) * contrast;
      const grit = (grain[i] - 0.5) * 0.07;
      const pit = poreHint(x, y, size) * pitAmt;
      const dirt = Math.max(0, stain[i] - 0.72) * 0.12;
      const scales = poreHint(x, y, size) * (finish === "wet" ? 0 : 0.08);

      const lift = mottle + grit - pit * 0.45 + scales * 0.25;
      let r = base[0] * (1 + lift);
      let g = base[1] * (1 + lift * 0.94);
      let bch = base[2] * (1 + lift * 0.78);
      r = r * (1 - dirt) + dirtRgb[0] * dirt;
      g = g * (1 - dirt) + dirtRgb[1] * dirt;
      bch = bch * (1 - dirt) + dirtRgb[2] * dirt;

      aData.data[p] = clampByte(r);
      aData.data[p + 1] = clampByte(g);
      aData.data[p + 2] = clampByte(bch);
      aData.data[p + 3] = 255;

      const gloss =
        finish === "wet" ? 0.55 : finish === "keratin" ? 0.36 : 0.28;
      const specV = clamp01(gloss - pit * 0.35 - dirt * 0.2 + mottle * 0.12);
      const sv = Math.round(specV * 255);
      sData.data[p] = sv;
      sData.data[p + 1] = sv;
      sData.data[p + 2] = sv;
      sData.data[p + 3] = 255;

      const bumpV = Math.round(
        clamp01(0.52 + grit * 0.5 - pit * 0.45 + scales * 0.7 + mottle * 0.25) * 255,
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
