/**
 * Shore-threat brain for offshore leviathans. Mutable like `wildlife.ts`
 * so the HUD does not rerender while they swim.
 *
 * Ambient beasts keep the slow orbit from `offshorePose`. At most one
 * beast escalates: notice → surge → windup → strike → recover → retreat.
 * The meadow stays safe — they never cross `WORLD_RADIUS`.
 */
import { WORLD_RADIUS } from "./constants";
import { isCoarsePointer } from "./device";
import {
  TIDE_AGGRO_ARC,
  TIDE_AGGRO_RANGE,
  TIDE_BITE_RADIUS,
  TIDE_COOLDOWN_SEC,
  TIDE_DOWN_SEC,
  TIDE_NOTICE_SEC,
  TIDE_RECOVER_SEC,
  TIDE_RETREAT_SEC,
  TIDE_STRIKE_RADIUS,
  TIDE_STRIKE_SEC,
  TIDE_SURGE_SEC,
  TIDE_WINDUP_SEC,
  biteableMood,
  engagedMood,
  lerpPose,
  mawPoint,
  offshorePose,
  offshoreRoster,
  playerInlandSafe,
  playerOnShore,
  shoreEngagePose,
  tideMoodGlow,
  tideMoodLift,
  wrapAngle,
  type OffshorePose,
  type OffshoreSpec,
  type TideMood,
} from "./offshore";
import { assertNever } from "./types";

export type TideBeast = {
  spec: OffshoreSpec;
  mood: TideMood;
  hp: number;
  moodUntil: number;
  cooldownUntil: number;
  pose: OffshorePose;
  from: OffshorePose;
  to: OffshorePose;
  glow: number;
  strikeEmitted: boolean;
};

export type TideEvent =
  | { kind: "notice"; id: string; name: string }
  | { kind: "strike"; id: string; name: string; damage: number; hit: boolean }
  | { kind: "down"; id: string; name: string };

export type NearbyTide = {
  id: string;
  name: string;
  mood: TideMood;
  canBite: boolean;
  x: number;
  z: number;
};

export const tide = {
  beasts: [] as TideBeast[],
  engagedId: null as string | null,
};

function clonePose(pose: OffshorePose): OffshorePose {
  return { ...pose };
}

function makeBeast(spec: OffshoreSpec, time: number): TideBeast {
  const pose = offshorePose(spec, time);
  return {
    spec,
    mood: "ambient",
    hp: spec.hp,
    moodUntil: 0,
    cooldownUntil: 0,
    pose,
    from: clonePose(pose),
    to: clonePose(pose),
    glow: 0,
    strikeEmitted: false,
  };
}

export function seedTide(mobile = isCoarsePointer(), time = 0): void {
  tide.beasts = offshoreRoster(mobile).map((spec) => makeBeast(spec, time));
  tide.engagedId = null;
}

export function resetTide(mobile = isCoarsePointer()): void {
  seedTide(mobile, 0);
}

function beastById(id: string): TideBeast | undefined {
  return tide.beasts.find((beast) => beast.spec.id === id);
}

export function engagedBeast(): TideBeast | null {
  if (!tide.engagedId) return null;
  return beastById(tide.engagedId) ?? null;
}

function applyMoodPresentation(beast: TideBeast, elapsed: number): void {
  const lift = tideMoodLift(beast.mood);
  if (beast.mood === "ambient") {
    beast.pose = offshorePose(beast.spec, elapsed);
    beast.glow = 0;
    return;
  }
  if (beast.mood === "down") {
    const sink = offshorePose(beast.spec, elapsed);
    beast.pose = {
      ...sink,
      y: sink.y + lift,
    };
    beast.glow = 0;
    return;
  }
  beast.pose = {
    ...beast.pose,
    y: beast.pose.y + lift * 0.35,
  };
  beast.glow = tideMoodGlow(beast.mood);
}

function beginMood(
  beast: TideBeast,
  mood: TideMood,
  elapsed: number,
  duration: number,
  to: OffshorePose,
): void {
  beast.mood = mood;
  beast.moodUntil = elapsed + duration;
  beast.from = clonePose(beast.pose);
  beast.to = clonePose(to);
  beast.strikeEmitted = false;
}

