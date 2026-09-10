export const keys = {
  forward: false,
  back: false,
  left: false,
  right: false,
};

/** Analog stick + eat latch. Written by touch HUD, sampled in the sim loop. */
export const steer = {
  throttle: 0,
  turn: 0,
  eat: false,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function sampleMove(): { throttle: number; turn: number } {
  const throttle =
    steer.throttle + (keys.forward ? 1 : 0) - (keys.back ? 1 : 0);
  const turn = steer.turn + (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
  return {
    throttle: clamp(throttle, -1, 1),
    turn: clamp(turn, -1, 1),
  };
}

function applyKey(code: string, down: boolean): boolean {
  switch (code) {
    case "KeyW":
    case "ArrowUp":
      keys.forward = down;
      return true;
    case "KeyS":
    case "ArrowDown":
      keys.back = down;
      return true;
    case "KeyA":
    case "ArrowLeft":
      keys.left = down;
      return true;
    case "KeyD":
    case "ArrowRight":
      keys.right = down;
      return true;
    default:
      return false;
  }
}

function releaseAll(): void {
  keys.forward = false;
  keys.back = false;
  keys.left = false;
  keys.right = false;
  steer.throttle = 0;
  steer.turn = 0;
  steer.eat = false;
}

export function bindInput(): () => void {
  const onDown = (event: KeyboardEvent) => {
    if (event.repeat) return;
    if (applyKey(event.code, true) && event.code.startsWith("Arrow")) {
      event.preventDefault();
    }
  };
  const onUp = (event: KeyboardEvent) => {
    applyKey(event.code, false);
  };

  window.addEventListener("keydown", onDown);
  window.addEventListener("keyup", onUp);
  window.addEventListener("blur", releaseAll);
  return () => {
    window.removeEventListener("keydown", onDown);
    window.removeEventListener("keyup", onUp);
    window.removeEventListener("blur", releaseAll);
    releaseAll();
  };
}
