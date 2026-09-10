"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { RotateHint } from "@/components/ui/RotateHint";
import { TouchControls } from "@/components/ui/TouchControls";

const GameCanvas = dynamic(
  () => import("@/components/game/GameCanvas").then((mod) => mod.GameCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full w-full place-items-center bg-[#16301c] text-lime-100">
        Waking the meadow…
      </div>
    ),
  },
);

const Hud = dynamic(
  () => import("@/components/ui/Hud").then((mod) => mod.Hud),
  { ssr: false },
);

export function Game() {
  const shellRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

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
      {ready ? (
        <>
          <Hud />
          <TouchControls />
          <RotateHint />
        </>
      ) : null}
    </div>
  );
}
