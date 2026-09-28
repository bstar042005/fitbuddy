/**
 * FitBuddy device simulator (CLI)
 * Streams a short workout + a sedentary challenge to the API exactly like the
 * ESP32 would (via the dashboard), authenticated with the shared device key.
 *
 *   DEVICE_API_KEY=... npm run simulate                 # uses FitBuddy-DEMO1
 *   DEVICE_ID=FitBuddy-DEMO4 SERVER_URL=http://localhost:3000 npm run simulate
 */
import { simulateRep, SimQuality } from "../src/lib/deviceSim";
import { ExerciseId, EXERCISES } from "../src/lib/exercises";

const SERVER = process.env.SERVER_URL || "http://localhost:3000";
const DEVICE_ID = process.env.DEVICE_ID || "FitBuddy-DEMO1";
const KEY = process.env.DEVICE_API_KEY;

if (!KEY) {
  console.error("Set DEVICE_API_KEY (same value as in your .env) to authenticate as a device.");
  process.exit(1);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function post(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${SERVER}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-device-key": KEY! },
    body: JSON.stringify({ deviceId: DEVICE_ID, ...body }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

const icon: Record<string, string> = { good: "✅", moderate: "🟡", poor: "❌" };

async function set(ex: ExerciseId, n: number, mode: "mixed" | "fatigue") {
  console.log(`\n▶ ${EXERCISES[ex].name} × ${n} (${mode})`);
  for (let i = 0; i < n; i++) {
    let q: SimQuality = "good";
    let fatigue = 0;
    if (mode === "mixed") {
      const x = Math.random();
      q = x < 0.65 ? "good" : x < 0.88 ? "moderate" : "poor";
    } else fatigue = Math.max(0, (i - n * 0.4) / (n * 0.6));
    const f = simulateRep(ex, q, null, fatigue);
    const r = await post("/api/device/rep", { ...f });
    const cue = r.rep.cues.length ? ` — ${r.rep.cues.join("; ")}` : "";
    console.log(`  rep ${String(r.rep.index).padStart(2)} ${icon[r.rep.quality]} ${String(r.rep.score).padStart(3)}  haptic:${r.haptic.padEnd(9)}${cue}`);
    if (r.fatigueJustDetected) console.log(`  💤 ${r.fatigue.level} fatigue: ${r.fatigue.reasons.join(", ")}`);
    await sleep(300);
  }
}

async function main() {
  console.log(`FitBuddy device simulator → ${SERVER} as ${DEVICE_ID}`);
  await set("squat", 10, "mixed");
  await set("lunge", 14, "fatigue");

  console.log("\n▶ Sat for 45 minutes…");
  await post("/api/device/event", { type: "SEDENTARY_ALERT", detail: { minutesSitting: 45 } });
  await post("/api/device/event", { type: "CHALLENGE_ISSUED", detail: { challenge: "arm_circles", target: 10 } });
  console.log("  📳 long pulse — challenge: 10 arm circles");
  await sleep(500);
  const done = await post("/api/device/event", { type: "CHALLENGE_COMPLETED", detail: { challenge: "arm_circles", count: 10, target: 10, seconds: 22 } });
  console.log(`  ✅ challenge verified by IMU (+${done.pointsEarned} pts)`);
  console.log("\nDone — open the dashboard to see it.");
}

main().catch((e) => {
  console.error("Simulator error:", e.message);
  process.exit(1);
});
