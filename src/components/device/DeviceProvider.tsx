"use client";
// One pipeline for everything the wearable says, whether it comes from the real
// ESP32 over Web Bluetooth or from the built-in simulator:
//   device message → (edge-processed rep / event) → API → live UI state
// Components read live state from this context instead of polling.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/client";
import { FitBuddyBle, DeviceMessage, bleSupported } from "@/lib/ble";
import { EXERCISES, ExerciseId, isExerciseId, Baseline, CHALLENGES } from "@/lib/exercises";
import { RepFeatures, FatigueResult } from "@/lib/formEngine";
import { HapticPattern } from "@/lib/haptics";
import { simulateRep, repWaveform, SimQuality } from "@/lib/deviceSim";
import type { CalibrationRow, DeviceConfig, RepView, SessionSummary, HapticFlash } from "@/lib/types";

type Source = "none" | "ble" | "sim";

export interface ChallengeState {
  type: string;
  name: string;
  target: number;
  count: number;
  startedAt: number;
}

interface DeviceContextValue {
  // connection
  source: Source;
  bleAvailable: boolean;
  bleState: "idle" | "connecting" | "connected" | "error";
  bleError: string | null;
  deviceName: string | null;
  firmware: string | null;
  battery: number | null;
  connectBle: () => Promise<void>;
  disconnectBle: () => void;
  sendCommand: (cmd: Record<string, unknown>) => void;
  // settings
  config: DeviceConfig | null;
  baselines: CalibrationRow[];
  updateConfig: (patch: Partial<DeviceConfig>) => Promise<void>;
  refreshConfig: () => Promise<void>;
  exerciseOverride: ExerciseId | "auto";
  setExerciseOverride: (x: ExerciseId | "auto") => void;
  // live state
  reps: RepView[];
  activeSession: SessionSummary | null;
  fatigue: FatigueResult | null;
  trace: { i: number; angle: number; sway: number }[];
  haptic: HapticFlash | null;
  flashHaptic: (p: HapticPattern) => void;
  sittingAlertAt: number | null;
  challenge: ChallengeState | null;
  lastPostureAlertAt: number | null;
  lastError: string | null;
  pointsFlash: { points: number; at: number } | null;
  // calibration
  calibration: { exercise: ExerciseId; reps: RepFeatures[] } | null;
  startCalibration: (ex: ExerciseId) => void;
  cancelCalibration: () => void;
  saveCalibration: () => Promise<{ pointsEarned: number } | null>;
  // simulator
  simRep: (ex: ExerciseId, quality: SimQuality, fatigue?: number) => Promise<void>;
  simSet: (ex: ExerciseId, reps: number, mode: "mixed" | "good" | "fatigue") => Promise<void>;
  stopSim: () => void;
  simRunning: boolean;
  simSitting: () => Promise<void>;
  simChallengeStep: (n?: number) => Promise<void>;
  simGiveUpChallenge: () => Promise<void>;
  simSlouch: (deg?: number) => Promise<void>;
  // reporting
  reportRecoveryDone: (detail: Record<string, unknown>) => Promise<void>;
}

const Ctx = createContext<DeviceContextValue | null>(null);

export function useDevice() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDevice must be used inside <DeviceProvider>");
  return v;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const TRACE_MAX = 160;

