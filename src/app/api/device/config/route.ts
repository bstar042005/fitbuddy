// Device settings. The dashboard reads/writes them here and pushes them to the
// ESP32 over BLE; the device keeps a copy in flash so it works offline.
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, HttpError } from "@/lib/auth";
import { ok, fail, readJson } from "@/lib/api";
import { getDeviceConfig } from "@/lib/services";
import { CHALLENGES } from "@/lib/exercises";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const config = await getDeviceConfig(user.deviceId);
    const baselines = await prisma.calibration.findMany({ where: { userId: user.id } });
    return ok({ config, baselines });
  } catch (e) {
    return fail(e);
  }
}

const MODES = ["WORKOUT", "STUDY", "RECOVERY"];

export async function POST(req: NextRequest) {
  try {
    const b = await readJson(req);
    const user = await requireUser(req, b);
    const current = await getDeviceConfig(user.deviceId);
    const data: Record<string, unknown> = {};

    const int = (k: string, lo: number, hi: number) => {
      if (b[k] === undefined) return;
      const v = Math.round(Number(b[k]));
      if (!Number.isFinite(v) || v < lo || v > hi) throw new HttpError(400, `${k} must be between ${lo} and ${hi}`);
      data[k] = v;
    };
    int("sedentaryAlertMins", 5, 240);
    int("postureAlertSecs", 10, 600);
    int("challengeTarget", 1, 50);
    int("hapticIntensity", 1, 3);
    for (const k of ["strictFormMode", "hapticFeedback", "confirmPulses"]) {
      if (b[k] !== undefined) data[k] = Boolean(b[k]);
    }
    if (b.mode !== undefined) {
      if (!MODES.includes(b.mode)) throw new HttpError(400, `mode must be one of ${MODES.join(", ")}`);
      data.mode = b.mode;
    }
    if (b.challengeType !== undefined) {
      if (!(b.challengeType in CHALLENGES)) throw new HttpError(400, "Unknown challenge type");
      data.challengeType = b.challengeType;
      if (b.challengeTarget === undefined) data.challengeTarget = CHALLENGES[b.challengeType].target;
    }
    // Device status fields reported by the device itself
    if (b.firmwareVersion !== undefined) data.firmwareVersion = String(b.firmwareVersion).slice(0, 32);
    if (b.batteryLevel !== undefined) int("batteryLevel", 0, 100);
    if (b.seen) data.lastSeenAt = new Date();

    const config = await prisma.deviceConfig.update({ where: { id: current.id }, data });
    return ok({ config });
  } catch (e) {
    return fail(e);
  }
}
