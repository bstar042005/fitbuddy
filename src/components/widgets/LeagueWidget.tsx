"use client";
import React, { useState } from "react";
import { Trophy, Crown, Flame, Building2, Users } from "lucide-react";
import { Panel, PanelHeader, cx } from "../ui";
import type { DashboardData } from "@/lib/types";

export function LeagueWidget({ data, compact }: { data: DashboardData | null; compact?: boolean }) {
  const [tab, setTab] = useState<"students" | "hostels" | "departments">("students");
  const league = data?.league;
  const rows = compact ? 5 : 50;
  return (
    <Panel className="h-full">
      <PanelHeader icon={<Trophy className="w-5 h-5" />} title="Campus League" badge="RANKED BY FITSCORE" />
      <div className="grid grid-cols-3 gap-1 p-1 rounded bg-[#0a0f1d] border border-cyber-800 mb-3 text-[11px] font-mono">
        {(["students", "hostels", "departments"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cx("py-1 rounded capitalize", tab === t ? "bg-[#39FF14] text-black font-bold" : "text-slate-400 hover:text-white")}>
            {t}
          </button>
        ))}
      </div>

      {tab === "students" ? (
        <ul className="space-y-1.5">
          {(league?.individuals ?? []).slice(0, rows).map((u) => (
            <li
              key={u.id}
              className={cx(
                "flex items-center gap-2.5 p-2 rounded border text-xs font-mono",
                u.isCurrentUser ? "border-[#39FF14]/60 bg-[#39FF14]/10" : "border-cyber-800 bg-[#0a0f1d]"
              )}
            >
              <span className={cx("w-6 text-center font-black", u.rank === 1 ? "text-amber-300" : "text-slate-400")}>
                {u.rank === 1 ? <Crown className="w-4 h-4 inline" /> : `#${u.rank}`}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold truncate">
                  {u.name}
                  {u.isCurrentUser && " (you)"}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {u.hostelBlock} · {u.department}
                </div>
              </div>
              <span className="flex items-center gap-0.5 text-orange-400 text-[11px] shrink-0">
                <Flame className="w-3 h-3" />
                {u.streak}
              </span>
              <span className="text-[#39FF14] font-black w-8 text-right shrink-0">{u.fitScore}</span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-1.5">
          {(tab === "hostels" ? league?.hostels : league?.departments)?.map((g, i) => {
            const mine = tab === "hostels" ? data?.user.hostelBlock.startsWith(g.name) : data?.user.department === g.name;
            return (
              <li key={g.name} className={cx("p-2.5 rounded border text-xs font-mono", mine ? "border-[#39FF14]/60 bg-[#39FF14]/10" : "border-cyber-800 bg-[#0a0f1d]")}>
                <div className="flex items-center gap-2">
                  <span className="w-6 text-slate-400 font-black">#{i + 1}</span>
                  {tab === "hostels" ? <Building2 className="w-4 h-4 text-cyan-400" /> : <Users className="w-4 h-4 text-cyan-400" />}
                  <span className="flex-1 text-white font-bold truncate">{g.name}</span>
                  <span className="text-[#39FF14] font-black">{g.avgFitScore}</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-cyber-800 overflow-hidden">
                  <div className="h-full bg-[#39FF14]/70" style={{ width: `${g.avgFitScore}%` }} />
                </div>
                <div className="mt-1 text-[10px] text-slate-500">
                  {g.members} member{g.members !== 1 && "s"} · avg FitScore · {g.totalPoints.toLocaleString("en-IN")} pts total
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-[10px] font-mono text-slate-500">Group rankings use the average FitScore, so big hostels don't win just by size.</p>
    </Panel>
  );
}
export default LeagueWidget;