export function DeviceProvider({ children, onActivity }: { children: React.ReactNode; onActivity?: () => void }) {
  const [source, setSource] = useState<Source>("sim");
  const [bleState, setBleState] = useState<DeviceContextValue["bleState"]>("idle");
  const [bleError, setBleError] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [firmware, setFirmware] = useState<string | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const [config, setConfig] = useState<DeviceConfig | null>(null);
  const [baselines, setBaselines] = useState<CalibrationRow[]>([]);
  const [exerciseOverride, setExerciseOverrideState] = useState<ExerciseId | "auto">("auto");
  const [reps, setReps] = useState<RepView[]>([]);
  const [activeSession, setActiveSession] = useState<SessionSummary | null>(null);
  const [fatigue, setFatigue] = useState<FatigueResult | null>(null);
  const [trace, setTrace] = useState<{ i: number; angle: number; sway: number }[]>([]);
  const [haptic, setHaptic] = useState<HapticFlash | null>(null);
  const [sittingAlertAt, setSittingAlertAt] = useState<number | null>(null);
  const [challenge, setChallenge] = useState<ChallengeState | null>(null);
  const [lastPostureAlertAt, setLastPostureAlertAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [pointsFlash, setPointsFlash] = useState<{ points: number; at: number } | null>(null);
  const [calibration, setCalibration] = useState<{ exercise: ExerciseId; reps: RepFeatures[] } | null>(null);
  const [simRunning, setSimRunning] = useState(false);

  const bleRef = useRef<FitBuddyBle | null>(null);
  const traceIdx = useRef(0);
  const simStop = useRef(false);
  // refs mirror state for use inside async device callbacks
  const calibrationRef = useRef(calibration);
  calibrationRef.current = calibration;
  const challengeRef = useRef(challenge);
  challengeRef.current = challenge;
  const configRef = useRef(config);
  configRef.current = config;
  const baselinesRef = useRef(baselines);
  baselinesRef.current = baselines;
  const onActivityRef = useRef(onActivity);
  onActivityRef.current = onActivity;

  const flashHaptic = useCallback((pattern: HapticPattern) => {
    if (pattern === "NONE") return;
    setHaptic({ pattern, at: Date.now() });
  }, []);

  const sendCommand = useCallback((cmd: Record<string, unknown>) => {
    bleRef.current?.send(cmd);
  }, []);

  const lastTraceAt = useRef(0);
  const pushTrace = useCallback((points: { angle: number; sway: number }[], idle = false) => {
    if (!idle) lastTraceAt.current = Date.now();
    setTrace((prev) => {
      const next = [...prev, ...points.map((p) => ({ i: traceIdx.current++, ...p }))];
      return next.slice(-TRACE_MAX);
    });
  }, []);

  const notify = useCallback(() => onActivityRef.current?.(), []);

  // ---------------------------------------------------------------- config
  const refreshConfig = useCallback(async () => {
    try {
      const d = await api<{ config: DeviceConfig; baselines: CalibrationRow[] }>("/api/device/config");
      setConfig(d.config);
      setBaselines(d.baselines);
    } catch (e: any) {
      setLastError(e.message);
    }
  }, []);

  const pushConfigToDevice = useCallback((c: DeviceConfig | null, override: ExerciseId | "auto", bases: CalibrationRow[]) => {
    if (!bleRef.current || !c) return;
    bleRef.current.send({
      c: "cfg",
      mode: c.mode[0], // W / S / R
      sed: c.sedentaryAlertMins,
      pos: c.postureAlertSecs,
      strict: c.strictFormMode ? 1 : 0,
      hap: c.hapticFeedback ? 1 : 0,
      int: c.hapticIntensity,
      conf: c.confirmPulses ? 1 : 0,
      chl: c.challengeType,
      tgt: c.challengeTarget,
      ex: override,
    });
    bases.forEach((b) =>
      bleRef.current?.send({ c: "base", ex: b.exercise, rom: b.romDeg, rs: b.romStd, tmp: b.tempoMs, sw: b.swayDeg, ss: b.swayStd, vel: b.peakVel })
    );
  }, []);

  const updateConfig = useCallback(
    async (patch: Partial<DeviceConfig>) => {
      setConfig((c) => (c ? { ...c, ...patch } : c)); // optimistic
      try {
        const d = await api<{ config: DeviceConfig }>("/api/device/config", { body: patch });
        setConfig(d.config);
        pushConfigToDevice(d.config, exerciseOverride, baselinesRef.current);
      } catch (e: any) {
        setLastError(e.message);
        refreshConfig();
      }
    },
    [exerciseOverride, pushConfigToDevice, refreshConfig]
  );

  const setExerciseOverride = useCallback(
    (x: ExerciseId | "auto") => {
      setExerciseOverrideState(x);
      bleRef.current?.send({ c: "cfg", ex: x });
    },
    []
  );

  // initial load
  useEffect(() => {
    refreshConfig();
    api<{ reps: RepView[]; activeSession: SessionSummary | null }>("/api/reps?limit=20")
      .then((d) => {
        setReps(d.reps);
        setActiveSession(d.activeSession);
        setFatigue(d.activeSession?.fatigue ?? null);
      })
      .catch(() => {});
  }, [refreshConfig]);

  const postEvent = useCallback(async (type: string, detail: Record<string, unknown>) => {
    try {
      const d = await api<{ pointsEarned: number }>("/api/device/event", { body: { type, detail } });
      if (d.pointsEarned) setPointsFlash({ points: d.pointsEarned, at: Date.now() });
    } catch (e: any) {
      setLastError(e.message);
    }
    notify();
  }, [notify]);

  // ---------------------------------------------------------------- message pipeline
  const handleMessage = useCallback(
    async (m: DeviceMessage, fromSim = false) => {
      switch (m.t) {
        case "hello":
          setFirmware(m.fw ?? null);
          if (typeof m.bat === "number") setBattery(m.bat);
          api("/api/device/config", { body: { firmwareVersion: m.fw, batteryLevel: m.bat, seen: true } }).catch(() => {});
          break;
        case "bat":
          setBattery(m.v);
          break;
        case "raw":
          pushTrace([{ angle: Number(m.a) || 0, sway: Number(m.s) || 0 }]);
          break;
        case "rep": {
          const calib = calibrationRef.current;
          const ex: string = calib ? calib.exercise : m.ex;
          if (!isExerciseId(ex)) return;
          const f: RepFeatures = {
            exercise: ex,
            confidence: Number(m.cf ?? 1),
            romDeg: Number(m.rom),
            tempoMs: Number(m.tmp),
            swayDeg: Number(m.sw),
            peakVel: Number(m.vel),
          };
          if (!fromSim) pushTrace(repWaveform(f, 12));
          if (calib) {
            // calibration reps are collected, not scored
            setCalibration((c) => (c ? { ...c, reps: [...c.reps, f] } : c));
            flashHaptic("CONFIRM");
            return;
          }
          try {
            const d = await api<any>("/api/device/rep", { body: f });
            const view: RepView = {
              id: d.rep.id,
              index: d.rep.index,
              exercise: ex,
              confidence: f.confidence ?? 1,
              romDeg: f.romDeg,
              tempoMs: f.tempoMs,
              swayDeg: f.swayDeg,
              peakVel: f.peakVel,
              score: d.rep.score,
              quality: d.rep.quality,
              cues: d.rep.cues,
              calibrated: d.rep.calibrated,
              createdAt: new Date().toISOString(),
            };
            setReps((r) => [view, ...r].slice(0, 30));
            setActiveSession({ ...d.session, fatigue: d.fatigue });
            setFatigue(d.fatigue);
            // Mirror the vibration on screen (a real device has already buzzed locally).
            flashHaptic(d.haptic);
            if (d.fatigueJustDetected) {
              flashHaptic("REST");
              bleRef.current?.send({ c: "hap", p: "REST" });
            }
            setPointsFlash({ points: d.pointsEarned, at: Date.now() });
            setLastError(null);
          } catch (e: any) {
            setLastError(e.message);
          }
          notify();
          break;
        }
        case "sed": {
          setSittingAlertAt(Date.now());
          flashHaptic("SEDENTARY");
          const type = m.k && m.k in CHALLENGES ? m.k : configRef.current?.challengeType ?? "arm_circles";
          const target = Number(m.tgt) || configRef.current?.challengeTarget || CHALLENGES[type].target;
          setChallenge({ type, name: CHALLENGES[type].name, target, count: 0, startedAt: Date.now() });
          await postEvent("SEDENTARY_ALERT", { minutesSitting: m.m ?? configRef.current?.sedentaryAlertMins });
          await postEvent("CHALLENGE_ISSUED", { challenge: type, target });
          break;
        }
        case "chl": {
          const c = challengeRef.current;
          if (m.s === "progress" && c) setChallenge({ ...c, count: Number(m.n) || c.count });
          if (m.s === "done") {
            flashHaptic("CHALLENGE_DONE");
            setChallenge(null);
            setSittingAlertAt(null);
            await postEvent("CHALLENGE_COMPLETED", {
              challenge: c?.type ?? m.k,
              count: m.n ?? c?.target,
              target: c?.target ?? m.tgt,
              seconds: c ? Math.round((Date.now() - c.startedAt) / 1000) : m.d,
            });
          }
          if (m.s === "fail") {
            setChallenge(null);
            await postEvent("CHALLENGE_FAILED", { challenge: c?.type ?? m.k, count: m.n ?? c?.count ?? 0, target: c?.target });
          }
          break;
        }
        case "pos":
          setLastPostureAlertAt(Date.now());
          flashHaptic("POSTURE");
          await postEvent("POSTURE_ALERT", { slouchDeg: m.a, seconds: m.s });
          break;
        case "act":
          await postEvent("ACTIVITY", { kind: m.k, minutes: m.m });
          break;
      }
    },
    [flashHaptic, notify, postEvent, pushTrace]
  );

  // ---------------------------------------------------------------- BLE
  const connectBle = useCallback(async () => {
    setBleError(null);
    setBleState("connecting");
    const link = new FitBuddyBle(
      (m) => handleMessage(m, false),
      () => {
        bleRef.current = null;
        setBleState("idle");
        setSource("sim");
        setDeviceName(null);
      }
    );
    try {
      await link.connect();
      bleRef.current = link;
      setDeviceName(link.name);
      setBleState("connected");
      setSource("ble");
      pushConfigToDevice(configRef.current, exerciseOverride, baselinesRef.current);
      link.send({ c: "live", on: 1 });
    } catch (e: any) {
      setBleState(e?.name === "NotFoundError" ? "idle" : "error"); // NotFoundError = user closed the picker
      if (e?.name !== "NotFoundError") setBleError(e?.message || "Bluetooth connection failed");
    }
  }, [exerciseOverride, handleMessage, pushConfigToDevice]);

  const disconnectBle = useCallback(() => {
    bleRef.current?.disconnect();
  }, []);

  // ---------------------------------------------------------------- calibration
  const startCalibration = useCallback((ex: ExerciseId) => {
    setCalibration({ exercise: ex, reps: [] });
    bleRef.current?.send({ c: "calib", ex, on: 1 });
  }, []);

  const cancelCalibration = useCallback(() => {
    const c = calibrationRef.current;
    setCalibration(null);
    if (c) bleRef.current?.send({ c: "calib", ex: c.exercise, on: 0 });
  }, []);

  const saveCalibration = useCallback(async () => {
    const c = calibrationRef.current;
    if (!c) return null;
    try {
      const d = await api<{ baseline: CalibrationRow; pointsEarned: number }>("/api/calibration", {
        body: { exercise: c.exercise, reps: c.reps },
      });
      bleRef.current?.send({ c: "calib", ex: c.exercise, on: 0 });
      const b = d.baseline;
      bleRef.current?.send({ c: "base", ex: b.exercise, rom: b.romDeg, rs: b.romStd, tmp: b.tempoMs, sw: b.swayDeg, ss: b.swayStd, vel: b.peakVel });
      setCalibration(null);
      await refreshConfig();
      if (d.pointsEarned) setPointsFlash({ points: d.pointsEarned, at: Date.now() });
      notify();
      return { pointsEarned: d.pointsEarned };
    } catch (e: any) {
      setLastError(e.message);
      return null;
    }
  }, [notify, refreshConfig]);

  // ---------------------------------------------------------------- simulator
  // The simulated user moves like their calibrated baseline (if any).
  const simRep = useCallback(
    async (ex: ExerciseId, quality: SimQuality, fatigueLevel = 0) => {
      const base: Baseline | null = baselinesRef.current.find((b) => b.exercise === ex) ?? null;
      const f = simulateRep(ex, quality, base, fatigueLevel);
      // animate the motion trace over (a sped-up version of) the rep
      const wave = repWaveform(f, 12);
      const step = Math.max(15, Math.min(60, f.tempoMs / 3 / wave.length));
      for (let i = 0; i < wave.length; i += 2) {
        pushTrace(wave.slice(i, i + 2));
        await sleep(step);
      }
      await handleMessage(
        { t: "rep", ex: f.exercise, cf: f.confidence, rom: f.romDeg, tmp: f.tempoMs, sw: f.swayDeg, vel: f.peakVel },
        true
      );
    },
    [handleMessage, pushTrace]
  );

  const simSet = useCallback(
    async (ex: ExerciseId, n: number, mode: "mixed" | "good" | "fatigue") => {
      simStop.current = false;
      setSimRunning(true);
      try {
        for (let i = 0; i < n && !simStop.current; i++) {
          let q: SimQuality = "good";
          let fat = 0;
          if (mode === "mixed") {
            const x = Math.random();
            q = x < 0.65 ? "good" : x < 0.88 ? "moderate" : "poor";
          } else if (mode === "fatigue") {
            fat = Math.max(0, (i - n * 0.4) / (n * 0.6));
            q = fat > 0.7 && Math.random() < 0.5 ? "moderate" : "good";
          }
          await simRep(ex, q, fat);
          await sleep(250);
        }
      } finally {
        setSimRunning(false);
      }
    },
    [simRep]
  );

  const stopSim = useCallback(() => {
    simStop.current = true;
  }, []);

  const simSitting = useCallback(async () => {
    const c = configRef.current;
    await handleMessage({ t: "sed", m: c?.sedentaryAlertMins ?? 45, k: c?.challengeType, tgt: c?.challengeTarget }, true);
  }, [handleMessage]);

  const simChallengeStep = useCallback(
    async (n = 1) => {
      const c = challengeRef.current;
      if (!c) return;
      const count = Math.min(c.target, c.count + n);
      pushTrace(Array.from({ length: 8 }, (_, i) => ({ angle: 60 + 50 * Math.sin((i / 8) * 2 * Math.PI), sway: 0 })));
      if (count >= c.target) await handleMessage({ t: "chl", s: "done", n: count, k: c.type, tgt: c.target }, true);
      else await handleMessage({ t: "chl", s: "progress", n: count }, true);
    },
    [handleMessage, pushTrace]
  );

  const simGiveUpChallenge = useCallback(async () => {
    const c = challengeRef.current;
    if (c) await handleMessage({ t: "chl", s: "fail", n: c.count, k: c.type }, true);
  }, [handleMessage]);

  const simSlouch = useCallback(
    async (deg = 22) => {
      await handleMessage({ t: "pos", a: deg, s: configRef.current?.postureAlertSecs ?? 60 }, true);
    },
    [handleMessage]
  );

  const reportRecoveryDone = useCallback(
    async (detail: Record<string, unknown>) => {
      await postEvent("RECOVERY_COMPLETED", detail);
    },
    [postEvent]
  );

  // idle trace so the live chart isn't empty (only when nothing else streams)
  useEffect(() => {
    const id = setInterval(() => {
      if (source === "ble" || Date.now() - lastTraceAt.current < 1500) return;
      pushTrace([{ angle: Math.round(Math.random() * 20) / 10, sway: Math.round((Math.random() - 0.5) * 10) / 10 }], true);
    }, 250);
    return () => clearInterval(id);
  }, [pushTrace, source]);

  const value = useMemo<DeviceContextValue>(
    () => ({
      source,
      bleAvailable: bleSupported(),
      bleState,
      bleError,
      deviceName,
      firmware,
      battery,
      connectBle,
      disconnectBle,
      sendCommand,
      config,
      baselines,
      updateConfig,
      refreshConfig,
      exerciseOverride,
      setExerciseOverride,
      reps,
      activeSession,
      fatigue,
      trace,
      haptic,
      flashHaptic,
      sittingAlertAt,
      challenge,
      lastPostureAlertAt,
      lastError,
      pointsFlash,
      calibration,
      startCalibration,
      cancelCalibration,
      saveCalibration,
      simRep,
      simSet,
      stopSim,
      simRunning,
      simSitting,
      simChallengeStep,
      simGiveUpChallenge,
      simSlouch,
      reportRecoveryDone,
    }),
    [
      source, bleState, bleError, deviceName, firmware, battery, connectBle, disconnectBle, sendCommand, config, baselines,
      updateConfig, refreshConfig, exerciseOverride, setExerciseOverride, reps, activeSession, fatigue, trace, haptic,
      flashHaptic, sittingAlertAt, challenge, lastPostureAlertAt, lastError, pointsFlash, calibration, startCalibration,
      cancelCalibration, saveCalibration, simRep, simSet, stopSim, simRunning, simSitting, simChallengeStep,
      simGiveUpChallenge, simSlouch, reportRecoveryDone,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export { EXERCISES };
