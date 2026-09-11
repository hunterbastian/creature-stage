import assert from "node:assert/strict";
import { test } from "node:test";
import { Color } from "three";
import {
  ATMOSPHERE,
  applyCoastalGrade,
  bloomPassSize,
  lumaRgb,
} from "./atmosphere";
import { SHORE } from "./shore-look";

function hexRgb(hex: string): [number, number, number] {
  const c = new Color(hex);
  return [c.r, c.g, c.b];
}

test("desktop bloom is the richer pyramid; mobile is the cheap cap", () => {
  const desk = ATMOSPHERE.desktop.bloom;
  const mob = ATMOSPHERE.mobile.bloom;
  assert.ok(desk.resolution > mob.resolution);
  assert.ok(desk.strength > mob.strength);
  assert.ok(desk.radius > mob.radius);
  assert.ok(mob.threshold >= desk.threshold);
  assert.ok(desk.threshold >= 0.82);
  assert.ok(desk.strength < 0.85, "bloom stays shy of nuclear");
});

test("bloom resolution cap shrinks a 1080p composer and never upscales", () => {
  assert.deepEqual(bloomPassSize(1920, 1080, 720), [720, 405]);
  assert.deepEqual(bloomPassSize(800, 400, 180), [180, 90]);
  assert.deepEqual(bloomPassSize(120, 80, 720), [120, 80]);
});

test("foam albedo sits under the bloom threshold so the lace does not blow out", () => {
  const foam = hexRgb(SHORE.foam);
  const foamY = lumaRgb(...foam);
  assert.ok(foamY < ATMOSPHERE.desktop.bloom.threshold);
  assert.ok(foamY < ATMOSPHERE.mobile.bloom.threshold);
});

test("both tiers run the grade; mobile skips vignette", () => {
  assert.equal(ATMOSPHERE.desktop.grade.enabled, true);
  assert.equal(ATMOSPHERE.mobile.grade.enabled, true);
  assert.ok(ATMOSPHERE.desktop.grade.vignette > 0);
  assert.equal(ATMOSPHERE.mobile.grade.vignette, 0);
  assert.ok(ATMOSPHERE.desktop.grade.contrast > ATMOSPHERE.mobile.grade.contrast);
});

test("grade cools shadows, warms highlights, creams midtones", () => {
  const grade = ATMOSPHERE.desktop.grade;
  const center = [0.5, 0.5] as const;

  const shadow = applyCoastalGrade([0.14, 0.12, 0.09], center, grade);
  assert.ok(
    shadow[2] / Math.max(shadow[0], 1e-5) >
      0.09 / 0.14,
    "dirt picks up cool ocean bounce",
  );

  const high = applyCoastalGrade([0.86, 0.84, 0.8], center, {
    ...grade,
    vignette: 0,
    shoulderAmount: 0,
  });
  assert.ok(
    high[0] / Math.max(high[2], 1e-5) > 0.86 / 0.8,
    "highlights go warm, not cyan",
  );

  const meadow = applyCoastalGrade([0.4, 0.54, 0.32], center, {
    ...grade,
    vignette: 0,
  });
  assert.ok(meadow[1] > meadow[0] && meadow[1] > meadow[2], "grass stays green");
  assert.ok(meadow[0] > 0.4 * 0.92, "mids do not crush");
  assert.ok(meadow[1] < 0.7, "mids do not candy");
});

test("desktop vignette darkens corners; mobile does not", () => {
  const mid = [0.42, 0.4, 0.36] as const;
  const desk = ATMOSPHERE.desktop.grade;
  const mob = ATMOSPHERE.mobile.grade;
  const deskCenter = applyCoastalGrade(mid, [0.5, 0.5], desk);
  const deskCorner = applyCoastalGrade(mid, [0, 0], desk);
  assert.ok(lumaRgb(...deskCorner) < lumaRgb(...deskCenter));

  const mobCenter = applyCoastalGrade(mid, [0.5, 0.5], mob);
  const mobCorner = applyCoastalGrade(mid, [0, 0], mob);
  assert.ok(Math.abs(lumaRgb(...mobCorner) - lumaRgb(...mobCenter)) < 1e-6);
});

test("highlight shoulder pulls nuclear white toward salt cream", () => {
  const grade = ATMOSPHERE.desktop.grade;
  const [r, g, b] = applyCoastalGrade([1, 1, 1], [0.5, 0.5], {
    ...grade,
    vignette: 0,
  });
  assert.ok(r < 1 || g < 1 || b < 1);
  assert.ok(r > b, "shoulder stays warm, not grey");
  assert.ok(lumaRgb(r, g, b) > 0.82, "highlights stay bright");
});
