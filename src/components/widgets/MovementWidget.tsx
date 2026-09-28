"use client";
import React, { useEffect, useState } from "react";
import { Armchair, BookOpen, CheckCircle2, XCircle, PersonStanding } from "lucide-react";
import { useDevice } from "../device/DeviceProvider";
import { Panel, PanelHeader, Btn, Toggle, Empty, timeAgo, cx } from "../ui";
import { PulseStrip } from "../HapticIndicator";
import { CHALLENGES } from "@/lib/exercises";
import type { DashboardData } from "@/lib/types";

const EVENT_LABEL: Record<string, { label: string; tone: string }> = {
  SEDENTARY_ALERT: { label: "Sitting too long — long pulse", tone: "text-orange-400" },
  CHALLENGE_ISSUED: { label: "Movement challenge issued", tone: "text-slate-300" },
  CHALLENGE_COMPLETED: { label: "Challenge completed (IMU-verified)", tone: "text-[#39FF14]" },
  CHALLENGE_FAILED: { label: "Challenge not completed", tone: "text-red-400" },
  POSTURE_ALERT: { label: "Posture nudge", tone: "text-cyan-400" },
  RECOVERY_COMPLETED: { label: "Recovery routine finished", tone: "text-violet-300" },
  ACTIVITY: { label: "Activity", tone: "text-slate-300" },
};

