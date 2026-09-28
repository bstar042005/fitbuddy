"use client";
import React, { useState } from "react";
import { Target, Play, Save, X, CheckCircle2, Wand2 } from "lucide-react";
import { useDevice } from "../device/DeviceProvider";
import { Panel, PanelHeader, Btn, cx } from "../ui";
import { EXERCISES, EXERCISE_IDS, ExerciseId } from "@/lib/exercises";
import { MIN_CALIBRATION_REPS } from "@/lib/formEngine";

const MOUNT_HINT: Record<string, string> = {
  waist: "Clip the module to your waistband, centred on your back.",
  wrist: "Strap the module to the wrist of your working arm.",
  "phone-case": "Attach the module to your phone case and keep the phone in a chest/arm band.",
  chest: "Strap the module to your chest.",
};

export function CalibrationWidget() {
  const d = useDevice();
  const [exercise, setExercise] = useState<ExerciseId>("squat");
  const [message, setMessage] = useState<string | null>(null);
  const cal = d.calibration;
  const active = !!cal;
  const collected = cal?.reps.length ?? 0;
  const baseline = d.baselines.find((b) => b.exercise === (cal?.exercise ?? exercise));
  const info = EXERCISES[cal?.exercise ?? exercise];

  const save = async () => {
    const r = await d.saveCalibration();
    if (r) setMessage(`Baseline saved${r.pointsEarned ? ` (+${r.pointsEarned} pts)` : ""}. Future ${info.name.toLowerCase()} reps are now judged against your own movement.`);
  };

  return (
    <Panel>
      <PanelHeader icon={<Target className="w-5 h-5" />} title="Personal Calibration" badge="YOUR MOVEMENT, NOT A GENERIC RULE" />
      <p className="text-xs font-mono text-slate-400 mb-4 leading-relaxed">
        Do {MIN_CALIBRATION_REPS}–10 reps at your normal, comfortable best. FitBuddy learns your range of motion, tempo and stability,
        then flags reps that drift from <em>your</em> pattern. Re-calibrate any time your technique improves.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {EXERCISE_IDS.map((id) => {
              const done = d.baselines.some((b) => b.exercise === id);
              return (
                <button
                  key={id}
                  disabled={active}
                  onClick={() => {
                    setExercise(id);
                    setMessage(null);
                  }}
                  className={cx(
                    "p-2 rounded border text-left text-xs font-mono disabled:opacity-50",
                    (cal?.exercise ?? exercise) === id ? "border-[#39FF14] bg-[#39FF14]/10 text-white" : "border-cyber-700 text-slate-300 hover:border-cyber-600"
                  )}
                >
                  <div className="font-bold">{EXERCISES[id].name}</div>
                  <div className={cx("text-[10px]", done ? "text-[#39FF14]" : "text-slate-500")}>{done ? "✓ calibrated" : "generic"}</div>
                </button>
              );
            })}
          </div>

          <div className="p-3 rounded bg-[#0a0f1d] border border-cyber-800 text-[11px] font-mono text-slate-300">
            <span className="text-cyan-400 font-bold">Mount: </span>
            {MOUNT_HINT[info.mount]}
          </div>

          {!active ? (
            <Btn variant="primary" onClick={() => d.startCalibration(exercise)} className="w-full py-2.5">
              <Play className="w-4 h-4" /> Start calibration set
            </Btn>
          ) : (
            <div className="p-3 rounded border border-[#39FF14]/40 bg-[#39FF14]/5">
              <div className="flex justify-between text-xs font-mono text-white mb-2">
                <span className="font-bold">Recording {info.name.toLowerCase()}…</span>
                <span>
                  {collected} / {MIN_CALIBRATION_REPS}+ reps
                </span>
              </div>
              <div className="h-2 rounded-full bg-cyber-800 overflow-hidden mb-3">
                <div className="h-full bg-[#39FF14] transition-all" style={{ width: `${Math.min(100, (collected / 8) * 100)}%` }} />
              </div>
              <div className="flex flex-wrap gap-2">
                {d.source !== "ble" && (
                  <Btn onClick={() => d.simRep(cal!.exercise, "good")} title="Simulate one natural rep">
                    <Wand2 className="w-3.5 h-3.5" /> Simulate rep
                  </Btn>
                )}
                <Btn variant="primary" disabled={collected < MIN_CALIBRATION_REPS} onClick={save}>
                  <Save className="w-3.5 h-3.5" /> Save baseline
                </Btn>
                <Btn onClick={d.cancelCalibration}>
                  <X className="w-3.5 h-3.5" /> Cancel
                </Btn>
              </div>
              {d.source === "ble" && <p className="mt-2 text-[10px] font-mono text-slate-400">The device gives a short confirm buzz for each captured rep.</p>}
            </div>
          )}
          {message && (
            <div className="flex gap-2 text-xs font-mono text-[#39FF14]">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {message}
            </div>
          )}
        </div>

        <div className="p-3 rounded bg-[#0a0f1d] border border-cyber-800">
          <div className="text-[10px] font-mono text-slate-400 uppercase font-bold mb-2">{info.name}: your baseline vs generic</div>
          <table className="w-full text-[11px] font-mono">
            <thead className="text-slate-500">
              <tr>
                <th className="text-left font-normal py-1">Metric</th>
                <th className="text-right font-normal py-1">Generic</th>
                <th className="text-right font-normal py-1">You</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {[
                ["Range of motion", `${info.defaults.romDeg}°`, baseline && `${baseline.romDeg}° ±${baseline.romStd}`],
                ["Rep tempo", `${(info.defaults.tempoMs / 1000).toFixed(1)} s`, baseline && `${(baseline.tempoMs / 1000).toFixed(2)} s`],
                ["Sway", `${info.defaults.swayDeg}°`, baseline && `${baseline.swayDeg}° ±${baseline.swayStd}`],
                ["Peak velocity", `${info.defaults.peakVel}°/s`, baseline && `${baseline.peakVel}°/s`],
              ].map(([k, g, y]) => (
                <tr key={k as string} className="border-t border-cyber-800">
                  <td className="py-1.5">{k}</td>
                  <td className="py-1.5 text-right text-slate-500">{g}</td>
                  <td className={cx("py-1.5 text-right font-bold", y ? "text-[#39FF14]" : "text-slate-600")}>{y || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {baseline && (
            <div className="mt-2 text-[10px] font-mono text-slate-500">
              From {baseline.samples} reps · updated {new Date(baseline.updatedAt).toLocaleDateString("en-IN")}
            </div>
          )}
          {active && collected > 0 && (
            <div className="mt-3 text-[10px] font-mono text-slate-400">
              Captured: {cal!.reps.map((r) => `${Math.round(r.romDeg)}°`).join(", ")}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
export default CalibrationWidget;
