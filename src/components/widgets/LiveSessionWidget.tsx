"use client";
import React, { useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { Activity, BatteryMedium, Coffee, ScanSearch } from "lucide-react";
import { useDevice } from "../device/DeviceProvider";
import { HapticIndicator } from "../HapticIndicator";
import { Panel, PanelHeader, Stat, QualityPill, QualityBar, Empty, cx } from "../ui";
import { EXERCISES, EXERCISE_IDS, exerciseName, ExerciseId } from "@/lib/exercises";

export function LiveSessionWidget({ compact = false }: { compact?: boolean }) {
  const d = useDevice();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const s = d.activeSession;
  const last = d.reps[0];
  const fatigue = d.fatigue;
  const tired = fatigue && fatigue.level !== "none";
  const confidence = s?.avgConfidence;

  return (
    <Panel alert={last?.quality === "poor" && Date.now() - new Date(last.createdAt).getTime() < 5000}>
      <PanelHeader
        icon={<Activity className="w-5 h-5" />}
        title="Live Session"
        badge={d.source === "ble" ? `BLE · ${d.deviceName}` : "SIMULATOR"}
        right={<HapticIndicator haptic={d.haptic} compact={compact} />}
      />

      <div className="flex flex-wrap items-center gap-2 mb-3 text-[11px] font-mono">
        <span className="text-slate-400">Exercise:</span>
        <select
          value={d.exerciseOverride}
          onChange={(e) => d.setExerciseOverride(e.target.value as ExerciseId | "auto")}
          className="px-2 py-1 bg-[#0a0f1d] border border-cyber-700 rounded text-white focus:outline-none focus:border-[#39FF14]"
        >
          <option value="auto">Auto-detect (on-device ML)</option>
          {EXERCISE_IDS.map((id) => (
            <option key={id} value={id}>
              {EXERCISES[id].name} (manual)
            </option>
          ))}
        </select>
        {d.source === "ble" && d.battery != null && (
          <span className="flex items-center gap-1 text-slate-400">
            <BatteryMedium className="w-3.5 h-3.5" /> {d.battery}%
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
        <Stat
          label="Detected exercise"
          value={<span className="text-lg">{s ? exerciseName(s.exercise) : "—"}</span>}
          tone="white"
          sub={
            confidence != null ? (
              <span className="flex items-center gap-1">
                <ScanSearch className="w-3 h-3" /> {Math.round(confidence * 100)}% confidence
              </span>
            ) : (
              "No set in progress"
            )
          }
        />
        <Stat label="Reps this set" value={s?.totalReps ?? 0} tone="cyan" sub={s ? `${s.goodReps} good · ${s.moderateReps} mod · ${s.poorReps} poor` : "—"} />
        <Stat
          label="Set form score"
          value={s ? Math.round(s.formScore) : "—"}
          unit={s ? "%" : undefined}
          tone={!s ? "white" : s.formScore >= 80 ? "neon" : s.formScore >= 60 ? "amber" : "red"}
          sub={s && <QualityBar good={s.goodReps} moderate={s.moderateReps} poor={s.poorReps} className="mt-1" />}
        />
        <Stat
          label="Last rep"
          value={last ? last.score : "—"}
          unit={last ? "/100" : undefined}
          tone={!last ? "white" : last.quality === "good" ? "neon" : last.quality === "moderate" ? "amber" : "red"}
          sub={last?.cues[0] ?? (last ? "Clean rep" : "—")}
        />
      </div>

      {tired && (
        <div className="mb-3 p-3 rounded border border-violet-400/50 bg-violet-500/10 text-xs font-mono text-violet-200 flex gap-3">
          <Coffee className="w-5 h-5 text-violet-300 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-violet-100">
              {fatigue!.level === "likely" ? "Fatigue likely" : "Possible fatigue"} — consider resting 60–90 s before the next set
            </div>
            <ul className="mt-1 text-violet-200/90 list-disc list-inside">
              {fatigue!.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!compact && (
        <div className="bg-[#090d16] p-3 rounded-lg border border-cyber-800 mb-3">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
            <span className="font-bold text-slate-300">MOTION TRACE (primary angle °, sway °)</span>
            <span>{d.source === "ble" ? "live from device" : "simulated"}</span>
          </div>
          <div className="h-40">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={d.trace} margin={{ top: 6, right: 8, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="i" hide />
                  <YAxis stroke="#475569" tick={{ fontSize: 10, fill: "#64748b" }} domain={[-20, "auto"]} />
                  <Line type="monotone" dataKey="angle" stroke="#39FF14" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="sway" stroke="#22d3ee" strokeWidth={1.2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      <div className="text-[10px] font-mono text-slate-400 uppercase font-bold mb-1.5">Rep-by-rep feedback</div>
      {d.reps.length === 0 ? (
        <Empty>No reps yet. Start moving with the device, or use the Test Bench to simulate a set.</Empty>
      ) : (
        <ul className="space-y-1.5">
          {d.reps.slice(0, compact ? 4 : 8).map((r) => (
            <li key={r.id} className="flex items-center gap-2 p-2 rounded bg-[#0a0f1d] border border-cyber-800 text-[11px] font-mono">
              <span className="text-slate-500 w-8 shrink-0">#{r.index}</span>
              <QualityPill q={r.quality} />
              <span className={cx("w-9 text-right font-bold shrink-0", r.quality === "good" ? "text-[#39FF14]" : r.quality === "moderate" ? "text-amber-400" : "text-red-400")}>
                {r.score}
              </span>
              <span className="text-slate-300 truncate flex-1">{r.cues.length ? r.cues.join(" · ") : `${exerciseName(r.exercise)} — clean rep`}</span>
              <span className="hidden sm:inline text-slate-500 shrink-0">
                {Math.round(r.romDeg)}° · {(r.tempoMs / 1000).toFixed(1)}s
              </span>
              {!r.calibrated && <span className="text-[9px] px-1 rounded bg-cyber-800 text-slate-400 shrink-0" title="Scored with generic defaults — calibrate for personal feedback">GENERIC</span>}
            </li>
          ))}
        </ul>
      )}
      {d.lastError && <div className="mt-2 text-[11px] font-mono text-red-400">{d.lastError}</div>}
    </Panel>
  );
}
export default LiveSessionWidget;
