import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MUTE_STORAGE_KEY,
  cueFeel,
  getAudioSnapshot,
  readMutedPreference,
} from "./audio";

test("mute preference is off when storage is missing", () => {
  assert.equal(readMutedPreference(), false);
  assert.equal(MUTE_STORAGE_KEY, "tideform-audio-muted");
});

test("audio snapshot starts locked and unmuted in node", () => {
  const snap = getAudioSnapshot();
  assert.equal(snap.unlocked, false);
  assert.equal(snap.muted, false);
});

test("feel cues are no-ops without a window AudioContext", () => {
  cueFeel("eat");
  cueFeel("form");
});
