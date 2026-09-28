"use client";
import React from "react";
import { LayoutDashboard, Activity, Crosshair, Target, Armchair, HeartPulse, Salad, Trophy, Sliders, Cpu } from "lucide-react";
import { useDevice } from "./device/DeviceProvider";
import { cx } from "./ui";
import type { AppUser } from "@/lib/types";

export type DashboardTab = "overview" | "live" | "analytics" | "calibration" | "movement" | "recovery" | "nutrition" | "league" | "device" | "simulator";

export const TABS: { id: DashboardTab; label: string; title: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview", title: "Today at a glance", icon: LayoutDashboard },
  { id: "live", label: "Live Session", title: "Live session & rep feedback", icon: Activity },
  { id: "analytics", label: "Form Analytics", title: "How well you move", icon: Crosshair },
  { id: "calibration", label: "Calibration", title: "Personal movement calibration", icon: Target },
  { id: "movement", label: "Movement & Posture", title: "Anti-sedentary & study mode", icon: Armchair },
  { id: "recovery", label: "Recovery", title: "Haptic recovery mode", icon: HeartPulse },
  { id: "nutrition", label: "Nutrition", title: "Fitness & nutrition engine", icon: Salad },
  { id: "league", label: "Campus League", title: "Campus fitness league", icon: Trophy },
  { id: "device", label: "Device & Settings", title: "Wearable & settings", icon: Sliders },
  { id: "simulator", label: "Test Bench", title: "Device simulator", icon: Cpu },
];

export function Sidebar({ active, onSelect, user }: { active: DashboardTab; onSelect: (t: DashboardTab) => void; user: AppUser | null }) {
  const d = useDevice();
  const connected = d.bleState === "connected";
  return (
    <aside className="w-full lg:w-60 bg-[#090d16] border-b lg:border-b-0 lg:border-r border-cyber-800 p-3 lg:p-4 shrink-0 lg:min-h-[calc(100vh-64px)] flex lg:flex-col gap-3">
      <div className="hidden lg:block p-3 rounded-lg bg-[#131e36] border border-cyber-700/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cx("w-2.5 h-2.5 rounded-full", connected ? "bg-[#39FF14] shadow-[0_0_8px_#39FF14] animate-pulse" : "bg-amber-400")} />
            <span className="text-xs font-mono font-bold text-white truncate max-w-[120px]">{connected ? d.deviceName : "Simulator"}</span>
          </div>
          {connected && d.battery != null && <span className="text-[10px] font-mono text-slate-300">{d.battery}%</span>}
        </div>
        <div className="text-[10px] font-mono text-slate-400 mt-1">
          {connected ? "BLE · edge processing on device" : "No module connected"}
        </div>
        {!connected && (
          <button onClick={() => onSelect("device")} className="mt-2 text-[10px] font-mono text-cyan-400 hover:underline">
            Connect wearable →
          </button>
        )}
      </div>

      <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible flex-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className={cx(
                "flex items-center gap-2.5 px-3 py-2 rounded text-xs font-mono whitespace-nowrap border transition-colors",
                on ? "bg-[#39FF14]/15 border-[#39FF14]/60 text-white font-bold" : "border-transparent text-slate-400 hover:text-white hover:bg-cyber-850"
              )}
            >
              <Icon className={cx("w-4 h-4 shrink-0", on ? "text-[#39FF14]" : "")} />
              {t.label}
              {t.id === "movement" && d.challenge && <span className="ml-auto w-2 h-2 rounded-full bg-orange-400 animate-pulse" />}
            </button>
          );
        })}
      </nav>

      {user && (
        <div className="hidden lg:flex items-center gap-2.5 p-2 rounded bg-[#131e36]/70 border border-cyber-700/60">
          <div className="w-8 h-8 rounded-full bg-cyber-800 border border-[#39FF14]/50 flex items-center justify-center font-mono font-bold text-xs text-[#39FF14]">
            {user.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-mono font-bold text-white truncate">{user.name}</div>
            <div className="text-[10px] font-mono text-slate-400 truncate">
              {user.hostelBlock} · {user.department}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
export default Sidebar;
