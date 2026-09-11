"use client";

import { useEffect, useState } from "react";
import {
  getAudioSnapshot,
  subscribeAudio,
  toggleMuted,
  type AudioSnapshot,
} from "@/lib/game/audio";

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 10.2v3.6h3.1L12 17.8V6.2L7.6 10.2H4.5z" fill="currentColor" stroke="none" />
      {muted ? (
        <>
          <path d="M14.8 8.6 19.4 15.2" />
          <path d="M19.4 8.6 14.8 15.2" />
        </>
      ) : (
        <>
          <path d="M15.1 9.4a3.2 3.2 0 0 1 0 5.2" />
          <path d="M17.4 7.4a6.2 6.2 0 0 1 0 9.2" />
        </>
      )}
    </svg>
  );
}

export function MuteControl({ compact }: { compact?: boolean }) {
  const [snap, setSnap] = useState<AudioSnapshot>(getAudioSnapshot);

  useEffect(() => subscribeAudio(setSnap), []);

  const label = snap.muted ? "Unmute coastal sound" : "Mute coastal sound";

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={snap.muted}
      title={snap.muted ? "Unmute (M)" : "Mute (M)"}
      onClick={() => toggleMuted()}
      className={`pointer-events-auto touch-manipulation rounded-full border backdrop-blur hover:border-lime-200/40 hover:bg-black/55 ${
        compact ? "grid min-h-11 min-w-11 place-items-center" : "grid h-9 w-9 place-items-center"
      } ${
        snap.muted
          ? "border-amber-200/45 bg-black/55 text-amber-100"
          : "border-white/15 bg-black/45 text-lime-50"
      }`}
    >
      <SpeakerIcon muted={snap.muted} />
    </button>
  );
}
