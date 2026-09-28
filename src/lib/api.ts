import { NextResponse } from "next/server";
import { HttpError } from "./auth";

export function ok(data: Record<string, unknown>) {
  return NextResponse.json({ success: true, ...data });
}

export function fail(err: unknown) {
  if (err instanceof HttpError) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.status });
  }
  console.error(err);
  const message = err instanceof Error ? err.message : "Unexpected server error";
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}

export async function readJson(req: Request): Promise<Record<string, any>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    throw new HttpError(400, "Request body must be JSON");
  }
}

export const num = (x: unknown, name: string): number => {
  const n = Number(x);
  if (!Number.isFinite(n)) throw new HttpError(400, `${name} must be a number`);
  return n;
};

export const parseJson = <T>(s: string, fallback: T): T => {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
};

export const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const daysAgo = (n: number) => new Date(startOfDay().getTime() - n * 86400000);
