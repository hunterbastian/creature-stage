import {
  BufferAttribute,
  BufferGeometry,
  Color,
} from "three";
import {
  BEACH_INNER_RADIUS,
  ISLAND_MESH_RADIUS,
  surfaceHeight,
} from "./collision";
import { WORLD_RADIUS } from "./constants";

const MEADOW = new Color("#5f7a48");
const SAND = new Color("#c2b080");
const WET = new Color("#c4b48a");
const FOAM = new Color("#c5d0c4");
const scratch = new Color();

function terrainColor(radius: number, target: Color): Color {
  const beach = smooth01(BEACH_INNER_RADIUS - 1.8, BEACH_INNER_RADIUS + 0.2, radius);
  target.copy(MEADOW).lerp(SAND, beach);
  const wet = smooth01(WORLD_RADIUS - 0.9, WORLD_RADIUS + 0.4, radius);
  target.lerp(WET, wet);
  const foamIn = smooth01(WORLD_RADIUS + 0.02, WORLD_RADIUS + 0.5, radius);
  const foamOut = 1 - smooth01(WORLD_RADIUS + 0.5, WORLD_RADIUS + 1.35, radius);
  target.lerp(FOAM, foamIn * foamOut * 0.62);
  return target;
}

function smooth01(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Polar grid displaced by `surfaceHeight` so feet and dirt share one field.
 * ~1–2k verts — cheap enough for iOS Safari landscape.
 */
export function createIslandGeometry(
  radialSegs: number,
  thetaSegs: number,
): BufferGeometry {
  const rings = radialSegs;
  const vertsPerRing = thetaSegs;
  const vertexCount = 1 + rings * vertsPerRing;
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);

  const y0 = surfaceHeight(0, 0);
  positions[0] = 0;
  positions[1] = y0;
  positions[2] = 0;
  terrainColor(0, scratch);
  colors[0] = scratch.r;
  colors[1] = scratch.g;
  colors[2] = scratch.b;

  for (let ri = 1; ri <= rings; ri += 1) {
    const radius = (ri / rings) * ISLAND_MESH_RADIUS;
    for (let ti = 0; ti < vertsPerRing; ti += 1) {
      const angle = (ti / vertsPerRing) * Math.PI * 2;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      const index = 1 + (ri - 1) * vertsPerRing + ti;
      positions[index * 3] = x;
      positions[index * 3 + 1] = surfaceHeight(x, z);
      positions[index * 3 + 2] = z;
      terrainColor(radius, scratch);
      colors[index * 3] = scratch.r;
      colors[index * 3 + 1] = scratch.g;
      colors[index * 3 + 2] = scratch.b;
    }
  }

  const indices: number[] = [];
  for (let ti = 0; ti < vertsPerRing; ti += 1) {
    const a = 1 + ti;
    const b = 1 + ((ti + 1) % vertsPerRing);
    indices.push(0, b, a);
  }
  for (let ri = 1; ri < rings; ri += 1) {
    const ring = 1 + (ri - 1) * vertsPerRing;
    const next = 1 + ri * vertsPerRing;
    for (let ti = 0; ti < vertsPerRing; ti += 1) {
      const a = ring + ti;
      const b = ring + ((ti + 1) % vertsPerRing);
      const c = next + ti;
      const d = next + ((ti + 1) % vertsPerRing);
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
