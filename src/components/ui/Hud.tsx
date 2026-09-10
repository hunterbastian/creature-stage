"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  nextUnlock,
  partsForSlot,
  slotLabel,
  unlockProgress,
} from "@/lib/game/catalog";
import { SLOT_UNLOCK_AT } from "@/lib/game/constants";
import { readPlaySurface, usePlaySurface } from "@/lib/game/play-surface";
import { temperamentLabel } from "@/lib/game/species";
import { useGameStore } from "@/lib/game/store";
import { SLOT_IDS, type SlotId } from "@/lib/game/types";

function NestPrompt({ compact }: { compact?: boolean }) {
  const nearby = useGameStore((state) => state.nearbyNest);
  const toast = useGameStore((state) => state.toast);
  const { touch } = usePlaySurface();

  if (!nearby || toast) return null;

  const action = touch ? "Eat" : "E or linger";
  const line = nearby.isHome
    ? `Home nest · ${action} to rest`
    : `${nearby.name} · ${action} to claim`;

  return (
    <div
      className={`pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 rounded-full border border-lime-200/35 bg-black/55 px-4 py-2 text-center text-lime-50 backdrop-blur ${
        compact ? "top-[7.1rem] text-xs" : "top-28 text-sm"
      }`}
    >
      <span className="font-medium">{line}</span>
      <span className="mt-0.5 block text-[11px] text-emerald-100/75">
        {nearby.speciesName} · {temperamentLabel(nearby.temperament)} flock
      </span>
    </div>
  );
}

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

