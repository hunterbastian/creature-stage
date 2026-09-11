import { WORLD_RADIUS } from "../constants";
import { NEST_LAYOUT } from "../wildlife";
import { BAND, WORLDGEN_SEED, densityFor } from "./density";
import {
  nearNest,
  sectorSitsOnWaterline,
  seedLayout,
  sectorsOf,
  type WorldLayout,
} from "./layout";
import {
  blocked,
  grounded,
  pose,
  ringPick,
  scatter,
  sectorPick,
} from "./place";
import { createRng, saltSeed } from "./rng";
import type { GroveSpec, PropPose, WorldDress } from "./types";
import { GROVE_OVERLOOK, TIDE_SHELF, isGroveOverlook } from "./landmarks";

function rng(salt: number): () => number {
  return createRng(saltSeed(WORLDGEN_SEED, salt));
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
      grounded(h1.x, 0.09, h1.z, 0.2, 0.4, 0.08, 0.28, 0.22, 0.24),
      grounded(h2.x, 0.07, h2.z, 0.12, 1.3, 0.1, 0.2, 0.16, 0.18),
      grounded(h3.x, 0.06, h3.z, 0.16, 2.2, 0.06, 0.16, 0.13, 0.15),
      grounded(b1.x, 0.1, b1.z, 0.18, 0.6, 0.1, 0.3, 0.24, 0.26),
      grounded(b2.x, 0.08, b2.z, 0.14, 1.8, 0.08, 0.22, 0.18, 0.2),
      grounded(b3.x, 0.07, b3.z, 0.2, 2.7, 0.05, 0.18, 0.14, 0.16),
    ],
    wetRocks: [
      grounded(tRockA.x, 0.07, tRockA.z, 0.22, 0.5, 0.12, 0.26, 0.18, 0.22),
      grounded(tRockB.x, 0.06, tRockB.z, 0.16, 1.7, 0.09, 0.2, 0.14, 0.18),
    ],
    driftwood: [
      grounded(hWood.x, 0.065, hWood.z, Math.PI / 2, 0.55, 0.08, 0.07, 0.42, 0.07),
      grounded(tWood.x, 0.06, tWood.z, Math.PI / 2, 2.05, 0.12, 0.065, 0.46, 0.065),
      grounded(bWood.x, 0.065, bWood.z, Math.PI / 2, -0.72, 0.06, 0.07, 0.4, 0.07),
    ],
    reeds: [
      grounded(hReedA.x, 0.16, hReedA.z, 0.08, 0.4, 0.04, 0.028, 0.32, 0.028),
      grounded(hReedB.x, 0.14, hReedB.z, 0.1, 1.1, -0.05, 0.024, 0.28, 0.024),
      grounded(bReed.x, 0.15, bReed.z, 0.07, 2.0, 0.03, 0.026, 0.3, 0.026),
    ],
    shells: [
      grounded(hShellA.x, 0.018, hShellA.z, 0.2, 0.6, 0.1, 0.055, 0.018, 0.042),
      grounded(hShellB.x, 0.016, hShellB.z, 0.15, 2.1, 0.2, 0.048, 0.016, 0.036),
      grounded(tShellA.x, 0.016, tShellA.z, 0.18, 1.2, 0.15, 0.05, 0.016, 0.038),
      grounded(tShellB.x, 0.015, tShellB.z, 0.12, 2.8, 0.08, 0.042, 0.014, 0.032),
    ],
    kelp: [grounded(tKelp.x, 0.12, tKelp.z, 0.45, 2.05, 0.12, 0.07, 0.26, 0.05)],
    spirals: [
      grounded(
        hShellA.x + 0.22,
        0.03,
        hShellA.z + 0.16,
        1.15,
        0.4,
        0.2,
        0.07,
        0.07,
        0.026,
      ),
      grounded(
        tShellB.x - 0.18,
        0.028,
        tShellB.z + 0.12,
        1.05,
        1.8,
        0.15,
        0.075,
        0.075,
        0.028,
      ),
      grounded(b1.x + 0.14, 0.03, b1.z - 0.2, 1.2, -0.5, 0.1, 0.068, 0.068, 0.024),
    ],
  };
}

