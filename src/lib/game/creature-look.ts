import {
  CanvasTexture,
  LinearFilter,
  LinearSRGBColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  type ColorSpace,
} from "three";
import { KIT_SOCKETS, LEG_DROP, type KitSockets } from "./saurian-sockets";
import type { BodyId, LegId } from "./types";

export type Finish = "skin" | "keratin" | "wet" | "plate";

export type Vec3 = [number, number, number];

/** Ivory modules + coastal teal eye from the locked Skyrim-saurian vibe. */
export const SHELL_CREAM = "#eee4d0";
export const BELLY_CREAM = "#eadfca";
export const FACE_CREAM = "#e6dcc6";
export const CLAW_GREY = "#3f3c38";
export const EYE_GLASS = "#7eb89a";

export type BodyPlan = KitSockets;

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
  return KIT_SOCKETS[id];
}

export function hipHeight(id: LegId): number {
  return LEG_DROP[id];
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
      const hex = hexScale(x, y, size);
      const scales = finish === "wet" ? 0 : hex.fill * 0.1 + hex.rim * 0.08;

      const lift = mottle + grainN - pit * 0.25 + scales + hex.light * 0.04;
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
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
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
  return hexScale(x, y, size).fill ** 2;
}

function hexScale(
  x: number,
  y: number,
  size: number,
): { fill: number; rim: number; light: number } {
  const cells = 11;
  const u = (x / size) * cells;
  const v = (y / size) * cells;
  const row = Math.floor(v);
  const hx = u + (row % 2) * 0.5;
  const cx = hx - Math.floor(hx) - 0.5;
  const cy = v - row - 0.5;
  const d = Math.sqrt(cx * cx + cy * cy);
  const fill = Math.max(0, 1 - d / 0.42);
  const rim = Math.max(0, 1 - Math.abs(d - 0.34) / 0.07);
  const light = cx * 0.28 + cy * 0.42;
  return { fill, rim, light };
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
