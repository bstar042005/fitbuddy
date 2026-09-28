// Personal movement calibration: the user performs a short set of their
// normal, comfortable reps; we store mean/spread as their baseline so future
// reps are judged against *their* movement, not a generic threshold.
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, HttpError } from "@/lib/auth";
import { ok, fail, readJson, num } from "@/lib/api";
import { computeBaseline, MIN_CALIBRATION_REPS } from "@/lib/formEngine";
import { exerciseOrThrow, touchActivity, POINTS } from "@/lib/services";
import { EXERCISES } from "@/lib/exercises";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const baselines = await prisma.calibration.findMany({ where: { userId: user.id } });
    return ok({
      minReps: MIN_CALIBRATION_REPS,
      exercises: Object.values(EXERCISES).map((e) => ({
        id: e.id,
        name: e.name,
        mount: e.mount,
        defaults: e.defaults,
        baseline: baselines.find((b) => b.exercise === e.id) ?? null,
      })),
    });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await readJson(req);
    const user = await requireUser(req, b);
    const exercise = exerciseOrThrow(b.exercise);
    if (!Array.isArray(b.reps)) throw new HttpError(400, "reps must be an array");
    const reps = b.reps.slice(0, 30).map((r: Record<string, unknown>) => ({
      romDeg: num(r.romDeg, "romDeg"),
      tempoMs: num(r.tempoMs, "tempoMs"),
      swayDeg: num(r.swayDeg, "swayDeg"),
      peakVel: num(r.peakVel, "peakVel"),
    }));
    if (reps.length < MIN_CALIBRATION_REPS) {
      throw new HttpError(400, `Perform at least ${MIN_CALIBRATION_REPS} reps to calibrate`);
    }
    const base = computeBaseline(reps);
    const data = { ...base, samples: reps.length };
    const existing = await prisma.calibration.findUnique({ where: { userId_exercise: { userId: user.id, exercise } } });
    const saved = await prisma.calibration.upsert({
      where: { userId_exercise: { userId: user.id, exercise } },
      update: data,
      create: { userId: user.id, exercise, ...data },
    });
    // Award points only for the first calibration of each exercise.
    const pointsEarned = existing ? 0 : POINTS.calibration;
    await touchActivity(user, pointsEarned);
    return ok({ baseline: saved, pointsEarned });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const exercise = exerciseOrThrow(new URL(req.url).searchParams.get("exercise"));
    await prisma.calibration.deleteMany({ where: { userId: user.id, exercise } });
    return ok({ reset: exercise });
  } catch (e) {
    return fail(e);
  }
}
