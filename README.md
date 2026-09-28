# FitBuddy — Screenless AI Fitness Coach

**Smart India Hackathon 2026 · PS 26213 · Hardware**

FitBuddy is an ultra-low-cost, screenless, haptic-first fitness coach. A clip-on module (ESP32 + BNO085 9-axis IMU + vibration motor) understands how you move, scores every rep against *your own* calibrated movement, and corrects you **through vibration while you're doing it** — no screen, no camera.

> Traditional fitness trackers tell you what you did. FitBuddy helps you do it better while you're doing it.

This repo contains the web dashboard + API (Next.js 14, Prisma/SQLite), the ESP32 firmware, a device simulator so everything can be demoed without hardware, and unit tests.

---

## Quick start

```bash
npm install                 # also runs `prisma generate`
cp .env.example .env        # then set AUTH_SECRET (and optionally ANTHROPIC_API_KEY)
npm run db:setup            # creates prisma/dev.db and seeds a demo campus
npm run dev                 # http://localhost:3000
```

Sign in with a demo account (password **`fitbuddy2026`** for all):

| Email | Who |
|---|---|
| `devansh@fitbuddy.demo` | Hostel Block 4 · CSE · beginner who's improving |
| `rohan@fitbuddy.demo` | Hostel Block 2 · CSE · two-week streak |
| `priya@fitbuddy.demo` | Girls Hostel 1 · Design |
| `kabir@`, `aryan@`, `vikram@fitbuddy.demo` | more students for the league |

No hardware? Open **Test Bench** (or use the "Simulate…" buttons on each screen). To stream a workout from the terminal:

```bash
DEVICE_API_KEY=dev-device-key npm run simulate
```

Other scripts: `npm test` (unit tests), `npm run db:reset` (wipe + reseed), `npm run build`.

---

## Features and where they live

| Feature (from the idea deck) | Dashboard screen | Code |
|---|---|---|
| Real-time AI form correction (ROM, tempo, stability, rep velocity) | Live Session | `src/lib/formEngine.ts` · firmware `form_engine.h` |
| Personalised movement calibration | Calibration | `POST /api/calibration`, `computeBaseline()` |
| Rep quality & form score (good / moderate / poor, %) | Live Session, Form Analytics | `scoreRep()`, `WorkoutSession` |
| Automatic exercise recognition | Live Session (auto / manual override) | firmware `classifyExercise()` |
| Smart anti-sedentary with IMU-verified challenge | Movement & Posture | firmware `updateSedentary()`, `/api/device/event` |
| Adaptive haptic pattern language | Device & Settings (tap to test) | `src/lib/haptics.ts` · firmware `haptics.h` |
| Movement-based fatigue detection | Live Session banner, Form Analytics | `detectFatigue()` |
| Posture & study mode | Movement & Posture | firmware `updatePosture()` |
| Haptic recovery mode | Recovery | `RecoveryWidget`, firmware `updateRecovery()` |
| Dashboard: history, form graphs, rep velocity, streaks | Overview, Form Analytics | `GET /api/dashboard` |
| AI fitness & nutrition engine (Indian hostel meals, cheap protein) | Nutrition | `src/lib/nutrition.ts`, optional `src/lib/llm.ts` |
| FitScore + campus challenges (hostel / department) | Overview, Campus League | `src/lib/fitScore.ts` |
| Edge AI & privacy ("process first, transmit later") | — | firmware sends only rep features/events over BLE |

Supported exercises: squats, lunges, push-ups, bicep curls, jumping jacks (`src/lib/exercises.ts` — add more there and in `form_engine.h`).

---

## Architecture

```
BNO085 ──I²C──▶ ESP32 ─────────────────────────────▶ vibration motor (ms latency)
                 │  rep segmentation → features →
                 │  exercise recognition → scoring
                 │
                 └─BLE (Nordic UART, JSON lines)─▶ Browser (Web Bluetooth)
                                                   │  DeviceProvider: one pipeline for
                                                   │  the real device AND the simulator
                                                   └─HTTPS─▶ Next.js API ─▶ SQLite (Prisma)
```

* The device doesn't stream raw IMU data by default. Each rep becomes ~5 numbers (`romDeg`, `tempoMs`, `swayDeg`, `peakVel`, `confidence`). A raw motion trace is only sent while the app requests the live view.
* The ESP32 scores reps with the same algorithm as the server (`form_engine.h` mirrors `formEngine.ts`), so the haptic cue fires instantly even with no phone nearby. The server re-scores for analytics so history stays consistent.
* Calibration baselines and settings are stored on the server, pushed to the device on connect, and kept in the ESP32's flash so it works offline.

### How a rep is scored

Each rep is compared with the user's baseline (mean ± spread from their calibration set, or generic defaults until they calibrate):

| Check | Penalty when… | Example cue |
|---|---|---|
| Range of motion | < 85 % of baseline (90 % in strict mode) | "Squat deeper" |
| Tempo | faster than 70 % of baseline duration | "Slow down on the way down" |
| Stability | sway above baseline + 2 σ | "Keep your hips level" |
| Momentum | peak velocity > 1.6 × baseline | "Don't swing — no body momentum" |