function progress(beast: TideBeast, elapsed: number, duration: number): number {
  const remain = Math.max(0, beast.moodUntil - elapsed);
  const t = 1 - remain / Math.max(duration, 0.001);
  return Math.min(1, Math.max(0, t));
}

function easeInOut(t: number): number {
  return t * t * (3 - 2 * t);
}

function noticeScore(
  beast: TideBeast,
  playerX: number,
  playerZ: number,
): number {
  if (beast.mood !== "ambient") return -1;
  const maw = mawPoint(beast.pose.x, beast.pose.z, beast.pose.yaw, beast.spec);
  const dist = Math.hypot(maw.x - playerX, maw.z - playerZ);
  if (dist > TIDE_AGGRO_RANGE) return -1;

  const playerBearing = Math.atan2(playerX, playerZ);
  const beastBearing = Math.atan2(beast.pose.x, beast.pose.z);
  if (Math.abs(wrapAngle(playerBearing - beastBearing)) > TIDE_AGGRO_ARC) {
    return -1;
  }
  return TIDE_AGGRO_RANGE - dist;
}

function pickNotice(
  elapsed: number,
  playerX: number,
  playerZ: number,
): TideBeast | null {
  if (tide.engagedId) return null;
  if (!playerOnShore(playerX, playerZ)) return null;

  let best: TideBeast | null = null;
  let bestScore = 0;
  for (const beast of tide.beasts) {
    if (elapsed < beast.cooldownUntil) continue;
    const score = noticeScore(beast, playerX, playerZ);
    if (score > bestScore) {
      best = beast;
      bestScore = score;
    }
  }
  return best;
}

function retreatTarget(beast: TideBeast, elapsed: number): OffshorePose {
  return offshorePose(beast.spec, elapsed + TIDE_RETREAT_SEC);
}

function facePlayer(beast: TideBeast, playerX: number, playerZ: number): void {
  beast.pose.yaw = Math.atan2(playerX - beast.pose.x, playerZ - beast.pose.z);
}

function holdNearShore(beast: TideBeast): void {
  const radius = Math.hypot(beast.pose.x, beast.pose.z);
  const minR = WORLD_RADIUS + 0.55;
  if (radius >= minR || radius < 0.001) return;
  const scale = minR / radius;
  beast.pose.x *= scale;
  beast.pose.z *= scale;
}

