"use client";

import { useEffect, useState } from "react";
import {
  nextUnlock,
  partsForSlot,
  slotLabel,
  unlockProgress,
} from "@/lib/game/catalog";
import { SLOT_UNLOCK_AT } from "@/lib/game/constants";
import { useGameStore } from "@/lib/game/store";
import { SLOT_IDS, type SlotId } from "@/lib/game/types";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[11px] uppercase tracking-[0.14em] text-emerald-200/70">
        {label}
      </span>
      <span className="font-mono text-sm text-emerald-50">{value}</span>
    </div>
  );
}

function SlotPicker({ slot, locked }: { slot: SlotId; locked: boolean }) {
  const equipped = useGameStore((state) => state.parts[slot]);
  const setPart = useGameStore((state) => state.setPart);
  const eaten = useGameStore((state) => state.eaten);
  const options = partsForSlot(slot);
  const remaining = Math.max(0, SLOT_UNLOCK_AT[slot] - eaten);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-lime-100">
          {slotLabel(slot)}
        </h3>
        {locked ? (
          <span className="text-[10px] text-amber-200/80">
            Eat {remaining} more
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((part) => {
          const active = equipped === part.id;
          return (
            <button
              key={`${slot}-${part.id}`}
              type="button"
              disabled={locked}
              onClick={() => setPart(slot, part.id)}
              className={`rounded-lg border px-2 py-1.5 text-left transition ${
                locked
                  ? "cursor-not-allowed border-white/5 bg-black/20 text-white/30"
                  : active
                    ? "border-lime-300/70 bg-lime-300/15 text-lime-50"
                    : "border-white/10 bg-white/5 text-emerald-50 hover:border-lime-200/40 hover:bg-white/10"
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: locked ? "#445" : part.color }}
                />
                <span className="text-xs font-medium">{part.name}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function Hud() {
  const eaten = useGameStore((state) => state.eaten);
  const stats = useGameStore((state) => state.stats);
  const unlocked = useGameStore((state) => state.unlocked);
  const toast = useGameStore((state) => state.toast);
  const randomize = useGameStore((state) => state.randomize);
  const reset = useGameStore((state) => state.reset);
  const clearToast = useGameStore((state) => state.clearToast);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => clearToast(), 2600);
    return () => window.clearTimeout(timer);
  }, [toast, clearToast]);

  const upcoming = nextUnlock(eaten);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 text-white">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-lime-200/80">
            Creature Stage
          </p>
          <h1 className="font-sans text-2xl font-semibold tracking-tight text-white">
            Sporling Meadow
          </h1>
          <p className="mt-1 max-w-sm text-sm text-emerald-100/80">
            Build a critter, walk it around, and eat glowing fruit to grow.
          </p>
        </div>
        <button
          type="button"
          className="pointer-events-auto rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs uppercase tracking-widest backdrop-blur md:hidden"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Hide editor" : "Editor"}
        </button>
      </header>

      {toast ? (
        <div className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 rounded-full border border-lime-200/30 bg-black/55 px-4 py-2 text-sm text-lime-50 backdrop-blur">
          {toast}
        </div>
      ) : null}

      <aside
        className={`pointer-events-auto absolute right-4 top-4 bottom-24 w-[min(100%,20rem)] overflow-y-auto rounded-2xl border border-white/10 bg-[#102116]/78 p-4 shadow-2xl shadow-black/40 backdrop-blur-md ${
          open ? "flex flex-col gap-4" : "hidden md:flex md:flex-col md:gap-4"
        }`}
      >
        <div className="space-y-2 rounded-xl bg-black/25 p-3">
          <Stat label="DNA meals" value={String(eaten)} />
          <Stat label="Size" value={stats.size.toFixed(2)} />
          <Stat label="Speed" value={stats.speed.toFixed(2)} />
          <Stat label="Bite" value={stats.bite.toFixed(2)} />
          <div className="pt-1">
            <div className="mb-1 text-[11px] uppercase tracking-[0.14em] text-emerald-200/70">
              {upcoming
                ? `Next: ${slotLabel(upcoming.slot)}`
                : "All slots unlocked"}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-lime-300"
                style={{
                  width: `${Math.min(100, unlockProgress(eaten) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {SLOT_IDS.map((slot) => (
          <SlotPicker
            key={slot}
            slot={slot}
            locked={!unlocked.includes(slot)}
          />
        ))}

        <div className="mt-auto flex gap-2 pt-2">
          <button
            type="button"
            onClick={randomize}
            className="flex-1 rounded-lg border border-lime-200/30 bg-lime-300/15 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-lime-50 hover:bg-lime-300/25"
          >
            Mutate
          </button>
          <button
            type="button"
            onClick={reset}
            className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-50 hover:bg-white/10"
          >
            Reset
          </button>
        </div>
      </aside>

      <footer className="max-w-xl rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs text-emerald-50/90 backdrop-blur">
        <span className="font-semibold text-lime-200">WASD</span> or arrows to
        walk and turn · bump glowing fruit to eat · editor on the right swaps
        parts
      </footer>
    </div>
  );
}
