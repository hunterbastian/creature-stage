/**
 * Coastal ambience bed + quiet eat/form cues.
 * Web Audio only — no extra deps. iOS Safari needs a user-gesture unlock.
 */
import { assertNever } from "./types";

export const MUTE_STORAGE_KEY = "tideform-audio-muted";

const BED_URL = "/audio/coastal-bed.mp3";
const EAT_URL = "/audio/eat.mp3";
const FORM_URL = "/audio/form.mp3";

/** Soft enough to sit under the meadow without shouting. */
const BED_GAIN = 0.2;
const EAT_GAIN = 0.38;
const FORM_GAIN = 0.42;
const FADE_IN_SEC = 1.7;
const MUTE_RAMP_SEC = 0.08;

export type FeelCue = "eat" | "form";

export type AudioSnapshot = {
  muted: boolean;
  unlocked: boolean;
};

type SafariWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let bedGain: GainNode | null = null;
let bedSource: AudioBufferSourceNode | null = null;
let bedBuffer: AudioBuffer | null = null;
let eatBuffer: AudioBuffer | null = null;
let formBuffer: AudioBuffer | null = null;
let muted = false;
let unlocked = false;
let bindCount = 0;
let loading: Promise<void> | null = null;
let attached: (() => void) | null = null;

const listeners = new Set<(snap: AudioSnapshot) => void>();

export function getAudioSnapshot(): AudioSnapshot {
  return { muted, unlocked };
}

export function subscribeAudio(
  listener: (snap: AudioSnapshot) => void,
): () => void {
  listeners.add(listener);
  listener(getAudioSnapshot());
  return () => {
    listeners.delete(listener);
  };
}

function emit(): void {
  const snap = getAudioSnapshot();
  for (const listener of listeners) listener(snap);
}

export function readMutedPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeMutedPreference(next: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MUTE_STORAGE_KEY, next ? "1" : "0");
  } catch {
    // Private mode / blocked storage — mute still works in-memory.
  }
}

function audioContextClass(): (new () => AudioContext) | undefined {
  if (typeof window === "undefined") return undefined;
  const safari = window as SafariWindow;
  return window.AudioContext ?? safari.webkitAudioContext;
}

function emitMuteRamp(nextMuted: boolean, hidden: boolean): void {
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  const target = nextMuted || hidden ? 0 : 1;
  master.gain.linearRampToValueAtTime(target, now + MUTE_RAMP_SEC);
}

function pageHidden(): boolean {
  return typeof document !== "undefined" && document.hidden;
}

function prepareLoop(buffer: AudioBuffer, context: AudioContext): AudioBuffer {
  // MP3 encoder delay / padding makes naive loops click on Safari.
  const skip = Math.min(
    Math.floor(buffer.sampleRate * 0.055),
    Math.floor(buffer.length / 10),
  );
  const fade = Math.min(
    Math.floor(buffer.sampleRate * 0.07),
    Math.floor((buffer.length - skip * 2) / 4),
  );
  const length = buffer.length - skip * 2;
  if (length < buffer.sampleRate || fade < 8) return buffer;

  const trimmed = context.createBuffer(1, length, buffer.sampleRate);
  const src = buffer.getChannelData(0);
  const dest = trimmed.getChannelData(0);
  dest.set(src.subarray(skip, skip + length));
  for (let i = 0; i < fade; i += 1) {
    const t = i / fade;
    const a = Math.sin((t * Math.PI) / 2);
    const b = Math.cos((t * Math.PI) / 2);
    dest[i] = dest[i] * a + dest[length - fade + i] * b;
  }
  return trimmed;
}

async function decodeBuffer(
  context: AudioContext,
  data: ArrayBuffer,
): Promise<AudioBuffer> {
  return context.decodeAudioData(data.slice(0));
}

