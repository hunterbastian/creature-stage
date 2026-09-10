"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";

const GameCanvas = dynamic(
  () => import("@/components/game/GameCanvas").then((mod) => mod.GameCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full w-full place-items-center bg-[#16301c] text-lime-100">
        Waking Tideform…
      </div>
    ),
  },
);

const Hud = dynamic(
  () => import("@/components/ui/Hud").then((mod) => mod.Hud),
  { ssr: false },
);

const TouchControls = dynamic(
  () =>
    import("@/components/ui/TouchControls").then((mod) => mod.TouchControls),
  { ssr: false },
);

const RotateHint = dynamic(
  () => import("@/components/ui/RotateHint").then((mod) => mod.RotateHint),
  { ssr: false },
);

export function Game() {
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = shellRef.current;
    if (!root) return;

    const onTouchMove = (event: TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-allow-scroll]")) return;
      event.preventDefault();
    };
    const preventGesture = (event: Event) => event.preventDefault();

    root.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("gesturestart", preventGesture);
    document.addEventListener("gesturechange", preventGesture);
    document.addEventListener("gestureend", preventGesture);

    return () => {
      root.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend", preventGesture);
    };
  }, []);

  return (
    <div
      ref={shellRef}
      className="fixed inset-0 overflow-hidden overscroll-none bg-[#16301c] select-none"
    >
      <GameCanvas />
      <Hud />
      <TouchControls />
      <RotateHint />
    </div>
  );
}
