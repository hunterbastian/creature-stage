"use client";

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { MuteControl } from "@/components/ui/MuteControl";
import { partsForSlot, slotLabel } from "@/lib/game/catalog";
import { SLOT_UNLOCK_AT } from "@/lib/game/constants";
import { steer } from "@/lib/game/input";
import { readPlaySurface, usePlaySurface } from "@/lib/game/play-surface";
import {
  bearingTo,
  canMutate,
  currentObjective,
  formAt,
  formProgress,
  nextForm,
} from "@/lib/game/progress";
import { sim } from "@/lib/game/sim";
import { temperamentLabel } from "@/lib/game/species";
import { useGameStore } from "@/lib/game/store";
import { SLOT_IDS, assertNever, type SlotId } from "@/lib/game/types";
import { nearbyTide } from "@/lib/game/offshore-ai";
import { fauna } from "@/lib/game/wildlife";

function waypointPos(id: string, kind: "food" | "nest" | "herd" | "beast") {
  switch (kind) {
    case "food": {
      const food = useGameStore.getState().foods.find((item) => item.id === id);
      return food ? { x: food.x, z: food.z } : null;
    }
    case "nest": {
      const nest = useGameStore.getState().nests.find((item) => item.id === id);
      return nest ? { x: nest.x, z: nest.z } : null;
    }
    case "herd": {
      const agent = fauna.agents.find((item) => item.id === id);
      return agent ? { x: agent.x, z: agent.z } : null;
    }
    case "beast": {
      const beast = nearbyTide(sim.x, sim.z);
      if (beast && beast.id === id) return { x: beast.x, z: beast.z };
      return null;
    }
    default:
      return assertNever(kind, "Unknown waypoint");
  }
}

function Compass() {
  const waypoint = useGameStore((state) => state.waypoint);
  const needle = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!waypoint) return;
    let frame = 0;
    const tick = () => {
      const pos = waypointPos(waypoint.id, waypoint.kind);
      if (needle.current && pos) {
        const bearing = bearingTo(sim.x, sim.z, sim.yaw, pos.x, pos.z);
        needle.current.style.transform = `rotate(${bearing}rad)`;
      }
      if (shell.current) {
        shell.current.style.borderColor = sim.focus
          ? "rgba(200, 232, 168, 0.72)"
          : "rgba(190, 242, 100, 0.3)";
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [waypoint]);

  if (!waypoint) return null;

  return (
    <button
      ref={shell}
      type="button"
      aria-label="Focus objective"
      className="pointer-events-auto flex h-9 w-9 touch-manipulation items-center justify-center rounded-full border border-lime-200/30 bg-black/45"
      onClick={() => {
        steer.focusTap = true;
      }}
    >
      <div
        ref={needle}
        className="h-0 w-0 border-x-[5px] border-b-[10px] border-x-transparent border-b-lime-200"
        style={{ transformOrigin: "50% 70%", marginBottom: "2px" }}
      />
    </button>
  );
}

