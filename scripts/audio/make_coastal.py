#!/usr/bin/env python3
"""Generate original Tideform coastal beds (CC0) as loopable WAV, then MP3.

No third-party samples — pink/brown noise, slow swells, and quiet meadow
rustle synthesized here so the game can ship tiny, license-clean files.
"""

from __future__ import annotations

import math
import random
import struct
import subprocess
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "public" / "audio"
SR = 22050


def clamp(value: float, lo: float = -1.0, hi: float = 1.0) -> float:
    return lo if value < lo else hi if value > hi else value


def write_wav(path: Path, samples: list[float], sr: int = SR) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "w") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sr)
        frames = b"".join(
            struct.pack("<h", int(clamp(sample) * 32767.0)) for sample in samples
        )
        wav.writeframes(frames)


def encode_mp3(wav_path: Path, mp3_path: Path, bitrate: str) -> None:
    cmd = [
        "ffmpeg",
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        str(wav_path),
        "-codec:a",
        "libmp3lame",
        "-b:a",
        bitrate,
        "-ac",
        "1",
        "-ar",
        str(SR),
        str(mp3_path),
    ]
    subprocess.run(cmd, check=True)


def one_pole(samples: list[float], alpha: float) -> list[float]:
    acc = 0.0
    out: list[float] = []
    for sample in samples:
        acc += alpha * (sample - acc)
        out.append(acc)
    return out


def highpass(samples: list[float], alpha: float) -> list[float]:
    low = one_pole(samples, alpha)
    return [sample - lowed for sample, lowed in zip(samples, low)]


def pink(n: int, rng: random.Random) -> list[float]:
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0
    out: list[float] = []
    for _ in range(n):
        white = rng.uniform(-1.0, 1.0)
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.96900 * b2 + white * 0.1538520
        b3 = 0.86650 * b3 + white * 0.3104856
        b4 = 0.55000 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.0168980
        pinked = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
        b6 = white * 0.115926
        out.append(pinked * 0.11)
    return out


def brown(n: int, rng: random.Random) -> list[float]:
    acc = 0.0
    out: list[float] = []
    for _ in range(n):
        acc += rng.uniform(-1.0, 1.0) * 0.018
        acc = clamp(acc, -0.92, 0.92)
        out.append(acc)
    return out


def normalize(samples: list[float], peak: float = 0.89) -> list[float]:
    mag = max((abs(sample) for sample in samples), default=1.0)
    if mag < 1e-9:
        return samples
    scale = peak / mag
    return [sample * scale for sample in samples]


def mul(samples: list[float], gain: float) -> list[float]:
    return [sample * gain for sample in samples]


def mix_layers(*layers: list[float]) -> list[float]:
    n = len(layers[0])
    out = [0.0] * n
    for layer in layers:
        for i, sample in enumerate(layer):
            out[i] += sample
    return out


def env_adsr(
    n: int,
    sr: int,
    attack: float,
    decay: float,
    sustain: float,
    release: float,
) -> list[float]:
    a = max(1, int(attack * sr))
    d = max(1, int(decay * sr))
    r = max(1, int(release * sr))
    s = max(0, n - a - d - r)
    out: list[float] = []
    for i in range(n):
        if i < a:
            out.append(i / a)
        elif i < a + d:
            t = (i - a) / d
            out.append(1.0 + (sustain - 1.0) * t)
        elif i < a + d + s:
            out.append(sustain)
        else:
            t = (i - a - d - s) / r
            out.append(sustain * (1.0 - t))
    return out


def apply_env(samples: list[float], env: list[float]) -> list[float]:
    return [sample * gain for sample, gain in zip(samples, env)]


def sine(n: int, sr: int, freq: float, rng_phase: float = 0.0) -> list[float]:
    two_pi = 2.0 * math.pi
    return [
        math.sin(two_pi * freq * (i / sr) + rng_phase) for i in range(n)
    ]


def loop_crossfade(samples: list[float], fade: int) -> list[float]:
    if fade <= 0 or fade * 2 >= len(samples):
        return samples
    head = samples[:-fade]
    for i in range(fade):
        t = i / fade
        # equal-power: incoming head, outgoing tail
        a = math.sin(t * math.pi * 0.5)
        b = math.cos(t * math.pi * 0.5)
        head[i] = samples[i] * a + samples[len(samples) - fade + i] * b
    return head