async function fetchBuffer(
  context: AudioContext,
  url: string,
): Promise<AudioBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return decodeBuffer(context, await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function loadBeds(context: AudioContext): Promise<void> {
  const [bed, eat, form] = await Promise.all([
    fetchBuffer(context, BED_URL),
    fetchBuffer(context, EAT_URL),
    fetchBuffer(context, FORM_URL),
  ]);
  if (bed) bedBuffer = prepareLoop(bed, context);
  eatBuffer = eat;
  formBuffer = form;
}

function ensureGraph(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = audioContextClass();
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = muted || pageHidden() ? 0 : 1;
  master.connect(ctx.destination);
  return ctx;
}

function stopBed(): void {
  if (bedSource) {
    try {
      bedSource.stop();
    } catch {
      // already stopped
    }
    bedSource.disconnect();
    bedSource = null;
  }
  if (bedGain) {
    bedGain.disconnect();
    bedGain = null;
  }
}

function startBed(): void {
  if (!ctx || !master || !bedBuffer || muted || !unlocked) return;
  stopBed();
  const src = ctx.createBufferSource();
  src.buffer = bedBuffer;
  src.loop = true;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  src.connect(gain);
  gain.connect(master);
  src.start(0);
  const now = ctx.currentTime;
  gain.gain.linearRampToValueAtTime(BED_GAIN, now + FADE_IN_SEC);
  bedSource = src;
  bedGain = gain;
}

function playOneShot(buffer: AudioBuffer | null, gainValue: number): void {
  if (!ctx || !master || !buffer || muted || !unlocked) return;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = gainValue;
  src.connect(gain);
  gain.connect(master);
  src.start(0);
  src.onended = () => {
    src.disconnect();
    gain.disconnect();
  };
}

function tapUnlock(): void {
  const context = ensureGraph();
  if (!context) return;

  // iOS: a silent buffer + resume() must run inside the gesture.
  try {
    const silent = context.createBuffer(1, 1, context.sampleRate || 22050);
    const src = context.createBufferSource();
    src.buffer = silent;
    src.connect(context.destination);
    src.start(0);
  } catch {
    // Graph might already be running.
  }
  void context.resume();

  if (!loading) {
    loading = loadBeds(context).then(() => {
      if (unlocked && !bedSource) startBed();
    });
  }

  const newly = !unlocked;
  unlocked = true;
  if (newly) emit();
  if (!bedSource) startBed();
}

export async function unlockAudio(): Promise<void> {
  tapUnlock();
  if (ctx && ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      // Still waiting on a real user gesture.
    }
  }
}

export function setMuted(next: boolean): void {
  muted = next;
  writeMutedPreference(next);
  emitMuteRamp(next, pageHidden());
  if (next) {
    stopBed();
  } else if (unlocked) {
    startBed();
  }
  emit();
}

export function toggleMuted(): void {
  setMuted(!muted);
}

export function cueFeel(kind: FeelCue): void {
  switch (kind) {
    case "eat":
      playOneShot(eatBuffer, EAT_GAIN);
      return;
    case "form":
      playOneShot(formBuffer, FORM_GAIN);
      return;
    default:
      assertNever(kind, "Unknown feel cue");
  }
}

function onGesture(): void {
  void unlockAudio();
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.repeat) return;
  const target = event.target as HTMLElement | null;
  if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
    return;
  }
  if (event.code === "KeyM") {
    toggleMuted();
  }
  void unlockAudio();
}

function onVisibility(): void {
  emitMuteRamp(muted, pageHidden());
}

function attach(): () => void {
  muted = readMutedPreference();
  emit();

  window.addEventListener("pointerdown", onGesture, true);
  window.addEventListener("touchstart", onGesture, { capture: true, passive: true });
  window.addEventListener("keydown", onKeyDown);
  document.addEventListener("visibilitychange", onVisibility);

  // Warm the graph as soon as a gesture may already have happened (bfcache).
  if (typeof navigator !== "undefined" && navigator.userActivation?.hasBeenActive) {
    void unlockAudio();
  }

  return () => {
    window.removeEventListener("pointerdown", onGesture, true);
    window.removeEventListener("touchstart", onGesture, true);
    window.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("visibilitychange", onVisibility);
    stopBed();
    if (ctx && ctx.state !== "closed") {
      void ctx.suspend();
    }
  };
}

/** Ref-counted so Game can bind for iOS unlock while HUD only subscribes. */
export function bindCoastalAudio(): () => void {
  if (typeof window === "undefined") return () => {};
  bindCount += 1;
  if (bindCount === 1) {
    attached = attach();
  }
  return () => {
    bindCount = Math.max(0, bindCount - 1);
    if (bindCount === 0) {
      attached?.();
      attached = null;
    }
  };
}
