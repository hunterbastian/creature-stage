/**
 * Procedural saurian locomotion.
 *
 * The kit GLB has no armature clips (see scripts/blender/README.md). This
 * module evaluates a cheap pose each frame: walk / idle / light trot plus
 * eat jaw. No IK. Root height stays in collision (`sim.y` / `groundHeight`);
 * `sampleGroundY` is the worldgen hook collision already binds to `surfaceHeight`.
 */

export type GaitKind = "theropod" | "sauropod" | "stego";
export type GaitBodyId = "sleek" | "plump" | "spiky";

/** Fields the pose reader needs. Structural — `sim` and wildlife agents both fit. */
export type AnimLocomotion = {
  moving: boolean;
  /** 0–1 stride intensity from the sim. */
  gait?: number;
  sprinting?: boolean;
  eatFlash?: number;
  formFlash?: number;
  hurtFlash?: number;
  hitstop?: number;
  yawRate?: number;
  size?: number;
  /** Desyncs nestmates so the flock does not march in lockstep. */
  id?: string;
};

export type LegPose = {
  swing: number;
  lift: number;
  roll: number;
};

export type CreaturePose = {
  bodyY: number;
  bodyPitch: number;
  bodyRoll: number;
  bodySway: number;
  jaw: number;
  neckPitch: number;
  tailYaw: number;
  tailPitch: number;
  armSwing: number;
  legs: [LegPose, LegPose, LegPose, LegPose];
};

export type AnimClock = {
  phase: number;
  drive: number;
  trot: number;
  lookYaw: number;
  lookPitch: number;
  lookTargetYaw: number;
  lookTargetPitch: number;
  lookHold: number;
  pose: CreaturePose;
  salt: number;
};

type GaitProfile = {
  hz: number;
  swing: number;
  lift: number;
  bob: number;
  roll: number;
  tail: number;
  arm: number;
  lean: number;
  /** Stance fraction of a stride (planted longer = heavier). */
  duty: number;
};

const PROFILES: Record<GaitKind, GaitProfile> = {
  theropod: {
    hz: 1.04,
    swing: 0.58,
    lift: 0.08,
    bob: 0.032,
    roll: 0.04,
    tail: 0.24,
    arm: 0.42,
    lean: 0.075,
    duty: 0.6,
  },
  sauropod: {
    hz: 0.74,
    swing: 0.36,
    lift: 0.05,
    bob: 0.022,
    roll: 0.028,
    tail: 0.14,
    arm: 0.1,
    lean: 0.05,
    duty: 0.66,
  },
  stego: {
    hz: 0.86,
    swing: 0.38,
    lift: 0.046,
    bob: 0.02,
    roll: 0.055,
    tail: 0.3,
    arm: 0.08,
    lean: 0.048,
    duty: 0.64,
  },
};

const TROT_HZ = 1.2;
const TROT_LIFT = 1.18;
const DRIVE_EASE = 3.15;
const TROT_EASE = 2.35;
const LOOK_EASE = 1.35;

function emptyLeg(): LegPose {
  return { swing: 0, lift: 0, roll: 0 };
}

function emptyPose(): CreaturePose {
  return {
    bodyY: 0,
    bodyPitch: 0,
    bodyRoll: 0,
    bodySway: 0,
    jaw: 0,
    neckPitch: 0,
    tailYaw: 0,
    tailPitch: 0,
    armSwing: 0,
    legs: [emptyLeg(), emptyLeg(), emptyLeg(), emptyLeg()],
  };
}

export function gaitKind(body: GaitBodyId): GaitKind {
  switch (body) {
    case "sleek":
      return "theropod";
    case "plump":
      return "sauropod";
    case "spiky":
      return "stego";
    default: {
      const _never: never = body;
      throw new Error(`Unknown body for gait: ${String(_never)}`);
    }
  }
}

