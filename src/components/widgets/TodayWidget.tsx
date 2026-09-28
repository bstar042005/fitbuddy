"use client";
import React from "react";
import { CalendarCheck } from "lucide-react";
import { Panel, PanelHeader, Stat, QualityBar } from "../ui";
import type { DashboardData } from "@/lib/types";

export function TodayWidget({ data }: { data: DashboardData | null }) {
  const t = data?.today;
  return (
    <Panel className="h-full">
      <PanelHeader icon={<CalendarCheck className="w-5 h-5" />} title="Today" />
      <div className="grid grid-cols-2 gap-2.5">
        <Stat label="Reps" value={t?.reps ?? 0} tone="cyan" />
        <Stat
          label="Avg form score"
          value={t?.formScore ?? "—"}
          unit={t?.formScore != null ? "%" : undefined}
          tone={t?.formScore == null ? "white" : t.formScore >= 80 ? "neon" : t.formScore >= 60 ? "amber" : "red"}
        />
        <Stat
          label="Movement breaks"
          value={`${t?.movementBreaks ?? 0}/${t?.challengesIssued ?? 0}`}
          tone="orange"
          sub="challenges done / issued"
        />
        <Stat label="Posture nudges" value={t?.postureAlerts ?? 0} tone="amber" sub={`${t?.recoveries ?? 0} recovery routine(s)`} />
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
          <span>Rep quality today</span>
          <span>
            <span className="text-[#39FF14]">{t?.good ?? 0}</span> / <span className="text-amber-400">{t?.moderate ?? 0}</span> /{" "}
            <span className="text-red-400">{t?.poor ?? 0}</span>
          </span>
        </div>
        <QualityBar good={t?.good ?? 0} moderate={t?.moderate ?? 0} poor={t?.poor ?? 0} />
      </div>
    </Panel>
  );
}
export default TodayWidget;