function groveTrees(
  layout: WorldLayout,
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
    const rand = rng(40 + grove.salt * 17);
    const heading = Math.atan2(grove.x, grove.z);
    const baseR = Math.hypot(grove.x, grove.z);
    let placed = 0;
    let guard = 0;
    while (placed < grove.count && guard < grove.count * 18) {
      guard += 1;
      const da = (rand() - 0.5) * grove.span;
      const radial = baseR + (rand() - 0.5) * 1.65;
      const angle = heading + da;
      const x = Math.sin(angle) * radial;
      const z = Math.cos(angle) * radial;
      if (radial < BAND.groveInner || radial > BAND.groveOuter) continue;
      if (isGroveOverlook(grove.salt) && radial > baseR + 0.08) continue;
      if (blocked(layout.tidePools, x, z, 2.7, 0.15)) continue;
      if (trunks.some((tree) => Math.hypot(tree.x - x, tree.z - z) < 0.82)) {
        continue;
      }

      const s = 0.92 + rand() * 0.52;
      const inlandX = radial > 0.001 ? -x / radial : 0;
      const inlandZ = radial > 0.001 ? -z / radial : 0;
      const outward = Math.atan2(x, z);
      const lean = 0.26 + rand() * 0.14;
      const rx = lean * Math.cos(outward);
      const rz = -lean * Math.sin(outward);
      trunks.push(
        pose(x, 0.52 * s, z, rx, outward, rz, 0.09 * s, 1.08 * s, 0.09 * s),
      );
      crowns.push(
        pose(
          x + inlandX * 0.42 * s,
          1.1 * s,
          z + inlandZ * 0.42 * s,
          0.38 + rand() * 0.08,
          outward,
          0.06,
          0.46 * s,
          0.4 * s,
          0.94 * s,
        ),
      );
      if (withTips) {
        canopies.push(
          pose(
            x + inlandX * 0.6 * s,
            1.56 * s,
            z + inlandZ * 0.6 * s,
            0.42,
            outward + 0.12,
            0.05,
            0.27 * s,
            0.66 * s,
            0.23 * s,
          ),
        );
      }

      if (rand() > 0.28) {
        const bx = x + inlandX * (0.62 + rand() * 0.48);
        const bz = z + inlandZ * (0.62 + rand() * 0.48);
        if (!blocked(layout.tidePools, bx, bz, 2.5)) {
          const bs = 0.64 + rand() * 0.4;
          scrub.push(
            grounded(
              bx,
              0.22 * bs,
              bz,
              0.18,
              outward,
              0.12,
              0.32 * bs,
              0.24 * bs,
              0.26 * bs,
            ),
          );
        }
      }

      placed += 1;
    }
  }

  return { trunks, crowns, canopies, scrub };
}

function overlookFurniture(): { dryRocks: PropPose[]; driftwood: PropPose[] } {
  const sea = GROVE_OVERLOOK.yaw;
  const sx = Math.sin(sea);
  const sz = Math.cos(sea);
  const px = GROVE_OVERLOOK.x + sx * 1.58;
  const pz = GROVE_OVERLOOK.z + sz * 1.58;
  return {
    dryRocks: [
      grounded(px, 0.28, pz, 0.16, sea, 0.08, 0.64, 0.44, 0.5),
      grounded(
        px + sz * 0.72,
        0.16,
        pz - sx * 0.72,
        0.22,
        sea + 0.55,
        0.1,
        0.34,
        0.24,
        0.3,
      ),
    ],
    driftwood: [
      grounded(
        px - sz * 0.88,
        0.07,
        pz + sx * 0.88,
        Math.PI / 2,
        sea + 0.38,
        0.1,
        0.072,
        0.54,
        0.072,
      ),
    ],
  };
}