function tickEngaged(
  beast: TideBeast,
  dt: number,
  elapsed: number,
  playerX: number,
  playerZ: number,
  events: TideEvent[],
): void {
  const inland = playerInlandSafe(playerX, playerZ);

  switch (beast.mood) {
    case "notice": {
      const next = shoreEngagePose(beast.spec, playerX, playerZ);
      beast.pose = lerpPose(beast.from, next, easeInOut(progress(beast, elapsed, TIDE_NOTICE_SEC)));
      beast.pose.y += tideMoodLift("notice");
      facePlayer(beast, playerX, playerZ);
      beast.glow = tideMoodGlow("notice");
      if (inland) {
        beginMood(beast, "retreat", elapsed, TIDE_RETREAT_SEC, retreatTarget(beast, elapsed));
        return;
      }
      if (elapsed < beast.moodUntil) return;
      beginMood(
        beast,
        "surge",
        elapsed,
        TIDE_SURGE_SEC,
        shoreEngagePose(beast.spec, playerX, playerZ),
      );
      return;
    }
    case "surge": {
      if (!inland) {
        beast.to = shoreEngagePose(beast.spec, playerX, playerZ);
      }
      beast.pose = lerpPose(
        beast.from,
        beast.to,
        easeInOut(progress(beast, elapsed, TIDE_SURGE_SEC)),
      );
      beast.pose.y += tideMoodLift("surge");
      facePlayer(beast, playerX, playerZ);
      holdNearShore(beast);
      beast.glow = tideMoodGlow("surge");
      if (inland && progress(beast, elapsed, TIDE_SURGE_SEC) < 0.55) {
        beginMood(beast, "retreat", elapsed, TIDE_RETREAT_SEC, retreatTarget(beast, elapsed));
        return;
      }
      if (elapsed < beast.moodUntil) return;
      beginMood(
        beast,
        "windup",
        elapsed,
        TIDE_WINDUP_SEC,
        shoreEngagePose(beast.spec, playerX, playerZ),
      );
      return;
    }
    case "windup": {
      const hold = shoreEngagePose(beast.spec, playerX, playerZ);
      const blended = lerpPose(beast.from, hold, 1 - Math.exp(-dt * 4.2));
      beast.pose = { ...blended, y: hold.y + tideMoodLift("windup") };
      facePlayer(beast, playerX, playerZ);
      holdNearShore(beast);
      beast.glow = tideMoodGlow("windup");
      if (elapsed < beast.moodUntil) return;
      beginMood(beast, "strike", elapsed, TIDE_STRIKE_SEC, {
        ...hold,
        y: hold.y + tideMoodLift("strike"),
        pitch: 0.22,
      });
      return;
    }
    case "strike": {
      beast.pose = lerpPose(
        beast.from,
        beast.to,
        easeInOut(progress(beast, elapsed, TIDE_STRIKE_SEC)),
      );
      holdNearShore(beast);
      beast.glow = tideMoodGlow("strike");
      if (!beast.strikeEmitted) {
        beast.strikeEmitted = true;
        const maw = mawPoint(beast.pose.x, beast.pose.z, beast.pose.yaw, beast.spec);
        const dist = Math.hypot(maw.x - playerX, maw.z - playerZ);
        const hit = !inland && dist <= TIDE_STRIKE_RADIUS;
        events.push({
          kind: "strike",
          id: beast.spec.id,
          name: beast.spec.name,
          damage: beast.spec.strike,
          hit,
        });
      }
      if (elapsed < beast.moodUntil) return;
      beginMood(
        beast,
        "recover",
        elapsed,
        TIDE_RECOVER_SEC,
        shoreEngagePose(beast.spec, playerX, playerZ),
      );
      return;
    }
    case "recover": {
      const hold = shoreEngagePose(beast.spec, playerX, playerZ);
      const blended = lerpPose(beast.from, hold, 1 - Math.exp(-dt * 3.1));
      beast.pose = { ...blended, y: hold.y + tideMoodLift("recover") };
      facePlayer(beast, playerX, playerZ);
      holdNearShore(beast);
      beast.glow = tideMoodGlow("recover");
      if (elapsed < beast.moodUntil) return;
      if (beast.hp <= 0) {
        beginMood(beast, "down", elapsed, TIDE_DOWN_SEC, {
          ...beast.pose,
          y: beast.pose.y - 2.4,
        });
        tide.engagedId = null;
        return;
      }
      beginMood(beast, "retreat", elapsed, TIDE_RETREAT_SEC, retreatTarget(beast, elapsed));
      return;
    }
    case "retreat": {
      beast.to = retreatTarget(beast, elapsed);
      beast.pose = lerpPose(
        beast.from,
        beast.to,
        easeInOut(progress(beast, elapsed, TIDE_RETREAT_SEC)),
      );
      beast.glow = tideMoodGlow("retreat");
      if (elapsed < beast.moodUntil) return;
      beast.mood = "ambient";
      beast.cooldownUntil = elapsed + TIDE_COOLDOWN_SEC;
      beast.glow = 0;
      if (tide.engagedId === beast.spec.id) tide.engagedId = null;
      return;
    }
    case "down":
    case "ambient":
      return;
    default:
      assertNever(beast.mood, "Unknown tide mood");
  }
}

