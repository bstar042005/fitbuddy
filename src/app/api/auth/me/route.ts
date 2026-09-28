import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, publicUser, HttpError } from "@/lib/auth";
import { ok, fail, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    return ok({ user: publicUser(user) });
  } catch (e) {
    return fail(e);
  }
}

// Update profile / pair a device.
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const b = await readJson(req);
    const data: Record<string, unknown> = {};
    if (typeof b.name === "string" && b.name.trim()) data.name = b.name.trim();
    if (typeof b.hostelBlock === "string") data.hostelBlock = b.hostelBlock.trim();
    if (typeof b.department === "string") data.department = b.department.trim();
    if (b.weightKg !== undefined) {
      const w = Number(b.weightKg);
      data.weightKg = Number.isFinite(w) && w > 25 && w < 200 ? w : null;
    }
    if (b.deviceId !== undefined) {
      const deviceId = b.deviceId ? String(b.deviceId).trim() : null;
      if (deviceId) {
        const other = await prisma.user.findUnique({ where: { deviceId } });
        if (other && other.id !== user.id) throw new HttpError(409, `Device ${deviceId} is paired to another account`);
      }
      data.deviceId = deviceId;
    }
    const updated = await prisma.user.update({ where: { id: user.id }, data });
    return ok({ user: publicUser(updated) });
  } catch (e) {
    return fail(e);
  }
}
