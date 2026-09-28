// Serves the ESP32 firmware source so the dashboard can show / download it.
import { promises as fs } from "fs";
import path from "path";
import { ok, fail } from "@/lib/api";

export const dynamic = "force-dynamic";

const FILES = ["fitbuddy_esp32.ino", "config.h", "haptics.h", "form_engine.h"];

export async function GET() {
  try {
    const dir = path.join(process.cwd(), "firmware", "fitbuddy_esp32");
    const files = await Promise.all(
      FILES.map(async (name) => ({ name, content: await fs.readFile(path.join(dir, name), "utf8").catch(() => "") }))
    );
    return ok({ files: files.filter((f) => f.content) });
  } catch (e) {
    return fail(e);
  }
}
