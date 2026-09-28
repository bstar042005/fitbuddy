import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken, publicUser, HttpError } from "@/lib/auth";
import { ok, fail, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const b = await readJson(req);
    const name = String(b.name || "").trim();
    const email = String(b.email || "").trim().toLowerCase();
    const password = String(b.password || "");
    if (!name || !email) throw new HttpError(400, "Name and email are required");
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "Enter a valid email address");
    if (password.length < 6) throw new HttpError(400, "Password must be at least 6 characters");

    if (await prisma.user.findUnique({ where: { email } })) {
      throw new HttpError(409, "This email is already registered");
    }
    const deviceId = b.deviceId ? String(b.deviceId).trim() : null;
    if (deviceId && (await prisma.user.findUnique({ where: { deviceId } }))) {
      throw new HttpError(409, `Device ${deviceId} is already paired to another account`);
    }
    const weight = Number(b.weightKg);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashPassword(password),
        deviceId,
        hostelBlock: String(b.hostelBlock || "Hostel Block 4").trim(),
        department: String(b.department || "General").trim(),
        weightKg: Number.isFinite(weight) && weight > 25 && weight < 200 ? weight : null,
      },
    });
    return ok({ message: `Welcome to FitBuddy, ${user.name}!`, user: publicUser(user), token: signToken(user.id) });
  } catch (e) {
    return fail(e);
  }
}
