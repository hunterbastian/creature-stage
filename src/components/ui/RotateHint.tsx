"use client";

import { useState } from "react";
import { usePlaySurface } from "@/lib/game/play-surface";

export function RotateHint() {
  const { touch, portrait } = usePlaySurface();
  const [dismissed, setDismissed] = useState(false);

  if (!portrait && dismissed) {
    setDismissed(false);
  }

  if (!touch || !portrait || dismissed) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#102116]/70 px-[max(1rem,env(safe-area-inset-left))] py-[max(1rem,env(safe-area-inset-top))] backdrop-blur-[2px]">
      <div className="mx-6 max-w-sm rounded-2xl border border-white/15 bg-black/55 px-6 py-5 text-center shadow-2xl shadow-black/40">
        <div
          className="mx-auto mb-3 h-14 w-9 rounded-md border-2 border-lime-200/80"
          style={{ animation: "creature-rotate-hint 1.6s ease-in-out infinite" }}
          aria-hidden
        />
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-lime-100">
          Rotate for Tideform
        </p>
        <p className="mt-2 text-sm text-emerald-100/85">
          Landscape gives Tideform a move stick and the editor without covering
          the critter.
        </p>
        <button
          type="button"
          className="mt-4 min-h-11 rounded-full border border-white/20 bg-white/10 px-4 text-xs font-semibold uppercase tracking-widest text-emerald-50"
          onClick={() => setDismissed(true)}
        >
          Keep portrait
        </button>
      </div>
    </div>
  );
}
