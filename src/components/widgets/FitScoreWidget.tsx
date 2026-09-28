"use client";
import React from "react";
import { Flame, Gauge, Sparkles } from "lucide-react";
import { Panel, PanelHeader, Ring } from "../ui";
import type { DashboardData } from "@/lib/types";

export function FitScoreWidget({ data }: { data: DashboardData | null }) {
  const fs = data?.fitScore;
  const total = fs?.total ?? 0;
  const color = total >= 75 ? "#39FF14" : total >= 50 ? "#fbbf24" : "#f97316";
  return (
    <Panel className="h-full">
      <PanelHeader icon={<Gauge className="w-5 h-5" />} title="FitScore" badge="LAST 7 DAYS" />
      <div className="flex items-center gap-4">
        <Ring value={total} size={108} stroke={9} color={color}>
          <span className="text-3xl font-black font-mono text-white">{fs ? total : "—"}</span>
          <span className="text-[9px] font-mono text-slate-400 uppercase">/ 100</span>
        </Ring>
        <div className="flex-1 space-y-1.5 min-w-0">
          {(fs?.parts ?? []).map((p) => (
            <div key={p.key}>
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span className="truncate">{p.label}</span>
                <span className="text-slate-300" title={`weight ${p.weight}%`}>{p.value}</span>
              </div>
              <div className="h-1.5 rounded-full bg-cyber-800 overflow-hidden">
                <div className="h-full rounded-full bg-[#39FF14]/80" style={{ width: `${p.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="p-2.5 rounded bg-[#0a0f1d] border border-orange-500/30 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" />
          <div>
            <div className="text-lg font-black font-mono text-white leading-none">{data?.user.currentStreak ?? 0}d</div>
            <div className="text-[10px] font-mono text-slate-400">streak · best {data?.user.highestStreak ?? 0}d</div>
          </div>
        </div>
        <div className="p-2.5 rounded bg-[#0a0f1d] border border-cyber-800 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <div>
            <div className="text-lg font-black font-mono text-white leading-none">{(data?.user.fitPoints ?? 0).toLocaleString("en-IN")}</div>
            <div className="text-[10px] font-mono text-slate-400">fit points</div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-[10px] font-mono text-slate-500 leading-relaxed">
        Weighted towards showing up and improving your own form — not raw athletic ability.
      </p>
    </Panel>
  );
}
export default FitScoreWidget;
