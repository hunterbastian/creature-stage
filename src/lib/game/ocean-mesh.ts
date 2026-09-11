import { BufferAttribute, BufferGeometry, Color } from "three";
import { OCEAN_RADIUS } from "./offshore";
import { waterColor } from "./shore-look";

const scratch = new Color();

/**
 * Flat polar disc with a shallows → mid → deep vertex tint.
 * ~300 verts on mobile — one draw for the whole ocean grade.
 */
export function createOceanGeometry(
  radialSegs: number,
  thetaSegs: number,
): BufferGeometry {
  const rings = radialSegs;
  const vertsPerRing = thetaSegs;
  const vertexCount = 1 + rings * vertsPerRing;
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);

  waterColor(0, 0, scratch);
  colors[0] = scratch.r;
  colors[1] = scratch.g;
  colors[2] = scratch.b;

  for (let ri = 1; ri <= rings; ri += 1) {
    const radius = (ri / rings) * OCEAN_RADIUS;
    for (let ti = 0; ti < vertsPerRing; ti += 1) {
      const angle = (ti / vertsPerRing) * Math.PI * 2;
      const index = 1 + (ri - 1) * vertsPerRing + ti;
      positions[index * 3] = Math.sin(angle) * radius;
      positions[index * 3 + 1] = 0;
      positions[index * 3 + 2] = Math.cos(angle) * radius;
      waterColor(radius, angle, scratch);
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