function tideShelfRocks(): PropPose[] {
  const sea = TIDE_SHELF.yaw;
  const sx = Math.sin(sea + 0.4);
  const sz = Math.cos(sea + 0.4);
  return [
    grounded(
      TIDE_SHELF.x + sx * 1.85,
      0.22,
      TIDE_SHELF.z + sz * 1.85,
      0.28,
      sea,
      0.12,
      0.48,
      0.28,
      0.4,
    ),
    grounded(
      TIDE_SHELF.x - sx * 1.55,
      0.18,
      TIDE_SHELF.z + sz * 0.4,
      0.2,
      sea + 1.1,
      0.14,
      0.36,
      0.22,
      0.32,
    ),
    grounded(
      TIDE_SHELF.x + sz * 1.7,
      0.14,
      TIDE_SHELF.z - sx * 1.7,
      0.24,
      sea - 0.5,
      0.1,
      0.3,
      0.18,
      0.26,
    ),
  ];
}

function mistWalls(layout: WorldLayout, mobile: boolean): PropPose[] {
  const knobs = densityFor(mobile);
  if (knobs.mistWalls <= 0) return [];
  const out: PropPose[] = [];
  const groves = layout.groves;
  for (let i = 0; i < groves.length && out.length < knobs.mistWalls; i += 1) {
    const grove = groves[i];
    const yaw = Math.atan2(grove.x, grove.z) + Math.PI / 2;
    const wide = grove.salt === 1 ? 4.4 : 3.2;
    out.push(
      pose(grove.x, 0.95, grove.z, 0, yaw, 0, wide, 1.55, 1),
    );
  }
  if (out.length < knobs.mistWalls) {
    const yaw = TIDE_SHELF.yaw + Math.PI / 2;
    out.push(
      pose(TIDE_SHELF.x, 0.72, TIDE_SHELF.z, 0, yaw, 0, 3.6, 1.15, 1),
    );
  }
  return out.slice(0, knobs.mistWalls);
}

function shelfFoam(): PropPose[] {
  return [
    pose(TIDE_SHELF.x + 0.4, 0.024, TIDE_SHELF.z + 1.6, 0, 0.4, 0, 1.35, 1, 0.7),
    pose(14.1, 0.024, 3.9, 0, 1.1, 0, 1.05, 1, 0.55),
  ];
}

function poolRocks(layout: WorldLayout, mobile: boolean): PropPose[] {
  const out: PropPose[] = [];
  layout.tidePools.forEach((pool, index) => {
    const rand = rng(70 + index * 9);
    const n = mobile ? 3 : 5;
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2 + rand() * 0.35;
      const r = Math.max(pool.sx, pool.sz) * 0.55 + 0.4 + rand() * 0.28;
      const x = pool.x + Math.cos(a) * r * (pool.sx / Math.max(pool.sx, pool.sz));
      const z = pool.z + Math.sin(a) * r * (pool.sz / Math.max(pool.sx, pool.sz));
      if (nearNest(x, z, 2.2)) continue;
      const s = 0.14 + rand() * 0.12;
      out.push(grounded(x, s * 0.45, z, 0.25, a, 0.12, s, s * 0.7, s * 0.85));
    }
  });
  return out;
}

function kelpLines(layout: WorldLayout, mobile: boolean): PropPose[] {
  const knobs = densityFor(mobile);
  const wrack = sectorsOf(layout, "kelpWrack");
  const out: PropPose[] = [];
  wrack.forEach((sector, index) => {
    if (index >= knobs.kelpLines) return;
    const rand = rng(190 + index * 11);
    const n = mobile ? 5 : 8;
    for (let i = 0; i < n; i += 1) {
      const t = n <= 1 ? 0.5 : i / (n - 1);
      const angle = sector.angle - sector.span * 0.45 + t * sector.span * 0.9;
      const radius =
        WORLD_RADIUS - 0.55 + Math.sin(i * 1.7 + index) * 0.32 + (rand() - 0.5) * 0.22;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      if (blocked(layout.tidePools, x, z, 2.15, 0, WORLD_RADIUS + 0.45)) continue;
      const s = 0.22 + rand() * 0.18;
      const seaward = Math.atan2(x, z);
      out.push(
        grounded(
          x,
          s * 0.42,
          z,
          0.48 + rand() * 0.28,
          seaward + (rand() - 0.5) * 0.4,
          0.16,
          0.055 + rand() * 0.03,
          s,
          0.042,
        ),
      );
    }
  });
  return out;
}

