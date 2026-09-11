import { collidePlayer } from "./collision";
import {
  MOVE_ACCEL,
  MOVE_DECEL,
  SPRINT_MULT,
  STAMINA_DRAIN,
  STAMINA_RECOVER,
  STAMINA_WINDED,
  TURN_SPEED,
  TURN_SPEED_SPRINT,
  YAW_ACCEL,
} from "./constants";
import { bearingTo, type Waypoint } from "./progress";
import { sim } from "./sim";

function approach(current: number, target: number, maxDelta: number): number {
  const delta = target - current;
  if (Math.abs(delta) <= maxDelta) return target;
  return current + Math.sign(delta) * maxDelta;
}

/**
 * Inertia walk + stamina trot. Hitstop freezes wish velocity so bites and
 * claims land with a hitch instead of sliding through.
 */
export function tickLocomotion(
  dt: number,
  throttle: number,
  turn: number,
  wantSprint: boolean,
  waypoint: Waypoint | null,
): void {
  if (steerFocusPull(dt, throttle, waypoint)) {
    /* yaw eased toward the objective */
  }

  const canSprint =
    wantSprint && sim.winded <= 0 && sim.stamina > 0.04 && Math.abs(throttle) > 0.12;
  sim.sprinting = canSprint;

  const turnCap = canSprint ? TURN_SPEED_SPRINT : TURN_SPEED;
  const wishRate = turn * turnCap;
  sim.yawRate = approach(sim.yawRate, wishRate, YAW_ACCEL * dt);
  sim.yaw += sim.yawRate * dt;

  const maxSpeed = sim.speed * (canSprint ? SPRINT_MULT : 1);
  const wish = sim.hitstop > 0 ? 0 : throttle * maxSpeed;
  const wishX = Math.sin(sim.yaw) * wish;
  const wishZ = Math.cos(sim.yaw) * wish;
  const accel = Math.abs(throttle) > 0.04 && sim.hitstop <= 0 ? MOVE_ACCEL : MOVE_DECEL;
  sim.vx = approach(sim.vx, wishX, accel * dt);
  sim.vz = approach(sim.vz, wishZ, accel * dt);

  if (sim.hitstop > 0) {
    sim.vx *= Math.max(0, 1 - dt * 7.5);
    sim.vz *= Math.max(0, 1 - dt * 7.5);
  }

  sim.x += sim.vx * dt;
  sim.z += sim.vz * dt;
  const next = collidePlayer(sim, dt);
  sim.x = next.x;
  sim.y = next.y;
  sim.z = next.z;
  sim.vx = next.vx;
  sim.vy = next.vy;
  sim.vz = next.vz;

  const speedNow = Math.hypot(sim.vx, sim.vz);
  sim.moving = speedNow > 0.12;
  sim.gait = Math.min(1, speedNow / Math.max(0.8, sim.speed));

  if (canSprint && sim.moving) {
    sim.stamina = Math.max(0, sim.stamina - STAMINA_DRAIN * dt);
    if (sim.stamina <= 0.001) {
      sim.stamina = 0;
      sim.sprinting = false;
      sim.winded = STAMINA_WINDED;
    }
  } else {
    const rate = sim.moving ? STAMINA_RECOVER * 0.62 : STAMINA_RECOVER;
    sim.stamina = Math.min(1, sim.stamina + rate * dt);
  }
}

function steerFocusPull(
  dt: number,
  throttle: number,
  waypoint: Waypoint | null,
): boolean {
  if (!waypoint) {
    sim.hasFocusTarget = false;
    return false;
  }
  sim.focusX = waypoint.x;
  sim.focusZ = waypoint.z;
  sim.hasFocusTarget = true;
  const bearing = bearingTo(sim.x, sim.z, sim.yaw, waypoint.x, waypoint.z);
  if (sim.focus && Math.abs(bearing) < 1.35) {
    sim.yaw += bearing * 2.05 * dt;
    return true;
  }
  if (throttle > 0.18 && Math.abs(bearing) < 0.52) {
    sim.yaw += bearing * 0.78 * dt;
    return true;
  }
  return false;
}