Score = 100 − penalties → **good ≥ 80**, **moderate 60–79**, **poor < 60**. Haptics: good → confirmation pulse, moderate → short pulse, poor → double pulse.

**Fatigue** compares the first and last three reps of a set: slower reps plus shrinking range, a falling score or rising sway → "possible" / "likely" fatigue and a rest suggestion (slow double pulse).

**FitScore (0–100)** = consistency 30 % + form quality 25 % + form improvement 15 % + movement breaks 20 % + streak 10 % — weighted so showing up and improving beats natural athleticism. Hostel/department rankings use the *average* FitScore so large groups don't win by size.

---

## Hardware & firmware

`firmware/fitbuddy_esp32/` — Arduino sketch for ESP32 (Arduino core **3.x**).

| Part | Notes |
|---|---|
| ESP32 dev board (or ESP32-C3/S3) | BLE + on-device processing |
| BNO085 breakout | I²C, address 0x4A (0x4B if ADR bridged) |
| Coin vibration motor | via NPN transistor/MOSFET + flyback diode on `PIN_MOTOR` |
| 1S Li-ion + charger | battery sense via 1:2 divider on `PIN_BATTERY` |

Wiring defaults (edit `config.h`): SDA 21, SCL 22, motor 18, battery 34. Libraries: **Adafruit BNO08x** and **ArduinoJson v7** (Library Manager).

Flash it, power on, then in the dashboard go to **Device & Settings → Connect** (Chrome/Edge on desktop or Android; Web Bluetooth isn't available in Safari/iOS). Pair the device to your account by entering its name (e.g. `FitBuddy-3A7F`) as *Paired device ID* in your profile.

### BLE protocol (Nordic UART Service, newline-delimited JSON)

Device → app: `{"t":"rep","ex":"squat","cf":0.9,"rom":82,"tmp":2100,"sw":3.9,"vel":118}`, `{"t":"sed","m":45,"k":"arm_circles","tgt":10}`, `{"t":"chl","s":"progress|done|fail","n":7}`, `{"t":"pos","a":22,"s":60}`, `{"t":"hello","fw":"1.0.0","bat":87}`, `{"t":"bat","v":80}`, `{"t":"raw","a":41.2,"s":-1.3}`

App → device: `{"c":"cfg",...}`, `{"c":"base","ex":"squat",...}`, `{"c":"calib","ex":"curl","on":1}`, `{"c":"hap","p":"REST"}`, `{"c":"rec","steps":[30,30,40]}`, `{"c":"live","on":1}`

---

## API

All endpoints except auth need `Authorization: Bearer <token>` (or, for device/script posts, `x-device-key: $DEVICE_API_KEY` plus a paired `deviceId` in the body).

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | returns `{ user, token }` |
| GET / PATCH | `/api/auth/me` | profile (weight, hostel, department, paired device) |
| POST | `/api/device/rep` | one rep or `{ reps: [...] }` → score, cues, haptic pattern, set summary, fatigue |
| POST | `/api/device/event` | `SEDENTARY_ALERT`, `CHALLENGE_ISSUED/COMPLETED/FAILED`, `POSTURE_ALERT`, `RECOVERY_COMPLETED`, `ACTIVITY` |
| GET / POST | `/api/device/config` | device settings (mode, thresholds, haptics) + baselines |
| GET / POST / DELETE | `/api/calibration` | personal baselines |
| GET | `/api/reps` | recent reps + set in progress |
| GET | `/api/dashboard` | FitScore, today, 7-day trend, per-exercise stats, league |
| GET / POST / DELETE | `/api/nutrition` | meal log, protein target, cheap alternatives |
| GET | `/api/firmware` | firmware source for the in-app viewer |

---

## Honest status / limitations

* **Firmware is untested on hardware.** It was syntax-checked against the real ArduinoJson and Adafruit BNO08x headers, but not compiled for the ESP32 toolchain or run on a device; the thresholds in `config.h` need tuning with a real module.
* **Exercise recognition is rule-based** (`classifyExercise()` in `form_engine.h`) — a placeholder for a TinyML model (e.g. Edge Impulse trained on labelled BNO085 windows). The interface is ready for it.
* A single IMU can only judge what its mount position can observe (e.g. a waist clip sees hip depth and sway, not knee valgus), so form checks are placement-specific.
* Nutrition values are approximate portion estimates and prices are rough averages; the protein target is a guideline-based estimate (ICMR-NIN adult RDA ≈ 0.8 g/kg, scaled for activity), **not medical advice**.
* Auth is deliberately minimal (scrypt + HMAC tokens in localStorage) — fine for a prototype; use a proper auth provider and Postgres for a real deployment.

## Project structure

```
firmware/fitbuddy_esp32/    ESP32 sketch (.ino, config.h, haptics.h, form_engine.h)
prisma/                     schema.prisma, seed.ts (demo campus)
scripts/simulate-device.ts  CLI device simulator
src/app/api/…               API routes
src/components/             dashboard UI (widgets/, device/DeviceProvider.tsx)
src/lib/                    form engine, fatigue, FitScore, haptics, nutrition, BLE, simulator
tests/                      unit tests (node:test via tsx)
```
