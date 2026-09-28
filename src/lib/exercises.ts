// Exercise catalogue shared by the server, the dashboard and the simulator.
// Default baselines are generic starting points used until the user runs a
// calibration set; they are NOT clinical norms. Units:
//   romDeg  – range of motion of the primary angle (degrees)
//   tempoMs – duration of one rep (ms)
//   swayDeg – RMS wobble on the secondary axis during the rep (degrees)
//   peakVel – peak angular velocity (deg/s)

export type ExerciseId = "squat" | "lunge" | "pushup" | "curl" | "jumping_jack";

export interface Baseline {
  romDeg: number;
  romStd: number;
  tempoMs: number;
  tempoStd: number;
  swayDeg: number;
  swayStd: number;
  peakVel: number;
  velStd: number;
  samples?: number;
}

export interface ExerciseInfo {
  id: ExerciseId;
  name: string;
  mount: "waist" | "wrist" | "phone-case" | "chest";
  romCue: string; // shown when range of motion is too short
  swayCue: string; // shown when the movement is unstable
  fastCue: string; // shown when the rep is rushed
  momentumCue: string; // shown when the rep is jerky / swung
  defaults: Baseline;
  stretches: { name: string; secs: number; hint: string }[];
}

export const EXERCISES: Record<ExerciseId, ExerciseInfo> = {
  squat: {
    id: "squat",
    name: "Squats",
    mount: "waist",
    romCue: "Squat deeper",
    swayCue: "Keep your hips level",
    fastCue: "Slow down on the way down",
    momentumCue: "Control the drive up",
    defaults: { romDeg: 85, romStd: 6, tempoMs: 2200, tempoStd: 250, swayDeg: 4, swayStd: 1.2, peakVel: 120, velStd: 20 },
    stretches: [
      { name: "Standing quad stretch (each leg)", secs: 30, hint: "Hold your ankle behind you, knees together" },
      { name: "Hamstring fold", secs: 30, hint: "Hinge at the hips, soft knees" },
      { name: "Hip flexor lunge stretch", secs: 40, hint: "Back knee down, push hips forward gently" },
    ],
  },
  lunge: {
    id: "lunge",
    name: "Lunges",
    mount: "waist",
    romCue: "Lower the back knee further",
    swayCue: "Stay balanced, don't tip sideways",
    fastCue: "Slow, controlled step",
    momentumCue: "Push up with control",
    defaults: { romDeg: 70, romStd: 6, tempoMs: 2400, tempoStd: 280, swayDeg: 5, swayStd: 1.5, peakVel: 100, velStd: 18 },
    stretches: [
      { name: "Hip flexor lunge stretch", secs: 40, hint: "Switch sides halfway" },
      { name: "Standing calf stretch", secs: 30, hint: "Heel down, lean into a wall" },
      { name: "Glute figure-4 stretch", secs: 30, hint: "Seated or lying down" },
    ],
  },
  pushup: {
    id: "pushup",
    name: "Push-ups",
    mount: "phone-case",
    romCue: "Lower your chest further",
    swayCue: "Keep your body in a straight line",
    fastCue: "Slow the lowering phase",
    momentumCue: "Don't bounce off the bottom",
    defaults: { romDeg: 40, romStd: 4, tempoMs: 1800, tempoStd: 220, swayDeg: 3, swayStd: 1, peakVel: 90, velStd: 15 },
    stretches: [
      { name: "Doorway chest stretch", secs: 30, hint: "Forearm on the frame, step through" },
      { name: "Cross-body shoulder stretch", secs: 30, hint: "Switch arms halfway" },
      { name: "Child's pose", secs: 40, hint: "Reach arms forward, breathe slowly" },
    ],
  },
  curl: {
    id: "curl",
    name: "Bicep Curls",
    mount: "wrist",
    romCue: "Fully straighten your arm at the bottom",
    swayCue: "Keep your elbow pinned to your side",
    fastCue: "Lower the weight slowly",
    momentumCue: "Don't swing — no body momentum",
    defaults: { romDeg: 120, romStd: 8, tempoMs: 2000, tempoStd: 250, swayDeg: 6, swayStd: 1.8, peakVel: 180, velStd: 30 },
    stretches: [
      { name: "Bicep wall stretch (each arm)", secs: 30, hint: "Palm on wall, turn away slowly" },
      { name: "Wrist flexor stretch", secs: 20, hint: "Arm straight, pull fingers back gently" },
      { name: "Overhead tricep stretch", secs: 30, hint: "Switch arms halfway" },
    ],
  },
  jumping_jack: {
    id: "jumping_jack",
    name: "Jumping Jacks",
    mount: "wrist",
    romCue: "Bring your arms all the way overhead",
    swayCue: "Land softly and stay centred",
    fastCue: "Keep a steady rhythm",
    momentumCue: "Keep a steady rhythm",
    defaults: { romDeg: 150, romStd: 10, tempoMs: 900, tempoStd: 120, swayDeg: 8, swayStd: 2.5, peakVel: 400, velStd: 60 },
    stretches: [
      { name: "Standing calf stretch", secs: 30, hint: "Switch legs halfway" },
      { name: "Overhead side reach", secs: 30, hint: "Reach up and lean gently each side" },
      { name: "Slow march + deep breaths", secs: 45, hint: "Bring your heart rate down" },
    ],
  },
};

export const EXERCISE_IDS = Object.keys(EXERCISES) as ExerciseId[];

export function isExerciseId(x: unknown): x is ExerciseId {
  return typeof x === "string" && x in EXERCISES;
}

export function exerciseName(id: string): string {
  return isExerciseId(id) ? EXERCISES[id].name : id;
}

// Generic cooldown used when there is no recent workout to tailor it to.
export const GENERAL_COOLDOWN = [
  { name: "Neck rolls", secs: 20, hint: "Slow circles, both directions" },
  { name: "Shoulder rolls", secs: 20, hint: "Backwards, then forwards" },
  { name: "Standing hamstring fold", secs: 30, hint: "Soft knees, let the head hang" },
  { name: "Deep breathing", secs: 40, hint: "4 seconds in, 6 seconds out" },
];

export const CHALLENGES: Record<string, { name: string; target: number; hint: string }> = {
  arm_circles: { name: "Arm circles", target: 10, hint: "Big circles, both arms" },
  standing_stretch: { name: "Standing stretch", target: 1, hint: "Stand up and reach overhead for 15 s" },
  squats: { name: "Bodyweight squats", target: 5, hint: "Quick movement break" },
  march: { name: "Marching on the spot", target: 20, hint: "Knees up, 20 steps" },
};
