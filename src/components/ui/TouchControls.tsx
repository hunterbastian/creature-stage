"use client";

import { useCallback, useRef, useState } from "react";
import { steer } from "@/lib/game/input";
import { usePlaySurface } from "@/lib/game/play-surface";

const RADIUS = 48;
const DEADZONE = 10;

function clampStick(dx: number, dy: number): { x: number; y: number } {
  const mag = Math.hypot(dx, dy);
  if (mag <= RADIUS) return { x: dx, y: dy };
  const scale = RADIUS / mag;
  return { x: dx * scale, y: dy * scale };
}

export function TouchControls() {
  const { touch } = usePlaySurface();
  const padRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [held, setHeld] = useState(false);
  const [eating, setEating] = useState(false);

  const applyStick = useCallback((clientX: number, clientY: number) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const next = clampStick(dx, dy);
    setKnob(next);

    const mag = Math.hypot(next.x, next.y);
    if (mag < DEADZONE) {
      steer.throttle = 0;
      steer.turn = 0;
      return;
    }
    const strength = Math.min(1, (mag - DEADZONE) / (RADIUS - DEADZONE));
    const nx = next.x / mag;
    const ny = next.y / mag;
    steer.throttle = -ny * strength;
    steer.turn = -nx * strength;
  }, []);

  const releaseStick = useCallback(() => {
    setKnob({ x: 0, y: 0 });
    setHeld(false);
    steer.throttle = 0;
    steer.turn = 0;
  }, []);

  if (!touch) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div
        className="absolute bottom-[max(0.85rem,env(safe-area-inset-bottom))] left-[max(0.85rem,env(safe-area-inset-left))]"
      >
        <div
          ref={padRef}
          className="pointer-events-auto relative h-[7.25rem] w-[7.25rem] touch-none select-none rounded-full border border-white/20 bg-black/35 shadow-lg shadow-black/30 backdrop-blur-sm"
          role="application"
          aria-label="Move"
          onContextMenu={(event) => event.preventDefault()}
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            setHeld(true);
            applyStick(event.clientX, event.clientY);
          }}
          onPointerMove={(event) => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
            event.preventDefault();
            applyStick(event.clientX, event.clientY);
          }}
          onPointerUp={releaseStick}
          onPointerCancel={releaseStick}
        >
          <div
            className={`absolute left-1/2 top-1/2 h-12 w-12 rounded-full border border-lime-100/40 ${
              held ? "bg-lime-200/45" : "bg-lime-200/25"
            }`}
            style={{
              transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
            }}
          />
        </div>
        <p className="pointer-events-none mt-1 text-center text-[10px] uppercase tracking-[0.16em] text-emerald-100/70">
          Move
        </p>
      </div>

      <div className="absolute bottom-[max(0.85rem,env(safe-area-inset-bottom))] right-[max(0.85rem,env(safe-area-inset-right))] flex flex-col items-center">
        <button
          type="button"
          aria-label="Eat"
          className={`pointer-events-auto flex h-[4.35rem] w-[4.35rem] touch-manipulation select-none items-center justify-center rounded-full border text-sm font-semibold uppercase tracking-[0.14em] shadow-lg shadow-black/30 backdrop-blur-sm ${
            eating
              ? "border-lime-200 bg-lime-300/45 text-lime-50"
              : "border-lime-200/50 bg-lime-300/20 text-lime-50"
          }`}
          onContextMenu={(event) => event.preventDefault()}
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            setEating(true);
            steer.eat = true;
          }}
          onPointerUp={() => {
            setEating(false);
            steer.eat = false;
          }}
          onPointerCancel={() => {
            setEating(false);
            steer.eat = false;
          }}
        >
          Eat
        </button>
      </div>
    </div>
  );
}
