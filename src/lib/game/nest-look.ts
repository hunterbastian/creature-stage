/**
 * Authored nest-bowl visuals. The lathe profile is `nestBowlHeight` so the
 * weave sits on the same walkable floor/rim collision uses.
 */
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  LatheGeometry,
  LinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
  Vector2,
} from "three";
import {
  NEST_BLEND_RADIUS,
  NEST_FLOOR_LIFT,
  NEST_FLOOR_RADIUS,
  NEST_RIM_LIFT,
  NEST_RIM_RADIUS,
  nestBowlHeight,
  smoothstep,
} from "./collision";
import { liftHex, shadeHex } from "./creature-look";
import { assertNever, type SpeciesId } from "./types";

export {
  NEST_BLEND_RADIUS,
  NEST_FLOOR_LIFT,
  NEST_FLOOR_RADIUS,
  NEST_RIM_LIFT,
  NEST_RIM_RADIUS,
};

/** Worn packed-earth stain under the bowl (ground depression read). */
export const NEST_SCOOP = "#5c5340";
/** Inner lining / down. */
export const NEST_LINING = "#efe4c8";
export const NEST_SALT = "#f2eadc";

const PACKED = new Color("#5a4c38");
const SAND = new Color("#c2b080");
const RIM_DIRT = new Color("#8a8064");
const BERM = new Color("#5c6844");
const scratch = new Color();

let bowlGeo: BufferGeometry | null = null;

function mixColor(a: Color, b: Color, t: number, target: Color): Color {
  return target.copy(a).lerp(b, t);
}

export function nestBowlGeometry(): BufferGeometry {
  if (bowlGeo) return bowlGeo;

  const samples = 20;
  const points: Vector2[] = [];
  for (let i = 0; i <= samples; i += 1) {
    const radius = (i / samples) * NEST_BLEND_RADIUS;
    // Keep the outer lip a hair above the island so the lathe does not z-fight.
    points.push(new Vector2(radius, Math.max(0.01, nestBowlHeight(radius))));
  }
  points.push(new Vector2(NEST_BLEND_RADIUS + 0.06, 0.01));

  const geometry = new LatheGeometry(points, 28);
  const pos = geometry.getAttribute("position");
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i += 1) {
    const radius = Math.hypot(pos.getX(i), pos.getZ(i));
    const t = radius / NEST_BLEND_RADIUS;
    mixColor(PACKED, SAND, smoothstep(0.12, 0.48, t), scratch);
    mixColor(scratch, RIM_DIRT, smoothstep(0.48, 0.72, t), scratch);
    mixColor(scratch, BERM, smoothstep(0.78, 1.05, t), scratch);
    colors[i * 3] = scratch.r;
    colors[i * 3 + 1] = scratch.g;
    colors[i * 3 + 2] = scratch.b;
  }
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  bowlGeo = geometry;
  return geometry;
}

export type ReedPose = {
  x: number;
  y: number;
  z: number;
  lean: number;
  rot: number;
  roll: number;
  sx: number;
  sy: number;
  sz: number;
};

function reed(
  angle: number,
  radius: number,
  y: number,
  lean: number,
  roll: number,
  length: number,
  thick = 0.028,
): ReedPose {
  return {
    x: Math.sin(angle) * radius,
    y,
    z: Math.cos(angle) * radius,
    lean,
    rot: angle,
    roll,
    sx: thick,
    sy: length,
    sz: thick * 1.15,
  };
}

/** Nearly-horizontal basket weave around the rim crest. */
export const RIM_WEAVE: readonly ReedPose[] = [
  reed(0.12, 0.66, 0.5, 1.22, 0.16, 0.5, 0.026),
  reed(0.75, 0.74, 0.56, 0.92, -0.12, 0.48, 0.03),
  reed(1.38, 0.65, 0.49, 1.18, 0.2, 0.52, 0.024),
  reed(2.02, 0.73, 0.55, 0.88, -0.18, 0.46, 0.029),
  reed(2.64, 0.67, 0.51, 1.2, 0.14, 0.5, 0.027),
  reed(3.28, 0.75, 0.57, 0.9, -0.1, 0.47, 0.031),
  reed(3.9, 0.66, 0.5, 1.16, 0.18, 0.51, 0.025),
  reed(4.52, 0.74, 0.56, 0.94, -0.14, 0.49, 0.028),
  reed(5.14, 0.65, 0.48, 1.21, 0.12, 0.5, 0.026),
  reed(5.76, 0.73, 0.55, 0.86, -0.16, 0.47, 0.03),
];

