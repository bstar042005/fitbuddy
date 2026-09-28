// FitScore (0-100): rewards consistency and personal improvement rather than
// raw athletic ability, so a beginner who shows up daily and improves their
// form can outrank a naturally athletic user who trains once a week.

export interface FitScoreInput {
  activeDaysLast7: number; // days with a workout, completed challenge or recovery
  avgFormScoreThisWeek: number | null; // mean rep score, last 7 days
  avgFormScoreLastWeek: number | null; // mean rep score, the 7 days before
  challengesIssued: number; // last 7 days
  challengesCompleted: number; // last 7 days
  currentStreak: number;
}

export interface FitScoreResult {
  total: number;
  parts: { key: string; label: string; value: number; weight: number }[];
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function computeFitScore(i: FitScoreInput): FitScoreResult {
  const consistency = clamp01(i.activeDaysLast7 / 7);
  const form = i.avgFormScoreThisWeek == null ? 0 : clamp01(i.avgFormScoreThisWeek / 100);
  const improvement =
    i.avgFormScoreThisWeek == null || i.avgFormScoreLastWeek == null
      ? 0.5
      : clamp01(0.5 + (i.avgFormScoreThisWeek - i.avgFormScoreLastWeek) / 20);
  const breaks = i.challengesIssued === 0 ? 0.5 : clamp01(i.challengesCompleted / i.challengesIssued);
  const streak = clamp01(i.currentStreak / 14);

  const parts = [
    { key: "consistency", label: "Workout consistency", value: consistency, weight: 30 },
    { key: "form", label: "Form quality", value: form, weight: 25 },
    { key: "improvement", label: "Form improvement", value: improvement, weight: 15 },
    { key: "breaks", label: "Movement breaks", value: breaks, weight: 20 },
    { key: "streak", label: "Daily streak", value: streak, weight: 10 },
  ];
  const total = Math.round(parts.reduce((a, p) => a + p.value * p.weight, 0));
  return { total, parts: parts.map((p) => ({ ...p, value: Math.round(p.value * 100) })) };
}

// Streak update when the user is active. Days are compared in the server's
// local calendar (IST for an Indian deployment).
export function nextStreak(lastActive: Date | null, current: number, now = new Date()) {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (!lastActive) return 1;
  const diffDays = Math.round((day(now) - day(lastActive)) / 86400000);
  if (diffDays <= 0) return Math.max(current, 1);
  if (diffDays === 1) return current + 1;
  return 1;
}

// A stored streak is only still alive if the user was active today or yesterday.
export function effectiveStreak(u: { lastActiveDate: Date | null; currentStreak: number }, now = new Date()) {
  if (!u.lastActiveDate) return 0;
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((day(now) - day(u.lastActiveDate)) / 86400000);
  return diffDays <= 1 ? u.currentStreak : 0;
}
