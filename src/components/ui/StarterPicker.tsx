"use client";

import { STARTER_CHOICES } from "@/lib/game/catalog";
import { useGameStore } from "@/lib/game/store";
import { assertNever, type BodyId } from "@/lib/game/types";

function swatch(id: BodyId): string {
  switch (id) {
    case "sleek":
      return "#6e9a88";
    case "plump":
      return "#7a9e90";
    case "spiky":
      return "#eee4d0";
    default:
      return assertNever(id, "Unknown body");
  }
}

export function StarterPicker() {
  const chosen = useGameStore((state) => state.starterChosen);
  const chooseStarter = useGameStore((state) => state.chooseStarter);

  if (chosen) return null;

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-[#2a261c]/55 px-4 backdrop-blur-[2px]">
      <div
        data-allow-scroll
        className="w-full max-w-xl rounded-2xl border border-white/12 bg-[#1e1c18]/92 p-4 shadow-2xl shadow-black/50"
        style={{
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        }}
      >
        <h2 className="text-center text-lg font-semibold tracking-tight text-white">
          Choose your Tideform
        </h2>
        <p className="mt-1 text-center text-sm text-emerald-100/80">
          Pick a coastal saurian. Eat to grow, claim a nest, then mutate.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {STARTER_CHOICES.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => chooseStarter(choice.id)}
              className="min-h-14 touch-manipulation rounded-xl border border-white/12 bg-white/5 px-3 py-3 text-left hover:border-lime-200/40 hover:bg-white/10"
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ background: swatch(choice.id) }}
                />
                <span className="text-sm font-semibold text-lime-50">
                  {choice.title}
                </span>
              </span>
              <span className="mt-1 block text-[12px] leading-snug text-emerald-100/75">
                {choice.blurb}
              </span>
              <span className="mt-1.5 block text-[11px] font-medium text-lime-100/85">
                {choice.purpose}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
