"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { DeviceProvider, useDevice } from "./device/DeviceProvider";
import { Sidebar, DashboardTab, TABS } from "./Sidebar";
import { LiveSessionWidget } from "./widgets/LiveSessionWidget";
import { FitScoreWidget } from "./widgets/FitScoreWidget";
import { TodayWidget } from "./widgets/TodayWidget";
import { FormAnalyticsWidget } from "./widgets/FormAnalyticsWidget";
import { CalibrationWidget } from "./widgets/CalibrationWidget";
import { MovementWidget } from "./widgets/MovementWidget";
import { RecoveryWidget } from "./widgets/RecoveryWidget";
import { NutritionWidget } from "./widgets/NutritionWidget";
import { LeagueWidget } from "./widgets/LeagueWidget";
import { DeviceSettingsWidget } from "./widgets/DeviceSettingsWidget";
import { SimulatorWidget } from "./widgets/SimulatorWidget";
import { api } from "@/lib/client";
import type { AppUser, DashboardData } from "@/lib/types";

export function DashboardView({ user, onUserChange }: { user: AppUser; onUserChange: (u: AppUser) => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onUserChangeRef = useRef(onUserChange);
  onUserChangeRef.current = onUserChange;

  const load = useCallback(async () => {
    try {
      const d = await api<DashboardData>("/api/dashboard");
      setData(d);
      onUserChangeRef.current(d.user); // keep navbar points/streak in sync
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  // Debounced refresh after device activity (a set can fire many reps quickly)
  const onActivity = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(load, 1200);
  }, [load]);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <DeviceProvider onActivity={onActivity}>
      <Shell data={data} error={error} reload={load} user={data?.user ?? user} onUserChange={(u) => { onUserChange(u); load(); }} />
    </DeviceProvider>
  );
}

function Shell({ data, error, reload, user, onUserChange }: { data: DashboardData | null; error: string | null; reload: () => void; user: AppUser; onUserChange: (u: AppUser) => void }) {
  const [tab, setTab] = useState<DashboardTab>("overview");
  const d = useDevice();
  const meta = TABS.find((t) => t.id === tab)!;
  const flash = d.pointsFlash && Date.now() - d.pointsFlash.at < 2500 && d.pointsFlash.points > 0 ? d.pointsFlash : null;
  const [, force] = useState(0);
  useEffect(() => {
    if (!d.pointsFlash) return;
    const t = setTimeout(() => force((x) => x + 1), 2600);
    return () => clearTimeout(t);
  }, [d.pointsFlash]);

  return (
    <div className="flex-1 flex flex-col lg:flex-row">
      <Sidebar active={tab} onSelect={setTab} user={user} />
      <main className="flex-1 min-w-0 p-3 sm:p-5 lg:p-6 max-w-[1500px] w-full mx-auto">
        <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-cyber-800">
          <div>
            <div className="text-[11px] font-mono text-slate-400">
              Hi {user.name.split(" ")[0]} · {data ? `FitScore ${data.fitScore.total}` : "loading…"}
            </div>
            <h1 className="text-xl sm:text-2xl font-black font-mono text-white tracking-wide uppercase">{meta.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {flash && (
              <span className="flex items-center gap-1 px-2 py-1 rounded bg-[#39FF14]/15 border border-[#39FF14]/40 text-[#39FF14] text-xs font-mono font-bold animate-pulse">
                <Sparkles className="w-3.5 h-3.5" /> +{flash.points} pts
              </span>
            )}
            <button onClick={reload} className="p-2 rounded bg-cyber-850 hover:bg-cyber-800 border border-cyber-700" title="Refresh" aria-label="Refresh">
              <RefreshCw className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>
        {error && <div className="mb-4 p-3 rounded border border-red-500/50 bg-red-950/40 text-xs font-mono text-red-300">{error}</div>}

        {tab === "overview" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <div className="xl:col-span-8">
              <LiveSessionWidget compact />
            </div>
            <div className="xl:col-span-4">
              <FitScoreWidget data={data} />
            </div>
            <div className="xl:col-span-4">
              <TodayWidget data={data} />
            </div>
            <div className="xl:col-span-4">
              <LeagueWidget data={data} compact />
            </div>
            <div className="xl:col-span-4">
              <QuickActions onGo={setTab} />
            </div>
          </div>
        )}
        {tab === "live" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
              <LiveSessionWidget />
            </div>
            <SimulatorQuick />
          </div>
        )}
        {tab === "analytics" && <FormAnalyticsWidget data={data} />}
        {tab === "calibration" && <CalibrationWidget />}
        {tab === "movement" && <MovementWidget data={data} />}
        {tab === "recovery" && <RecoveryWidget lastExercise={data?.lastExercise ?? null} />}
        {tab === "nutrition" && <NutritionWidget onProfileNeeded={() => setTab("device")} />}
        {tab === "league" && <LeagueWidget data={data} />}
        {tab === "device" && <DeviceSettingsWidget user={user} onUserChange={onUserChange} />}
        {tab === "simulator" && <SimulatorWidget />}
      </main>
    </div>
  );
}

