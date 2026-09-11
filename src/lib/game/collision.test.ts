import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BEACH_INNER_RADIUS,
  WATER_Y,
  clampToShore,
  collidePlayer,
  groundHeight,
  playableRadius,
  resolveProps,
  settleFooting,
  surfaceHeight,
  type PropCollider,
} from "./collision";
import { sampleGroundY } from "./worldgen";
import { BEACH_INNER_RADIUS as CONST_BEACH, MAX_SIZE, NEST_INTERACT_RADIUS } from "./constants";
import { SHORE_DANGER_RADIUS, SHORE_SAFE_RADIUS, playerOnShore, playerInlandSafe } from "./offshore";
import { NEST_LAYOUT } from "./wildlife";

test("beach inner radius is the leviathan notice line", () => {
  assert.equal(BEACH_INNER_RADIUS, CONST_BEACH);
  assert.equal(SHORE_DANGER_RADIUS, BEACH_INNER_RADIUS);
  assert.ok(SHORE_SAFE_RADIUS < SHORE_DANGER_RADIUS);
});

test("meadow sits above the waterline and beach slopes down", () => {
  const meadow = surfaceHeight(0, 0);
  const beach = surfaceHeight(0, BEACH_INNER_RADIUS + 0.4);
  const lip = surfaceHeight(0, 15.2);
  const sea = surfaceHeight(0, 20);
  assert.ok(meadow > WATER_Y + 0.12);
  assert.ok(beach < meadow);
  assert.ok(lip < beach);
  assert.ok(Math.abs(sea - WATER_Y) < 1e-6);
});

test("height field is coherent across a small step", () => {
  const a = surfaceHeight(2.4, 3.1);
  const b = surfaceHeight(2.45, 3.12);
  assert.ok(Math.abs(a - b) < 0.03);
});

test("nest bowls have a walkable rim above the floor", () => {
  const nest = NEST_LAYOUT[0];
  const floor = groundHeight(nest.x, nest.z);
  const rim = groundHeight(nest.x + 0.78, nest.z);
  const outside = groundHeight(nest.x + 2.4, nest.z);
  assert.ok(floor > surfaceHeight(nest.x, nest.z) + 0.25);
  assert.ok(rim > floor + 0.08);
  assert.ok(Math.abs(outside - surfaceHeight(nest.x + 2.4, nest.z)) < 0.02);
});

test("claim volumes still contain the bowl", () => {
  assert.ok(NEST_INTERACT_RADIUS > 1.42);
});

test("playable lip still reaches shore-danger, including Apex", () => {
  assert.ok(playableRadius(1) > SHORE_DANGER_RADIUS);
  assert.ok(playableRadius(MAX_SIZE) >= SHORE_DANGER_RADIUS);
  assert.ok(playableRadius(1) < 16);
});

test("shore clamp is a solid slide, not a full velocity kill", () => {
  const hit = clampToShore(0, 18, 0.2, 4, 1);
  assert.ok(hit.hit);
  assert.ok(Math.hypot(hit.x, hit.z) <= playableRadius(1) + 1e-6);
  assert.ok(hit.vz < 0.5);
  assert.ok(Math.abs(hit.vx) > 0.05);
});

test("inland and beach aggro samples are unchanged", () => {
  assert.equal(playerInlandSafe(0, 0), true);
  assert.equal(playerOnShore(0, 14.85), true);
  assert.equal(playerOnShore(0, 0), false);
});

test("capsule slides off a rock cylinder", () => {
  const rock: PropCollider = { kind: "rock", x: 0, z: 0, radius: 0.4 };
  const next = resolveProps(0.2, 0, 0, 1, 0.3, [rock]);
  assert.ok(Math.hypot(next.x, next.z) >= 0.7 - 1e-6);
  assert.ok(next.x > 0.3);
});

test("footing catches uphill and falls off a drop", () => {
  const up = settleFooting(0, 0, 0.4, 1 / 60);
  assert.ok(up.y > 0.05);
  assert.equal(up.vy, 0);
  const drop = settleFooting(0.8, 0, 0.1, 1 / 60);
  assert.ok(drop.y < 0.8);
  assert.ok(drop.vy < 0);
});

test("full collide step keeps the body on the meadow", () => {
  let body = { x: 1, y: 0, z: 2, vx: 0, vy: 0, vz: 0, size: 1 };
  for (let i = 0; i < 24; i += 1) {
    body = collidePlayer(body, 1 / 60, []);
  }
  const ground = groundHeight(body.x, body.z);
  assert.ok(Math.abs(body.y - ground) < 0.02);
});

test("worldgen sampleGroundY is bound to the collision height field", () => {
  assert.equal(sampleGroundY(0, 0), surfaceHeight(0, 0));
  assert.equal(sampleGroundY(0, 15.2), surfaceHeight(0, 15.2));
});