function VitalityBreath({ compact }: { compact?: boolean }) {
  const fill = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const hurt = sim.hp < sim.maxHp - 0.01;
      const show =
        hurt || sim.hurtFlash > 0.05 || sim.threat > 0.22 || sim.shoreThreat > 0;
      if (wrap.current) wrap.current.style.opacity = show ? "1" : "0";
      if (fill.current) {
        const ratio = sim.maxHp > 0 ? sim.hp / sim.maxHp : 0;
        fill.current.style.width = `${Math.round(ratio * 100)}%`;
        fill.current.style.background = ratio <= 0.34 ? "#c4a070" : "#9ec4b8";
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      ref={wrap}
      className={`pointer-events-none transition-opacity duration-200 ${
        compact ? "mt-1" : "mt-1.5"
      }`}
      style={{ opacity: 0 }}
      aria-hidden
    >
      <div
        className={`overflow-hidden rounded-full bg-white/10 ${
          compact ? "h-[3px] w-20" : "h-[3px] w-28"
        }`}
      >
        <div
          ref={fill}
          className="h-full rounded-full bg-[#9ec4b8]"
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
}

function StaminaBreath({ compact }: { compact?: boolean }) {
  const fill = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const show = sim.stamina < 0.97 || sim.sprinting || sim.winded > 0;
      if (wrap.current) wrap.current.style.opacity = show ? "1" : "0";
      if (fill.current) {
        fill.current.style.width = `${Math.round(sim.stamina * 100)}%`;
        fill.current.style.background =
          sim.winded > 0 ? "#c4a070" : "#d8e0c8";
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      ref={wrap}
      className={`pointer-events-none transition-opacity duration-200 ${
        compact ? "mt-1.5" : "mt-2"
      }`}
      style={{ opacity: 0 }}
      aria-hidden
    >
      <div
        className={`overflow-hidden rounded-full bg-white/10 ${
          compact ? "h-[3px] w-20" : "h-[3px] w-28"
        }`}
      >
        <div
          ref={fill}
          className="h-full rounded-full bg-[#d8e0c8]"
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
}

function ObjectiveChip({ compact }: { compact?: boolean }) {
  const eaten = useGameStore((state) => state.eaten);
  const claimedWild = useGameStore((state) => state.claimedWild);
  const greetedHerd = useGameStore((state) => state.greetedHerd);
  const hasMutated = useGameStore((state) => state.hasMutated);
  const beat = currentObjective({
    eaten,
    claimedWild,
    greetedHerd,
    hasMutated,
  });

  return (
    <div
      className={`flex items-center gap-2 rounded-full border border-white/12 bg-black/40 px-3 py-1.5 text-lime-50 backdrop-blur ${
        compact ? "max-w-[16rem]" : "max-w-sm"
      }`}
    >
      <Compass />
      <div className="min-w-0">
        <p className={`truncate font-medium ${compact ? "text-xs" : "text-sm"}`}>
          {beat.label}
        </p>
        <p className="truncate text-[11px] text-emerald-100/75">{beat.hint}</p>
      </div>
    </div>
  );
}

function MateLine({ mates }: { mates: number }) {
  return (
    <span className="font-mono text-[11px] text-emerald-100/70">
      {mates === 1 ? "1 mate" : `${mates} mates`}
    </span>
  );
}

function TidePrompt({ compact }: { compact?: boolean }) {
  const threat = useGameStore((state) => state.nearbyThreat);
  const toast = useGameStore((state) => state.toast);
  const { touch } = usePlaySurface();

  if (!threat || toast) return null;

  const action = touch ? "Eat" : "Eat / walk in";
  const line = threat.canBite
    ? `${threat.name} is open · ${action} to bite`
    : `${threat.name} surges · flee inland or wait the slam`;

  return (
    <div
      className={`pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 rounded-full border border-teal-100/40 bg-black/55 px-4 py-2 text-center text-lime-50 backdrop-blur ${
        compact ? "top-[7.1rem] text-xs" : "top-28 text-sm"
      }`}
    >
      <span className="font-medium">{line}</span>
      <span className="mt-0.5 block text-[11px] text-emerald-100/75">
        Deep water only — the meadow is safe
      </span>
    </div>
  );
}

function NestPrompt({ compact }: { compact?: boolean }) {
  const nearby = useGameStore((state) => state.nearbyNest);
  const threat = useGameStore((state) => state.nearbyThreat);
  const toast = useGameStore((state) => state.toast);
  const eaten = useGameStore((state) => state.eaten);
  const { touch } = usePlaySurface();

  if (threat || !nearby || toast) return null;

  const action = touch ? "Eat" : "E or linger";
  const claimOpen = formAt(eaten).canClaimNest;
  const line = nearby.isHome
    ? `Home nest · ${action} to rest`
    : claimOpen
      ? `${nearby.name} · ${action} to claim`
      : `${nearby.name} · grow to claim`;

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

function FormBar({ compact }: { compact?: boolean }) {
  const eaten = useGameStore((state) => state.eaten);
  const form = formAt(eaten);
  const upcoming = nextForm(eaten);

  return (
    <div className={compact ? "min-w-0" : "space-y-1"}>
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={`font-semibold tracking-tight text-lime-50 ${
            compact ? "text-xs" : "text-sm"
          }`}
        >
          {form.name}
        </span>
        <span className="font-mono text-[11px] text-emerald-100/75">
          {upcoming
            ? `${eaten}/${upcoming.meals} · ${upcoming.name}`
            : `${eaten} meals`}
          {" · "}
          <MateLine mates={form.herdMates} />
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-lime-300 transition-[width] duration-300"
          style={{ width: `${Math.min(100, formProgress(eaten) * 100)}%` }}
        />
      </div>
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

function EditorActions() {
  const randomize = useGameStore((state) => state.randomize);
  const reset = useGameStore((state) => state.reset);
  const eaten = useGameStore((state) => state.eaten);
  const hasMutated = useGameStore((state) => state.hasMutated);
  const mutateOpen = canMutate(eaten);

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={randomize}
        className={`min-h-11 flex-1 touch-manipulation rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wider ${
          mutateOpen
            ? hasMutated
              ? "border-lime-200/30 bg-lime-300/15 text-lime-50 hover:bg-lime-300/25"
              : "tideform-pulse border-lime-200/50 bg-lime-300/25 text-lime-50 hover:bg-lime-300/35"
            : "border-white/10 bg-black/20 text-white/45"
        }`}
      >
        {mutateOpen ? "Mutate" : "Mutate · grow"}
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
  const unlocked = useGameStore((state) => state.unlocked);
  const toast = useGameStore((state) => state.toast);
  const editorNudge = useGameStore((state) => state.editorNudge);
  const clearEditorNudge = useGameStore((state) => state.clearEditorNudge);
  const [slot, setSlot] = useState<SlotId>("body");
  const form = formAt(eaten);

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
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-white">
            Tideform
          </h1>
          <p className="mt-0.5 font-mono text-[11px] text-emerald-100/80">
            {form.name} · {eaten} {eaten === 1 ? "meal" : "meals"}
          </p>
          <div className="mt-2">
            <ObjectiveChip compact />
            <VitalityBreath compact />
            <StaminaBreath compact />
          </div>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <MuteControl compact />
          <button
            type="button"
            className={`min-h-11 min-w-11 touch-manipulation rounded-full border px-4 text-xs font-semibold uppercase tracking-widest backdrop-blur ${
              editorNudge
                ? "tideform-pulse border-lime-200/60 bg-lime-300/25"
                : "border-white/15 bg-black/45"
            }`}
            onClick={() => {
              setOpen((value) => !value);
              clearEditorNudge();
            }}
          >
            {open ? "Close" : "Editor"}
          </button>
        </div>
      </header>

      {toast ? (
        <div className="tideform-impact pointer-events-none absolute left-1/2 top-[6.35rem] -translate-x-1/2 rounded-full border border-lime-200/30 bg-black/55 px-4 py-2 text-center text-sm text-lime-50 backdrop-blur">
          {toast}
        </div>
      ) : null}

      <TidePrompt compact />
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
            <FormBar compact />
            <div
              className="mb-2 mt-2 flex gap-1 overflow-x-auto pb-1"
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
  const eaten = useGameStore((state) => state.eaten);
  const stats = useGameStore((state) => state.stats);
  const form = formAt(eaten);

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
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="font-sans text-2xl font-semibold tracking-tight text-white">
              Tideform
            </h1>
            <MuteControl />
          </div>
          <ObjectiveChip />
          <VitalityBreath />
          <StaminaBreath />
        </div>
      </header>

      {toast ? (
        <div className="tideform-impact pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 rounded-full border border-lime-200/30 bg-black/55 px-4 py-2 text-sm text-lime-50 backdrop-blur">
          {toast}
        </div>
      ) : null}

      <TidePrompt />
      <NestPrompt />

      <aside
        className="pointer-events-auto absolute flex w-[min(100%,20rem)] flex-col gap-3 overflow-y-auto rounded-2xl border border-white/10 bg-[#102116]/78 p-4 shadow-2xl shadow-black/40 backdrop-blur-md"
        style={{
          top: "max(1rem, env(safe-area-inset-top))",
          right: "max(1rem, env(safe-area-inset-right))",
          bottom: "max(5.5rem, calc(env(safe-area-inset-bottom) + 4.5rem))",
        }}
      >
        <FormBar />
        <p className="font-mono text-[11px] text-emerald-100/75">
          Size {stats.size.toFixed(2)} · Spd {stats.speed.toFixed(1)} · Bite{" "}
          {stats.bite.toFixed(1)}
        </p>
        <p className="text-[11px] leading-snug text-emerald-100/65">
          {form.blurb}
        </p>

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
        <span className="font-semibold text-lime-200">WASD</span> walk ·{" "}
        <span className="font-semibold text-lime-200">Shift</span> trot ·{" "}
        <span className="font-semibold text-lime-200">F</span> or tap the
        compass to focus · fruit grows you · far shore wakes the deep ·{" "}
        <span className="font-semibold text-lime-200">E</span> nestle ·{" "}
        <span className="font-semibold text-lime-200">M</span> mute
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
    const linger = toast.length > 42 ? 3800 : 2600;
    const timer = window.setTimeout(() => clearToast(), linger);
    return () => window.clearTimeout(timer);
  }, [toast, clearToast]);

  if (!starterChosen) return null;

  if (surface.compact) {
    return <CompactHud open={open} setOpen={setOpen} />;
  }

  return <DesktopHud />;
}
