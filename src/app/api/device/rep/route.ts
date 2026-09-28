// A completed rep, already segmented and feature-extracted on the device
// (or by the dashboard simulator). Accepts one rep or { reps: [...] }.
import { NextRequest } from "next/server";
import { requireUser, HttpError } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, fail, readJson, num } from "@/lib/api";
import { recordRep, exerciseOrThrow, RecordedRep } from "@/lib/services";
import { RepFeatures } from "@/lib/formEngine";

export const dynamic = "force-dynamic";

function toFeatures(r: Record<string, unknown>): RepFeatures {
  const confidence = r.confidence === undefined ? 1 : num(r.confidence, "confidence");
  const f: RepFeatures = {
    exercise: exerciseOrThrow(r.exercise),
    confidence: Math.min(1, Math.max(0, confidence)),
    romDeg: num(r.romDeg, "romDeg"),
    tempoMs: num(r.tempoMs, "tempoMs"),
    swayDeg: num(r.swayDeg, "swayDeg"),
    peakVel: num(r.peakVel, "peakVel"),
  };
  if (f.romDeg < 0 || f.tempoMs <= 0 || f.swayDeg < 0 || f.peakVel < 0) {
    throw new HttpError(400, "Rep features must be positive numbers");
  }
  return f;
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req);
    let user = await requireUser(req, body);
    const list: Record<string, unknown>[] = Array.isArray(body.reps) ? body.reps : [body];
    if (list.length === 0 || list.length > 50) throw new HttpError(400, "Send between 1 and 50 reps");
    const results: RecordedRep[] = [];
    for (const r of list) {
      const features = toFeatures(r);
      results.push(await recordRep(user, features));
      // user row changed (points/streak) — reload for the next rep
      user = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    }
    return ok(list.length === 1 && !Array.isArray(body.reps) ? { ...results[0] } : { results });
  } catch (e) {
    return fail(e);
  }
}