function foamPatches(layout: WorldLayout, mobile: boolean): PropPose[] {
  const knobs = densityFor(mobile);
  return scatter(
    knobs.foam,
    rng(211),
    2.0,
    layout.tidePools,
    (rand) => {
      const pool = layout.sectors.filter((sector) =>
        sectorSitsOnWaterline(sector.kind),
      );
      if (pool.length && rand() > 0.28) {
        const sector = pool[Math.floor(rand() * pool.length)];
        return sectorPick(
          rand,
          sector.angle,
          sector.span,
          WORLD_RADIUS - 0.15,
          WORLD_RADIUS + 0.72,
        );
      }
      return ringPick(rand, WORLD_RADIUS - 0.2, WORLD_RADIUS + 0.7);
    },
    (x, z, rand) => {
      const sx = 0.85 + rand() * 1.15;
      const sz = 0.42 + rand() * 0.55;
      return pose(x, 0.022, z, 0, rand() * Math.PI * 2, 0, sx, 1, sz);
    },
    { maxR: WORLD_RADIUS + 0.85, poolExtra: -0.2 },
  );
}

export function seedWorldDress(mobile: boolean): WorldDress {
  const knobs = densityFor(mobile);
  const layout = seedLayout(mobile);
  const trees = groveTrees(layout, layout.groves, !mobile);
  const dressed = nestDress();
  const sit = overlookFurniture();
  const pools = layout.tidePools;

  const grass = scatter(
    knobs.grass,
    rng(3),
    2.35,
    pools,
    (rand) => ringPick(rand, BAND.meadowInner, BAND.meadowOuter),
    (x, z, rand) => {
      const s = 0.2 + rand() * 0.2;
      return grounded(x, s * 0.5, z, 0.04, rand() * Math.PI * 2, 0.03, s * 0.24, s, s * 0.24);
    },
  );

  const reeds = scatter(
    knobs.reeds,
    rng(21),
    2.2,
    pools,
    (rand) => {
      const wrack = sectorsOf(layout, "kelpWrack");
      if (wrack.length && rand() > 0.45) {
        const sector = wrack[Math.floor(rand() * wrack.length)];
        return sectorPick(rand, sector.angle, sector.span, BAND.shoreInner, BAND.shoreOuter);
      }
      return ringPick(rand, WORLD_RADIUS - 4.6, WORLD_RADIUS - 1.15);
    },
    (x, z, rand) => {
      const s = 0.3 + rand() * 0.2;
      return grounded(
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
    knobs.dryRocks,
    rng(11),
    2.35,
    pools,
    (rand) => ringPick(rand, 3.2, BAND.groveOuter),
    (x, z, rand) => {
      const s = 0.16 + rand() * 0.2;
      return grounded(x, s * 0.42, z, 0.18, rand() * Math.PI * 2, 0.1, s, s * 0.72, s * 0.88);
    },
  ).concat(dressed.dryRocks).concat(sit.dryRocks);

  const wetRocks = scatter(
    knobs.wetRocks,
    rng(29),
    2.25,
    pools,
    (rand) => {
      if (rand() > 0.35) {
        const pool = pools[Math.floor(rand() * pools.length)];
        const a = rand() * Math.PI * 2;
        const r = 0.85 + rand() * 1.1;
        return { x: pool.x + Math.sin(a) * r, z: pool.z + Math.cos(a) * r };
      }
      const shelves = sectorsOf(layout, "rockShelf");
      if (shelves.length && rand() > 0.4) {
        const sector = shelves[Math.floor(rand() * shelves.length)];
        return sectorPick(rand, sector.angle, sector.span, sector.inner, sector.outer);
      }
      return ringPick(rand, WORLD_RADIUS - 2.4, WORLD_RADIUS - 0.55);
    },
    (x, z, rand) => {
      const s = 0.14 + rand() * 0.16;
      return grounded(x, s * 0.38, z, 0.22, rand() * Math.PI * 2, 0.14, s, s * 0.62, s * 0.82);
    },
  )
    .concat(dressed.wetRocks)
    .concat(poolRocks(layout, mobile))
    .concat(tideShelfRocks());

  const shells = scatter(
    knobs.shells,
    rng(41),
    1.7,
    pools,
    (rand) => {
      const fans = sectorsOf(layout, "shellFan");
      if (fans.length && rand() > 0.4) {
        const sector = fans[Math.floor(rand() * fans.length)];
        return sectorPick(rand, sector.angle, sector.span, sector.inner, sector.outer);
      }
      if (rand() > 0.48) {
        const pool = pools[Math.floor(rand() * pools.length)];
        const a = rand() * Math.PI * 2;
        const r = 0.28 + rand() * 1.15;
        return { x: pool.x + Math.sin(a) * r, z: pool.z + Math.cos(a) * r };
      }
      return ringPick(rand, WORLD_RADIUS - 2.8, WORLD_RADIUS - 0.45);
    },
    (x, z, rand) => {
      const s = 0.034 + rand() * 0.028;
      return grounded(
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
    { poolExtra: -0.35 },
  ).concat(dressed.shells);

  const kelp = scatter(
    knobs.kelp,
    rng(53),
    2.15,
    pools,
    (rand) => ringPick(rand, WORLD_RADIUS - 2.15, WORLD_RADIUS + 0.2),
    (x, z, rand) => {
      const s = 0.2 + rand() * 0.16;
      return grounded(
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
    { maxR: WORLD_RADIUS + 0.35 },
  )
    .concat(dressed.kelp)
    .concat(kelpLines(layout, mobile));

  const driftwood = scatter(
    knobs.driftwood,
    rng(61),
    2.2,
    pools,
    (rand) => {
      const wrack = sectorsOf(layout, "kelpWrack");
      if (wrack.length && rand() > 0.35) {
        const sector = wrack[Math.floor(rand() * wrack.length)];
        return sectorPick(
          rand,
          sector.angle,
          sector.span,
          WORLD_RADIUS - 3.2,
          WORLD_RADIUS - 0.55,
        );
      }
      return ringPick(rand, WORLD_RADIUS - 3.4, WORLD_RADIUS - 0.7);
    },
    (x, z, rand) => {
      const len = 0.34 + rand() * 0.22;
      const radius = 0.055 + rand() * 0.02;
      return grounded(
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
  ).concat(dressed.driftwood).concat(sit.driftwood);

  const spirals = scatter(
    knobs.spirals,
    rng(83),
    1.65,
    pools,
    (rand) => {
      const pool = pools[Math.floor(rand() * pools.length)];
      const a = rand() * Math.PI * 2;
      const r = 0.4 + rand() * 1.05;
      return { x: pool.x + Math.sin(a) * r, z: pool.z + Math.cos(a) * r };
    },
    (x, z, rand) => {
      const s = 0.055 + rand() * 0.03;
      return grounded(
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
    { poolExtra: -0.25 },
  ).concat(dressed.spirals);

  const duneScrub = scatter(
    knobs.duneScrub,
    rng(73),
    2.4,
    pools,
    (rand) => ringPick(rand, BAND.groveInner, BAND.shoreInner + 0.4),
    (x, z, rand) => {
      const s = 0.42 + rand() * 0.28;
      return grounded(
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

  const shelves = layout.shelves;

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
    foam: foamPatches(layout, mobile).concat(shelfFoam()),
    shelves,
    mistWalls: mistWalls(layout, mobile),
    haze: layout.haze,
    tidePools: pools,
    clearings: layout.clearings,
    landforms: layout.landforms,
  };
}
