// Server-side domain logic shared by the API routes.
import type { User } from "@prisma/client";
import { prisma } from "./prisma";
import { EXERCISES, ExerciseId } from "./exercises";
import { RepFeatures, scoreRep, detectFatigue, FatigueResult } from "./formEngine";
import { computeFitScore, nextStreak, effectiveStreak } from "./fitScore";
import { HapticPattern, patternForQuality } from "./haptics";
import { daysAgo } from "./api";
import { HttpError } from "./auth";

export const SESSION_GAP_MS = 5 * 60 * 1000;
export const POINTS = { good: 10, moderate: 5, poor: 2, challenge: 25, calibration: 50, recovery: 20 };

export async function getDeviceConfig(deviceId: string | null) {
  const id = deviceId || "UNPAIRED";
  return prisma.deviceConfig.upsert({ where: { deviceId: id }, update: {}, create: { deviceId: id } });
}

export async function touchActivity(user: User, points: number) {
  const streak = nextStreak(user.lastActiveDate, user.currentStreak);
  return prisma.user.update({
    where: { id: user.id },
    data: {
      fitPoints: { increment: points },
      currentStreak: streak,
      highestStreak: Math.max(user.highestStreak, streak),
      lastActiveDate: new Date(),
    },
  });
}

export async function getBaseline(userId: string, exercise: ExerciseId) {
  return prisma.calibration.findUnique({ where: { userId_exercise: { userId, exercise } } });
}

export interface RecordedRep {
  rep: { id: string; index: number; score: number; quality: string; cues: string[]; calibrated: boolean };
  haptic: HapticPattern;
  session: {
    id: string;
    exercise: string;
    totalReps: number;
    goodReps: number;
    moderateReps: number;
    poorReps: number;
    formScore: number;
    fatigueLevel: string;
    avgConfidence: number;
  };
  fatigue: FatigueResult;
  fatigueJustDetected: boolean;
  pointsEarned: number;
}

export async function recordRep(user: User, f: RepFeatures): Promise<RecordedRep> {
  const config = await getDeviceConfig(user.deviceId);
  const baseline = await getBaseline(user.id, f.exercise);
  const result = scoreRep(f, baseline, config.strictFormMode);
  const now = new Date();

  // Continue the current set if it's the same exercise and recent enough.
  let session = await prisma.workoutSession.findFirst({
    where: { userId: user.id, exercise: f.exercise, lastRepAt: { gte: new Date(now.getTime() - SESSION_GAP_MS) } },
    orderBy: { lastRepAt: "desc" },
  });
  if (!session) {
    session = await prisma.workoutSession.create({ data: { userId: user.id, exercise: f.exercise } });
  }

  const rep = await prisma.rep.create({
    data: {
      sessionId: session.id,
      userId: user.id,
      index: session.totalReps + 1,
      exercise: f.exercise,
      confidence: f.confidence ?? 1,
      romDeg: f.romDeg,
      tempoMs: f.tempoMs,
      swayDeg: f.swayDeg,
      peakVel: f.peakVel,
      score: result.score,
      quality: result.quality,
      cues: JSON.stringify(result.cues),
      calibrated: !!baseline,
    },
  });

  const sessionReps = await prisma.rep.findMany({
    where: { sessionId: session.id },
    orderBy: { index: "asc" },
    select: { tempoMs: true, romDeg: true, swayDeg: true, score: true, confidence: true },
  });
  const n = sessionReps.length;
  const mean = (k: "tempoMs" | "score" | "confidence") => sessionReps.reduce((a, r) => a + r[k], 0) / n;
  const fatigue = detectFatigue(sessionReps);
  const fatigueJustDetected = fatigue.level !== "none" && session.fatigueLevel === "none";

  const updated = await prisma.workoutSession.update({
    where: { id: session.id },
    data: {
      lastRepAt: now,
      totalReps: n,
      goodReps: { increment: result.quality === "good" ? 1 : 0 },
      moderateReps: { increment: result.quality === "moderate" ? 1 : 0 },
      poorReps: { increment: result.quality === "poor" ? 1 : 0 },
      formScore: Math.round(mean("score") * 10) / 10,
      avgTempoMs: Math.round(mean("tempoMs")),
      avgConfidence: Math.round(mean("confidence") * 100) / 100,
      fatigueLevel: fatigue.level === "none" ? session.fatigueLevel : fatigue.level,
    },
  });

  const pointsEarned = POINTS[result.quality];
  await touchActivity(user, pointsEarned);

  let haptic: HapticPattern = config.hapticFeedback ? patternForQuality(result.quality, config.confirmPulses) : "NONE";
  if (fatigueJustDetected && config.hapticFeedback) haptic = "REST";

  return {
    rep: { id: rep.id, index: rep.index, score: result.score, quality: result.quality, cues: result.cues, calibrated: !!baseline },
    haptic,
    session: {
      id: updated.id,
      exercise: updated.exercise,
      totalReps: updated.totalReps,
      goodReps: updated.goodReps,
      moderateReps: updated.moderateReps,
      poorReps: updated.poorReps,
      formScore: updated.formScore,
      fatigueLevel: updated.fatigueLevel,
      avgConfidence: updated.avgConfidence,
    },
    fatigue,
    fatigueJustDetected,
    pointsEarned,
  };
}

