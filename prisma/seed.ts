// Seeds a demo campus: 6 students across hostels/departments with 14 days of
// realistic history (reps scored by the real form engine, movement breaks,
// posture alerts, meals). All demo accounts use the password "fitbuddy2026".
import { hashPassword } from "../src/lib/auth";
import { EXERCISES, ExerciseId } from "../src/lib/exercises";
import { scoreRep, computeBaseline, detectFatigue } from "../src/lib/formEngine";
import { simulateRep, personalBaseline, mulberry32, SimQuality } from "../src/lib/deviceSim";
import { POINTS } from "../src/lib/services";
import { prisma } from "../src/lib/prisma";

const rand = mulberry32(2026);
const DEMO_PASSWORD = "fitbuddy2026";

const USERS = [
  { name: "Devansh Sharma", email: "devansh@fitbuddy.demo", hostel: "Hostel Block 4", dept: "CSE", weight: 64, device: "FitBuddy-DEMO1", activity: 0.85, improving: true, skill: 0.55, exercises: ["squat", "pushup", "lunge"] },
  { name: "Kabir Varma", email: "kabir@fitbuddy.demo", hostel: "Hostel Block 4", dept: "ECE", weight: 72, device: "FitBuddy-DEMO2", activity: 0.7, improving: false, skill: 0.8, exercises: ["pushup", "curl", "squat"] },
  { name: "Aryan Mehta", email: "aryan@fitbuddy.demo", hostel: "Hostel Block 2", dept: "ME", weight: 70, device: "FitBuddy-DEMO3", activity: 0.45, improving: false, skill: 0.9, exercises: ["curl", "jumping_jack"] },
  { name: "Rohan Patel", email: "rohan@fitbuddy.demo", hostel: "Hostel Block 2", dept: "CSE", weight: 58, device: "FitBuddy-DEMO4", activity: 1.0, improving: true, skill: 0.4, exercises: ["squat", "jumping_jack"] },
  { name: "Vikram Singh", email: "vikram@fitbuddy.demo", hostel: "Hostel Block 1", dept: "ECE", weight: 80, device: "FitBuddy-DEMO5", activity: 0.3, improving: false, skill: 0.7, exercises: ["pushup", "squat"] },
  { name: "Priya Nair", email: "priya@fitbuddy.demo", hostel: "Girls Hostel 1", dept: "Design", weight: 52, device: "FitBuddy-DEMO6", activity: 0.75, improving: true, skill: 0.6, exercises: ["lunge", "squat", "curl"] },
] as const;

function pickQuality(skill: number): SimQuality {
  const x = rand();
  if (x < skill) return "good";
  if (x < skill + (1 - skill) * 0.65) return "moderate";
  return "poor";
}

const at = (daysBack: number, hour: number, min = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  d.setHours(hour, min, 0, 0);
  // Never create history in the future: today's items land 1.5–3 h ago.
  const latest = Date.now() - 90 * 60000;
  if (d.getTime() > latest) return new Date(latest - rand() * 90 * 60000);
  return d;
};

