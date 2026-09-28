// Software stand-in for the ESP32 + BNO085 module, used by the dashboard's
// Test Bench, the CLI simulator and the database seed. It produces the same
// per-rep features the firmware extracts on-device, plus a synthetic motion
// trace for the live chart.
import { Baseline, EXERCISES, ExerciseId } from "./exercises";
import { RepFeatures } from "./formEngine";

export type SimQuality = "good" | "moderate" | "poor";

export type Rand = () => number;

// Small deterministic PRNG so the seed is reproducible.
export function mulberry32(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (r: Rand, lo: number, hi: number) => lo + (hi - lo) * r();
const r1 = (x: number) => Math.round(x * 10) / 10;

// A user's "natural" movement differs a little from the generic defaults —
// this is what calibration captures.
export function personalBaseline(exercise: ExerciseId, rand: Rand = Math.random): Baseline {
  const d = EXERCISES[exercise].defaults;
  return {
    ...d,
    romDeg: r1(d.romDeg * between(rand, 0.86, 1.04)),
    tempoMs: Math.round(d.tempoMs * between(rand, 0.9, 1.15)),
    swayDeg: r1(d.swayDeg * between(rand, 0.8, 1.2)),
    peakVel: r1(d.peakVel * between(rand, 0.9, 1.1)),
  };
}

/**
 * @param fatigue 0 (fresh) … 1 (exhausted): slows reps, shortens range, adds sway
 */
export function simulateRep(
  exercise: ExerciseId,
  quality: SimQuality,
  baseline?: Baseline | null,
  fatigue = 0,
  rand: Rand = Math.random
): RepFeatures {
  const b = baseline ?? EXERCISES[exercise].defaults;
  let rom = b.romDeg * between(rand, 0.94, 1.06);
  let tempo = b.tempoMs * between(rand, 0.9, 1.12);
  let sway = Math.max(0.3, b.swayDeg + between(rand, -1, 1) * b.swayStd);
  let vel = b.peakVel * between(rand, 0.9, 1.1);

  if (quality === "moderate") {
    // one clear fault
    const fault = Math.floor(rand() * 3);
    if (fault === 0) rom = b.romDeg * between(rand, 0.66, 0.72);
    else if (fault === 1) sway = b.swayDeg + b.swayStd * 2 + b.swayDeg * between(rand, 1.1, 1.6);
    else {
      tempo = b.tempoMs * between(rand, 0.4, 0.48);
      rom = b.romDeg * between(rand, 0.78, 0.82);
    }
  } else if (quality === "poor") {
    rom = b.romDeg * between(rand, 0.5, 0.62);
    tempo = b.tempoMs * between(rand, 0.48, 0.6);
    sway = b.swayDeg + b.swayStd * 2 + b.swayDeg * between(rand, 0.8, 1.4);
    if (exercise === "curl" || exercise === "jumping_jack") vel = b.peakVel * between(rand, 1.8, 2.1);
  }

  if (fatigue > 0) {
    tempo *= 1 + 0.45 * fatigue;
    rom *= 1 - 0.18 * fatigue;
    sway *= 1 + 0.6 * fatigue;
    vel *= 1 - 0.2 * fatigue;
  }

  return {
    exercise,
    confidence: Math.round(between(rand, 0.82, 0.98) * 100) / 100,
    romDeg: r1(rom),
    tempoMs: Math.round(tempo),
    swayDeg: r1(sway),
    peakVel: r1(vel),
  };
}

// Synthetic primary-angle trace for one rep (down-and-up cosine) with sway.
export function repWaveform(f: RepFeatures, hz = 25) {
  const n = Math.max(8, Math.round((f.tempoMs / 1000) * hz));
  return Array.from({ length: n }, (_, i) => {
    const phase = i / (n - 1);
    return {
      angle: r1((f.romDeg * (1 - Math.cos(2 * Math.PI * phase))) / 2),
      sway: r1(f.swayDeg * Math.sin(6 * Math.PI * phase) * (0.6 + 0.4 * Math.random())),
    };
  });
}
