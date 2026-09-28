// Haptic pattern language. Each pattern is an on/off sequence in ms:
// [on, off, on, off, ...]. The same table is mirrored in the ESP32 firmware
// (firmware/fitbuddy_esp32/haptics.h) so the device can react instantly
// without waiting for the app.

export type HapticPattern =
  | "CONFIRM"
  | "CORRECT"
  | "ALERT"
  | "SEDENTARY"
  | "CHALLENGE_DONE"
  | "REST"
  | "POSTURE"
  | "STEP"
  | "NONE";

export const HAPTICS: Record<Exclude<HapticPattern, "NONE">, { pulses: number[]; meaning: string; label: string }> = {
  CONFIRM: { pulses: [60], label: "Confirmation pulse", meaning: "Good rep" },
  CORRECT: { pulses: [150], label: "Short pulse", meaning: "Correction needed (moderate rep)" },
  ALERT: { pulses: [200, 100, 200], label: "Double pulse", meaning: "Movement done incorrectly (poor rep)" },
  SEDENTARY: { pulses: [800], label: "Long pulse", meaning: "You've been sitting too long — challenge incoming" },
  CHALLENGE_DONE: { pulses: [80, 60, 80, 60, 300], label: "Celebration pattern", meaning: "Movement challenge completed" },
  REST: { pulses: [400, 200, 400], label: "Slow double", meaning: "Possible fatigue — take a rest" },
  POSTURE: { pulses: [100, 150, 100], label: "Gentle tap-tap", meaning: "Adjust your posture" },
  STEP: { pulses: [120, 80, 120, 80, 120], label: "Triple tap", meaning: "Recovery: next stretch" },
};

export function patternForQuality(quality: "good" | "moderate" | "poor", confirmPulses: boolean): HapticPattern {
  if (quality === "poor") return "ALERT";
  if (quality === "moderate") return "CORRECT";
  return confirmPulses ? "CONFIRM" : "NONE";
}
