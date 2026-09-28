"use client";
// Visualises the last haptic pattern: a pulse strip that lights up in the same
// on/off rhythm the vibration motor uses.
import React, { useEffect, useState } from "react";
import { Vibrate } from "lucide-react";
import { HAPTICS, HapticPattern } from "@/lib/haptics";
import { cx } from "./ui";

const COLORS: Partial<Record<HapticPattern, string>> = {
  CONFIRM: "#39FF14",
  CORRECT: "#fbbf24",
  ALERT: "#ef4444",
  SEDENTARY: "#f97316",
  CHALLENGE_DONE: "#39FF14",
  REST: "#a78bfa",
  POSTURE: "#22d3ee",
  STEP: "#22d3ee",
};

export function PulseStrip({ pattern, active, scale = 0.12 }: { pattern: Exclude<HapticPattern, "NONE">; active?: boolean; scale?: number }) {
  const pulses = HAPTICS[pattern].pulses;
  const color = COLORS[pattern] ?? "#39FF14";
  return (
    <div className="flex items-center h-4">
      {pulses.map((ms, i) => (
        <div
          key={i}
          className={cx("h-full rounded-sm", i % 2 === 1 ? "opacity-0" : active ? "animate-pulse" : "opacity-60")}
          style={{ width: Math.max(4, ms * scale), background: i % 2 === 1 ? "transparent" : color, boxShadow: active && i % 2 === 0 ? `0 0 8px ${color}` : undefined }}
        />
      ))}
    </div>
  );
}

export function HapticIndicator({ haptic, compact }: { haptic: { pattern: HapticPattern; at: number } | null; compact?: boolean }) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (!haptic || haptic.pattern === "NONE") return;
    setActive(true);
    const total = HAPTICS[haptic.pattern as Exclude<HapticPattern, "NONE">].pulses.reduce((a, b) => a + b, 0);
    const t = setTimeout(() => setActive(false), Math.max(900, total + 500));
    return () => clearTimeout(t);
  }, [haptic]);

  if (!haptic || haptic.pattern === "NONE") {
    return (
      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
        <Vibrate className="w-4 h-4" />
        <span>Haptic: idle</span>
      </div>
    );
  }
  const p = haptic.pattern as Exclude<HapticPattern, "NONE">;
  const info = HAPTICS[p];
  return (
    <div className={cx("flex items-center gap-3 px-3 py-1.5 rounded border font-mono transition-colors", active ? "bg-white/5 border-white/20" : "border-cyber-800")}>
      <Vibrate className={cx("w-4 h-4 shrink-0", active ? "animate-bounce" : "")} style={{ color: COLORS[p] }} />
      <div className="min-w-0">
        <div className="text-[11px] font-bold text-white truncate">{info.label}</div>
        {!compact && <div className="text-[10px] text-slate-400 truncate">{info.meaning}</div>}
      </div>
      <PulseStrip pattern={p} active={active} />
    </div>
  );
}