/** Messy outer sticks spilled on the berm. */
export const SPILL_TWIGS: readonly ReedPose[] = [
  reed(0.4, 0.92, 0.42, 0.55, 0.15, 0.5, 0.032),
  reed(1.85, 0.88, 0.4, -0.45, 0.12, 0.46, 0.03),
  reed(3.4, 0.96, 0.38, 0.7, 0.18, 0.52, 0.034),
  reed(4.55, 0.9, 0.41, -0.35, 0.1, 0.48, 0.028),
  reed(5.7, 0.94, 0.39, 0.5, 0.14, 0.5, 0.031),
];

export type NestShellBit = { x: number; z: number; yaw: number; tilt: number };

export const NEST_SHELLS: readonly NestShellBit[] = [
  { x: 0.28, z: -0.12, yaw: 0.6, tilt: -0.45 },
  { x: -0.22, z: 0.2, yaw: 2.1, tilt: -0.32 },
];

export function clutchOffsets(
  count: number,
): readonly { x: number; z: number; phase: number }[] {
  if (count <= 1) return [{ x: 0.02, z: 0.015, phase: 0.4 }];
  const radius = count === 2 ? 0.145 : 0.175;
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 + 0.4;
    return {
      x: Math.sin(angle) * radius,
      z: Math.cos(angle) * radius,
      phase: index * 1.7,
    };
  });
}

/** Eggs sit on the lining, not hovering above the weave. */
export const EGG_SIT = NEST_FLOOR_LIFT + 0.168;

export function liningFinish(speciesId: SpeciesId): {
  color: string;
  shininess: number;
} {
  switch (speciesId) {
    case "sporling":
      return { color: NEST_LINING, shininess: 9 };
    case "tideglider":
      return { color: "#e4eee8", shininess: 16 };
    case "brambleback":
      return { color: "#efe6d4", shininess: 7 };
    default:
      return assertNever(speciesId, "Unknown nest species");
  }
}

export function reedColor(speciesId: SpeciesId): string {
  switch (speciesId) {
    case "sporling":
      return "#d4c4a0";
    case "tideglider":
      return "#c4d0b8";
    case "brambleback":
      return "#c8b898";
    default:
      return assertNever(speciesId, "Unknown nest species");
  }
}

export function rimLight(
  isHome: boolean,
  claimable: boolean,
  aimed: boolean,
): { color: string; emissive: string; intensity: number } {
  if (aimed) {
    return { color: "#e8f4d0", emissive: "#c8e8a8", intensity: 0.22 };
  }
  if (isHome) {
    return { color: "#f2ead0", emissive: "#e8d8a8", intensity: 0.16 };
  }
  if (claimable) {
    return { color: "#d8e8dc", emissive: "#9ec8b0", intensity: 0.12 };
  }
  return { color: "#eadfc8", emissive: "#d4c4a0", intensity: 0.07 };
}

const WEAVE_CACHE = new Map<string, CanvasTexture>();

export function getNestWeaveMap(hex: string): CanvasTexture {
  const hit = WEAVE_CACHE.get(hex);
  if (hit) return hit;

  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D unavailable");
  }

  const dark = shadeHex(hex, 0.22);
  const light = liftHex(hex, 0.18);
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = dark;
  ctx.lineWidth = 3.2;
  for (let i = -2; i < 10; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 8, 0);
    ctx.lineTo(i * 8 + 18, size);
    ctx.stroke();
  }
  ctx.strokeStyle = light;
  ctx.lineWidth = 2.1;
  for (let i = -2; i < 10; i += 1) {
    ctx.beginPath();
    ctx.moveTo(0, i * 8);
    ctx.lineTo(size, i * 8 + 14);
    ctx.stroke();
  }
  ctx.strokeStyle = shadeHex(hex, 0.08);
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 8; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 9 + 2, 0);
    ctx.lineTo(i * 9 + 10, size);
    ctx.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(2.4, 1.1);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  WEAVE_CACHE.set(hex, texture);
  return texture;
}
