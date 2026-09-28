// Haptic pattern language — must stay in sync with src/lib/haptics.ts
#pragma once
#include <Arduino.h>

struct HapticPatternDef {
  const char* name;
  uint16_t pulses[6];   // on, off, on, off, ... (ms); 0 terminates
};

static const HapticPatternDef HAPTIC_PATTERNS[] = {
  {"CONFIRM",        {60, 0}},
  {"CORRECT",        {150, 0}},
  {"ALERT",          {200, 100, 200, 0}},
  {"SEDENTARY",      {800, 0}},
  {"CHALLENGE_DONE", {80, 60, 80, 60, 300, 0}},
  {"REST",           {400, 200, 400, 0}},
  {"POSTURE",        {100, 150, 100, 0}},
  {"STEP",           {120, 80, 120, 80, 120, 0}},
};
static const int HAPTIC_COUNT = sizeof(HAPTIC_PATTERNS) / sizeof(HAPTIC_PATTERNS[0]);

// Non-blocking player: call haptic.update() from loop().
class HapticPlayer {
 public:
  void begin(int pin) {
    pin_ = pin;
    // ESP32 Arduino core 3.x LEDC API (for core 2.x use ledcSetup + ledcAttachPin)
    ledcAttach(pin_, 200, 8);
    ledcWrite(pin_, 0);
  }
  void setIntensity(int level) {  // 1..3
    duty_ = level <= 1 ? 140 : level == 2 ? 200 : 255;
  }
  void setEnabled(bool on) { enabled_ = on; if (!on) stop(); }

  void play(const char* name) {
    if (!enabled_) return;
    for (int i = 0; i < HAPTIC_COUNT; i++) {
      if (strcmp(HAPTIC_PATTERNS[i].name, name) == 0) {
        current_ = &HAPTIC_PATTERNS[i];
        step_ = 0;
        stepStart_ = millis();
        apply();
        return;
      }
    }
  }
  bool busy() const { return current_ != nullptr; }

  void update() {
    if (!current_) return;
    if (millis() - stepStart_ >= current_->pulses[step_]) {
      step_++;
      if (step_ >= 6 || current_->pulses[step_] == 0) { stop(); return; }
      stepStart_ = millis();
      apply();
    }
  }

 private:
  void apply() { ledcWrite(pin_, (step_ % 2 == 0) ? duty_ : 0); }
  void stop() { current_ = nullptr; ledcWrite(pin_, 0); }
  int pin_ = -1;
  uint8_t duty_ = 200;
  bool enabled_ = true;
  const HapticPatternDef* current_ = nullptr;
  int step_ = 0;
  unsigned long stepStart_ = 0;
};
