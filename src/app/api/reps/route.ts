// Recent reps + the set in progress, for the live session view.
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ok, fail, parseJson } from "@/lib/api";
import { SESSION_GAP_MS } from "@/lib/services";
import { detectFatigue } from "@/lib/formEngine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const limit = Math.min(50, Math.max(1, Number(new URL(req.url).searchParams.get("limit")) || 20));
    const reps = await prisma.rep.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: limit });
    const active = await prisma.workoutSession.findFirst({
      where: { userId: user.id, lastRepAt: { gte: new Date(Date.now() - SESSION_GAP_MS) } },
      orderBy: { lastRepAt: "desc" },
      include: { reps: { orderBy: { index: "asc" } } },
    });
    return ok({
      reps: reps.map((r) => ({ ...r, cues: parseJson<string[]>(r.cues, []) })),
      activeSession: active
        ? {
            id: active.id,
            exercise: active.exercise,
            totalReps: active.totalReps,
            goodReps: active.goodReps,
            moderateReps: active.moderateReps,
            poorReps: active.poorReps,
            formScore: active.formScore,
            fatigueLevel: active.fatigueLevel,
            fatigue: detectFatigue(active.reps),
            avgConfidence: active.avgConfidence,
          }
        : null,
    });
  } catch (e) {
    return fail(e);
  }
}