function SlotPicker({
  slot,
  locked,
  compact,
}: {
  slot: SlotId;
  locked: boolean;
  compact?: boolean;
}) {
  const equipped = useGameStore((state) => state.parts[slot]);
  const setPart = useGameStore((state) => state.setPart);
  const eaten = useGameStore((state) => state.eaten);
  const options = partsForSlot(slot);
  const remaining = Math.max(0, SLOT_UNLOCK_AT[slot] - eaten);

  return (
    <section className="space-y-2">
      {compact ? null : (
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
      )}
      <div className={`grid gap-1.5 ${compact ? "grid-cols-3" : "grid-cols-2"}`}>
        {options.map((part) => {
          const active = equipped === part.id;
          return (
            <button
              key={`${slot}-${part.id}`}
              type="button"
              disabled={locked}
              onClick={() => setPart(slot, part.id)}
              className={`touch-manipulation rounded-lg border text-left transition ${
                compact ? "min-h-11 px-2.5 py-2" : "px-2 py-1.5"
              } ${
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
      {compact && locked ? (
        <p className="text-[11px] text-amber-200/80">
          Eat {remaining} more to unlock {slotLabel(slot).toLowerCase()}.
        </p>
      ) : null}
    </section>
  );
}

function StatsBlock() {
  const eaten = useGameStore((state) => state.eaten);
  const stats = useGameStore((state) => state.stats);
  const homeNestId = useGameStore((state) => state.homeNestId);
  const nests = useGameStore((state) => state.nests);
  const upcoming = nextUnlock(eaten);
  const home = nests.find((nest) => nest.id === homeNestId);

  return (
    <div className="space-y-2 rounded-xl bg-black/25 p-3">
      <Stat label="DNA meals" value={String(eaten)} />
      <Stat label="Size" value={stats.size.toFixed(2)} />
      <Stat label="Speed" value={stats.speed.toFixed(2)} />
      <Stat label="Bite" value={stats.bite.toFixed(2)} />
      <Stat label="Home nest" value={home?.name ?? "—"} />
      <div className="pt-1">
        <div className="mb-1 text-[11px] uppercase tracking-[0.14em] text-emerald-200/70">
          {upcoming ? `Next: ${slotLabel(upcoming.slot)}` : "All slots unlocked"}
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
  );
}

function EditorActions() {
  const randomize = useGameStore((state) => state.randomize);
  const reset = useGameStore((state) => state.reset);

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={randomize}
        className="min-h-11 flex-1 touch-manipulation rounded-lg border border-lime-200/30 bg-lime-300/15 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-lime-50 hover:bg-lime-300/25"
      >
        Mutate
      </button>
      <button
        type="button"
        onClick={reset}
        className="min-h-11 flex-1 touch-manipulation rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-50 hover:bg-white/10"
      >
        Reset
      </button>
    </div>
  );
}

function CompactHud({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const eaten = useGameStore((state) => state.eaten);
  const stats = useGameStore((state) => state.stats);
  const unlocked = useGameStore((state) => state.unlocked);
  const toast = useGameStore((state) => state.toast);
  const [slot, setSlot] = useState<SlotId>("body");

  return (
    <div className="pointer-events-none absolute inset-0 z-10 text-white">
      <header
        className="flex items-start justify-between gap-3"
        style={{
          paddingTop: "max(0.55rem, env(safe-area-inset-top))",
          paddingLeft: "max(0.85rem, env(safe-area-inset-left))",
          paddingRight: "max(0.85rem, env(safe-area-inset-right))",
        }}
      >
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-white">
            Tideform
          </h1>
          <p className="mt-0.5 font-mono text-[11px] text-emerald-100/80">
            {eaten} meals · size {stats.size.toFixed(2)}
          </p>
        </div>
        <button
          type="button"
          className="pointer-events-auto min-h-11 min-w-11 touch-manipulation rounded-full border border-white/15 bg-black/45 px-4 text-xs font-semibold uppercase tracking-widest backdrop-blur"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close" : "Editor"}
        </button>
      </header>

      {toast ? (
        <div className="pointer-events-none absolute left-1/2 top-[4.6rem] -translate-x-1/2 rounded-full border border-lime-200/30 bg-black/55 px-4 py-2 text-sm text-lime-50 backdrop-blur">
          {toast}
        </div>
      ) : null}

      <NestPrompt compact />

      {open ? (
        <div
          className="pointer-events-auto absolute bottom-0"
          style={{
            left: "max(8.15rem, calc(env(safe-area-inset-left) + 7.25rem))",
            right: "max(6.9rem, calc(env(safe-area-inset-right) + 6.1rem))",
            paddingBottom: "max(0.45rem, env(safe-area-inset-bottom))",
          }}
        >
          <div
            data-allow-scroll
            className="max-h-[min(52dvh,17.5rem)] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#102116]/88 p-3 shadow-2xl shadow-black/40 backdrop-blur-md"
            style={{ touchAction: "pan-y" }}
          >
            <div className="mb-2 flex items-center gap-3 font-mono text-[11px] text-emerald-100/85">
              <span>DNA {eaten}</span>
              <span>Spd {stats.speed.toFixed(1)}</span>
              <span>Bite {stats.bite.toFixed(1)}</span>
              <span className="ml-auto h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                <span
                  className="block h-full rounded-full bg-lime-300"
                  style={{
                    width: `${Math.min(100, unlockProgress(eaten) * 100)}%`,
                  }}
                />
              </span>
            </div>
            <div
              className="mb-2 flex gap-1 overflow-x-auto pb-1"
              style={{ touchAction: "pan-x" }}
            >
              {SLOT_IDS.map((id) => {
                const locked = !unlocked.includes(id);
                const active = slot === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSlot(id)}
                    className={`min-h-11 shrink-0 touch-manipulation rounded-full border px-3 text-xs font-semibold uppercase tracking-wider ${
                      active
                        ? "border-lime-300/70 bg-lime-300/20 text-lime-50"
                        : locked
                          ? "border-white/10 bg-black/20 text-white/45"
                          : "border-white/10 bg-white/5 text-emerald-50"
                    }`}
                  >
                    {slotLabel(id)}
                  </button>
                );
              })}
            </div>
            <SlotPicker
              slot={slot}
              locked={!unlocked.includes(slot)}
              compact
            />
            <div className="mt-3">
              <EditorActions />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DesktopHud() {
  const unlocked = useGameStore((state) => state.unlocked);
  const toast = useGameStore((state) => state.toast);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between text-white"
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingRight: "max(1rem, env(safe-area-inset-right))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
      }}
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-sans text-2xl font-semibold tracking-tight text-white">
            Tideform
          </h1>
          <p className="mt-1 max-w-sm text-sm text-emerald-100/80">
            Build a critter, graze with meadow herds, and nestle at a hollow to
            rest.
          </p>
        </div>
      </header>

      {toast ? (
        <div className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 rounded-full border border-lime-200/30 bg-black/55 px-4 py-2 text-sm text-lime-50 backdrop-blur">
          {toast}
        </div>
      ) : null}

      <NestPrompt />

      <aside
        className="pointer-events-auto absolute flex w-[min(100%,20rem)] flex-col gap-4 overflow-y-auto rounded-2xl border border-white/10 bg-[#102116]/78 p-4 shadow-2xl shadow-black/40 backdrop-blur-md"
        style={{
          top: "max(1rem, env(safe-area-inset-top))",
          right: "max(1rem, env(safe-area-inset-right))",
          bottom: "max(5.5rem, calc(env(safe-area-inset-bottom) + 4.5rem))",
        }}
      >
        <StatsBlock />

        {SLOT_IDS.map((slot) => (
          <SlotPicker
            key={slot}
            slot={slot}
            locked={!unlocked.includes(slot)}
          />
        ))}

        <div className="mt-auto pt-2">
          <EditorActions />
        </div>
      </aside>

      <footer className="mx-auto mb-1 w-fit max-w-xl rounded-xl border border-white/10 bg-black/35 px-4 py-2 text-xs text-emerald-50/90 backdrop-blur">
        <span className="font-semibold text-lime-200">WASD</span> to walk · bump
        fruit to eat · <span className="font-semibold text-lime-200">E</span> or
        linger in a nest to nestle · editor swaps parts
      </footer>
    </div>
  );
}

export function Hud() {
  const starterChosen = useGameStore((state) => state.starterChosen);
  const surface = usePlaySurface();
  const toast = useGameStore((state) => state.toast);
  const clearToast = useGameStore((state) => state.clearToast);
  const [open, setOpen] = useState(() => !readPlaySurface().compact);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => clearToast(), 2600);
    return () => window.clearTimeout(timer);
  }, [toast, clearToast]);

  if (!starterChosen) return null;

  if (surface.compact) {
    return <CompactHud open={open} setOpen={setOpen} />;
  }

  return <DesktopHud />;
}