export const EVENT_TYPES = [
  "SEDENTARY_ALERT",
  "CHALLENGE_ISSUED",
  "CHALLENGE_COMPLETED",
  "CHALLENGE_FAILED",
  "POSTURE_ALERT",
  "RECOVERY_COMPLETED",
  "ACTIVITY",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export async function recordEvent(user: User, type: EventType, detail: Record<string, unknown>) {
  const event = await prisma.activityEvent.create({
    data: { userId: user.id, type, detail: JSON.stringify(detail) },
  });
  let points = 0;
  if (type === "CHALLENGE_COMPLETED") points = POINTS.challenge;
  if (type === "RECOVERY_COMPLETED") points = POINTS.recovery;
  if (points > 0 || type === "ACTIVITY") await touchActivity(user, points);
  return { event, pointsEarned: points };
}

// ---------------------------------------------------------------------------
// FitScore for one user (last 7 days vs the 7 days before)
export async function fitScoreFor(user: User) {
  const weekAgo = daysAgo(6);
  const twoWeeksAgo = daysAgo(13);
  const [thisWeek, lastWeek, events] = await Promise.all([
    prisma.rep.findMany({ where: { userId: user.id, createdAt: { gte: weekAgo } }, select: { score: true, createdAt: true } }),
    prisma.rep.aggregate({
      where: { userId: user.id, createdAt: { gte: twoWeeksAgo, lt: weekAgo } },
      _avg: { score: true },
    }),
    prisma.activityEvent.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: weekAgo },
        type: { in: ["CHALLENGE_ISSUED", "CHALLENGE_COMPLETED", "RECOVERY_COMPLETED", "ACTIVITY"] },
      },
      select: { type: true, createdAt: true },
    }),
  ]);
  const days = new Set<string>();
  thisWeek.forEach((r) => days.add(r.createdAt.toDateString()));
  events
    .filter((e) => e.type !== "CHALLENGE_ISSUED")
    .forEach((e) => days.add(e.createdAt.toDateString()));
  const avgThis = thisWeek.length ? thisWeek.reduce((a, r) => a + r.score, 0) / thisWeek.length : null;
  return computeFitScore({
    activeDaysLast7: days.size,
    avgFormScoreThisWeek: avgThis,
    avgFormScoreLastWeek: lastWeek._avg.score,
    challengesIssued: events.filter((e) => e.type === "CHALLENGE_ISSUED").length,
    challengesCompleted: events.filter((e) => e.type === "CHALLENGE_COMPLETED").length,
    currentStreak: effectiveStreak(user),
  });
}

export function exerciseOrThrow(x: unknown): ExerciseId {
  if (typeof x === "string" && x in EXERCISES) return x as ExerciseId;
  throw new HttpError(400, `Unknown exercise "${String(x)}". Expected one of: ${Object.keys(EXERCISES).join(", ")}`);
}
