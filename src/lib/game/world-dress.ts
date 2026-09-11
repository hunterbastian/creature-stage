import { WORLD_RADIUS } from "./constants";
import { NEST_LAYOUT } from "./wildlife";

/** Placement for ART_DIRECTION.md: shoreline groves, salt-light props, no forest wall. */

export type PropPose = {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  sx: number;
  sy: number;
  sz: number;
};

export type TidePoolSpec = {
  x: number;
  z: number;
  sx: number;
  sz: number;
  yaw: number;
};

export type ClearingSpec = {
  x: number;
  z: number;
  radius: number;
  color: string;
};

export type LandformKind = "cliff" | "isle" | "stack";

export type LandformSpec = {
  x: number;
  z: number;
  scale: number;
  rot: number;
  kind: LandformKind;
};

export type GroveSpec = {
  x: number;
  z: number;
  count: number;
  salt: number;
};

export type WorldDress = {
  grass: PropPose[];
  reeds: PropPose[];
  dryRocks: PropPose[];
  wetRocks: PropPose[];
  shells: PropPose[];
  kelp: PropPose[];
  driftwood: PropPose[];
  trunks: PropPose[];
  crowns: PropPose[];
  canopies: PropPose[];
  scrub: PropPose[];
  spirals: PropPose[];
  haze: HazeSpec[];
  tidePools: TidePoolSpec[];
  clearings: ClearingSpec[];
  landforms: LandformSpec[];
};

export type HazeSpec = {
  x: number;
  y: number;
  z: number;
  radius: number;
};

/** Shore pockets — kept off nest bowls so herds still have a clearing. */
export const TIDE_POOLS: TidePoolSpec[] = [
  { x: 12.6, z: 3.4, sx: 1.75, sz: 1.05, yaw: 0.35 },
  { x: -11.4, z: 7.2, sx: 1.45, sz: 0.88, yaw: -0.4 },
  { x: 3.4, z: -2.8, sx: 1.45, sz: 0.62, yaw: 0.2 },
  { x: -4.6, z: 1.6, sx: 1.12, sz: 0.5, yaw: 0.55 },
  { x: 10.6, z: -10.1, sx: 1.55, sz: 0.82, yaw: 1.05 },
];

/**
 * Pocket groves on the beach–meadow edge only. A full ring would read as a
 * temperate forest wall — forbidden by ART_DIRECTION.md.
 */
const GROVES: GroveSpec[] = [
  { x: 4.2, z: 9.4, count: 5, salt: 1 },
  { x: -9.6, z: 8.8, count: 4, salt: 3 },
  { x: -12.4, z: -6.6, count: 5, salt: 4 },
  { x: 12.4, z: -8.4, count: 5, salt: 5 },
  { x: -11.2, z: 1.6, count: 4, salt: 7 },
];

const HAZE: HazeSpec[] = [
  { x: 17.4, y: 0.42, z: 2.2, radius: 5.1 },
  { x: -16.6, y: 0.48, z: 6.4, radius: 4.7 },
  { x: 5.4, y: 0.4, z: -17.6, radius: 5.0 },
  { x: -7.2, y: 0.46, z: 16.8, radius: 4.5 },
  { x: 28.6, y: 0.62, z: 10.4, radius: 7.4 },
  { x: -24.8, y: 0.66, z: -16.2, radius: 6.8 },
];

const LANDFORMS: LandformSpec[] = [
  { x: 24, z: -10, scale: 4.4, rot: 0.4, kind: "cliff" },
  { x: 20, z: 18, scale: 3.6, rot: -0.55, kind: "cliff" },
  { x: -22, z: 16, scale: 4.0, rot: 0.9, kind: "cliff" },
  { x: -18, z: -20, scale: 3.2, rot: -0.2, kind: "cliff" },
  { x: 31, z: 6, scale: 2.8, rot: 0.7, kind: "isle" },
  { x: -29, z: -8, scale: 3.1, rot: -0.9, kind: "isle" },
  { x: 16.9, z: -18.2, scale: 1.55, rot: 0.3, kind: "stack" },
  { x: -17.6, z: 14.4, scale: 1.35, rot: 1.1, kind: "stack" },
];

