#!/usr/bin/env node
/**
 * Build Tideform coastal prop GLB kit (unit-space hero meshes).
 *
 * Local space matches the primitives CoastalDress used to instance:
 *   rock / shelf / crown / scrub  → unit sphere-ish (dodeca / icosa r=1)
 *   driftwood / trunk             → Y-up cylinder height 1, radius ~1
 *   kelp / reed / canopy          → Y-up cone-ish height 1, radius ~1
 *   shell                         → unit sphere
 *   spiral                        → torus in XY (major r=1, tube ~0.36)
 *
 * Pose scales + collision cylinders stay in worldgen / collision.ts.
 * Do not retarget radii from these mesh bounds.
 *
 *   node scripts/blender/build_coastal_props.mjs
 *   node scripts/blender/build_coastal_props.mjs --out public/models/coastal-props.glb
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_OUT = resolve(ROOT, "public/models/coastal-props.glb");

const MATS = {
  prop_rock_dry: [0.541, 0.51, 0.463, 1],
  prop_rock_wet: [0.369, 0.408, 0.392, 1],
  prop_rock_shelf: [0.478, 0.463, 0.424, 1],
  prop_shell: [0.894, 0.847, 0.769, 1],
  prop_spiral: [0.91, 0.863, 0.784, 1],
  prop_kelp: [0.29, 0.353, 0.267, 1],
  prop_driftwood: [0.604, 0.541, 0.439, 1],
  prop_trunk: [0.478, 0.416, 0.322, 1],
  prop_crown: [0.353, 0.408, 0.282, 1],
  prop_canopy: [0.384, 0.439, 0.314, 1],
  prop_scrub: [0.38, 0.408, 0.298, 1],
  prop_reed: [0.361, 0.408, 0.282, 1],
};

function parseOut() {
  const idx = process.argv.indexOf("--out");
  if (idx >= 0 && process.argv[idx + 1]) return resolve(process.argv[idx + 1]);
  return DEFAULT_OUT;
}

function clamp(v, a, b) {
  return Math.min(b, Math.max(a, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function noise3(x, y, z, salt) {
  return (
    Math.sin(x * 2.13 + y * 1.71 + salt) * 0.47 +
    Math.sin(x * 5.27 - z * 3.41 + salt * 1.3) * 0.31 +
    Math.sin(y * 7.03 + z * 4.19 - salt) * 0.22
  );
}

class Mesh {
  constructor() {
    this.positions = [];
    this.indices = [];
  }

  vert(x, y, z) {
    this.positions.push(x, y, z);
    return this.positions.length / 3 - 1;
  }

  tri(a, b, c) {
    this.indices.push(a, b, c);
  }

  quad(a, b, c, d) {
    this.tri(a, b, c);
    this.tri(a, c, d);
  }

  bounds() {
    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    let maxR = 0;
    for (let i = 0; i < this.positions.length; i += 3) {
      const x = this.positions[i];
      const y = this.positions[i + 1];
      const z = this.positions[i + 2];
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
      maxR = Math.max(maxR, Math.hypot(x, y, z));
    }
    return { minX, minY, minZ, maxX, maxY, maxZ, maxR };
  }

  normals() {
    const n = this.positions.length / 3;
    const out = new Float32Array(n * 3);
    for (let i = 0; i < this.indices.length; i += 3) {
      const a = this.indices[i];
      const b = this.indices[i + 1];
      const c = this.indices[i + 2];
      const ax = this.positions[a * 3];
      const ay = this.positions[a * 3 + 1];
      const az = this.positions[a * 3 + 2];
      const bx = this.positions[b * 3];
      const by = this.positions[b * 3 + 1];
      const bz = this.positions[b * 3 + 2];
      const cx = this.positions[c * 3];
      const cy = this.positions[c * 3 + 1];
      const cz = this.positions[c * 3 + 2];
      const ux = bx - ax;
      const uy = by - ay;
      const uz = bz - az;
      const vx = cx - ax;
      const vy = cy - ay;
      const vz = cz - az;
      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;
      out[a * 3] += nx;
      out[a * 3 + 1] += ny;
      out[a * 3 + 2] += nz;
      out[b * 3] += nx;
      out[b * 3 + 1] += ny;
      out[b * 3 + 2] += nz;
      out[c * 3] += nx;
      out[c * 3 + 1] += ny;
      out[c * 3 + 2] += nz;
    }
    for (let i = 0; i < n; i += 1) {
      const x = out[i * 3];
      const y = out[i * 3 + 1];
      const z = out[i * 3 + 2];
      const len = Math.hypot(x, y, z) || 1;
      out[i * 3] = x / len;
      out[i * 3 + 1] = y / len;
      out[i * 3 + 2] = z / len;
    }
    return out;
  }
}

function icosphere(subdiv, radius = 1) {
  const t = (1 + Math.sqrt(5)) / 2;
  const raw = [
    [-1, t, 0],
    [1, t, 0],
    [-1, -t, 0],
    [1, -t, 0],
    [0, -1, t],
    [0, 1, t],
    [0, -1, -t],
    [0, 1, -t],
    [t, 0, -1],
    [t, 0, 1],
    [-t, 0, -1],
    [-t, 0, 1],
  ];
  const mesh = new Mesh();
  const verts = raw.map(([x, y, z]) => {
    const len = Math.hypot(x, y, z);
    return mesh.vert((x / len) * radius, (y / len) * radius, (z / len) * radius);
  });
  const faces = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];
  const midCache = new Map();
  const midpoint = (a, b) => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    const hit = midCache.get(key);
    if (hit !== undefined) return hit;
    const ax = mesh.positions[a * 3];
    const ay = mesh.positions[a * 3 + 1];
    const az = mesh.positions[a * 3 + 2];
    const bx = mesh.positions[b * 3];
    const by = mesh.positions[b * 3 + 1];
    const bz = mesh.positions[b * 3 + 2];
    const x = (ax + bx) * 0.5;
    const y = (ay + by) * 0.5;
    const z = (az + bz) * 0.5;
    const len = Math.hypot(x, y, z) || 1;
    const id = mesh.vert((x / len) * radius, (y / len) * radius, (z / len) * radius);
    midCache.set(key, id);
    return id;
  };
  let tris = faces.map(([a, b, c]) => [verts[a], verts[b], verts[c]]);
  for (let s = 0; s < subdiv; s += 1) {
    const next = [];
    midCache.clear();
    for (const [a, b, c] of tris) {
      const ab = midpoint(a, b);
      const bc = midpoint(b, c);
      const ca = midpoint(c, a);
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    tris = next;
  }
  for (const [a, b, c] of tris) mesh.tri(a, b, c);
  return mesh;
}

function displaceRock(mesh, salt, opts) {
  const { jagged = 1, flatten = 0.22, squashY = 1, stretchX = 1, stretchZ = 1 } = opts;
  const n = mesh.positions.length / 3;
  for (let i = 0; i < n; i += 1) {
    let x = mesh.positions[i * 3] * stretchX;
    let y = mesh.positions[i * 3 + 1] * squashY;
    let z = mesh.positions[i * 3 + 2] * stretchZ;
    const nse = noise3(x, y, z, salt);
    const nse2 = noise3(x * 1.8, y * 1.4, z * 1.6, salt + 4.2);
    const bump = 1 + (nse * 0.16 + nse2 * 0.08) * jagged;
    x *= bump;
    y *= bump * (1 - flatten * 0.12);
    z *= bump;
    if (y < -0.18) {
      const t = clamp((-0.18 - y) / 0.7, 0, 1);
      y = lerp(y, -0.62, t * 0.72);
      const pinch = 1 - t * 0.18;
      x *= pinch;
      z *= pinch;
    }
    mesh.positions[i * 3] = x;
    mesh.positions[i * 3 + 1] = y;
    mesh.positions[i * 3 + 2] = z;
  }
  const { maxR } = mesh.bounds();
  const scale = 1.02 / Math.max(0.001, maxR);
  for (let i = 0; i < mesh.positions.length; i += 1) mesh.positions[i] *= scale;
  return mesh;
}

function rockDry() {
  return displaceRock(icosphere(2, 1), 1.7, {
    jagged: 1.15,
    flatten: 0.28,
    squashY: 0.92,
    stretchX: 1.08,
    stretchZ: 0.94,
  });
}

function rockWet() {
  return displaceRock(icosphere(2, 1), 8.4, {
    jagged: 0.72,
    flatten: 0.38,
    squashY: 0.78,
    stretchX: 1.12,
    stretchZ: 1.04,
  });
}

function rockShelf() {
  return displaceRock(icosphere(2, 1), 12.1, {
    jagged: 0.85,
    flatten: 0.5,
    squashY: 0.52,
    stretchX: 1.22,
    stretchZ: 0.88,
  });
}

function lathe(profile, segs) {
  const mesh = new Mesh();
  const rings = profile.length;
  const ids = [];
  for (let i = 0; i < rings; i += 1) {
    const [py, pr] = profile[i];
    const row = [];
    for (let s = 0; s < segs; s += 1) {
      const a = (s / segs) * Math.PI * 2;
      row.push(mesh.vert(Math.cos(a) * pr, py, Math.sin(a) * pr));
    }
    ids.push(row);
  }
  for (let i = 0; i < rings - 1; i += 1) {
    for (let s = 0; s < segs; s += 1) {
      const n = (s + 1) % segs;
      mesh.quad(ids[i][s], ids[i][n], ids[i + 1][n], ids[i + 1][s]);
    }
  }
  return mesh;
}

function driftwood() {
  const rings = 12;
  const segs = 8;
  const profile = [];
  for (let i = 0; i < rings; i += 1) {
    const t = i / (rings - 1);
    const y = lerp(-0.5, 0.5, t);
    const envelope = Math.pow(Math.sin(t * Math.PI), 0.55);
    const waist = 0.62 + 0.38 * envelope;
    const bark = 0.9 + 0.1 * Math.sin(t * 18.0);
    const endChip = t < 0.08 || t > 0.92 ? 0.72 : 1;
    profile.push([y, waist * bark * endChip]);
  }
  const mesh = lathe(profile, segs);
  const n = mesh.positions.length / 3;
  for (let i = 0; i < n; i += 1) {
    let x = mesh.positions[i * 3];
    let y = mesh.positions[i * 3 + 1];
    let z = mesh.positions[i * 3 + 2];
    const t = (y + 0.5);
    x += 0.14 * Math.sin(t * Math.PI);
    z += 0.06 * Math.sin(t * Math.PI * 2 + 0.4);
    const knotA = Math.exp(-(((t - 0.32) * 9) ** 2));
    const knotB = Math.exp(-(((t - 0.68) * 10) ** 2));
    const bump = 1 + knotA * 0.28 + knotB * 0.22;
    x *= bump;
    z *= bump;
    const groove = 1 + 0.05 * Math.sin(Math.atan2(z, x) * 6 + y * 8);
    x *= groove;
    z *= groove;
    mesh.positions[i * 3] = x;
    mesh.positions[i * 3 + 1] = y;
    mesh.positions[i * 3 + 2] = z;
  }
  normalizeRadius(mesh, 1.12);
  return mesh;
}

function trunk() {
  const rings = 8;
  const segs = 8;
  const profile = [];
  for (let i = 0; i < rings; i += 1) {
    const t = i / (rings - 1);
    const y = lerp(-0.5, 0.5, t);
    const r = lerp(1.18, 1.0, t);
    profile.push([y, r]);
  }
  const mesh = lathe(profile, segs);
  const n = mesh.positions.length / 3;
  for (let i = 0; i < n; i += 1) {
    let x = mesh.positions[i * 3];
    const y = mesh.positions[i * 3 + 1];
    let z = mesh.positions[i * 3 + 2];
    const ang = Math.atan2(z, x);
    const bark = 1 + 0.055 * Math.sin(ang * 8) + 0.03 * Math.sin(y * 14 + ang * 3);
    x *= bark;
    z *= bark * 0.96;
    mesh.positions[i * 3] = x;
    mesh.positions[i * 3 + 2] = z;
  }
  return mesh;
}

function kelp() {
  const mesh = new Mesh();
  const cols = 3;
  const rows = 11;
  const ids = [];
  for (let r = 0; r < rows; r += 1) {
    const row = [];
    const t = r / (rows - 1);
    const y = lerp(-0.5, 0.5, t);
    const width = lerp(1.0, 0.18, t * t);
    const wave = Math.sin(t * 7.2) * 0.16 * (0.35 + t);
    const wave2 = Math.sin(t * 3.4 + 0.6) * 0.08;
    for (let c = 0; c < cols; c += 1) {
      const u = cols === 1 ? 0 : c / (cols - 1);
      const x = lerp(-width, width, u);
      const z = wave + wave2 * (u - 0.5) * 2 + (u - 0.5) * 0.04;
      row.push(mesh.vert(x, y, z));
    }
    ids.push(row);
  }
  for (let r = 0; r < rows - 1; r += 1) {
    for (let c = 0; c < cols - 1; c += 1) {
      mesh.quad(ids[r][c], ids[r][c + 1], ids[r + 1][c + 1], ids[r + 1][c]);
      mesh.quad(ids[r][c + 1], ids[r][c], ids[r + 1][c], ids[r + 1][c + 1]);
    }
  }
  return mesh;
}

function reed() {
  const mesh = new Mesh();
  const blades = [
    { yaw: 0, lean: 0.08, h: 1, w: 0.92 },
    { yaw: 2.15, lean: -0.06, h: 0.86, w: 0.7 },
    { yaw: -2.05, lean: 0.05, h: 0.78, w: 0.58 },
  ];
  for (const blade of blades) {
    const rows = 7;
    const ids = [];
    for (let r = 0; r < rows; r += 1) {
      const t = r / (rows - 1);
      const y = lerp(-0.5, -0.5 + blade.h, t);
      const w = lerp(blade.w, 0.03, t);
      const x0 = -w;
      const x1 = w;
      const z = blade.lean * t * t;
      const ca = Math.cos(blade.yaw);
      const sa = Math.sin(blade.yaw);
      const a = mesh.vert(x0 * ca, y, x0 * sa + z);
      const b = mesh.vert(x1 * ca, y, x1 * sa + z);
      ids.push([a, b]);
    }
    for (let r = 0; r < rows - 1; r += 1) {
      mesh.quad(ids[r][0], ids[r][1], ids[r + 1][1], ids[r + 1][0]);
      mesh.quad(ids[r][1], ids[r][0], ids[r + 1][0], ids[r + 1][1]);
    }
  }
  return mesh;
}

function shell() {
  const rings = 8;
  const segs = 12;
  const mesh = new Mesh();
  const ids = [];
  for (let i = 0; i < rings; i += 1) {
    const t = i / (rings - 1);
    const lat = t * Math.PI * 0.52;
    const row = [];
    for (let s = 0; s <= segs; s += 1) {
      const u = s / segs;
      const lon = u * Math.PI * 2;
      const ridge = 1 + 0.08 * Math.sin(lon * 9);
      const r = Math.sin(lat) * ridge;
      const y = -0.12 + Math.cos(lat) * 0.55 * (0.55 + 0.45 * Math.sin(lat));
      const x = Math.cos(lon) * r;
      const z = Math.sin(lon) * r * 0.78;
      row.push(mesh.vert(x, y, z));
    }
    ids.push(row);
  }
  for (let i = 0; i < rings - 1; i += 1) {
    for (let s = 0; s < segs; s += 1) {
      mesh.quad(ids[i][s], ids[i][s + 1], ids[i + 1][s + 1], ids[i + 1][s]);
    }
  }
  const { maxR } = mesh.bounds();
  const scale = 1 / Math.max(0.001, maxR);
  for (let i = 0; i < mesh.positions.length; i += 1) mesh.positions[i] *= scale;
  return mesh;
}

function spiral() {
  const turns = 2.4;
  const path = 20;
  const segs = 8;
  const mesh = new Mesh();
  const rings = [];
  for (let i = 0; i < path; i += 1) {
    const t = i / (path - 1);
    const ang = t * turns * Math.PI * 2;
    const rad = lerp(0.14, 1.0, Math.pow(t, 0.82));
    const cx = Math.cos(ang) * rad;
    const cy = Math.sin(ang) * rad;
    const tube = lerp(0.2, 0.36, Math.sin(t * Math.PI)) * (0.92 - t * 0.12);
    const normalX = Math.cos(ang);
    const normalY = Math.sin(ang);
    const row = [];
    for (let s = 0; s < segs; s += 1) {
      const a = (s / segs) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      row.push(
        mesh.vert(
          cx + normalX * ca * tube * 0.42,
          cy + normalY * ca * tube * 0.42,
          sa * tube,
        ),
      );
    }
    rings.push(row);
  }
  for (let i = 0; i < path - 1; i += 1) {
    for (let s = 0; s < segs; s += 1) {
      const n = (s + 1) % segs;
      mesh.quad(rings[i][s], rings[i][n], rings[i + 1][n], rings[i + 1][s]);
    }
  }
  const { maxR } = mesh.bounds();
  const scale = 1.18 / Math.max(0.001, maxR);
  for (let i = 0; i < mesh.positions.length; i += 1) mesh.positions[i] *= scale;
  return mesh;
}

function lumpySphere(subdiv, salt, squashY, stretchZ) {
  const mesh = icosphere(subdiv, 1);
  const n = mesh.positions.length / 3;
  for (let i = 0; i < n; i += 1) {
    let x = mesh.positions[i * 3];
    let y = mesh.positions[i * 3 + 1] * squashY;
    let z = mesh.positions[i * 3 + 2] * stretchZ;
    const nse = noise3(x * 1.4, y * 1.6, z * 1.3, salt);
    const clump = 1 + nse * 0.18 + Math.abs(nse) * 0.08;
    x *= clump;
    y *= clump;
    z *= clump;
    mesh.positions[i * 3] = x;
    mesh.positions[i * 3 + 1] = y;
    mesh.positions[i * 3 + 2] = z;
  }
  const { maxR } = mesh.bounds();
  const scale = 1 / Math.max(0.001, maxR);
  for (let i = 0; i < mesh.positions.length; i += 1) mesh.positions[i] *= scale;
  return mesh;
}

function crown() {
  return lumpySphere(2, 3.2, 0.82, 1.22);
}

function canopy() {
  const mesh = lumpySphere(2, 6.8, 1.05, 0.92);
  const n = mesh.positions.length / 3;
  for (let i = 0; i < n; i += 1) {
    let x = mesh.positions[i * 3];
    let y = mesh.positions[i * 3 + 1];
    let z = mesh.positions[i * 3 + 2];
    const taper = lerp(1.12, 0.55, clamp((y + 0.5), 0, 1));
    x *= taper;
    z *= taper;
    y = lerp(-0.5, 0.5, clamp((y + 0.62) / 1.2, 0, 1));
    mesh.positions[i * 3] = x;
    mesh.positions[i * 3 + 1] = y;
    mesh.positions[i * 3 + 2] = z;
  }
  const { maxR } = mesh.bounds();
  const scale = 1 / Math.max(0.001, maxR);
  for (let i = 0; i < mesh.positions.length; i += 1) mesh.positions[i] *= scale;
  return mesh;
}

function scrub() {
  const mesh = lumpySphere(2, 9.5, 0.7, 1.05);
  const n = mesh.positions.length / 3;
  for (let i = 0; i < n; i += 1) {
    let y = mesh.positions[i * 3 + 1];
    if (y < -0.15) y = lerp(y, -0.42, 0.65);
    mesh.positions[i * 3 + 1] = y;
  }
  const { maxR } = mesh.bounds();
  const scale = 1 / Math.max(0.001, maxR);
  for (let i = 0; i < mesh.positions.length; i += 1) mesh.positions[i] *= scale;
  return mesh;
}

function normalizeRadius(mesh, target) {
  const { maxR } = mesh.bounds();
  const scale = target / Math.max(0.001, maxR);
  for (let i = 0; i < mesh.positions.length; i += 1) mesh.positions[i] *= scale;
  return mesh;
}

function pad4(n) {
  return (4 - (n % 4)) % 4;
}

function encodeGLB(meshes) {
  const json = {
    asset: { version: "2.0", generator: "tideform-coastal-props" },
    scene: 0,
    scenes: [{ nodes: meshes.map((_, i) => i) }],
    nodes: [],
    meshes: [],
    accessors: [],
    bufferViews: [],
    buffers: [{ byteLength: 0 }],
    materials: [],
  };

  const chunks = [];
  let offset = 0;
  const align = () => {
    const pad = pad4(offset);
    if (pad) {
      chunks.push(Buffer.alloc(pad));
      offset += pad;
    }
  };

  meshes.forEach((item, index) => {
    const positions = Float32Array.from(item.mesh.positions);
    const normals = item.mesh.normals();
    const indices = Uint16Array.from(item.mesh.indices);
    const b = item.mesh.bounds();

    align();
    const posView = offset;
    const posBuf = Buffer.from(positions.buffer, positions.byteOffset, positions.byteLength);
    chunks.push(posBuf);
    offset += posBuf.length;
    json.bufferViews.push({
      buffer: 0,
      byteOffset: posView,
      byteLength: posBuf.length,
      target: 34962,
    });
    json.accessors.push({
      bufferView: json.bufferViews.length - 1,
      componentType: 5126,
      count: positions.length / 3,
      type: "VEC3",
      min: [b.minX, b.minY, b.minZ],
      max: [b.maxX, b.maxY, b.maxZ],
    });
    const posAcc = json.accessors.length - 1;

    align();
    const nrmView = offset;
    const nrmBuf = Buffer.from(normals.buffer, normals.byteOffset, normals.byteLength);
    chunks.push(nrmBuf);
    offset += nrmBuf.length;
    json.bufferViews.push({
      buffer: 0,
      byteOffset: nrmView,
      byteLength: nrmBuf.length,
      target: 34962,
    });
    json.accessors.push({
      bufferView: json.bufferViews.length - 1,
      componentType: 5126,
      count: normals.length / 3,
      type: "VEC3",
    });
    const nrmAcc = json.accessors.length - 1;

    align();
    const idxView = offset;
    const idxBuf = Buffer.from(indices.buffer, indices.byteOffset, indices.byteLength);
    chunks.push(idxBuf);
    offset += idxBuf.length;
    json.bufferViews.push({
      buffer: 0,
      byteOffset: idxView,
      byteLength: idxBuf.length,
      target: 34963,
    });
    json.accessors.push({
      bufferView: json.bufferViews.length - 1,
      componentType: 5123,
      count: indices.length,
      type: "SCALAR",
    });
    const idxAcc = json.accessors.length - 1;

    json.materials.push({
      name: `mat_${item.name}`,
      pbrMetallicRoughness: {
        baseColorFactor: MATS[item.name] ?? [0.7, 0.7, 0.7, 1],
        metallicFactor: 0,
        roughnessFactor: 0.72,
      },
    });
    json.meshes.push({
      name: item.name,
      primitives: [
        {
          attributes: { POSITION: posAcc, NORMAL: nrmAcc },
          indices: idxAcc,
          material: index,
        },
      ],
    });
    json.nodes.push({ name: item.name, mesh: index });
  });

  align();
  const bin = Buffer.concat(chunks);
  json.buffers[0].byteLength = bin.length;

  let jsonStr = JSON.stringify(json);
  const jsonPad = pad4(jsonStr.length);
  if (jsonPad) jsonStr += " ".repeat(jsonPad);
  const jsonBuf = Buffer.from(jsonStr, "utf8");
  const binPad = pad4(bin.length);
  const binPadded = binPad ? Buffer.concat([bin, Buffer.alloc(binPad)]) : bin;

  const total = 12 + 8 + jsonBuf.length + 8 + binPadded.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(total, 8);
  const jsonHead = Buffer.alloc(8);
  jsonHead.writeUInt32LE(jsonBuf.length, 0);
  jsonHead.writeUInt32LE(0x4e4f534a, 4);
  const binHead = Buffer.alloc(8);
  binHead.writeUInt32LE(binPadded.length, 0);
  binHead.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonHead, jsonBuf, binHead, binPadded]);
}

function main() {
  const recipes = [
    { name: "prop_rock_dry", mesh: rockDry() },
    { name: "prop_rock_wet", mesh: rockWet() },
    { name: "prop_rock_shelf", mesh: rockShelf() },
    { name: "prop_shell", mesh: shell() },
    { name: "prop_spiral", mesh: spiral() },
    { name: "prop_kelp", mesh: kelp() },
    { name: "prop_driftwood", mesh: driftwood() },
    { name: "prop_trunk", mesh: trunk() },
    { name: "prop_crown", mesh: crown() },
    { name: "prop_canopy", mesh: canopy() },
    { name: "prop_scrub", mesh: scrub() },
    { name: "prop_reed", mesh: reed() },
  ];

  const stats = recipes.map((item) => ({
    name: item.name,
    verts: item.mesh.positions.length / 3,
    tris: item.mesh.indices.length / 3,
    maxR: Number(item.mesh.bounds().maxR.toFixed(3)),
  }));

  const out = parseOut();
  mkdirSync(dirname(out), { recursive: true });
  const glb = encodeGLB(recipes);
  writeFileSync(out, glb);
  console.log(
    JSON.stringify(
      { out, bytes: glb.length, meshes: stats },
      null,
      2,
    ),
  );
}

main();
