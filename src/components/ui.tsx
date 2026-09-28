"use client";
// Small shared UI primitives in the FitBuddy "cyber" style.
import React from "react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Panel({ className, children, alert }: { className?: string; children: React.ReactNode; alert?: boolean }) {
  return (
    <section className={cx("cyber-panel rounded-lg p-4 sm:p-5", alert && "!border-red-500/50 shadow-alert", className)}>
      {children}
    </section>
  );
}

export function PanelHeader({
  icon,
  title,
  badge,
  right,
}: {
  icon?: React.ReactNode;
  title: string;
  badge?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-cyber-800">
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="text-[#39FF14] shrink-0">{icon}</span>}
        <h3 className="text-sm font-mono font-bold text-white tracking-wider uppercase truncate">{title}</h3>
        {badge && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/25 whitespace-nowrap">
            {badge}
          </span>
        )}
      </div>
      {right}
    </div>
  );
}

export function Stat({ label, value, unit, sub, tone = "neon" }: { label: string; value: React.ReactNode; unit?: string; sub?: React.ReactNode; tone?: "neon" | "cyan" | "amber" | "red" | "white" | "orange" }) {
  const color = {
    neon: "text-[#39FF14]",
    cyan: "text-cyan-400",
    amber: "text-amber-400",
    red: "text-red-400",
    white: "text-white",
    orange: "text-orange-400",
  }[tone];
  return (
    <div className="p-3 rounded bg-[#0a0f1d] border border-cyber-800 min-w-0">
      <div className="text-[10px] font-mono text-slate-400 uppercase truncate">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={cx("text-2xl font-black font-mono telemetry-num", color)}>{value}</span>
        {unit && <span className="text-xs text-slate-400 font-mono">{unit}</span>}
      </div>
      {sub && <div className="text-[10px] font-mono text-slate-400 mt-1 truncate">{sub}</div>}
    </div>
  );
}

export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cx(
        "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors disabled:opacity-40",
        on ? "bg-[#39FF14]" : "bg-cyber-700"
      )}
    >
      <span className={cx("inline-block h-5 w-5 rounded-full transition-transform", on ? "translate-x-5 bg-black" : "translate-x-0 bg-slate-300")} />
    </button>
  );
}

export const QUALITY_STYLE = {
  good: { text: "text-[#39FF14]", bg: "bg-[#39FF14]", soft: "bg-[#39FF14]/10 border-[#39FF14]/40", label: "Good" },
  moderate: { text: "text-amber-400", bg: "bg-amber-400", soft: "bg-amber-400/10 border-amber-400/40", label: "Moderate" },
  poor: { text: "text-red-400", bg: "bg-red-500", soft: "bg-red-500/10 border-red-500/40", label: "Poor" },
} as const;

export function QualityPill({ q }: { q: "good" | "moderate" | "poor" }) {
  const s = QUALITY_STYLE[q];
  return <span className={cx("text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border", s.soft, s.text)}>{s.label.toUpperCase()}</span>;
}

// Good / moderate / poor as one stacked bar.
export function QualityBar({ good, moderate, poor, className }: { good: number; moderate: number; poor: number; className?: string }) {
  const total = good + moderate + poor;
  if (!total) return <div className={cx("h-2 rounded-full bg-cyber-800", className)} />;
  return (
    <div className={cx("h-2 rounded-full overflow-hidden flex bg-cyber-800", className)}>
      <div className="bg-[#39FF14]" style={{ width: `${(good / total) * 100}%` }} />
      <div className="bg-amber-400" style={{ width: `${(moderate / total) * 100}%` }} />
      <div className="bg-red-500" style={{ width: `${(poor / total) * 100}%` }} />
    </div>
  );
}

export function Ring({ value, size = 96, stroke = 8, color = "#39FF14", children }: { value: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#1e293b" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (v / 100) * c}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function Btn({
  children,
  onClick,
  variant = "ghost",
  disabled,
  className,
  title,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "amber";
  disabled?: boolean;
  className?: string;
  title?: string;
  type?: "button" | "submit";
}) {
  const styles = {
    primary: "bg-[#39FF14] hover:bg-[#32e012] text-black font-bold shadow-neon-sm border-[#39FF14]",
    ghost: "bg-cyber-850 hover:bg-cyber-800 text-slate-200 border-cyber-700",
    danger: "bg-red-600 hover:bg-red-500 text-white font-bold border-red-500",
    amber: "bg-amber-400 hover:bg-amber-300 text-black font-bold border-amber-400",
  }[variant];
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cx("px-3 py-1.5 rounded border text-xs font-mono inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed", styles, className)}
    >
      {children}
    </button>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="p-4 rounded border border-dashed border-cyber-700 text-center text-xs font-mono text-slate-400">{children}</div>;
}

export function timeAgo(iso: string | number | Date) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.max(s, 0)}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