function makeRng(salt: number): () => number {
  let seed = (salt * 9301 + 49297) % 233280;
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function pose(
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  rz: number,
  sx: number,
  sy: number,
  sz: number,
): PropPose {
  return { x, y, z, rx, ry, rz, sx, sy, sz };
}

function nestPoint(
  nest: (typeof NEST_LAYOUT)[number],
  angle: number,
  radius: number,
): { x: number; z: number } {
  const a = nest.yaw + angle;
  return {
    x: nest.x + Math.sin(a) * radius,
    z: nest.z + Math.cos(a) * radius,
  };
}

function poolRadius(pool: TidePoolSpec): number {
  return Math.max(pool.sx, pool.sz) * 0.55 + 0.32;
}

function nearNest(x: number, z: number, min: number): boolean {
  return NEST_LAYOUT.some((nest) => Math.hypot(nest.x - x, nest.z - z) < min);
}

function nearPool(x: number, z: number, extra = 0): boolean {
  return TIDE_POOLS.some(
    (pool) => Math.hypot(pool.x - x, pool.z - z) < poolRadius(pool) + extra,
  );
}

function blocked(x: number, z: number, nestMin: number): boolean {
  const r = Math.hypot(x, z);
  if (r < 2.0 || r > WORLD_RADIUS - 0.35) return true;
  if (nearNest(x, z, nestMin)) return true;
  if (nearPool(x, z)) return true;
  return false;
}

function scatter(
  count: number,
  salt: number,
  nestMin: number,
  pick: (rand: () => number) => { x: number; z: number } | null,
  toPose: (x: number, z: number, rand: () => number) => PropPose,
): PropPose[] {
  const rand = makeRng(salt);
  const out: PropPose[] = [];
  let guard = 0;
  while (out.length < count && guard < count * 18) {
    guard += 1;
    const at = pick(rand);
    if (!at || blocked(at.x, at.z, nestMin)) continue;
    out.push(toPose(at.x, at.z, rand));
  }
  return out;
}

function ringPick(
  rand: () => number,
  inner: number,
  outer: number,
): { x: number; z: number } {
  const angle = rand() * Math.PI * 2;
  const radius = inner + rand() * Math.max(0.2, outer - inner);
  return {
    x: Math.sin(angle) * radius,
    z: Math.cos(angle) * radius,
  };
}

function nestClearings(): ClearingSpec[] {
  return [
    { x: NEST_LAYOUT[0].x, z: NEST_LAYOUT[0].z, radius: 2.2, color: "#6e7a4c" },
    { x: NEST_LAYOUT[1].x, z: NEST_LAYOUT[1].z, radius: 2.28, color: "#8a8462" },
    { x: NEST_LAYOUT[2].x, z: NEST_LAYOUT[2].z, radius: 2.16, color: "#7a7650" },
  ];
}

function nestDress(): {
  dryRocks: PropPose[];
  wetRocks: PropPose[];
  driftwood: PropPose[];
  reeds: PropPose[];
  shells: PropPose[];
  kelp: PropPose[];
  spirals: PropPose[];
} {
  const home = NEST_LAYOUT[0];
  const tide = NEST_LAYOUT[1];
  const bramble = NEST_LAYOUT[2];

  const h1 = nestPoint(home, 0.55, 2.05);
  const h2 = nestPoint(home, 2.15, 2.22);
  const h3 = nestPoint(home, 4.05, 1.92);
  const hWood = nestPoint(home, 5.15, 2.12);
  const hReedA = nestPoint(home, 1.25, 2.38);
  const hReedB = nestPoint(home, 3.4, 2.42);
  const hShellA = nestPoint(home, 0.9, 1.78);
  const hShellB = nestPoint(home, 4.55, 1.82);

  const tRockA = nestPoint(tide, 0.4, 2.0);
  const tRockB = nestPoint(tide, 2.4, 2.18);
  const tWood = nestPoint(tide, 4.1, 2.08);
  const tKelp = nestPoint(tide, 5.4, 2.28);
  const tShellA = nestPoint(tide, 1.3, 1.72);
  const tShellB = nestPoint(tide, 3.2, 1.8);

  const b1 = nestPoint(bramble, 0.7, 2.02);
  const b2 = nestPoint(bramble, 2.5, 2.2);
  const b3 = nestPoint(bramble, 4.3, 1.88);
  const bWood = nestPoint(bramble, 5.6, 2.15);
  const bReed = nestPoint(bramble, 1.6, 2.4);

  return {
    dryRocks: [
      pose(h1.x, 0.09, h1.z, 0.2, 0.4, 0.08, 0.28, 0.22, 0.24),
      pose(h2.x, 0.07, h2.z, 0.12, 1.3, 0.1, 0.2, 0.16, 0.18),
      pose(h3.x, 0.06, h3.z, 0.16, 2.2, 0.06, 0.16, 0.13, 0.15),
      pose(b1.x, 0.1, b1.z, 0.18, 0.6, 0.1, 0.3, 0.24, 0.26),
      pose(b2.x, 0.08, b2.z, 0.14, 1.8, 0.08, 0.22, 0.18, 0.2),
      pose(b3.x, 0.07, b3.z, 0.2, 2.7, 0.05, 0.18, 0.14, 0.16),
    ],
    wetRocks: [
      pose(tRockA.x, 0.07, tRockA.z, 0.22, 0.5, 0.12, 0.26, 0.18, 0.22),
      pose(tRockB.x, 0.06, tRockB.z, 0.16, 1.7, 0.09, 0.2, 0.14, 0.18),
    ],
    driftwood: [
      pose(hWood.x, 0.065, hWood.z, Math.PI / 2, 0.55, 0.08, 0.07, 0.42, 0.07),
      pose(tWood.x, 0.06, tWood.z, Math.PI / 2, 2.05, 0.12, 0.065, 0.46, 0.065),
      pose(bWood.x, 0.065, bWood.z, Math.PI / 2, -0.72, 0.06, 0.07, 0.4, 0.07),
    ],
    reeds: [
      pose(hReedA.x, 0.16, hReedA.z, 0.08, 0.4, 0.04, 0.028, 0.32, 0.028),
      pose(hReedB.x, 0.14, hReedB.z, 0.1, 1.1, -0.05, 0.024, 0.28, 0.024),
      pose(bReed.x, 0.15, bReed.z, 0.07, 2.0, 0.03, 0.026, 0.3, 0.026),
    ],
    shells: [
      pose(hShellA.x, 0.018, hShellA.z, 0.2, 0.6, 0.1, 0.055, 0.018, 0.042),
      pose(hShellB.x, 0.016, hShellB.z, 0.15, 2.1, 0.2, 0.048, 0.016, 0.036),
      pose(tShellA.x, 0.016, tShellA.z, 0.18, 1.2, 0.15, 0.05, 0.016, 0.038),
      pose(tShellB.x, 0.015, tShellB.z, 0.12, 2.8, 0.08, 0.042, 0.014, 0.032),
    ],
    kelp: [
      pose(tKelp.x, 0.12, tKelp.z, 0.45, 2.05, 0.12, 0.07, 0.26, 0.05),
    ],
    spirals: [
      pose(hShellA.x + 0.22, 0.03, hShellA.z + 0.16, 1.15, 0.4, 0.2, 0.07, 0.07, 0.026),
      pose(tShellB.x - 0.18, 0.028, tShellB.z + 0.12, 1.05, 1.8, 0.15, 0.075, 0.075, 0.028),
      pose(b1.x + 0.14, 0.03, b1.z - 0.2, 1.2, -0.5, 0.1, 0.068, 0.068, 0.024),
    ],
  };
}

function groveTrees(
  groves: GroveSpec[],
  withTips: boolean,
): {
  trunks: PropPose[];
  crowns: PropPose[];
  canopies: PropPose[];
  scrub: PropPose[];
} {
  const trunks: PropPose[] = [];
  const crowns: PropPose[] = [];
  const canopies: PropPose[] = [];
  const scrub: PropPose[] = [];

  for (const grove of groves) {
    const rand = makeRng(40 + grove.salt * 17);
    let placed = 0;
    let guard = 0;
    while (placed < grove.count && guard < grove.count * 16) {
      guard += 1;
      const angle = rand() * Math.PI * 2;
      const spread = 0.35 + rand() * 2.35;
      const x = grove.x + Math.sin(angle) * spread;
      const z = grove.z + Math.cos(angle) * spread;
      const radial = Math.hypot(x, z);
      if (radial < 9.7 || radial > 15.25) continue;
      if (blocked(x, z, 2.55)) continue;
      if (trunks.some((tree) => Math.hypot(tree.x - x, tree.z - z) < 0.78)) {
        continue;
      }

      const s = 0.88 + rand() * 0.48;
      const inlandX = radial > 0.001 ? -x / radial : 0;
      const inlandZ = radial > 0.001 ? -z / radial : 0;
      const outward = Math.atan2(x, z);
      const lean = 0.24 + rand() * 0.12;
      const rx = lean * Math.cos(outward);
      const rz = -lean * Math.sin(outward);
      trunks.push(
        pose(x, 0.5 * s, z, rx, outward, rz, 0.088 * s, 1.04 * s, 0.088 * s),
      );
      crowns.push(
        pose(
          x + inlandX * 0.4 * s,
          1.06 * s,
          z + inlandZ * 0.4 * s,
          0.38 + rand() * 0.08,
          outward,
          0.06,
          0.44 * s,
          0.38 * s,
          0.9 * s,
        ),
      );
      if (withTips) {
        canopies.push(
          pose(
            x + inlandX * 0.58 * s,
            1.5 * s,
            z + inlandZ * 0.58 * s,
            0.42,
            outward + 0.12,
            0.05,
            0.26 * s,
            0.64 * s,
            0.22 * s,
          ),
        );
      }

      if (rand() > 0.32) {
        const bx = x + inlandX * (0.62 + rand() * 0.45);
        const bz = z + inlandZ * (0.62 + rand() * 0.45);
        if (!blocked(bx, bz, 2.4)) {
          const bs = 0.62 + rand() * 0.4;
          scrub.push(
            pose(bx, 0.22 * bs, bz, 0.18, outward, 0.12, 0.32 * bs, 0.24 * bs, 0.26 * bs),
          );
        }
      }

      placed += 1;
    }
  }

  return { trunks, crowns, canopies, scrub };
}

function poolRocks(mobile: boolean): PropPose[] {
  const out: PropPose[] = [];
  TIDE_POOLS.forEach((pool, index) => {
    const rand = makeRng(70 + index * 9);
    const n = mobile ? 3 : 4;
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2 + rand() * 0.35;
      const r = poolRadius(pool) + 0.08 + rand() * 0.22;
      const x = pool.x + Math.cos(a) * r * (pool.sx / Math.max(pool.sx, pool.sz));
      const z = pool.z + Math.sin(a) * r * (pool.sz / Math.max(pool.sx, pool.sz));
      if (nearNest(x, z, 2.2)) continue;
      const s = 0.14 + rand() * 0.12;
      out.push(pose(x, s * 0.45, z, 0.25, a, 0.12, s, s * 0.7, s * 0.85));
    }
  });
  return out;
}