export function tickTide(
  dt: number,
  elapsed: number,
  playerX: number,
  playerZ: number,
  active: boolean,
): TideEvent[] {
  const events: TideEvent[] = [];

  if (tide.beasts.length === 0) seedTide(isCoarsePointer(), elapsed);

  for (const beast of tide.beasts) {
    if (beast.mood === "ambient") {
      beast.pose = offshorePose(beast.spec, elapsed);
      beast.glow = 0;
      continue;
    }
    if (beast.mood === "down") {
      applyMoodPresentation(beast, elapsed);
      if (elapsed >= beast.moodUntil) {
        beast.hp = beast.spec.hp;
        beast.mood = "ambient";
        beast.cooldownUntil = elapsed + TIDE_COOLDOWN_SEC * 0.45;
        beast.glow = 0;
        beast.pose = offshorePose(beast.spec, elapsed);
      }
    }
  }

  if (active && !tide.engagedId) {
    const candidate = pickNotice(elapsed, playerX, playerZ);
    if (candidate) {
      tide.engagedId = candidate.spec.id;
      beginMood(
        candidate,
        "notice",
        elapsed,
        TIDE_NOTICE_SEC,
        shoreEngagePose(candidate.spec, playerX, playerZ),
      );
      events.push({
        kind: "notice",
        id: candidate.spec.id,
        name: candidate.spec.name,
      });
    }
  }

  const engaged = engagedBeast();
  if (engaged && engaged.mood !== "down") {
    tickEngaged(engaged, dt, elapsed, playerX, playerZ, events);
  }

  return events;
}

export function tideThreat(playerX: number, playerZ: number): number {
  const engaged = engagedBeast();
  if (!engaged || !engagedMood(engaged.mood)) return 0;
  const maw = mawPoint(
    engaged.pose.x,
    engaged.pose.z,
    engaged.pose.yaw,
    engaged.spec,
  );
  const dist = Math.hypot(maw.x - playerX, maw.z - playerZ);
  if (dist >= 14) return 0.18;
  const intensity = 1 - dist / 14;
  switch (engaged.mood) {
    case "notice":
      return intensity * 0.35;
    case "surge":
      return intensity * 0.62;
    case "windup":
      return 0.55 + intensity * 0.4;
    case "strike":
      return 1;
    case "recover":
      return intensity * 0.4;
    case "retreat":
      return intensity * 0.16;
    case "ambient":
    case "down":
      return 0;
    default:
      return assertNever(engaged.mood, "Unknown tide mood");
  }
}

export function tideBiteTarget(
  playerX: number,
  playerZ: number,
  reach: number,
): TideBeast | null {
  const engaged = engagedBeast();
  if (!engaged || !biteableMood(engaged.mood) || engaged.hp <= 0) return null;
  const maw = mawPoint(
    engaged.pose.x,
    engaged.pose.z,
    engaged.pose.yaw,
    engaged.spec,
  );
  const dist = Math.hypot(maw.x - playerX, maw.z - playerZ);
  if (dist > Math.max(reach, TIDE_BITE_RADIUS)) return null;
  return engaged;
}

export function woundTide(id: string, damage: number, elapsed: number): boolean {
  const beast = beastById(id);
  if (!beast || beast.hp <= 0) return false;
  beast.hp = Math.max(0, beast.hp - damage);
  if (beast.hp > 0) return false;
  beginMood(beast, "down", elapsed, TIDE_DOWN_SEC, {
    ...beast.pose,
    y: beast.pose.y - 2.6,
  });
  if (tide.engagedId === id) tide.engagedId = null;
  return true;
}

export function forceTideRetreat(elapsed: number): void {
  const engaged = engagedBeast();
  if (!engaged) return;
  beginMood(engaged, "retreat", elapsed, TIDE_RETREAT_SEC, retreatTarget(engaged, elapsed));
  tide.engagedId = null;
}

export function nearbyTide(
  playerX: number,
  playerZ: number,
): NearbyTide | null {
  const engaged = engagedBeast();
  if (!engaged || !engagedMood(engaged.mood)) return null;
  const maw = mawPoint(
    engaged.pose.x,
    engaged.pose.z,
    engaged.pose.yaw,
    engaged.spec,
  );
  const dist = Math.hypot(maw.x - playerX, maw.z - playerZ);
  if (dist > 16) return null;
  return {
    id: engaged.spec.id,
    name: engaged.spec.name,
    mood: engaged.mood,
    canBite: Boolean(tideBiteTarget(playerX, playerZ, TIDE_BITE_RADIUS)),
    x: maw.x,
    z: maw.z,
  };
}

export function tideWaypoint(
  playerX: number,
  playerZ: number,
): { id: string; x: number; z: number } | null {
  const near = nearbyTide(playerX, playerZ);
  if (!near) return null;
  return { id: near.id, x: near.x, z: near.z };
}
