"use client";

import { useEffect, useState } from "react";
import { isCoarsePointer } from "./device";

export type PlaySurface = {
  /** Phone / short viewport: use the compact HUD instead of the desktop sidebar. */
  compact: boolean;
  /** Height-led portrait. Used for the rotate-device hint. */
  portrait: boolean;
  /** Show on-screen stick + eat. */
  touch: boolean;
};

export function readPlaySurface(): PlaySurface {
  if (typeof window === "undefined") {
    return { compact: false, portrait: false, touch: false };
  }

  const touch = isCoarsePointer();
  const portrait = window.innerHeight > window.innerWidth;
  const compact =
    touch || window.innerHeight <= 540 || window.innerWidth <= 700;

  return { compact, portrait, touch };
}

export function usePlaySurface(): PlaySurface {
  const [surface, setSurface] = useState<PlaySurface>(readPlaySurface);

  useEffect(() => {
    const sync = () => setSurface(readPlaySurface());
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    const portraitMq = window.matchMedia("(orientation: portrait)");
    const coarseMq = window.matchMedia("(pointer: coarse)");
    portraitMq.addEventListener("change", sync);
    coarseMq.addEventListener("change", sync);
    sync();
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      portraitMq.removeEventListener("change", sync);
      coarseMq.removeEventListener("change", sync);
    };
  }, []);

  return surface;
}