export function seedWorldDress(mobile: boolean): WorldDress {
  const groves = mobile
    ? GROVES.filter((grove) => grove.salt !== 3)
    : GROVES;
  const trees = groveTrees(groves, !mobile);
  const dressed = nestDress();

  const grass = scatter(
    mobile ? 22 : 38,
    3,
    2.35,
    (rand) => ringPick(rand, 2.6, WORLD_RADIUS - 2.4),
    (x, z, rand) => {
      const s = 0.2 + rand() * 0.2;
      return pose(x, s * 0.5, z, 0.04, rand() * Math.PI * 2, 0.03, s * 0.24, s, s * 0.24);
    },
  );

  const reeds = scatter(
    mobile ? 10 : 16,
    21,
    2.2,
    (rand) => ringPick(rand, WORLD_RADIUS - 4.6, WORLD_RADIUS - 1.15),
    (x, z, rand) => {
      const s = 0.3 + rand() * 0.2;
      return pose(
        x,
        s * 0.52,
        z,
        0.08 + rand() * 0.1,
        rand() * Math.PI * 2,
        (rand() - 0.5) * 0.08,
        0.026,
        s,
        0.026,
      );
    },
  ).concat(dressed.reeds);

  const dryRocks = scatter(
    mobile ? 10 : 16,
    11,
    2.25,
    (rand) => ringPick(rand, 3.2, WORLD_RADIUS - 1.4),
    (x, z, rand) => {
      const s = 0.16 + rand() * 0.2;
      return pose(x, s * 0.42, z, 0.18, rand() * Math.PI * 2, 0.1, s, s * 0.72, s * 0.88);
    },
  ).concat(dressed.dryRocks);

  const wetRocks = scatter(
    mobile ? 7 : 11,
    29,
    2.2,
    (rand) => {
      if (rand() > 0.4) {
        const pool = TIDE_POOLS[Math.floor(rand() * TIDE_POOLS.length)];
        const a = rand() * Math.PI * 2;
        const r = poolRadius(pool) + 0.35 + rand() * 0.7;
        return { x: pool.x + Math.sin(a) * r, z: pool.z + Math.cos(a) * r };
      }
      return ringPick(rand, WORLD_RADIUS - 2.4, WORLD_RADIUS - 0.55);
    },
    (x, z, rand) => {
      const s = 0.14 + rand() * 0.16;
      return pose(x, s * 0.38, z, 0.22, rand() * Math.PI * 2, 0.14, s, s * 0.62, s * 0.82);
    },
  )
    .concat(dressed.wetRocks)
    .concat(poolRocks(mobile));

  const shells = scatter(
    mobile ? 18 : 32,
    41,
    1.7,
    (rand) => {
      if (rand() > 0.55) {
        const pool = TIDE_POOLS[Math.floor(rand() * TIDE_POOLS.length)];
        const a = rand() * Math.PI * 2;
        const r = 0.35 + rand() * (poolRadius(pool) + 0.55);
        return { x: pool.x + Math.sin(a) * r, z: pool.z + Math.cos(a) * r };
      }
      return ringPick(rand, WORLD_RADIUS - 2.8, WORLD_RADIUS - 0.45);
    },
    (x, z, rand) => {
      const s = 0.034 + rand() * 0.028;
      return pose(
        x,
        0.014,
        z,
        0.15 + rand() * 0.2,
        rand() * Math.PI * 2,
        rand() * 0.3,
        s,
        s * 0.32,
        s * 0.72,
      );
    },
  ).concat(dressed.shells);

  const kelp = scatter(
    mobile ? 10 : 16,
    53,
    2.15,
    (rand) => ringPick(rand, WORLD_RADIUS - 2.15, WORLD_RADIUS + 0.15),
    (x, z, rand) => {
      const s = 0.2 + rand() * 0.16;
      return pose(
        x,
        s * 0.42,
        z,
        0.4 + rand() * 0.35,
        rand() * Math.PI * 2,
        0.15,
        0.06 + rand() * 0.03,
        s,
        0.045,
      );
    },
  ).concat(dressed.kelp);

  const driftwood = scatter(
    mobile ? 5 : 8,
    61,
    2.2,
    (rand) => ringPick(rand, WORLD_RADIUS - 3.4, WORLD_RADIUS - 0.7),
    (x, z, rand) => {
      const len = 0.34 + rand() * 0.22;
      const radius = 0.055 + rand() * 0.02;
      return pose(
        x,
        radius * 0.95,
        z,
        Math.PI / 2 + (rand() - 0.5) * 0.18,
        rand() * Math.PI * 2,
        (rand() - 0.5) * 0.2,
        radius,
        len,
        radius,
      );
    },
  ).concat(dressed.driftwood);

  const spirals = scatter(
    mobile ? 5 : 8,
    83,
    1.65,
    (rand) => {
      const pool = TIDE_POOLS[Math.floor(rand() * TIDE_POOLS.length)];
      const a = rand() * Math.PI * 2;
      const r = 0.45 + rand() * (poolRadius(pool) + 0.4);
      return { x: pool.x + Math.sin(a) * r, z: pool.z + Math.cos(a) * r };
    },
    (x, z, rand) => {
      const s = 0.055 + rand() * 0.03;
      return pose(
        x,
        0.028,
        z,
        1.05 + rand() * 0.25,
        rand() * Math.PI * 2,
        rand() * 0.25,
        s,
        s,
        s * 0.38,
      );
    },
  ).concat(dressed.spirals);

  const duneScrub = scatter(
    mobile ? 6 : 10,
    73,
    2.3,
    (rand) => ringPick(rand, WORLD_RADIUS - 4.2, WORLD_RADIUS - 1.6),
    (x, z, rand) => {
      const s = 0.42 + rand() * 0.28;
      return pose(
        x,
        0.18 * s,
        z,
        0.12,
        rand() * Math.PI * 2,
        0.08,
        0.24 * s,
        0.2 * s,
        0.2 * s,
      );
    },
  );

  return {
    grass,
    reeds,
    dryRocks,
    wetRocks,
    shells,
    kelp,
    driftwood,
    trunks: trees.trunks,
    crowns: trees.crowns,
    canopies: trees.canopies,
    scrub: trees.scrub.concat(duneScrub),
    spirals,
    haze: mobile ? HAZE.slice(0, 3) : HAZE,
    tidePools: TIDE_POOLS,
    clearings: nestClearings(),
    landforms: LANDFORMS,
  };
}