export function MovementWidget({ data }: { data: DashboardData | null }) {
  const d = useDevice();
  const c = d.challenge;
  const cfg = d.config;
  const studyMode = cfg?.mode === "STUDY";
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Panel>
        <PanelHeader icon={<Armchair className="w-5 h-5" />} title="Smart Anti-Sedentary" badge={`ALERT AFTER ${cfg?.sedentaryAlertMins ?? 45} MIN`} />
        <p className="text-xs font-mono text-slate-400 mb-3 leading-relaxed">
          When you've been still too long the module gives a <span className="text-orange-400">long pulse</span>, then sets a small physical
          challenge. It can't just be dismissed — the IMU counts the movement and only clears once you've actually done it.
        </p>

        {c ? (
          <div className="p-4 rounded border border-orange-500/50 bg-orange-500/10">
            <div className="flex items-center justify-between">
              <div className="text-sm font-mono font-bold text-white">
                Challenge: {c.name} × {c.target}
              </div>
              <span className="text-[10px] font-mono text-orange-300">{Math.round((Date.now() - c.startedAt) / 1000)} s</span>
            </div>
            <div className="text-[11px] font-mono text-orange-200/80 mt-0.5">{CHALLENGES[c.type]?.hint}</div>
            <div className="flex items-end gap-2 mt-3">
              <span className="text-4xl font-black font-mono text-white">{c.count}</span>
              <span className="text-sm font-mono text-slate-400 mb-1">/ {c.target} verified by IMU</span>
            </div>
            <div className="h-2 rounded-full bg-cyber-800 overflow-hidden mt-2">
              <div className="h-full bg-orange-400 transition-all" style={{ width: `${(c.count / c.target) * 100}%` }} />
            </div>
            {d.source !== "ble" && (
              <div className="flex flex-wrap gap-2 mt-3">
                <Btn variant="amber" onClick={() => d.simChallengeStep(1)}>
                  <PersonStanding className="w-3.5 h-3.5" /> Simulate 1 movement
                </Btn>
                <Btn onClick={() => d.simChallengeStep(c.target)}>Complete all</Btn>
                <Btn onClick={d.simGiveUpChallenge}>Ignore it</Btn>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded border border-cyber-800 bg-[#0a0f1d] flex items-center justify-between gap-3">
            <div className="text-xs font-mono text-slate-300">
              No active challenge.
              <div className="text-[10px] text-slate-500 mt-0.5">
                Next challenge: {CHALLENGES[cfg?.challengeType ?? "arm_circles"]?.name} × {cfg?.challengeTarget ?? 10}
              </div>
            </div>
            {d.source !== "ble" && (
              <Btn onClick={d.simSitting} title="Pretend you've been sitting past the limit">
                <Armchair className="w-3.5 h-3.5" /> Simulate long sitting
              </Btn>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mt-3 text-center font-mono">
          <div className="p-2 rounded bg-[#0a0f1d] border border-cyber-800">
            <div className="text-xl font-black text-orange-400">{data?.today.sedentaryAlerts ?? 0}</div>
            <div className="text-[10px] text-slate-400">alerts today</div>
          </div>
          <div className="p-2 rounded bg-[#0a0f1d] border border-cyber-800">
            <div className="text-xl font-black text-[#39FF14]">{data?.today.movementBreaks ?? 0}</div>
            <div className="text-[10px] text-slate-400">breaks done</div>
          </div>
          <div className="p-2 rounded bg-[#0a0f1d] border border-cyber-800">
            <div className="text-xl font-black text-white">
              {data && data.today.challengesIssued ? Math.min(100, Math.round((data.today.movementBreaks / data.today.challengesIssued) * 100)) : 0}%
            </div>
            <div className="text-[10px] text-slate-400">completion</div>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          icon={<BookOpen className="w-5 h-5" />}
          title="Posture & Study Mode"
          right={
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-300">
              Study mode
              <Toggle on={studyMode} label="Study mode" onChange={(v) => d.updateConfig({ mode: v ? "STUDY" : "WORKOUT" })} />
            </div>
          }
        />
        <p className="text-xs font-mono text-slate-400 mb-3 leading-relaxed">
          For studying, laptop work or library sessions. Worn on the waistband, the module watches your trunk angle and gives a gentle{" "}
          <span className="text-cyan-400">tap-tap</span> if you stay slouched for more than {cfg?.postureAlertSecs ?? 60} s — plus the usual
          movement-break reminders.
        </p>
        <div className="flex items-center gap-3 p-3 rounded bg-[#0a0f1d] border border-cyber-800 mb-3">
          <PulseStrip pattern="POSTURE" active={!!d.lastPostureAlertAt && Date.now() - d.lastPostureAlertAt < 2000} />
          <div className="flex-1 text-xs font-mono text-slate-300">
            {d.lastPostureAlertAt ? `Last nudge ${timeAgo(d.lastPostureAlertAt)}` : "No posture nudges this session"}
          </div>
          {d.source !== "ble" && (
            <Btn onClick={() => d.simSlouch(18 + Math.round(Math.random() * 12))}>Simulate slouch</Btn>
          )}
        </div>
        <label className="block text-[11px] font-mono text-slate-400 mb-1">Slouch tolerance before a nudge</label>
        <div className="flex gap-1.5 mb-4">
          {[30, 60, 120, 300].map((s) => (
            <button
              key={s}
              onClick={() => d.updateConfig({ postureAlertSecs: s })}
              className={cx(
                "flex-1 py-1 text-xs font-mono rounded border",
                cfg?.postureAlertSecs === s ? "bg-cyan-400 text-black font-bold border-cyan-400" : "border-cyber-700 text-slate-400 hover:text-white"
              )}
            >
              {s < 60 ? `${s}s` : `${s / 60}m`}
            </button>
          ))}
        </div>

        <div className="text-[10px] font-mono text-slate-400 uppercase font-bold mb-1.5">Recent activity</div>
        {data && data.recentEvents.length ? (
          <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {data.recentEvents
              .filter((e) => e.type !== "CHALLENGE_ISSUED")
              .map((e) => {
                const meta = EVENT_LABEL[e.type] ?? { label: e.type, tone: "text-slate-300" };
                return (
                  <li key={e.id} className="flex items-center gap-2 text-[11px] font-mono">
                    {e.type === "CHALLENGE_COMPLETED" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#39FF14] shrink-0" />
                    ) : e.type === "CHALLENGE_FAILED" ? (
                      <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">•</span>
                    )}
                    <span className={cx("flex-1 truncate", meta.tone)}>
                      {meta.label}
                      {e.type === "POSTURE_ALERT" && e.detail.slouchDeg ? ` (${e.detail.slouchDeg}° forward)` : ""}
                      {e.type.startsWith("CHALLENGE_") && e.detail.count != null ? ` — ${e.detail.count}/${e.detail.target ?? "?"}` : ""}
                    </span>
                    <span className="text-slate-500 shrink-0">{timeAgo(e.createdAt)}</span>
                  </li>
                );
              })}
          </ul>
        ) : (
          <Empty>No activity events yet.</Empty>
        )}
      </Panel>
    </div>
  );
}
export default MovementWidget;