async function main() {
  console.log("Seeding FitBuddy demo data…");
  await prisma.rep.deleteMany();
  await prisma.workoutSession.deleteMany();
  await prisma.activityEvent.deleteMany();
  await prisma.mealLog.deleteMany();
  await prisma.calibration.deleteMany();
  await prisma.user.deleteMany();
  await prisma.deviceConfig.deleteMany();

  for (const cfg of USERS) {
    const user = await prisma.user.create({
      data: {
        name: cfg.name,
        email: cfg.email,
        passwordHash: hashPassword(DEMO_PASSWORD),
        deviceId: cfg.device,
        hostelBlock: cfg.hostel,
        department: cfg.dept,
        weightKg: cfg.weight,
      },
    });
    await prisma.deviceConfig.create({ data: { deviceId: cfg.device, firmwareVersion: "1.0.0", batteryLevel: 60 + Math.floor(rand() * 40) } });

    // Personal movement + calibration for their main exercises
    const natural: Partial<Record<ExerciseId, ReturnType<typeof personalBaseline>>> = {};
    for (const ex of cfg.exercises) {
      natural[ex] = personalBaseline(ex, rand);
      const calReps = Array.from({ length: 8 }, () => simulateRep(ex, "good", natural[ex], 0, rand));
      const base = computeBaseline(calReps);
      await prisma.calibration.create({ data: { userId: user.id, exercise: ex, ...base, samples: calReps.length } });
    }
    const baselines = await prisma.calibration.findMany({ where: { userId: user.id } });

    let points = POINTS.calibration * cfg.exercises.length;
    const activeDays: number[] = [];

    for (let daysBack = 13; daysBack >= 0; daysBack--) {
      // everyone active today so the demo dashboard has live-looking data
      // Devansh (main demo user) has trained every day for the last 9 days
      const forced = cfg.name === "Devansh Sharma" && daysBack <= 8;
      const active = forced || rand() < cfg.activity;
      if (!active) continue;
      activeDays.push(daysBack);
      // improving users get better as the fortnight goes on
      const skill = cfg.improving ? Math.min(0.92, cfg.skill + (13 - daysBack) * 0.025) : cfg.skill;
      const nEx = 1 + Math.floor(rand() * 2);
      let hour = 7 + Math.floor(rand() * 3);
      for (let k = 0; k < nEx; k++) {
        const ex = cfg.exercises[Math.floor(rand() * cfg.exercises.length)] as ExerciseId;
        const baseline = baselines.find((b) => b.exercise === ex) ?? null;
        const nReps = 10 + Math.floor(rand() * 11);
        const tired = rand() < 0.3;
        const start = at(daysBack, hour, Math.floor(rand() * 40));
        const session = await prisma.workoutSession.create({ data: { userId: user.id, exercise: ex, startedAt: start } });
        const reps: { tempoMs: number; romDeg: number; swayDeg: number; score: number; quality: string; confidence: number }[] = [];
        for (let i = 0; i < nReps; i++) {
          const fatigue = tired ? Math.max(0, (i - nReps * 0.5) / (nReps * 0.5)) : 0;
          const f = simulateRep(ex, pickQuality(skill), natural[ex] ?? null, fatigue, rand);
          const s = scoreRep(f, baseline);
          const createdAt = new Date(start.getTime() + i * (f.tempoMs + 1200));
          await prisma.rep.create({
            data: {
              sessionId: session.id,
              userId: user.id,
              index: i + 1,
              exercise: ex,
              confidence: f.confidence ?? 1,
              romDeg: f.romDeg,
              tempoMs: f.tempoMs,
              swayDeg: f.swayDeg,
              peakVel: f.peakVel,
              score: s.score,
              quality: s.quality,
              cues: JSON.stringify(s.cues),
              calibrated: !!baseline,
              createdAt,
            },
          });
          reps.push({ ...f, score: s.score, quality: s.quality, confidence: f.confidence ?? 1 });
          points += POINTS[s.quality];
        }
        const avg = (k: "score" | "tempoMs" | "confidence") => reps.reduce((a, r) => a + r[k], 0) / reps.length;
        await prisma.workoutSession.update({
          where: { id: session.id },
          data: {
            lastRepAt: new Date(start.getTime() + nReps * 3500),
            totalReps: reps.length,
            goodReps: reps.filter((r) => r.quality === "good").length,
            moderateReps: reps.filter((r) => r.quality === "moderate").length,
            poorReps: reps.filter((r) => r.quality === "poor").length,
            formScore: Math.round(avg("score") * 10) / 10,
            avgTempoMs: Math.round(avg("tempoMs")),
            avgConfidence: Math.round(avg("confidence") * 100) / 100,
            fatigueLevel: detectFatigue(reps).level,
          },
        });
        hour += 1;
      }

      // Anti-sedentary: study-day alerts, most answered with a movement break
      const alerts = 1 + Math.floor(rand() * 3);
      for (let a = 0; a < alerts; a++) {
        const t = at(daysBack, 14 + a * 2, Math.floor(rand() * 50));
        await prisma.activityEvent.create({ data: { userId: user.id, type: "SEDENTARY_ALERT", detail: JSON.stringify({ minutesSitting: 45 }), createdAt: t } });
        await prisma.activityEvent.create({ data: { userId: user.id, type: "CHALLENGE_ISSUED", detail: JSON.stringify({ challenge: "arm_circles", target: 10 }), createdAt: t } });
        const done = rand() < 0.35 + cfg.activity * 0.6;
        await prisma.activityEvent.create({
          data: {
            userId: user.id,
            type: done ? "CHALLENGE_COMPLETED" : "CHALLENGE_FAILED",
            detail: JSON.stringify({ challenge: "arm_circles", count: done ? 10 : 3, target: 10, seconds: 25 + Math.floor(rand() * 40) }),
            createdAt: new Date(t.getTime() + 60000),
          },
        });
        if (done) points += POINTS.challenge;
      }
      if (rand() < 0.5) {
        await prisma.activityEvent.create({
          data: { userId: user.id, type: "POSTURE_ALERT", detail: JSON.stringify({ slouchDeg: 18 + Math.floor(rand() * 12), seconds: 60 }), createdAt: at(daysBack, 21, 10) },
        });
      }
    }

    // Streak = consecutive active days ending today (or yesterday)
    let streak = 0;
    const set = new Set(activeDays);
    for (let d = set.has(0) ? 0 : 1; set.has(d); d++) streak++;
    let best = 0;
    let run = 0;
    for (let d = 13; d >= 0; d--) {
      run = set.has(d) ? run + 1 : 0;
      best = Math.max(best, run);
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        fitPoints: points,
        currentStreak: streak,
        highestStreak: Math.max(best, streak),
        lastActiveDate: activeDays.length ? at(Math.min(...activeDays), 9) : null,
      },
    });
    console.log(`  ${cfg.name.padEnd(16)} ${activeDays.length} active days, streak ${streak}, ${points} pts`);
  }

  // A logged breakfast for the main demo user
  const devansh = await prisma.user.findUniqueOrThrow({ where: { email: "devansh@fitbuddy.demo" } });
  await prisma.mealLog.create({
    data: {
      userId: devansh.id,
      text: "1 plate poha and chai",
      items: JSON.stringify([
        { name: "Poha", qty: 1, unit: "plate", calories: 180, protein: 3.5, carbs: 32, fats: 4.5 },
        { name: "Chai", qty: 1, unit: "cup", calories: 60, protein: 1.5, carbs: 8, fats: 2 },
      ]),
      calories: 240,
      protein: 5,
      carbs: 40,
      fats: 6.5,
      createdAt: at(0, 8, 15),
    },
  });

  console.log(`Done. Log in with any demo email (e.g. devansh@fitbuddy.demo) and password "${DEMO_PASSWORD}".`);
  console.log(`Exercises: ${Object.keys(EXERCISES).join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
