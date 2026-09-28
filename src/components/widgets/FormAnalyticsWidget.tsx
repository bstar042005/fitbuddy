"use client";
import React, { useEffect, useState } from "react";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, LineChart } from "recharts";
import { Crosshair, TrendingUp, TrendingDown } from "lucide-react";
import { Panel, PanelHeader, QualityBar, Empty, cx } from "../ui";
import type { DashboardData } from "@/lib/types";

const tooltipStyle = { background: "#090d16", border: "1px solid #334155", fontSize: 11, fontFamily: "monospace" };

export function FormAnalyticsWidget({ data }: { data: DashboardData | null }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const exercises = (data?.exercises ?? []).filter((e) => e.totalReps > 0);
  const [selected, setSelected] = useState<string | null>(null);
  const current = exercises.find((e) => e.exercise === selected) ?? exercises[0];

  const trend = current?.trend ?? [];
  const delta = trend.length >= 2 ? trend[trend.length - 1].formScore - trend[0].formScore : null;

  return (
    <Panel>
      <PanelHeader icon={<Crosshair className="w-5 h-5" />} title="Form Analytics" badge="HOW WELL YOU MOVE" />

      <div className="text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">Last 7 days — reps (bars) & form score (line)</div>
      <div className="h-48 mb-4">
        {mounted && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data?.weekly ?? []} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="day" stroke="#475569" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis yAxisId="reps" stroke="#475569" tick={{ fontSize: 10, fill: "#64748b" }} />
              <YAxis yAxisId="score" orientation="right" domain={[0, 100]} hide />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#e2e8f0" }} />
              <Bar yAxisId="reps" dataKey="good" stackId="q" fill="#39FF14" name="Good reps" />
              <Bar yAxisId="reps" dataKey="moderate" stackId="q" fill="#fbbf24" name="Moderate reps" />
              <Bar yAxisId="reps" dataKey="poor" stackId="q" fill="#ef4444" name="Poor reps" radius={[3, 3, 0, 0]} />
              <Line yAxisId="score" type="monotone" dataKey="formScore" stroke="#22d3ee" strokeWidth={2} dot={{ r: 3 }} name="Form score %" connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {exercises.length === 0 ? (
        <Empty>No workouts in the last 30 days yet.</Empty>
      ) : (
        <>
          <div className="flex gap-1.5 p-1 rounded bg-[#0a0f1d] border border-cyber-800 overflow-x-auto mb-3">
            {exercises.map((e) => (
              <button
                key={e.exercise}
                onClick={() => setSelected(e.exercise)}
                className={cx(
                  "px-2.5 py-1 text-xs font-mono rounded whitespace-nowrap",
                  current?.exercise === e.exercise ? "bg-[#39FF14] text-black font-bold" : "text-slate-400 hover:text-white"
                )}
              >
                {e.name}
              </button>
            ))}
          </div>

          {current && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black font-mono text-white">{current.formScore ?? "—"}%</span>
                  <span className="text-xs font-mono text-slate-400">avg form · {current.totalReps} reps (30 d)</span>
                </div>
                <QualityBar good={current.good} moderate={current.moderate} poor={current.poor} />
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-[#39FF14]">{current.good} good</span>
                  <span className="text-amber-400">{current.moderate} moderate</span>
                  <span className="text-red-400">{current.poor} poor</span>
                </div>
                {delta != null && (
                  <div className={cx("flex items-center gap-1.5 text-xs font-mono", delta >= 0 ? "text-[#39FF14]" : "text-red-400")}>
                    {delta >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {delta >= 0 ? "+" : ""}
                    {delta} points across your last {trend.length} sessions
                  </div>
                )}
                {!current.calibrated && (
                  <div className="text-[11px] font-mono text-amber-300">Not calibrated — scores use generic thresholds. Calibrate for personal feedback.</div>
                )}
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">Form score per session</div>
                <div className="h-32">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trend.map((t, i) => ({ ...t, n: i + 1 }))} margin={{ top: 6, right: 6, left: -26, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="n" stroke="#475569" tick={{ fontSize: 10, fill: "#64748b" }} />
                        <YAxis domain={[40, 100]} stroke="#475569" tick={{ fontSize: 10, fill: "#64748b" }} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "Form score"]} labelFormatter={(l) => `Session ${l}`} />
                        <Line type="monotone" dataKey="formScore" stroke="#39FF14" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {data && data.recentSessions.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] font-mono text-slate-400 uppercase font-bold mb-1.5">Recent sets</div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono">
              <thead className="text-slate-500 text-left">
                <tr>
                  <th className="py-1 pr-2 font-normal">Exercise</th>
                  <th className="py-1 pr-2 font-normal">Reps</th>
                  <th className="py-1 pr-2 font-normal">Quality</th>
                  <th className="py-1 pr-2 font-normal">Score</th>
                  <th className="py-1 font-normal">Fatigue</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSessions.map((s) => (
                  <tr key={s.id} className="border-t border-cyber-800 text-slate-300">
                    <td className="py-1.5 pr-2">
                      {s.name}
                      <div className="text-[10px] text-slate-500">{new Date(s.startedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                    </td>
                    <td className="py-1.5 pr-2">{s.totalReps}</td>
                    <td className="py-1.5 pr-2 w-28">
                      <QualityBar good={s.goodReps} moderate={s.moderateReps} poor={s.poorReps} />
                    </td>
                    <td className="py-1.5 pr-2 font-bold text-white">{s.formScore}%</td>
                    <td className={cx("py-1.5", s.fatigueLevel === "none" ? "text-slate-500" : "text-violet-300")}>{s.fatigueLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Panel>
  );
}
export default FormAnalyticsWidget;
