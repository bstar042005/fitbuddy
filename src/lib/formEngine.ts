// Rep scoring and personal calibration.
// A rep is compared with the user's own calibrated baseline (or generic
// defaults until they calibrate). The same logic is ported to the ESP32
// firmware so the haptic cue can fire on-device within milliseconds; the
// server re-scores for analytics so history stays consistent.

import { Baseline, EXERCISES, ExerciseId } from "./exercises";

export interface RepFeatures {
  exercise: ExerciseId;
  confidence?: number; // exercise-recognition confidence 0-1
  romDeg: number;
  tempoMs: number;
  swayDeg: number;
  peakVel: number;
}

export type RepQuality = "good" | "moderate" | "poor";

export interface RepScore {
  score: number;
  quality: RepQuality;
  cues: string[];
  penalties: { rom: number; tempo: number; sway: number; momentum: number };
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function qualityFromScore(score: number): RepQuality {
  if (score >= 80) return "good";
  if (score >= 60) return "moderate";
  return "poor";
}

// Tiny deviations still cost a point or two but don't trigger a spoken/visual cue.
const CUE_MIN = 3;

export function scoreRep(f: RepFeatures, baseline: Baseline | null, strict = false): RepScore {
  const info = EXERCISES[f.exercise];
  const b = baseline ?? info.defaults;
  const cues: string[] = [];

  // Strict mode tightens every tolerance.
  const romFloor = strict ? 0.9 : 0.85; // min acceptable fraction of baseline ROM
  const fastFloor = strict ? 0.78 : 0.7; // min acceptable fraction of baseline tempo
  const swayK = strict ? 1.5 : 2.0; // allowed std-devs above baseline sway
  const velCeil = strict ? 1.45 : 1.6; // max fraction of baseline peak velocity

  // 1. Range of motion – partial reps
  let rom = 0;
  const romRatio = f.romDeg / Math.max(b.romDeg, 1);
  if (romRatio < romFloor) {
    rom = Math.min(50, ((romFloor - romRatio) / 0.25) * 50);
    if (rom >= CUE_MIN) cues.push(info.romCue);
  }

  // 2. Tempo – rushed reps
  let tempo = 0;
  const tempoRatio = f.tempoMs / Math.max(b.tempoMs, 1);
  if (tempoRatio < fastFloor) {
    tempo = Math.min(25, ((fastFloor - tempoRatio) / 0.3) * 25);
    if (tempo >= CUE_MIN) cues.push(info.fastCue);
  }

  // 3. Stability – sway beyond the user's normal wobble
  let sway = 0;
  const swayLimit = b.swayDeg + swayK * Math.max(b.swayStd, 0.8);
  if (f.swayDeg > swayLimit) {
    sway = Math.min(30, ((f.swayDeg - swayLimit) / Math.max(b.swayDeg, 1)) * 20);
    if (sway >= CUE_MIN) cues.push(info.swayCue);
  }

  // 4. Momentum – jerky / swung reps
  let momentum = 0;
  const velRatio = f.peakVel / Math.max(b.peakVel, 1);
  if (velRatio > velCeil) {
    momentum = Math.min(15, ((velRatio - velCeil) / 0.5) * 15);
    if (momentum >= CUE_MIN && !cues.includes(info.momentumCue)) cues.push(info.momentumCue);
  }

  const score = Math.round(clamp(100 - rom - tempo - sway - momentum, 0, 100));
  return {
    score,
    quality: qualityFromScore(score),
    cues,
    penalties: {
      rom: Math.round(rom),
      tempo: Math.round(tempo),
      sway: Math.round(sway),
      momentum: Math.round(momentum),
    },
  };
}

function meanStd(xs: number[]) {
  const m = xs.reduce((a, x) => a + x, 0) / xs.length;
  const v = xs.reduce((a, x) => a + (x - m) ** 2, 0) / Math.max(xs.length - 1, 1);
  return { mean: m, std: Math.sqrt(v) };
}

export const MIN_CALIBRATION_REPS = 5;

// Build a personal baseline from a calibration set. With 7+ reps the two most
// extreme ROM values are dropped so a stumble doesn't skew the baseline.
export function computeBaseline(reps: Omit<RepFeatures, "exercise">[]): Baseline {
  if (reps.length < MIN_CALIBRATION_REPS) {
    throw new Error(`Need at least ${MIN_CALIBRATION_REPS} calibration reps`);
  }
  let used = reps;
  if (reps.length >= 7) {
    const sorted = [...reps].sort((a, b) => a.romDeg - b.romDeg);
    used = sorted.slice(1, -1);
  }
  const rom = meanStd(used.map((r) => r.romDeg));
  const tempo = meanStd(used.map((r) => r.tempoMs));
  const sway = meanStd(used.map((r) => r.swayDeg));
  const vel = meanStd(used.map((r) => r.peakVel));
  const r1 = (x: number) => Math.round(x * 10) / 10;
  return {
    romDeg: r1(rom.mean),
    romStd: r1(Math.max(rom.std, 2)),
    tempoMs: Math.round(tempo.mean),
    tempoStd: Math.round(Math.max(tempo.std, 80)),
    swayDeg: r1(sway.mean),
    swayStd: r1(Math.max(sway.std, 0.5)),
    peakVel: r1(vel.mean),
    velStd: r1(Math.max(vel.std, 5)),
    samples: reps.length,
  };
}

// ---------------------------------------------------------------------------
// Movement-based fatigue estimation.
// Compares the start of a set with its end: slower reps plus shrinking range,
// falling scores or growing sway suggest fatigue. This is a heuristic signal
// ("possible fatigue"), not a physiological measurement.

export interface FatigueInput {
  tempoMs: number;
  romDeg: number;
  swayDeg: number;
  score: number;
}

export interface FatigueResult {
  level: "none" | "possible" | "likely";
  index: number; // 0-1
  reasons: string[];
}

export function detectFatigue(reps: FatigueInput[]): FatigueResult {
  if (reps.length < 6) return { level: "none", index: 0, reasons: [] };
  const avg = (xs: FatigueInput[], k: keyof FatigueInput) => xs.reduce((a, r) => a + r[k], 0) / xs.length;
  const early = reps.slice(0, 3);
  const late = reps.slice(-3);

  const tempoUp = avg(late, "tempoMs") / avg(early, "tempoMs") - 1;
  const romDrop = 1 - avg(late, "romDeg") / avg(early, "romDeg");
  const scoreDrop = avg(early, "score") - avg(late, "score");
  const swayUp = avg(late, "swayDeg") / Math.max(avg(early, "swayDeg"), 0.1) - 1;

  const reasons: string[] = [];
  if (tempoUp > 0.2) reasons.push(`Reps ${Math.round(tempoUp * 100)}% slower than at the start`);
  if (romDrop > 0.1) reasons.push(`Range of motion down ${Math.round(romDrop * 100)}%`);
  if (scoreDrop > 12) reasons.push(`Form score down ${Math.round(scoreDrop)} points`);
  if (swayUp > 0.4) reasons.push(`Stability down (sway +${Math.round(swayUp * 100)}%)`);

  const index = clamp(
    Math.max(tempoUp, 0) * 1.2 + Math.max(romDrop, 0) * 2 + Math.max(scoreDrop, 0) / 40 + Math.max(swayUp, 0) * 0.4,
    0,
    1
  );
  const slower = tempoUp > 0.2;
  const degraded = romDrop > 0.1 || scoreDrop > 12 || swayUp > 0.4;
  let level: FatigueResult["level"] = "none";
  if ((slower && degraded) || index >= 0.75) level = "likely";
  else if (slower || degraded || index >= 0.45) level = "possible";
  return { level, index: Math.round(index * 100) / 100, reasons };
}