function QuickActions({ onGo }: { onGo: (t: DashboardTab) => void }) {
  const d = useDevice();
  const uncalibrated = d.baselines.length === 0;
  const items: { tab: DashboardTab; title: string; desc: string; hot?: boolean }[] = [
    ...(d.challenge ? [{ tab: "movement" as const, title: `Movement challenge: ${d.challenge.count}/${d.challenge.target}`, desc: "Finish it to clear the reminder", hot: true }] : []),
    ...(uncalibrated ? [{ tab: "calibration" as const, title: "Calibrate your movement", desc: "Personal feedback instead of generic thresholds", hot: true }] : []),
    { tab: "recovery", title: "Start a cooldown", desc: "Eyes-free stretches guided by vibration" },
    { tab: "nutrition", title: "Log a meal", desc: "Protein check with cheap Indian options" },
    { tab: "simulator", title: "No hardware?", desc: "Simulate a set, long sitting or a slouch" },
  ];
  return (
    <section className="cyber-panel rounded-lg p-4 sm:p-5 h-full">
      <h3 className="text-sm font-mono font-bold text-white tracking-wider uppercase pb-3 mb-3 border-b border-cyber-800">Next up</h3>
      <div className="space-y-2">
        {items.map((i) => (
          <button
            key={i.title}
            onClick={() => onGo(i.tab)}
            className={`w-full text-left p-2.5 rounded border text-xs font-mono transition-colors ${i.hot ? "border-orange-400/50 bg-orange-500/10 hover:bg-orange-500/20" : "border-cyber-800 bg-[#0a0f1d] hover:border-cyber-600"}`}
          >
            <div className="text-white font-bold">{i.title}</div>
            <div className="text-[10px] text-slate-400">{i.desc}</div>
          </button>
        ))}
      </div>
    </section>
  );
}

function SimulatorQuick() {
  const d = useDevice();
  const ex = d.exerciseOverride === "auto" ? "squat" : d.exerciseOverride;
  return (
    <section className="cyber-panel rounded-lg p-4 sm:p-5 h-fit">
      <h3 className="text-sm font-mono font-bold text-white tracking-wider uppercase pb-3 mb-3 border-b border-cyber-800">Quick simulate</h3>
      <p className="text-[11px] font-mono text-slate-400 mb-3">
        {d.source === "ble" ? "Your module is connected — just start moving." : `Simulating ${ex}. Pick a different exercise with the selector.`}
      </p>
      <div className="grid grid-cols-1 gap-2">
        {(
          [
            ["Good rep", () => d.simRep(ex, "good")],
            ["Moderate rep", () => d.simRep(ex, "moderate")],
            ["Poor rep", () => d.simRep(ex, "poor")],
            ["10-rep mixed set", () => d.simSet(ex, 10, "mixed")],
            ["Set that gets tired", () => d.simSet(ex, 14, "fatigue")],
          ] as [string, () => void][]
        ).map(([label, fn]) => (
          <button key={label} disabled={d.simRunning} onClick={fn} className="px-3 py-2 rounded border border-cyber-700 bg-cyber-850 hover:bg-cyber-800 text-xs font-mono text-slate-200 text-left disabled:opacity-40">
            {label}
          </button>
        ))}
        {d.simRunning && (
          <button onClick={d.stopSim} className="px-3 py-2 rounded border border-red-500 bg-red-600 text-xs font-mono text-white font-bold">
            Stop
          </button>
        )}
      </div>
    </section>
  );
}
export default DashboardView;
