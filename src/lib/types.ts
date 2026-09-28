// Shapes returned by the API, used by the dashboard components.
import type { ExerciseId, Baseline } from "./exercises";
import type { FatigueResult } from "./formEngine";
import type { HapticPattern } from "./haptics";

export interface AppUser {
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
}

export interface DeviceConfig {
  deviceId: string;
  mode: "WORKOUT" | "STUDY" | "RECOVERY";
  sedentaryAlertMins: number;
  postureAlertSecs: number;
  challengeType: string;
  challengeTarget: number;
  strictFormMode: boolean;
  hapticFeedback: boolean;
  hapticIntensity: number;
  confirmPulses: boolean;
  firmwareVersion: string;
  batteryLevel: number | null;
  lastSeenAt: string | null;
}

export interface CalibrationRow extends Baseline {
  exercise: ExerciseId;
  samples: number;
  updatedAt: string;
}

export interface RepView {
  id: string;
  index: number;
  exercise: ExerciseId;
  confidence: number;
  romDeg: number;
  tempoMs: number;
  swayDeg: number;
  peakVel: number;
  score: number;
  quality: "good" | "moderate" | "poor";
  cues: string[];
  calibrated: boolean;
  createdAt: string;
}

export interface SessionSummary {
  id: string;
  exercise: ExerciseId;
  totalReps: number;
  goodReps: number;
  moderateReps: number;
  poorReps: number;
  formScore: number;
  fatigueLevel: string;
  fatigue?: FatigueResult;
  avgConfidence?: number;
}

export interface DashboardData {
  user: AppUser;
  fitScore: { total: number; parts: { key: string; label: string; value: number; weight: number }[] };
  today: {
    reps: number;
    formScore: number | null;
    good: number;
    moderate: number;
    poor: number;
    sedentaryAlerts: number;
    challengesIssued: number;
    movementBreaks: number;
    postureAlerts: number;
    recoveries: number;
  };
  weekly: { day: string; date: string; reps: number; formScore: number | null; good: number; moderate: number; poor: number }[];
  exercises: {
    exercise: ExerciseId;
    name: string;
    totalReps: number;
    good: number;
    moderate: number;
    poor: number;
    formScore: number | null;
    trend: { date: string; formScore: number }[];
    calibrated: boolean;
  }[];
  lastExercise: ExerciseId | null;
  recentSessions: (SessionSummary & { name: string; startedAt: string })[];
  recentEvents: { id: string; type: string; detail: Record<string, any>; createdAt: string }[];
  league: {
    individuals: { rank: number; id: string; name: string; hostelBlock: string; department: string; fitScore: number; fitPoints: number; streak: number; isCurrentUser: boolean }[];
    hostels: { name: string; members: number; avgFitScore: number; totalPoints: number }[];
    departments: { name: string; members: number; avgFitScore: number; totalPoints: number }[];
  };
  device: DeviceConfig;
}

export interface HapticFlash {
  pattern: HapticPattern;
  at: number;
}