export function saltFromId(id: string | undefined): number {
  if (!id) return 0.37;
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

export function createAnimClock(salt = 0.37): AnimClock {
  return {
    phase: salt * Math.PI * 2,
    drive: 0,
    trot: 0,
    lookYaw: 0,
    lookPitch: 0,
    lookTargetYaw: 0,
    lookTargetPitch: 0,
    lookHold: 0.35 + salt * 1.8,
    pose: emptyPose(),
    salt,
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function wrap01(value: number): number {
  return value - Math.floor(value);
}

function smooth01(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

function hash01(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function expApproach(current: number, target: number, dt: number, rate: number): number {
  return current + (target - current) * (1 - Math.exp(-dt * rate));
}

/**
 * One leg over a 0–1 stride. Stance is a slow plant (foot back), swing is a
 * shorter lift-and-reach — Skyrim/ER weight, not a sine cartoon.
 */
export function legCycle(
  unit: number,
  swingAmp: number,
  liftAmp: number,
  duty: number,
): LegPose {
  const u = wrap01(unit);
  const plant = clamp01(duty);
  if (u < plant) {
    const t = u / Math.max(0.0001, plant);
    return {
      swing: lerp(swingAmp * 0.82, -swingAmp * 0.7, t),
      lift: 0,
      roll: (0.5 - t) * 0.04,
    };
  }
  const t = (u - plant) / Math.max(0.0001, 1 - plant);
  const rise = Math.sin(t * Math.PI);
  return {
    swing: lerp(-swingAmp * 0.7, swingAmp * 0.82, smooth01(t)),
    lift: rise * liftAmp,
    roll: (t - 0.5) * 0.05,
  };
}

function slotPhase(kind: GaitKind, index: number, trot: number): number {
  switch (kind) {
    case "theropod":
      return index === 0 ? 0 : 0.5;
    case "sauropod":
    case "stego": {
      // Walk = lateral pairs with a small delay; trot = diagonal pairs.
      const walk = [0, 0.5, 0.54, 0.04] as const;
      const diagonal = [0, 0.5, 0.5, 0] as const;
      const a = walk[index] ?? 0;
      const b = diagonal[index] ?? 0;
      return lerp(a, b, trot);
    }
    default: {
      const _never: never = kind;
      throw new Error(`Unknown gait kind: ${String(_never)}`);
    }
  }
}

function retargetLook(clock: AnimClock, elapsed: number): void {
  const seed = clock.salt * 17.13 + Math.floor(elapsed * 0.35) * 0.91;
  clock.lookTargetYaw = (hash01(seed) - 0.5) * 0.22;
  clock.lookTargetPitch = (hash01(seed + 2.15) - 0.45) * 0.08;
  clock.lookHold = 1.8 + hash01(seed + 4.4) * 2.4;
}

/**
 * Advance the per-creature clock and write into `clock.pose` (reused).
 */
export function tickAnim(
  clock: AnimClock,
  dt: number,
  elapsed: number,
  locomotion: AnimLocomotion,
  kind: GaitKind,
): CreaturePose {
  const profile = PROFILES[kind];
  const gait = locomotion.gait ?? (locomotion.moving ? 1 : 0);
  const wantDrive = clamp01(gait);
  const wantTrot =
    locomotion.sprinting && wantDrive > 0.18 ? 1 : 0;
  const frozen = (locomotion.hitstop ?? 0) > 0;
  const step = frozen ? 0 : dt;

  clock.drive = expApproach(clock.drive, wantDrive, step || dt * 0.15, DRIVE_EASE);
  clock.trot = expApproach(clock.trot, wantTrot, step || dt * 0.15, TROT_EASE);

  const mass = Math.sqrt(Math.max(0.72, locomotion.size ?? 1));
  const hz =
    (profile.hz * (0.7 + 0.3 * Math.max(clock.drive, 0.08)) * (1 + clock.trot * (TROT_HZ - 1))) /
    mass;
  if (!frozen) {
    clock.phase += dt * hz * Math.PI * 2 * Math.max(clock.drive, 0);
  }

  const idle = 1 - clock.drive;
  clock.lookHold -= dt * (0.35 + idle);
  if (clock.lookHold <= 0) retargetLook(clock, elapsed);
  clock.lookYaw = expApproach(
    clock.lookYaw,
    clock.lookTargetYaw * idle,
    dt,
    LOOK_EASE,
  );
  clock.lookPitch = expApproach(
    clock.lookPitch,
    clock.lookTargetPitch * idle,
    dt,
    LOOK_EASE,
  );

  const eat = clamp01(locomotion.eatFlash ?? 0);
  const form = clamp01(locomotion.formFlash ?? 0);
  const hurt = clamp01(locomotion.hurtFlash ?? 0);
  // Open on the flash, close as it dies — tied to pulseEat / bite, not a loop.
  const jaw = Math.sin(eat * Math.PI) * (kind === "theropod" ? 0.48 : 0.34);

  const swingAmp = profile.swing * (0.78 + 0.22 * clock.drive) * (1 - clock.trot * 0.08);
  const liftAmp = profile.lift * (0.85 + 0.15 * clock.drive) * (1 + clock.trot * (TROT_LIFT - 1));
  const cycle = clock.phase / (Math.PI * 2);
  const plants = kind === "theropod" ? 2 : 4;

  let plantSum = 0;
  for (let i = 0; i < 4; i += 1) {
    const unit = cycle + slotPhase(kind, i, clock.trot);
    const leg = legCycle(unit, swingAmp, liftAmp, profile.duty);
    const poseLeg = clock.pose.legs[i];
    const scale = clock.drive;
    poseLeg.swing = leg.swing * scale;
    poseLeg.lift = leg.lift * scale;
    poseLeg.roll = leg.roll * scale;
    if (i < plants) {
      plantSum += 1 - Math.min(1, leg.lift / Math.max(0.0001, liftAmp));
    }
  }

  const impact = clock.drive * (plantSum / plants);
  const breath = Math.sin(elapsed * 1.28 + clock.salt * 6.2) * 0.013 * idle;
  const bobWave =
    kind === "theropod"
      ? Math.abs(Math.sin(clock.phase))
      : Math.abs(Math.sin(clock.phase * 2));
  const bob = -bobWave * profile.bob * clock.drive * (0.55 + 0.45 * impact);

  const yawRate = locomotion.yawRate ?? 0;
  const lean = clock.drive * profile.lean + eat * 0.1;
  const neckWalk =
    kind === "sauropod"
      ? Math.sin(clock.phase) * 0.045 * clock.drive
      : Math.sin(clock.phase) * 0.02 * clock.drive;

  const pose = clock.pose;
  pose.bodyY = bob + breath + eat * -0.035 - hurt * 0.02;
  pose.bodyPitch =
    lean +
    neckWalk +
    clock.lookPitch +
    eat * 0.14 +
    hurt * 0.1 -
    form * 0.04;
  pose.bodyRoll = Math.sin(clock.phase) * profile.roll * clock.drive - yawRate * 0.09;
  pose.bodySway = clock.lookYaw * (kind === "sauropod" ? 0.45 : 1);
  pose.jaw = jaw;
  pose.neckPitch = eat * 0.18 + clock.lookPitch * 0.5 + neckWalk * 0.6;
  pose.tailYaw =
    Math.sin(clock.phase + 1.1) * profile.tail * clock.drive +
    Math.sin(elapsed * 0.62 + clock.salt * 4) * 0.07 * idle;
  pose.tailPitch =
    Math.sin(clock.phase * 0.5 + 0.4) * profile.tail * 0.35 * clock.drive +
    breath * 2.2;
  pose.armSwing =
    (kind === "theropod" ? clock.pose.legs[1].swing : Math.sin(clock.phase) * 0.2 * clock.drive) *
    profile.arm;

  return pose;
}
