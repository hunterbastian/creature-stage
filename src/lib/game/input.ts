export const keys = {
  forward: false,
  back: false,
  left: false,
  right: false,
};

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
  const onBlur = () => {
    keys.forward = false;
    keys.back = false;
    keys.left = false;
    keys.right = false;
  };

  window.addEventListener("keydown", onDown);
  window.addEventListener("keyup", onUp);
  window.addEventListener("blur", onBlur);
  return () => {
    window.removeEventListener("keydown", onDown);
    window.removeEventListener("keyup", onUp);
    window.removeEventListener("blur", onBlur);
    onBlur();
  };
}
