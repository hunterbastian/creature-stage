import assert from "node:assert/strict";
import { test } from "node:test";
import { NEST_LAYOUT } from "./wildlife";
import {
  GROVE_OVERLOOK,
  INSTANCE_BUDGET,
  TIDE_SHELF,
  countInstancedPoses,
  seedLayout,
  seedWorldDress,
} from "./worldgen";

test("mobile instance count stays under the iOS budget", () => {
  const dress = seedWorldDress(true);
  const count = countInstancedPoses(dress);
  assert.ok(
    count <= INSTANCE_BUDGET.mobile,
    `mobile instances ${count} exceed ${INSTANCE_BUDGET.mobile}`,
  );
});

test("desktop instance count stays under the authored cap", () => {
  const dress = seedWorldDress(false);
  const count = countInstancedPoses(dress);
  assert.ok(
    count <= INSTANCE_BUDGET.desktop,
    `desktop instances ${count} exceed ${INSTANCE_BUDGET.desktop}`,
  );
});

test("tide shelf is a clustered place, not a lone puddle", () => {
  const layout = seedLayout(true);
  const near = layout.tidePools.filter(
    (pool) => Math.hypot(pool.x - TIDE_SHELF.x, pool.z - TIDE_SHELF.z) < TIDE_SHELF.radius,
  );
  assert.ok(near.length >= 3);
  const hero = near.find(
    (pool) => Math.hypot(pool.x - TIDE_SHELF.x, pool.z - TIDE_SHELF.z) < 0.05,
  );
  assert.ok(hero);
});

test("grove overlook still has wind-bent trees and a sitting rock", () => {
  const dress = seedWorldDress(true);
  const trees = dress.trunks.filter(
    (tree) =>
      Math.hypot(tree.x - GROVE_OVERLOOK.x, tree.z - GROVE_OVERLOOK.z) <
      GROVE_OVERLOOK.radius,
  );
  assert.ok(trees.length >= 3);
  const sit = dress.dryRocks.filter(
    (rock) =>
      Math.hypot(rock.x - GROVE_OVERLOOK.x, rock.z - GROVE_OVERLOOK.z) <
      GROVE_OVERLOOK.radius + 0.4,
  );
  assert.ok(sit.some((rock) => Math.max(rock.sx, rock.sz) > 0.45));
});

test("nest hollows stay cleared as places", () => {
  const layout = seedLayout(true);
  assert.equal(layout.clearings.length, NEST_LAYOUT.length);
  for (const nest of NEST_LAYOUT) {
    const hit = layout.clearings.find(
      (clearing) =>
        Math.hypot(clearing.x - nest.x, clearing.z - nest.z) < 0.05,
    );
    assert.ok(hit);
    assert.ok(hit.radius >= 2.15);
  }
});

test("mobile skips vertical mist walls", () => {
  const mobile = seedWorldDress(true);
  const desktop = seedWorldDress(false);
  assert.equal(mobile.mistWalls.length, 0);
  assert.ok(desktop.mistWalls.length >= 4);
});
