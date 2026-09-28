import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreRep, computeBaseline, detectFatigue } from "../src/lib/formEngine";
import { EXERCISES, EXERCISE_IDS } from "../src/lib/exercises";
import { simulateRep, mulberry32 } from "../src/lib/deviceSim";
import { computeFitScore, nextStreak, effectiveStreak } from "../src/lib/fitScore";
import { parseMeal, totals, proteinTarget } from "../src/lib/nutrition";

test("simulated reps are classified as intended for every exercise", () => {
  const rand = mulberry32(1);
  for (const ex of EXERCISE_IDS) {
    for (const q of ["good", "moderate", "poor"] as const) {
      for (let i = 0; i < 50; i++) {
        const b = EXERCISES[ex].defaults;
        assert.equal(scoreRep(simulateRep(ex, q, b, 0, rand), b).quality, q, `${ex} ${q}`);
      }
    }
  }
});

test("partial squat gets a depth cue", () => {
  const r = scoreRep({ exercise: "squat", romDeg: 55, tempoMs: 2200, swayDeg: 4, peakVel: 120 }, null);
  assert.ok(r.cues.includes("Squat deeper"));
  assert.notEqual(r.quality, "good");
});

test("strict mode is harsher than standard", () => {
  const f = { exercise: "squat" as const, romDeg: 74, tempoMs: 2200, swayDeg: 4, peakVel: 120 };
  assert.ok(scoreRep(f, null, true).score < scoreRep(f, null, false).score);
});

test("baseline needs 5 reps and trims outliers", () => {
  const reps = Array.from({ length: 4 }, () => ({ romDeg: 80, tempoMs: 2000, swayDeg: 4, peakVel: 100 }));
  assert.throws(() => computeBaseline(reps));
  const more = [...reps, ...reps, { romDeg: 10, tempoMs: 2000, swayDeg: 4, peakVel: 100 }];
  assert.equal(computeBaseline(more).romDeg, 80);
});

test("fatigue: slowing + shrinking reps are flagged, a steady set is not", () => {
  const tired = Array.from({ length: 10 }, (_, i) => ({ tempoMs: 2000 + i * 120, romDeg: 85 - i * 2, swayDeg: 4, score: 95 - i * 3 }));
  assert.notEqual(detectFatigue(tired).level, "none");
  const steady = Array.from({ length: 10 }, () => ({ tempoMs: 2000, romDeg: 85, swayDeg: 4, score: 95 }));
  assert.equal(detectFatigue(steady).level, "none");
});

test("FitScore rewards consistency and improvement", () => {
  const base = { activeDaysLast7: 6, avgFormScoreThisWeek: 75, avgFormScoreLastWeek: 65, challengesIssued: 4, challengesCompleted: 4, currentStreak: 6 };
  const athlete = { ...base, activeDaysLast7: 1, avgFormScoreThisWeek: 95, avgFormScoreLastWeek: 95, currentStreak: 1 };
  assert.ok(computeFitScore(base).total > computeFitScore(athlete).total);
});

test("streaks", () => {
  const today = new Date(2026, 8, 28, 10);
  assert.equal(nextStreak(new Date(2026, 8, 27, 20), 4, today), 5);
  assert.equal(nextStreak(new Date(2026, 8, 28, 7), 4, today), 4);
  assert.equal(nextStreak(new Date(2026, 8, 25), 4, today), 1);
  assert.equal(effectiveStreak({ lastActiveDate: new Date(2026, 8, 25), currentStreak: 9 }, today), 0);
});

test("meal parser counts quantities without double-counting", () => {
  const { items } = parseMeal("Maggi with 2 boiled eggs");
  assert.deepEqual(items.map((i) => [i.name, i.qty]).sort(), [["Egg", 2], ["Maggi", 1]]);
  assert.equal(parseMeal("three roti and dal").items.find((i) => i.name === "Roti")?.qty, 3);
  assert.equal(totals(parseMeal("2 roti").items).protein, 6.4);
  assert.equal(parseMeal("pizza").unmatched, true);
  assert.equal(proteinTarget(60, "active").grams, 72);
});
