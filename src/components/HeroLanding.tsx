"use client";

import Image from "next/image";
import React from "react";
import {
  ArrowDown,
  ArrowRight,
  Bluetooth,
  Check,
  Cpu,
  ScanSearch,
  ShieldCheck,
  Target,
  Vibrate,
  Zap,
} from "lucide-react";

type HeroLandingProps = {
  onStart: () => void;
};

const FEATURES = [
  {
    number: "01",
    title: "Real-time form correction",
    description:
      "Detect movement deviations during an exercise and deliver an immediate haptic cue.",
    icon: Target,
  },
  {
    number: "02",
    title: "Personal calibration",
    description:
      "Learn the user's movement range, tempo and stability instead of relying only on generic thresholds.",
    icon: ScanSearch,
  },
  {
    number: "03",
    title: "Rep quality",
    description:
      "Evaluate movement quality instead of simply counting repetitions.",
    icon: Zap,
  },
  {
    number: "04",
    title: "Exercise recognition",
    description:
      "Recognise supported exercises from motion data without requiring manual exercise selection.",
    icon: Cpu,
  },
  {
    number: "05",
    title: "Haptic feedback",
    description:
      "Translate movement insights into simple physical cues that can be understood without a screen.",
    icon: Vibrate,
  },
  {
    number: "06",
    title: "Activity & posture feedback",
    description:
      "Support healthier movement habits through posture awareness and activity reminders.",
    icon: Target,
  },
];

const HARDWARE = [
  {
    name: "BNO085",
    description: "9-axis motion sensing",
  },
  {
    name: "ESP32",
    description: "Edge processing",
  },
  {
    name: "Haptic Motor",
    description: "Physical feedback",
  },
  {
    name: "BLE",
    description: "Wireless synchronisation",
  },
];