def wind_layer(n: int, sr: int, rng: random.Random) -> list[float]:
    noise = highpass(one_pole(pink(n, rng), 0.18), 0.012)
    out: list[float] = []
    for i, sample in enumerate(noise):
        t = i / sr
        gust = 0.72 + 0.28 * math.sin(2.0 * math.pi * t / 11.0 + 0.4)
        gust += 0.12 * math.sin(2.0 * math.pi * t / 4.7 + 1.7)
        out.append(sample * gust)
    return mul(normalize(out), 0.34)


def surf_layer(n: int, sr: int, rng: random.Random) -> list[float]:
    noise = one_pole(one_pole(brown(n, rng), 0.045), 0.08)
    out: list[float] = []
    for i, sample in enumerate(noise):
        t = i / sr
        # Distant sets, not a close crash.
        swell = 0.48 + 0.52 * (0.5 + 0.5 * math.sin(2.0 * math.pi * t / 8.4))
        swell *= 0.82 + 0.18 * math.sin(2.0 * math.pi * t / 19.0 + 2.1)
        out.append(sample * swell)
    return mul(normalize(out), 0.52)


def meadow_layer(n: int, sr: int, rng: random.Random) -> list[float]:
    rustle = highpass(pink(n, rng), 0.22)
    rustle = mul(normalize(one_pole(rustle, 0.35)), 0.09)
    bed = rustle[:]
    # A few far, dry insect ticks — not a cartoon bird loop.
    for _ in range(5):
        start = rng.randint(int(0.6 * sr), n - int(0.4 * sr))
        length = int(rng.uniform(0.028, 0.055) * sr)
        freq = rng.uniform(3100.0, 4700.0)
        for i in range(length):
            idx = start + i
            if idx >= n:
                break
            t = i / length
            amp = math.sin(math.pi * t) * 0.028
            bed[idx] += amp * math.sin(2.0 * math.pi * freq * (i / sr))
    return bed


def make_bed(seconds: float = 12.0) -> list[float]:
    rng = random.Random(20260911)
    fade = int(0.85 * SR)
    n = int(seconds * SR) + fade
    mixed = mix_layers(
        wind_layer(n, SR, rng),
        surf_layer(n, SR, rng),
        meadow_layer(n, SR, rng),
    )
    looped = loop_crossfade(mixed, fade)
    # Tiny edge fades so decode/start never clicks; loop seam is already blended.
    edge = int(0.012 * SR)
    for i in range(edge):
        g = i / edge
        looped[i] *= g
        looped[-1 - i] *= g
    return normalize(looped, 0.72)


def make_eat() -> list[float]:
    rng = random.Random(7)
    n = int(0.16 * SR)
    noise = highpass(one_pole(pink(n, rng), 0.28), 0.05)
    thunk = sine(n, SR, 168.0, 0.2)
    body = mix_layers(mul(normalize(noise), 0.55), mul(thunk, 0.42))
    env = env_adsr(n, SR, 0.006, 0.04, 0.22, 0.11)
    return normalize(apply_env(body, env), 0.7)


def make_form() -> list[float]:
    rng = random.Random(13)
    n = int(0.34 * SR)
    air = highpass(pink(n, rng), 0.08)
    swell = [
        math.sin(2.0 * math.pi * (196.0 + 70.0 * (i / n)) * (i / SR))
        for i in range(n)
    ]
    airy = [
        math.sin(2.0 * math.pi * (420.0 + 90.0 * (i / n)) * (i / SR)) * 0.35
        for i in range(n)
    ]
    body = mix_layers(
        mul(normalize(air), 0.28),
        mul(swell, 0.55),
        airy,
    )
    env = env_adsr(n, SR, 0.04, 0.08, 0.7, 0.2)
    return normalize(apply_env(body, env), 0.68)


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    jobs = [
        ("coastal-bed", make_bed(), "64k"),
        ("eat", make_eat(), "48k"),
        ("form", make_form(), "48k"),
    ]
    for name, samples, bitrate in jobs:
        wav_path = OUT_DIR / f"{name}.wav"
        mp3_path = OUT_DIR / f"{name}.mp3"
        write_wav(wav_path, samples)
        encode_mp3(wav_path, mp3_path, bitrate)
        wav_path.unlink()
        size_kb = mp3_path.stat().st_size / 1024.0
        print(f"{mp3_path.relative_to(ROOT)}  {size_kb:.1f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
