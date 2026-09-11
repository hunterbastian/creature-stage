/**
 * Per-frame locomotion lives here on purpose: pushing x/z through React 60
 * times a second would rerender the HUD. The canvas reads these fields
 * inside `useFrame`; the store only syncs stats when parts or meals change.
 */
import { FEEL } from "./constants";

export const sim = {
  x: 0,
  z: 0,
  yaw: 0,
  yawRate: 0,
  vx: 0,
  vz: 0,
  moving: false,
  gait: 0,
  speed: 4.15,
  bite: 0.85,
  size: 1,
  stamina: 1,
  sprinting: false,
  winded: 0,
  focus: false,
  focusX: 0,
  focusZ: 0,
  hasFocusTarget: false,
  threat: 0,
  /** Seconds of locomotion hitch remaining. */
  hitstop: 0,
  camKick: 0,
  /** 1 → 0 nibble squash, written by the store and decayed in tickFeel. */
  eatFlash: 0,
  /** 1 → 0 form-up swell. */
  formFlash: 0,
  claimFlash: 0,
  hp: 3,
  maxHp: 3,
  /** 1 → 0 flinch after a shore slam. */
  hurtFlash: 0,
  iFrames: 0,
  /** Seconds before another leviathan bite registers. */
  biteLock: 0,
  /** 1 while a shore leviathan is engaged near the player. */
  shoreThreat: 0,
};

export function resetSim(x = 0, z = 0, yaw = 0): void {
  sim.x = x;
  sim.z = z;
  sim.yaw = yaw;
  sim.yawRate = 0;
  sim.vx = 0;
  sim.vz = 0;
  sim.moving = false;
  sim.gait = 0;
  sim.stamina = 1;
  sim.sprinting = false;
  sim.winded = 0;
  sim.focus = false;
  sim.hasFocusTarget = false;
  sim.threat = 0;
  sim.hitstop = 0;
  sim.camKick = 0;
  sim.eatFlash = 0;
  sim.formFlash = 0;
  sim.claimFlash = 0;
  sim.hp = sim.maxHp;
  sim.hurtFlash = 0;
  sim.iFrames = 0;
  sim.biteLock = 0;
  sim.shoreThreat = 0;
}

export function tickFeel(dt: number): void {
  if (sim.hitstop > 0) sim.hitstop = Math.max(0, sim.hitstop - dt);
  if (sim.camKick > 0) sim.camKick = Math.max(0, sim.camKick - dt * 3.6);
  if (sim.eatFlash > 0) sim.eatFlash = Math.max(0, sim.eatFlash - dt * 3.4);
  if (sim.formFlash > 0) sim.formFlash = Math.max(0, sim.formFlash - dt * 1.55);
  if (sim.claimFlash > 0) sim.claimFlash = Math.max(0, sim.claimFlash - dt * 2.6);
  if (sim.hurtFlash > 0) sim.hurtFlash = Math.max(0, sim.hurtFlash - dt * 2.8);
  if (sim.iFrames > 0) sim.iFrames = Math.max(0, sim.iFrames - dt);
  if (sim.biteLock > 0) sim.biteLock = Math.max(0, sim.biteLock - dt);
  if (sim.winded > 0) sim.winded = Math.max(0, sim.winded - dt);
}

function kick(amount: number, stop: number): void {
  sim.camKick = Math.max(sim.camKick, amount);
  sim.hitstop = Math.max(sim.hitstop, stop);
}

export function pulseEat(formUp = false): void {
  sim.eatFlash = 1;
  kick(FEEL.eatKick, FEEL.eatHitstop);
  sim.stamina = Math.max(0, sim.stamina - 0.07);
  if (formUp) {
    sim.formFlash = 1;
    kick(FEEL.formKick, FEEL.formHitstop);
  }
}

export function pulseClaim(heavy = true): void {
  sim.claimFlash = 1;
  kick(heavy ? FEEL.claimKick : FEEL.greetKick, heavy ? FEEL.claimHitstop : 0.04);
  if (heavy) sim.stamina = Math.max(0, sim.stamina - 0.1);
}

export function pulseEncounter(kind: "greet" | "threat"): void {
  if (kind === "threat") {
    kick(FEEL.threatKick, 0.04);
    sim.threat = Math.max(sim.threat, 0.7);
    return;
  }
  kick(FEEL.greetKick, 0.035);
}

export function pulseHurt(): void {
  sim.hurtFlash = 1;
  kick(FEEL.hurtKick, FEEL.hurtHitstop);
  sim.stamina = Math.max(0, sim.stamina - 0.2);
}

export function syncSimVitality(maxHp: number, refill = false): void {
  sim.maxHp = Math.max(1, maxHp);
  if (refill) {
    sim.hp = sim.maxHp;
    return;
  }
  sim.hp = Math.min(sim.maxHp, Math.max(0, sim.hp));
}

export function syncSimStats(stats: {
  speed: number;
  bite: number;
  size: number;
}): void {
  sim.speed = stats.speed;
  sim.bite = stats.bite;
  sim.size = stats.size;
}
