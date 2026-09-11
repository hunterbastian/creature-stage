import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createAnimClock,
  gaitKind,
  legCycle,
  saltFromId,
  tickAnim,
} from "./anim";

test("starter chassis map to gait kinds", () => {
  assert.equal(gaitKind("sleek"), "theropod");
  assert.equal(gaitKind("plump"), "sauropod");
  assert.equal(gaitKind("spiky"), "stego");
});

test("agent ids desync stride phase", () => {
  assert.notEqual(saltFromId("herd-a"), saltFromId("herd-b"));
});

test("stance plants with no lift; swing lifts the foot", () => {
  const planted = legCycle(0.1, 0.5, 0.08, 0.62);
  assert.equal(planted.lift, 0);
  const swinging = legCycle(0.8, 0.5, 0.08, 0.62);
  assert.ok(swinging.lift > 0.02);
});

test("idle keeps legs still and the jaw shut", () => {
  const clock = createAnimClock(0.2);
  const idle = tickAnim(clock, 1 / 30, 1.2, { moving: false, gait: 0 }, "theropod");
  assert.ok(Math.abs(idle.legs[0].swing) < 0.05);
  assert.equal(idle.jaw, 0);
});

test("biped walk eases in and splits the legs", () => {
  const walkClock = createAnimClock(0.1);
  for (let i = 0; i < 90; i += 1) {
    tickAnim(
      walkClock,
      1 / 30,
      i / 30,
      { moving: true, gait: 1, size: 1 },
      "theropod",
    );
  }
  const left = walkClock.pose.legs[0].swing;
  const right = walkClock.pose.legs[1].swing;
  assert.ok(Math.abs(left - right) > 0.2);
  assert.ok(walkClock.drive > 0.8);
});

test("eatFlash opens the jaw", () => {
  const eatClock = createAnimClock(0.4);
  const bite = tickAnim(
    eatClock,
    1 / 30,
    0.4,
    { moving: false, gait: 0, eatFlash: 0.5 },
    "theropod",
  );
  assert.ok(bite.jaw > 0.2);
});

test("hitstop freezes stride phase", () => {
  const freeze = createAnimClock(0.5);
  tickAnim(freeze, 1 / 30, 0, { moving: true, gait: 1 }, "stego");
  const phase = freeze.phase;
  tickAnim(freeze, 1 / 30, 0.03, { moving: true, gait: 1, hitstop: 0.1 }, "stego");
  assert.equal(freeze.phase, phase);
});

test("trot advances faster than walk", () => {
  const trot = createAnimClock(0.15);
  const walk = createAnimClock(0.15);
  for (let i = 0; i < 45; i += 1) {
    tickAnim(
      trot,
      1 / 30,
      i / 30,
      { moving: true, gait: 1, sprinting: true },
      "sauropod",
    );
    tickAnim(
      walk,
      1 / 30,
      i / 30,
      { moving: true, gait: 1, sprinting: false },
      "sauropod",
    );
  }
  assert.ok(trot.phase > walk.phase);
  assert.ok(trot.trot > 0.4);
});
