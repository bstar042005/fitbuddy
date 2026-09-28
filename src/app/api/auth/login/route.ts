import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken, publicUser, HttpError } from "@/lib/auth";
import { ok, fail, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const b = await readJson(req);
    const email = String(b.email || "").trim().toLowerCase();
    const password = String(b.password || "");
    if (!email || !password) throw new HttpError(400, "Email and password are required");

    const user = await prisma.user.findUnique({ where: { email } });
    // Same message for unknown email and wrong password.
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new HttpError(401, "Incorrect email or password");
    }
    return ok({ message: `Welcome back, ${user.name}`, user: publicUser(user), token: signToken(user.id) });
  } catch (e) {
    return fail(e);
  }
}
