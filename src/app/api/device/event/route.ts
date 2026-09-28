// Non-rep events from the device: sedentary alerts, movement challenges,
// posture alerts (study mode), finished recovery routines, general activity.
import { NextRequest } from "next/server";
import { requireUser, HttpError } from "@/lib/auth";
import { ok, fail, readJson } from "@/lib/api";
import { recordEvent, EVENT_TYPES, EventType } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await readJson(req);
    const user = await requireUser(req, body);
    const type = String(body.type || "") as EventType;
    if (!EVENT_TYPES.includes(type)) {
      throw new HttpError(400, `type must be one of ${EVENT_TYPES.join(", ")}`);
    }
    const detail = body.detail && typeof body.detail === "object" ? body.detail : {};
    const { event, pointsEarned } = await recordEvent(user, type, detail);
    return ok({ eventId: event.id, type, pointsEarned });
  } catch (e) {
    return fail(e);
  }
}
