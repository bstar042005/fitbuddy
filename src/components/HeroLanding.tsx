"use client";
import React from "react";
import {
  ArrowRight,
  Vibrate,
  Target,
  ScanSearch,
  Armchair,
  Coffee,
  BookOpen,
  HeartPulse,
  Crosshair,
  Trophy,
  Salad,
  ShieldCheck,
  Cpu,
  Bluetooth,
  EyeOff,
} from "lucide-react";
import { HAPTICS, HapticPattern } from "@/lib/haptics";
import { PulseStrip } from "./HapticIndicator";

const FEATURES = [
  { icon: Vibrate, title: "Real-time form correction", text: "Every rep is scored on the device against your own movement; a vibration tells you to correct it — no screen needed." },
  { icon: Target, title: "Personal calibration", text: "A short calibration set learns your range of motion, tempo and stability, so feedback isn't based on one-size-fits-all thresholds." },
  { icon: Crosshair, title: "Rep quality & form score", text: "Not just a counter: 8 good, 1 moderate, 1 poor → 84% form score, tracked over time." },
  { icon: ScanSearch, title: "Automatic exercise recognition", text: "Squats, lunges, push-ups, curls and jumping jacks are recognised from motion — no menus." },
  { icon: Armchair, title: "Smart anti-sedentary", text: "Sat too long? A long pulse, then a small challenge. The IMU checks you actually did it — it can't just be dismissed." },
  { icon: Coffee, title: "Fatigue detection", text: "Slowing reps, shrinking range and rising sway flag possible fatigue and suggest a rest." },
  { icon: BookOpen, title: "Posture & study mode", text: "Gentle nudges when you slouch during study, laptop or library sessions, plus movement breaks." },
  { icon: HeartPulse, title: "Haptic recovery mode", text: "Eyes-free cooldowns: the module taps you when it's time for the next stretch." },
  { icon: Salad, title: "Nutrition engine", text: "Log hostel meals like “roti, dal, rice, curd” and get affordable Indian protein options sized to your activity." },
  { icon: Trophy, title: "Campus FitScore league", text: "Hostel vs hostel, class vs class — ranked on consistency and improvement, not just natural athleticism." },
];

const PIPELINE = ["BNO085 IMU", "ESP32 edge scoring", "Haptic cue (ms)", "BLE → results only", "Dashboard"];

export function HeroLanding({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-25">
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#39FF14]/10 rounded-full blur-[130px]" />
      </div>

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-20">
        <div className="flex justify-center mb-6">
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#131e36] border border-[#39FF14]/30 text-xs font-mono text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#39FF14] animate-ping" />
            <span className="text-[#39FF14] font-bold">Smart India Hackathon 2026</span>
            <span>· PS 26213 · Hardware</span>
          </span>
        </div>

        <section className="text-center max-w-4xl mx-auto mb-14">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase leading-[1.08]">
            Trackers tell you what you did.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#39FF14] via-emerald-400 to-cyan-400">FitBuddy helps you do it better.</span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            An ultra-low-cost, <strong className="text-white">screenless, haptic-first</strong> fitness coach. A 9-axis IMU and on-device AI
            understand how you move, spot form deviations and correct you <strong className="text-[#39FF14]">through vibration</strong> — while
            you're mid-rep, without looking at a phone, and without a camera.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              onClick={onStart}
              className="px-6 py-3 text-sm font-bold font-mono uppercase tracking-wider text-black bg-[#39FF14] hover:bg-[#32e012] rounded shadow-neon flex items-center gap-2"
            >
              Open the dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2 text-[11px] font-mono">
            {["Sense", "Understand", "Correct", "Improve"].map((s, i) => (
              <React.Fragment key={s}>
                <span className="px-3 py-1 rounded border border-cyber-700 bg-[#131e36] text-white">{s}</span>
                {i < 3 && <span className="text-slate-500 self-center">→</span>}
              </React.Fragment>
            ))}
          </div>
        </section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-14">
          {[
            { icon: EyeOff, title: "Screenless", text: "Nothing to look at mid-workout." },
            { icon: Vibrate, title: "Haptic-first", text: "The device talks to you physically." },
            { icon: Cpu, title: "Edge intelligence", text: "Scoring & feedback happen on the ESP32." },
            { icon: ShieldCheck, title: "Private by design", text: "No camera. Raw motion never leaves the device." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="cyber-panel rounded-lg p-4">
              <Icon className="w-5 h-5 text-[#39FF14] mb-2" />
              <div className="text-sm font-mono font-bold text-white">{title}</div>
              <div className="text-xs font-mono text-slate-400 mt-1">{text}</div>
            </div>
          ))}
        </section>

        <section className="mb-14">
          <h2 className="text-lg font-mono font-bold text-white uppercase mb-4">What it does</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="p-4 rounded-lg bg-[#0a0f1d] border border-cyber-800 hover:border-cyber-600 transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className="w-4 h-4 text-[#39FF14]" />
                  <span className="text-sm font-mono font-bold text-white">{title}</span>
                </div>
                <p className="text-xs font-mono text-slate-400 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-4 mb-14">
          <div className="cyber-panel rounded-lg p-5">
            <h2 className="text-sm font-mono font-bold text-white uppercase mb-1 flex items-center gap-2">
              <Bluetooth className="w-4 h-4 text-cyan-400" /> Process first, transmit later
            </h2>
            <p className="text-xs font-mono text-slate-400 mb-4">Lower power, instant feedback, works offline, better privacy.</p>
            <div className="flex flex-col gap-2">
              {PIPELINE.map((p, i) => (
                <div key={p} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#39FF14]/15 border border-[#39FF14]/40 text-[#39FF14] text-[11px] font-mono flex items-center justify-center">{i + 1}</span>
                  <span className="text-xs font-mono text-slate-200">{p}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 text-[11px] font-mono text-slate-500">
              Hardware: ESP32 · BNO085 9-axis IMU (sensor fusion) · coin vibration motor · Li-ion battery · universal mount (waist, wrist, phone case).
            </div>
          </div>
          <div className="cyber-panel rounded-lg p-5">
            <h2 className="text-sm font-mono font-bold text-white uppercase mb-1 flex items-center gap-2">
              <Vibrate className="w-4 h-4 text-[#39FF14]" /> The haptic language
            </h2>
            <p className="text-xs font-mono text-slate-400 mb-4">Different rhythms mean different things — learnable in minutes.</p>
            <div className="space-y-2">
              {(Object.keys(HAPTICS) as Exclude<HapticPattern, "NONE">[]).map((p) => (
                <div key={p} className="flex items-center gap-3">
                  <div className="w-28 shrink-0">
                    <PulseStrip pattern={p} />
                  </div>
                  <span className="text-xs font-mono text-slate-300">{HAPTICS[p].meaning}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="text-center">
          <p className="text-base font-mono text-slate-300">
            Not <span className="text-slate-500">“how many steps did you take?”</span> — but <span className="text-[#39FF14] font-bold">“how well did you move?”</span>
          </p>
          <button onClick={onStart} className="mt-5 px-5 py-2.5 text-xs font-bold font-mono uppercase text-black bg-[#39FF14] hover:bg-[#32e012] rounded shadow-neon inline-flex items-center gap-2">
            Try it — no hardware needed <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      </main>
    </div>
  );
}
export default HeroLanding;
