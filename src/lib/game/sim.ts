/**
 * Per-frame locomotion lives here on purpose: pushing x/z through React 60
 * times a second would rerender the HUD. The canvas reads these fields
 * inside `useFrame`; the store only syncs stats when parts or meals change.
 */
export const sim = {
  x: 0,
  z: 0,
  yaw: 0,
  moving: false,
  speed: 4.6,
  bite: 0.85,
  size: 1,
};

export function resetSim(x = 0, z = 0, yaw = 0): void {
  sim.x = x;
  sim.z = z;
  sim.yaw = yaw;
  sim.moving = false;
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
