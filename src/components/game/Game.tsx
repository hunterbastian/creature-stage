"use client";

import dynamic from "next/dynamic";
import { Hud } from "@/components/ui/Hud";

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

export function Game() {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#16301c]">
      <GameCanvas />
      <Hud />
    </div>
  );
}
