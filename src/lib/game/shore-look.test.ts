import assert from "node:assert/strict";
import { test } from "node:test";
import { Color } from "three";
import { BEACH_INNER_RADIUS, WORLD_RADIUS } from "./constants";
import { WATER_Y, WATERLINE_RADIUS } from "./collision";
import { OFFSHORE_LANE_INNER, OCEAN_RADIUS } from "./offshore";
import {
  SHORE,
  SHORE_BAND,
  luma,
  terrainColor,
  waterColor,
} from "./shore-look";

test("wet sand is darker than dry beach sand", () => {
  const dry = new Color();
  const damp = new Color();
  const wet = new Color();
  terrainColor(BEACH_INNER_RADIUS + 0.2, dry);
  terrainColor(WORLD_RADIUS - 0.7, damp);
  terrainColor(WORLD_RADIUS, wet);
  assert.ok(luma(wet) < luma(damp));
  assert.ok(luma(damp) < luma(dry));
});

test("submerged shelf is cooler than the dry sand", () => {
  const dry = new Color();
  const submerged = new Color();
  terrainColor(BEACH_INNER_RADIUS + 0.1, dry);
  terrainColor(WATERLINE_RADIUS + 0.5, submerged);
  assert.ok(submerged.g + submerged.b > submerged.r);
  assert.ok(luma(submerged) < luma(dry));
});

test("near-shore water is lighter than the deep", () => {
  const shallow = new Color();
  const mid = new Color();
  const deep = new Color();
  waterColor(WORLD_RADIUS + 0.4, 0, shallow);
  waterColor(OFFSHORE_LANE_INNER, 0, mid);
  waterColor(OCEAN_RADIUS * 0.92, 0, deep);
  assert.ok(luma(shallow) > luma(mid));
  assert.ok(luma(mid) > luma(deep));
});

test("shallows overlay sits between the lip and the swim lane", () => {
  assert.ok(SHORE_BAND.shallowsInner < WORLD_RADIUS);
  assert.ok(SHORE_BAND.shallowsOuter > WORLD_RADIUS + 1.5);
  assert.ok(SHORE_BAND.shallowsOuter < SHORE_BAND.midRadius);
  assert.equal(SHORE_BAND.midRadius, OFFSHORE_LANE_INNER);
  assert.equal(SHORE_BAND.oceanRadius, OCEAN_RADIUS);
});

test("foam lace straddles the waterline", () => {
  assert.ok(SHORE_BAND.foamInner < WATERLINE_RADIUS);
  assert.ok(SHORE_BAND.foamMid > WATERLINE_RADIUS);
  assert.ok(SHORE_BAND.foamOuter > SHORE_BAND.foamMid);
  assert.ok(SHORE.foamInnerOpacity > SHORE.foamOuterOpacity);
});

test("look knobs do not move the collision waterline", () => {
  assert.equal(WATER_Y, -0.22);
  assert.equal(WATERLINE_RADIUS, WORLD_RADIUS + 0.1);
});

test("foam is salt-grey, not paper white", () => {
  const foam = new Color(SHORE.foam);
  assert.ok(luma(foam) < 0.8);
  assert.ok(foam.g >= foam.r);
  assert.ok(SHORE.foamShininess <= 8);
});
