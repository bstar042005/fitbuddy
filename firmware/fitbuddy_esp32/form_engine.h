// On-device rep scoring — a port of src/lib/formEngine.ts so the vibration can
// fire within milliseconds of the rep ending, even with no phone connected.
#pragma once
#include <Arduino.h>
#include <math.h>

enum ExerciseId { EX_SQUAT = 0, EX_LUNGE, EX_PUSHUP, EX_CURL, EX_JUMPING_JACK, EX_COUNT, EX_AUTO = 255 };
static const char* EX_NAMES[EX_COUNT] = {"squat", "lunge", "pushup", "curl", "jumping_jack"};

inline int exerciseFromName(const char* s) {
  if (!s) return -1;
  if (strcmp(s, "auto") == 0) return EX_AUTO;
  for (int i = 0; i < EX_COUNT; i++) if (strcmp(s, EX_NAMES[i]) == 0) return i;
  return -1;
}

struct Baseline {
  float romDeg, romStd, tempoMs, swayDeg, swayStd, peakVel;
};

// Generic defaults (same as src/lib/exercises.ts) until the user calibrates.
static const Baseline DEFAULT_BASELINES[EX_COUNT] = {
  {85, 6, 2200, 4, 1.2, 120},
  {70, 6, 2400, 5, 1.5, 100},
  {40, 4, 1800, 3, 1.0, 90},
  {120, 8, 2000, 6, 1.8, 180},
  {150, 10, 900, 8, 2.5, 400},
};

struct RepFeatures {
  int exercise;
  float confidence, romDeg, tempoMs, swayDeg, peakVel;
};

enum Quality { Q_GOOD, Q_MODERATE, Q_POOR };

inline Quality scoreRep(const RepFeatures& f, const Baseline& b, bool strict, int* scoreOut) {
  const float romFloor = strict ? 0.9f : 0.85f;
  const float fastFloor = strict ? 0.78f : 0.7f;
  const float swayK = strict ? 1.5f : 2.0f;
  const float velCeil = strict ? 1.45f : 1.6f;
  float penalty = 0;

  float romRatio = f.romDeg / max(b.romDeg, 1.0f);
  if (romRatio < romFloor) penalty += min(50.0f, (romFloor - romRatio) / 0.25f * 50.0f);

  float tempoRatio = f.tempoMs / max(b.tempoMs, 1.0f);
  if (tempoRatio < fastFloor) penalty += min(25.0f, (fastFloor - tempoRatio) / 0.3f * 25.0f);

  float swayLimit = b.swayDeg + swayK * max(b.swayStd, 0.8f);
  if (f.swayDeg > swayLimit) penalty += min(30.0f, (f.swayDeg - swayLimit) / max(b.swayDeg, 1.0f) * 20.0f);

  float velRatio = f.peakVel / max(b.peakVel, 1.0f);
  if (velRatio > velCeil) penalty += min(15.0f, (velRatio - velCeil) / 0.5f * 15.0f);

  int score = (int)roundf(constrain(100.0f - penalty, 0.0f, 100.0f));
  if (scoreOut) *scoreOut = score;
  return score >= 80 ? Q_GOOD : score >= 60 ? Q_MODERATE : Q_POOR;
}

// ---------------------------------------------------------------------------
// Exercise recognition.
// PROTOTYPE: a transparent rule-based classifier over the rep features and the
// resting orientation. Replace with a TinyML model (e.g. an Edge Impulse
// classifier trained on labelled BNO085 windows) — keep the same signature.
inline int classifyExercise(const RepFeatures& f, float restGravZ, float* confidence) {
  // restGravZ ~ how much gravity lies along the device's Z axis at rest.
  // Device horizontal (body in plank) -> push-up.
  if (fabsf(restGravZ) > 0.75f && f.romDeg < 70) { *confidence = 0.8f; return EX_PUSHUP; }
  if (f.peakVel > 260 && f.tempoMs < 1300) { *confidence = 0.85f; return EX_JUMPING_JACK; }
  if (f.romDeg > 100) { *confidence = 0.75f; return EX_CURL; }
  if (f.swayDeg > 7) { *confidence = 0.6f; return EX_LUNGE; }
  *confidence = 0.7f;
  return EX_SQUAT;
}
