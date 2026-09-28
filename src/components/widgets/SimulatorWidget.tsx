"use client";
import React, { useState } from "react";
import { Cpu, Play, Square, Armchair, Code2, CheckCircle2, AlertTriangle, CircleDot, Copy, Check, X, Download } from "lucide-react";
import { useDevice } from "../device/DeviceProvider";
import { Panel, PanelHeader, Btn, cx } from "../ui";
import { EXERCISES, EXERCISE_IDS, ExerciseId } from "@/lib/exercises";
import { api } from "@/lib/client";

export function SimulatorWidget() {
  const d = useDevice();
  const [ex, setEx] = useState<ExerciseId>("squat");
  const [showFw, setShowFw] = useState(false);
  const busy = d.simRunning;

  const curl = `curl -X POST http://localhost:3000/api/device/rep \\
  -H "Content-Type: application/json" \\
  -H "x-device-key: $DEVICE_API_KEY" \\
  -d '{"deviceId":"${d.config?.deviceId ?? "FitBuddy-DEMO1"}","exercise":"${ex}",
       "romDeg":${EXERCISES[ex].defaults.romDeg},"tempoMs":${EXERCISES[ex].defaults.tempoMs},
       "swayDeg":${EXERCISES[ex].defaults.swayDeg},"peakVel":${EXERCISES[ex].defaults.peakVel},"confidence":0.93}'`;

  return (
    <Panel>
      <PanelHeader
        icon={<Cpu className="w-5 h-5" />}
        title="Device Simulator & Test Bench"
        badge="NO HARDWARE NEEDED"
        right={
          <Btn onClick={() => setShowFw(true)}>
            <Code2 className="w-3.5 h-3.5 text-[#39FF14]" /> ESP32 firmware
          </Btn>
        }
      />
      <p className="text-xs font-mono text-slate-400 mb-3 leading-relaxed">
        Emits exactly the messages the real module sends over BLE (per-rep features, sedentary and posture events), so every screen can be
        demoed without the hardware. Simulated movement follows your calibrated baseline when you have one.
      </p>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {EXERCISE_IDS.map((id) => (
              <button
                key={id}
                onClick={() => setEx(id)}
                disabled={busy}
                className={cx("px-2.5 py-1 text-xs font-mono rounded border disabled:opacity-50", ex === id ? "bg-[#39FF14] text-black font-bold border-[#39FF14]" : "border-cyber-700 text-slate-300")}
              >
                {EXERCISES[id].name}
              </button>
            ))}
          </div>

          <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Single rep</div>
          <div className="flex flex-wrap gap-2">
            <Btn variant="primary" disabled={busy} onClick={() => d.simRep(ex, "good")}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Good rep
            </Btn>
            <Btn variant="amber" disabled={busy} onClick={() => d.simRep(ex, "moderate")}>
              <CircleDot className="w-3.5 h-3.5" /> Moderate rep
            </Btn>
            <Btn variant="danger" disabled={busy} onClick={() => d.simRep(ex, "poor")}>
              <AlertTriangle className="w-3.5 h-3.5" /> Poor rep
            </Btn>
          </div>

          <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Whole set</div>
          <div className="flex flex-wrap gap-2">
            <Btn disabled={busy} onClick={() => d.simSet(ex, 10, "mixed")}>
              <Play className="w-3.5 h-3.5" /> 10 mixed reps
            </Btn>
            <Btn disabled={busy} onClick={() => d.simSet(ex, 8, "good")}>
              <Play className="w-3.5 h-3.5" /> 8 clean reps
            </Btn>
            <Btn disabled={busy} onClick={() => d.simSet(ex, 14, "fatigue")} title="Reps slow down and shorten — triggers fatigue detection">
              <Play className="w-3.5 h-3.5" /> 14 reps getting tired
            </Btn>
            {busy && (
              <Btn variant="danger" onClick={d.stopSim}>
                <Square className="w-3.5 h-3.5" /> Stop
              </Btn>
            )}
          </div>

          <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">Daily life</div>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={d.simSitting} disabled={!!d.challenge}>
              <Armchair className="w-3.5 h-3.5" /> Sat too long
            </Btn>
            <Btn onClick={() => d.simChallengeStep(1)} disabled={!d.challenge}>
              Do 1 challenge move {d.challenge ? `(${d.challenge.count}/${d.challenge.target})` : ""}
            </Btn>
            <Btn onClick={() => d.simSlouch()}>Slouch while studying</Btn>
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">Same thing from a script (device key auth)</div>
          <pre className="text-[10px] font-mono text-slate-300 bg-[#060a12] p-3 rounded border border-cyber-800 overflow-x-auto leading-relaxed">{curl}</pre>
          <p className="mt-2 text-[10px] font-mono text-slate-500">
            Or run <span className="text-[#39FF14]">npm run simulate</span> to stream a whole workout from the command line.
          </p>
        </div>
      </div>
      {showFw && <FirmwareModal onClose={() => setShowFw(false)} />}
    </Panel>
  );
}

function FirmwareModal({ onClose }: { onClose: () => void }) {
  const [files, setFiles] = useState<{ name: string; content: string }[] | null>(null);
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    api<{ files: { name: string; content: string }[] }>("/api/firmware")
      .then((r) => setFiles(r.files))
      .catch((e) => setError(e.message));
  }, []);

  const f = files?.[active];
  const download = () => {
    if (!f) return;
    const url = URL.createObjectURL(new Blob([f.content], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-4xl bg-[#090d16] border border-cyber-700 rounded-lg p-5 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-mono font-bold text-white uppercase">ESP32 + BNO085 firmware (Arduino)</h3>
          <button onClick={onClose} className="p-1 rounded bg-cyber-800 text-slate-400 hover:text-white" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] font-mono text-slate-400 mb-3">
          Source lives in <span className="text-[#39FF14]">firmware/fitbuddy_esp32/</span>. Reps are segmented and scored on the ESP32, the motor
          fires locally, and only results go over BLE.
        </p>
        {error && <div className="text-xs font-mono text-red-400">{error}</div>}
        {files && (
          <>
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {files.map((file, i) => (
                <button key={file.name} onClick={() => setActive(i)} className={cx("px-2 py-1 text-[11px] font-mono rounded border", i === active ? "bg-[#39FF14] text-black border-[#39FF14]" : "border-cyber-700 text-slate-300")}>
                  {file.name}
                </button>
              ))}
              <div className="flex-1" />
              <Btn
                onClick={() => {
                  navigator.clipboard.writeText(f?.content ?? "");
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} Copy
              </Btn>
              <Btn onClick={download}>
                <Download className="w-3.5 h-3.5" /> Download
              </Btn>
            </div>
            <pre className="flex-1 overflow-auto text-[11px] font-mono text-slate-200 bg-[#060a12] p-3 rounded border border-cyber-800">{f?.content}</pre>
          </>
        )}
      </div>
    </div>
  );
}
export default SimulatorWidget;
