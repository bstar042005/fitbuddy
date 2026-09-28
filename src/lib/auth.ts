// Minimal, dependency-free auth for the prototype:
//  - passwords hashed with scrypt (Node crypto) + per-user salt
//  - stateless HMAC-signed bearer tokens (7 day expiry)
//  - devices/scripts may post with the shared DEVICE_API_KEY header instead
import crypto from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";

const SECRET = process.env.AUTH_SECRET || "dev-only-insecure-secret-change-me";
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return expected.length === test.length && crypto.timingSafeEqual(expected, test);
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

export function signToken(userId: string): string {
  const payload = b64url(JSON.stringify({ sub: userId, exp: Date.now() + TOKEN_TTL_MS }));
  const sig = b64url(crypto.createHmac("sha256", SECRET).update(payload).digest());
  return `${payload}.${sig}`;
}

export function verifyToken(token: string): string | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = b64url(crypto.createHmac("sha256", SECRET).update(payload).digest());
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof data.sub !== "string" || Date.now() > data.exp) return null;
    return data.sub;
  } catch {
    return null;
  }
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Resolve the acting user: a signed-in user's bearer token, or a device posting
// with x-device-key + a deviceId that is paired to a user.
export async function requireUser(req: NextRequest, body?: { deviceId?: string }) {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const userId = verifyToken(auth.slice(7));
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) return user;
    }
    throw new HttpError(401, "Session expired — please sign in again");
  }
  const deviceKey = req.headers.get("x-device-key");
  const expectedKey = process.env.DEVICE_API_KEY;
  if (deviceKey && expectedKey && deviceKey === expectedKey && body?.deviceId) {
    const user = await prisma.user.findUnique({ where: { deviceId: body.deviceId } });
    if (user) return user;
    throw new HttpError(404, `No user is paired with device ${body.deviceId}`);
  }
  throw new HttpError(401, "Not signed in");
}

export function publicUser(u: {
  id: string;
  name: string;
  email: string;
  deviceId: string | null;
  hostelBlock: string;
  department: string;
  weightKg: number | null;
  fitPoints: number;
  currentStreak: number;
  highestStreak: number;
}) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    deviceId: u.deviceId,
    hostelBlock: u.hostelBlock,
    department: u.department,
    weightKg: u.weightKg,
    fitPoints: u.fitPoints,
    currentStreak: u.currentStreak,
    highestStreak: u.highestStreak,
  };
}
