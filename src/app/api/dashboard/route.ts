import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, publicUser } from "@/lib/auth";
import { ok, fail, startOfDay, daysAgo, parseJson } from "@/lib/api";
import { fitScoreFor, getDeviceConfig } from "@/lib/services";
import { effectiveStreak } from "@/lib/fitScore";
import { exerciseName, EXERCISE_IDS } from "@/lib/exercises";

export const dynamic = "force-dynamic";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Group = { name: string; members: number; totalFitScore: number; totalPoints: number };

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const today = startOfDay();
    const weekStart = daysAgo(6);
    const monthStart = daysAgo(29);

    const [repsWeek, repsMonth, eventsToday, recentEvents, sessions, calibrations, config, allUsers] = await Promise.all([
      prisma.rep.findMany({
        where: { userId: user.id, createdAt: { gte: weekStart } },
        select: { createdAt: true, score: true, quality: true },
      }),
      prisma.rep.findMany({
        where: { userId: user.id, createdAt: { gte: monthStart } },
        select: { exercise: true, score: true, quality: true },
      }),
      prisma.activityEvent.findMany({ where: { userId: user.id, createdAt: { gte: today } } }),
      prisma.activityEvent.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 15 }),
      prisma.workoutSession.findMany({ where: { userId: user.id }, orderBy: { lastRepAt: "desc" }, take: 30 }),
      prisma.calibration.findMany({ where: { userId: user.id }, select: { exercise: true, updatedAt: true, samples: true } }),
      getDeviceConfig(user.deviceId),
      prisma.user.findMany(),
    ]);

    // --- Today
    const repsToday = repsWeek.filter((r) => r.createdAt >= today);
    const count = (type: string) => eventsToday.filter((e) => e.type === type).length;
    const todaySummary = {
      reps: repsToday.length,
      formScore: repsToday.length ? Math.round(repsToday.reduce((a, r) => a + r.score, 0) / repsToday.length) : null,
      good: repsToday.filter((r) => r.quality === "good").length,
      moderate: repsToday.filter((r) => r.quality === "moderate").length,
      poor: repsToday.filter((r) => r.quality === "poor").length,
      sedentaryAlerts: count("SEDENTARY_ALERT"),
      challengesIssued: count("CHALLENGE_ISSUED"),
      movementBreaks: count("CHALLENGE_COMPLETED"),
      postureAlerts: count("POSTURE_ALERT"),
      recoveries: count("RECOVERY_COMPLETED"),
    };

    // --- Last 7 days (real data, one bucket per calendar day)
    const weekly = Array.from({ length: 7 }, (_, i) => {
      const start = daysAgo(6 - i);
      const end = new Date(start.getTime() + 86400000);
      const rs = repsWeek.filter((r) => r.createdAt >= start && r.createdAt < end);
      return {
        day: DAY_LABELS[start.getDay()],
        date: start.toISOString(),
        reps: rs.length,
        formScore: rs.length ? Math.round(rs.reduce((a, r) => a + r.score, 0) / rs.length) : null,
        good: rs.filter((r) => r.quality === "good").length,
        moderate: rs.filter((r) => r.quality === "moderate").length,
        poor: rs.filter((r) => r.quality === "poor").length,
      };
    });

    // --- Per exercise (last 30 days) with session-by-session form trend
    const exercises = EXERCISE_IDS.map((id) => {
      const rs = repsMonth.filter((r) => r.exercise === id);
      const exSessions = sessions.filter((s) => s.exercise === id && s.totalReps > 0).slice(0, 8).reverse();
      return {
        exercise: id,
        name: exerciseName(id),
        totalReps: rs.length,
        good: rs.filter((r) => r.quality === "good").length,
        moderate: rs.filter((r) => r.quality === "moderate").length,
        poor: rs.filter((r) => r.quality === "poor").length,
        formScore: rs.length ? Math.round(rs.reduce((a, r) => a + r.score, 0) / rs.length) : null,
        trend: exSessions.map((s) => ({ date: s.startedAt.toISOString(), formScore: Math.round(s.formScore) })),
        calibrated: calibrations.some((c) => c.exercise === id),
      };
    });

    // --- League: individuals, hostels, departments (ranked by FitScore)
    const scored = await Promise.all(allUsers.map(async (u) => ({ u, fit: await fitScoreFor(u) })));
    scored.sort((a, b) => b.fit.total - a.fit.total || b.u.fitPoints - a.u.fitPoints);
    const individuals = scored.map(({ u, fit }, i) => ({
      rank: i + 1,
      id: u.id,
      name: u.name,
      hostelBlock: u.hostelBlock,
      department: u.department,
      fitScore: fit.total,
      fitPoints: u.fitPoints,
      streak: effectiveStreak(u),
      isCurrentUser: u.id === user.id,
    }));
    const groupBy = (key: "hostelBlock" | "department") => {
      const m = new Map<string, Group>();
      scored.forEach(({ u, fit }) => {
        const name = u[key].replace(/\s*\(.*\)$/, ""); // "Hostel Block 4 (Room 312)" -> "Hostel Block 4"
        const g = m.get(name) ?? { name, members: 0, totalFitScore: 0, totalPoints: 0 };
        g.members++;
        g.totalFitScore += fit.total;
        g.totalPoints += u.fitPoints;
        m.set(name, g);
      });
      return Array.from(m.values())
        .map((g) => ({ name: g.name, members: g.members, avgFitScore: Math.round(g.totalFitScore / g.members), totalPoints: g.totalPoints }))
        .sort((a, b) => b.avgFitScore - a.avgFitScore);
    };
    const me = scored.find((s) => s.u.id === user.id)!;

    return ok({
      user: { ...publicUser(user), currentStreak: effectiveStreak(user) },
      fitScore: me.fit,
      today: todaySummary,
      weekly,
      exercises,
      lastExercise: sessions[0]?.exercise ?? null,
      recentSessions: sessions.slice(0, 8).map((s) => ({
        id: s.id,
        exercise: s.exercise,
        name: exerciseName(s.exercise),
        startedAt: s.startedAt,
        totalReps: s.totalReps,
        goodReps: s.goodReps,
        moderateReps: s.moderateReps,
        poorReps: s.poorReps,
        formScore: Math.round(s.formScore),
        fatigueLevel: s.fatigueLevel,
        avgConfidence: s.avgConfidence,
      })),
      recentEvents: recentEvents.map((e) => ({ id: e.id, type: e.type, detail: parseJson(e.detail, {}), createdAt: e.createdAt })),
      league: { individuals, hostels: groupBy("hostelBlock"), departments: groupBy("department") },
      device: config,
    });
  } catch (e) {
    return fail(e);
  }
}