export function HeroLanding({ onStart }: HeroLandingProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050807] text-white">
      {/* ========================================================= */}
      {/* NAVIGATION */}
      {/* ========================================================= */}

      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-[#050807]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-5 md:px-8">
          {/* Logo */}
          <a href="#" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#b6ff24]">
              <span className="text-sm font-black text-black">F</span>
            </div>

            <span className="text-sm font-bold tracking-[0.2em]">
              FITBUDDY
            </span>
          </a>

          {/* Desktop navigation */}
          <div className="hidden items-center gap-8 text-[11px] uppercase tracking-[0.16em] text-white/50 md:flex">
            <a
              href="#product"
              className="transition hover:text-white"
            >
              Product
            </a>

            <a
              href="#technology"
              className="transition hover:text-white"
            >
              Technology
            </a>

            <a
              href="#hardware"
              className="transition hover:text-white"
            >
              Hardware
            </a>

            <a
              href="#privacy"
              className="transition hover:text-white"
            >
              Privacy
            </a>
          </div>

          <button
            onClick={onStart}
            className="rounded-full bg-[#b6ff24] px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-black transition hover:scale-105"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* ========================================================= */}
      {/* 01 — HERO */}
      {/* ========================================================= */}

      <section
        id="product"
        className="relative min-h-screen border-b border-white/10"
      >
        {/* Background */}
        <div className="absolute inset-0">
          <Image
            src="/images/gym.jpeg"
            alt="Fitness training"
            fill
            priority
            className="object-cover opacity-25"
            sizes="100vw"
          />

          <div className="absolute inset-0 bg-gradient-to-b from-[#050807]/70 via-[#050807]/80 to-[#050807]" />

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_48%,rgba(182,255,36,0.14),transparent_30%)]" />
        </div>

        <div className="relative mx-auto flex min-h-screen max-w-[1500px] items-center px-5 pb-16 pt-28 md:px-8">
          <div className="grid w-full items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            {/* LEFT */}
            <div>
              <div className="mb-8 flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-[#b6ff24] shadow-[0_0_18px_#b6ff24]" />

                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#b6ff24]">
                  AI-POWERED • SCREENLESS • HAPTIC
                </span>
              </div>

              <h1 className="text-[clamp(4rem,9vw,9rem)] font-black leading-[0.82] tracking-[-0.075em]">
                DON'T JUST
                <br />
                <span className="text-white/35">TRACK.</span>
                <br />
                <span className="text-[#b6ff24]">CORRECT.</span>
              </h1>

              <p className="mt-10 max-w-xl text-lg leading-relaxed text-white/60 md:text-xl">
                FitBuddy is a screenless fitness coach that understands
                movement and provides real-time physical feedback while you
                exercise.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <button
                  onClick={onStart}
                  className="group flex items-center gap-4 rounded-full bg-white px-7 py-4 text-xs font-black uppercase tracking-wider text-black transition hover:bg-[#b6ff24]"
                >
                  Explore FitBuddy

                  <ArrowRight
                    size={17}
                    className="transition group-hover:translate-x-1"
                  />
                </button>

                <a
                  href="#technology"
                  className="flex items-center gap-3 rounded-full border border-white/15 px-7 py-4 text-xs font-bold uppercase tracking-wider text-white/70 transition hover:border-white/30 hover:text-white"
                >
                  How it works
                </a>
              </div>
            </div>

            {/* 3D MODEL PLACEHOLDER */}
            <div className="relative mx-auto flex h-[500px] w-full max-w-[520px] items-center justify-center">
              {/* Glow */}
              <div className="absolute h-72 w-72 rounded-full bg-[#b6ff24]/10 blur-[100px]" />

              {/* Device */}
              <div className="relative h-[330px] w-[225px] rotate-[-9deg] rounded-[3rem] border border-white/25 bg-gradient-to-br from-zinc-700 via-zinc-900 to-black shadow-[0_50px_120px_rgba(0,0,0,0.8),0_0_80px_rgba(182,255,36,0.08)]">
                {/* Inner face */}
                <div className="absolute inset-4 rounded-[2.4rem] border border-white/10 bg-gradient-to-br from-[#1d201f] to-[#060706]" />

                {/* Texture */}
                <div className="absolute inset-8 rounded-[2rem] opacity-30 [background-image:repeating-linear-gradient(135deg,transparent_0px,transparent_5px,rgba(255,255,255,0.08)_6px,transparent_7px)]" />

                {/* Green LED */}
                <div className="absolute right-7 top-20 h-24 w-2 rounded-full bg-[#b6ff24] shadow-[0_0_30px_#b6ff24]" />

                {/* Side button */}
                <div className="absolute right-[-8px] top-36 h-12 w-3 rounded-r-md border border-white/20 bg-zinc-700" />

                {/* Bottom port */}
                <div className="absolute bottom-3 left-1/2 h-2 w-12 -translate-x-1/2 rounded-full bg-black" />

                {/* Branding */}
                <div className="absolute bottom-10 left-8 font-black tracking-widest text-white/50">
                  FITBUDDY
                </div>
              </div>

              {/* Label */}
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-black/40 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.2em] text-white/35 backdrop-blur-md">
                3D MODEL / COMING SOON
              </div>
            </div>
          </div>

          <div className="absolute bottom-7 left-5 flex items-center gap-3 text-white/30 md:left-8">
            <ArrowDown size={14} />

            <span className="font-mono text-[9px] uppercase tracking-[0.25em]">
              Scroll to discover
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 02 — PROBLEM */}
      {/* ========================================================= */}

      <section className="border-b border-white/10 bg-[#070a09]">
        <div className="mx-auto grid max-w-[1500px] gap-16 px-5 py-28 md:px-8 md:py-40 lg:grid-cols-2 lg:gap-24">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#b6ff24]">
              / THE PROBLEM
            </span>

            <h2 className="mt-8 text-5xl font-black leading-[0.88] tracking-[-0.055em] md:text-7xl">
              TRACKING
              <br />
              TELLS YOU
              <br />
              <span className="text-white/30">WHAT HAPPENED.</span>
            </h2>
          </div>

          <div className="flex flex-col justify-end">
            <p className="text-xl leading-relaxed text-white/60 md:text-2xl">
              Most fitness devices are designed to measure activity and
              present information after the movement has happened.
            </p>

            <p className="mt-7 text-base leading-relaxed text-white/35">
              FitBuddy focuses on the moment when feedback can actually help:
              while you are moving.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 03 — HOW IT WORKS */}
      {/* ========================================================= */}

      <section className="border-b border-white/10">
        <div className="mx-auto max-w-[1500px] px-5 py-28 md:px-8 md:py-40">
          <div className="mb-20">
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#b6ff24]">
              / HOW IT WORKS
            </span>

            <h2 className="mt-7 max-w-5xl text-5xl font-black leading-[0.88] tracking-[-0.055em] md:text-8xl">
              SENSE.
              <br />
              UNDERSTAND.
              <br />
              <span className="text-[#b6ff24]">CORRECT.</span>
            </h2>
          </div>

          <div className="grid border-l border-t border-white/10 md:grid-cols-4">
            {[
              {
                number: "01",
                title: "Sense",
                text: "Motion data is captured using the onboard IMU.",
              },
              {
                number: "02",
                title: "Understand",
                text: "Edge processing interprets the movement pattern.",
              },
              {
                number: "03",
                title: "Correct",
                text: "The device delivers a physical haptic cue.",
              },
              {
                number: "04",
                title: "Improve",
                text: "Results can be synchronised for longer-term insights.",
              },
            ].map((step) => (
              <div
                key={step.number}
                className="min-h-[290px] border-b border-r border-white/10 p-7 transition hover:bg-white/[0.025] md:p-9"
              >
                <span className="font-mono text-xs text-[#b6ff24]">
                  {step.number}
                </span>

                <h3 className="mt-20 text-3xl font-black">
                  {step.title}
                </h3>

                <p className="mt-4 text-sm leading-relaxed text-white/40">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* VISUAL BREAK */}
      {/* ========================================================= */}

      <section className="relative h-[55vh] min-h-[450px] overflow-hidden">
        <Image
          src="/images/running.jpeg"
          alt="Athlete running"
          fill
          className="object-cover"
          sizes="100vw"
        />

        <div className="absolute inset-0 bg-black/50" />

        <div className="absolute inset-0 bg-gradient-to-t from-[#050807] via-transparent to-black/20" />

        <div className="relative mx-auto flex h-full max-w-[1500px] items-end px-5 pb-12 md:px-8 md:pb-16">
          <p className="max-w-4xl text-4xl font-black leading-[0.9] tracking-[-0.04em] md:text-7xl">
            MOVEMENT
            <br />
            BECOMES
            <br />
            <span className="text-[#b6ff24]">INTELLIGENCE.</span>
          </p>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 04 — CORE FEATURES */}
      {/* ========================================================= */}

      <section className="border-b border-white/10 bg-[#080b0a]">
        <div className="mx-auto max-w-[1500px] px-5 py-28 md:px-8 md:py-40">
          <div className="mb-20">
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#b6ff24]">
              / CORE FEATURES
            </span>

            <h2 className="mt-7 max-w-5xl text-5xl font-black leading-[0.88] tracking-[-0.055em] md:text-8xl">
              BUILT AROUND
              <br />
              <span className="text-white/30">YOUR MOVEMENT.</span>
            </h2>
          </div>

          <div className="grid border-l border-t border-white/10 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.number}
                  className="group min-h-[310px] border-b border-r border-white/10 p-7 transition duration-300 hover:bg-[#b6ff24] hover:text-black md:p-9"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-xs text-[#b6ff24] group-hover:text-black">
                      {feature.number}
                    </span>

                    <Icon
                      size={21}
                      strokeWidth={1.5}
                      className="text-white/30 transition group-hover:text-black"
                    />
                  </div>

                  <h3 className="mt-20 text-2xl font-black leading-tight md:text-3xl">
                    {feature.title}
                  </h3>

                  <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/40 group-hover:text-black/70">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 05 — SCREENLESS EXPERIENCE */}
      {/* ========================================================= */}

      <section className="border-b border-white/10">
        <div className="grid min-h-[700px] lg:grid-cols-2">
          {/* Image */}
          <div className="relative min-h-[500px]">
            <Image
              src="/images/workout.jpeg"
              alt="Fitness workout"
              fill
              className="object-cover"
              sizes="50vw"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-[#050807]" />

            <div className="absolute bottom-7 left-7 font-mono text-[9px] uppercase tracking-[0.25em] text-white/40">
              SCREENLESS INTERACTION
            </div>
          </div>

          {/* Text */}
          <div className="flex flex-col justify-center bg-[#050807] px-7 py-24 md:px-16 lg:px-20">
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#b6ff24]">
              / SCREENLESS EXPERIENCE
            </span>

            <h2 className="mt-7 text-5xl font-black leading-[0.88] tracking-[-0.055em] md:text-7xl">
              FEEDBACK
              <br />
              YOU
              <br />
              <span className="text-[#b6ff24]">CAN FEEL.</span>
            </h2>

            <p className="mt-10 max-w-xl text-lg leading-relaxed text-white/50">
              FitBuddy is designed to keep your attention on the movement,
              not on another screen.
            </p>

            {/* Haptic signals */}
            <div className="mt-12 space-y-3">
              {[
                ["SHORT PULSE", "Attention"],
                ["DOUBLE PULSE", "Correction"],
                ["LONG PULSE", "Recovery / break"],
              ].map(([signal, meaning]) => (
                <div
                  key={signal}
                  className="flex items-center justify-between border-b border-white/10 pb-4"
                >
                  <span className="font-mono text-xs text-white">
                    {signal}
                  </span>

                  <span className="text-xs text-white/35">{meaning}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 06 — HARDWARE */}
      {/* ========================================================= */}

      <section id="hardware" className="border-b border-white/10 bg-[#070a09]">
        <div className="mx-auto max-w-[1500px] px-5 py-28 md:px-8 md:py-40">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-end">
            <div>
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#b6ff24]">
                / HARDWARE
              </span>

              <h2 className="mt-7 text-5xl font-black leading-[0.88] tracking-[-0.055em] md:text-8xl">
                SMALL
                <br />
                DEVICE.
                <br />
                <span className="text-white/30">REAL HARDWARE.</span>
              </h2>
            </div>

            <p className="max-w-xl text-lg leading-relaxed text-white/45">
              FitBuddy combines motion sensing, edge processing, haptic
              feedback and wireless connectivity inside a compact module.
            </p>
          </div>

          {/* Hardware visual */}
          <div className="relative mt-20 min-h-[620px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#050706]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(182,255,36,0.14),transparent_32%)]" />

            {/* Temporary product visual */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-[350px] w-[235px] rotate-[-8deg] rounded-[3rem] border border-white/25 bg-gradient-to-br from-zinc-700 via-zinc-900 to-black shadow-[0_50px_120px_rgba(0,0,0,0.8),0_0_80px_rgba(182,255,36,0.08)]">
                <div className="absolute inset-4 rounded-[2.4rem] border border-white/10 bg-gradient-to-br from-[#1c201e] to-[#050605]" />

                <div className="absolute inset-9 rounded-[2rem] opacity-25 [background-image:repeating-linear-gradient(135deg,transparent_0px,transparent_5px,rgba(255,255,255,0.1)_6px,transparent_7px)]" />

                <div className="absolute right-7 top-20 h-28 w-2 rounded-full bg-[#b6ff24] shadow-[0_0_35px_#b6ff24]" />

                <div className="absolute right-[-7px] top-40 h-12 w-3 rounded-r-md border border-white/20 bg-zinc-700" />

                <div className="absolute bottom-3 left-1/2 h-2 w-12 -translate-x-1/2 rounded-full bg-black" />

                <div className="absolute bottom-10 left-8 font-black tracking-widest text-white/45">
                  FITBUDDY
                </div>
              </div>
            </div>

            <div className="absolute left-7 top-7">
              <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-white/30">
                PRODUCT CONCEPT
              </div>

              <div className="mt-2 text-xs text-white/20">
                Interactive 3D model coming soon
              </div>
            </div>

            {/* Hardware specifications */}
            <div className="absolute bottom-7 left-5 right-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {HARDWARE.map((item) => (
                <div
                  key={item.name}
                  className="rounded-xl border border-white/10 bg-black/50 p-5 backdrop-blur-md"
                >
                  <div className="font-mono text-xs font-bold text-[#b6ff24]">
                    {item.name}
                  </div>

                  <div className="mt-2 text-xs text-white/35">
                    {item.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 07 — TECHNOLOGY */}
      {/* ========================================================= */}

      <section id="technology" className="border-b border-white/10">
        <div className="mx-auto max-w-[1500px] px-5 py-28 md:px-8 md:py-40">
          <div className="grid gap-20 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#b6ff24]">
                / TECHNOLOGY
              </span>

              <h2 className="mt-7 text-5xl font-black leading-[0.88] tracking-[-0.055em] md:text-8xl">
                MOTION
                <br />
                IN.
                <br />
                <span className="text-[#b6ff24]">FEEDBACK OUT.</span>
              </h2>

              <p className="mt-10 max-w-xl text-lg leading-relaxed text-white/45">
                The device captures movement, processes useful signals locally,
                generates a haptic response and synchronises selected results
                through Bluetooth.
              </p>
            </div>

            {/* Pipeline */}
            <div className="space-y-3">
              {[
                {
                  number: "01",
                  title: "BNO085 IMU",
                  subtitle: "Motion sensing",
                },
                {
                  number: "02",
                  title: "ESP32",
                  subtitle: "Edge processing",
                },
                {
                  number: "03",
                  title: "HAPTIC MOTOR",
                  subtitle: "Physical feedback",
                },
                {
                  number: "04",
                  title: "BLE",
                  subtitle: "Results synchronisation",
                },
              ].map((item) => (
                <div
                  key={item.number}
                  className="group flex items-center gap-5 border border-white/10 p-5 transition hover:border-[#b6ff24]/30 hover:bg-[#b6ff24]/5"
                >
                  <span className="font-mono text-xs text-[#b6ff24]">
                    {item.number}
                  </span>

                  <div className="h-px flex-1 bg-white/10 group-hover:bg-[#b6ff24]/20" />

                  <div className="text-right">
                    <div className="font-mono text-xs text-white">
                      {item.title}
                    </div>

                    <div className="mt-1 text-[9px] uppercase tracking-wider text-white/30">
                      {item.subtitle}
                    </div>
                  </div>
                </div>
              ))}

              <div className="mt-8 flex items-center gap-4 border border-[#b6ff24]/20 bg-[#b6ff24]/5 p-5">
                <Cpu size={20} className="text-[#b6ff24]" />

                <div>
                  <div className="text-sm font-bold">
                    Edge-first architecture
                  </div>

                  <div className="mt-1 text-xs text-white/35">
                    Process movement data before synchronising results.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 08 — PRIVACY */}
      {/* ========================================================= */}

      <section id="privacy" className="border-b border-white/10 bg-[#080b0a]">
        <div className="mx-auto grid max-w-[1500px] gap-16 px-5 py-28 md:px-8 md:py-40 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#b6ff24]">
              / PRIVACY
            </span>

            <h2 className="mt-7 text-5xl font-black leading-[0.88] tracking-[-0.055em] md:text-8xl">
              PROCESS
              <br />
              FIRST.
              <br />
              <span className="text-white/30">TRANSMIT LATER.</span>
            </h2>
          </div>

          <div>
            <div className="flex items-start gap-5 border border-white/10 bg-black/20 p-7 md:p-9">
              <ShieldCheck
                size={30}
                strokeWidth={1.5}
                className="shrink-0 text-[#b6ff24]"
              />

              <div>
                <h3 className="text-xl font-black">
                  Designed with edge processing in mind.
                </h3>

                <p className="mt-4 text-sm leading-relaxed text-white/40">
                  FitBuddy is designed to perform movement processing locally
                  where practical, while the phone can receive the useful
                  results needed for tracking and analysis.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-4 text-xs text-white/30">
              <Bluetooth size={16} />
              <span>
                Bluetooth is used for synchronisation between the device and
                connected application.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 09 — COST / ACCESS */}
      {/* ========================================================= */}

      <section className="border-b border-black/10 bg-[#b6ff24] text-black">
        <div className="mx-auto max-w-[1500px] px-5 py-24 md:px-8 md:py-32">
          <div className="grid gap-12 md:grid-cols-2 md:items-end">
            <div>
              <span className="font-mono text-xs uppercase tracking-[0.25em]">
                / ACCESSIBLE HARDWARE
              </span>

              <h2 className="mt-6 text-5xl font-black leading-[0.85] tracking-[-0.06em] md:text-8xl">
                BUILT TO
                <br />
                BE
                <br />
                ACCESSIBLE.
              </h2>
            </div>

            <div>
              <div className="text-7xl font-black tracking-[-0.06em] md:text-9xl">
                ~₹500
              </div>

              <p className="mt-5 max-w-md text-sm leading-relaxed text-black/60">
                Target prototype cost. Final cost depends on component
                selection, enclosure and manufacturing volume.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 10 — FINAL CTA */}
      {/* ========================================================= */}

      <section className="relative overflow-hidden bg-[#050807]">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#b6ff24]/10 blur-[130px]" />

        <div className="relative mx-auto max-w-[1500px] px-5 py-32 text-center md:px-8 md:py-48">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-[#b6ff24]">
            / FITBUDDY
          </span>

          <h2 className="mx-auto mt-8 max-w-6xl text-6xl font-black leading-[0.82] tracking-[-0.07em] md:text-[9rem]">
            MOVE
            <br />
            <span className="text-[#b6ff24]">BETTER.</span>
          </h2>

          <p className="mx-auto mt-10 max-w-xl text-lg leading-relaxed text-white/40">
            A screenless fitness companion designed to help you improve your
            movement while you move.
          </p>

          <button
            onClick={onStart}
            className="group mx-auto mt-12 flex items-center gap-4 rounded-full bg-[#b6ff24] px-8 py-5 text-xs font-black uppercase tracking-wider text-black transition hover:scale-105"
          >
            Get Started

            <ArrowRight
              size={17}
              className="transition group-hover:translate-x-1"
            />
          </button>
        </div>
      </section>

      {/* ========================================================= */}
      {/* FOOTER */}
      {/* ========================================================= */}

      <footer className="border-t border-white/10 bg-[#050807]">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-6 px-5 py-8 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#b6ff24]">
              <span className="text-xs font-black text-black">F</span>
            </div>

            <span className="font-mono text-xs tracking-[0.2em]">
              FITBUDDY
            </span>
          </div>

          <div className="flex flex-wrap gap-5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/25">
            <span>ESP32</span>
            <span>BNO085</span>
            <span>BLE</span>
            <span>EDGE AI</span>
            <span>HAPTICS</span>
          </div>

          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/20">
            SIH 2026
          </span>
        </div>
      </footer>
    </main>
  );
}