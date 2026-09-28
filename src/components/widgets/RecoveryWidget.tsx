"use client";
import React, { useEffect, useRef, useState } from "react";
import { HeartPulse, Play, Square, SkipForward, CheckCircle2 } from "lucide-react";
import { useDevice } from "../device/DeviceProvider";
import { Panel, PanelHeader, Btn, Ring, cx } from "../ui";
import { PulseStrip } from "../HapticIndicator";
import { EXERCISES, EXERCISE_IDS, ExerciseId, GENERAL_COOLDOWN } from "@/lib/exercises";

type Step = { name: string; secs: number; hint: string };

export function RecoveryWidget({ lastExercise }: { lastExercise: ExerciseId | null }) {
  const d = useDevice();
  const [focus, setFocus] = useState<ExerciseId | "general">(lastExercise ?? "general");
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [done, setDone] = useState(false);
  const stepsRef = useRef<Step[]>([]);

  const steps: Step[] = focus === "general" ? GENERAL_COOLDOWN : [...EXERCISES[focus].stretches, GENERAL_COOLDOWN[3]];
  const total = steps.reduce((a, s) => a + s.secs, 0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!running || remaining > 0) return;
    const next = index + 1;
    const list = stepsRef.current;
    if (next >= list.length) {
      setRunning(false);
      setDone(true);
      d.flashHaptic("CHALLENGE_DONE");
      d.sendCommand({ c: "hap", p: "CHALLENGE_DONE" });
      d.reportRecoveryDone({ focus, steps: list.length, seconds: list.reduce((a, s) => a + s.secs, 0) });
    } else {
      setIndex(next);
      setRemaining(list[next].secs);
      d.flashHaptic("STEP");
      // the device runs its own timer; this keeps the screen in sync if it's connected
    }
  }, [remaining, running, index, d, focus]);

  const start = () => {
    stepsRef.current = steps;
    setIndex(0);
    setRemaining(steps[0].secs);
    setDone(false);
    setRunning(true);
    d.flashHaptic("STEP");
    d.sendCommand({ c: "rec", steps: steps.map((s) => s.secs) });
  };
  const stop = () => {
    setRunning(false);
    d.sendCommand({ c: "rec", steps: [] });
  };

  const list = running ? stepsRef.current : steps;
  const cur = list[index];
  return (
    <Panel>
      <PanelHeader icon={<HeartPulse className="w-5 h-5" />} title="Haptic Recovery Mode" badge="EYES-FREE COOLDOWN" />
      <p className="text-xs font-mono text-slate-400 mb-3 leading-relaxed">
        Start a cooldown and put your phone away: the module gives a <span className="text-cyan-400">triple tap</span> each time it's time to
        move to the next stretch, and a celebration pattern when you're done.
      </p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {(["general", ...EXERCISE_IDS] as const).map((f) => (
          <button
            key={f}
            disabled={running}
            onClick={() => setFocus(f)}
            className={cx(
              "px-2.5 py-1 text-xs font-mono rounded border disabled:opacity-50",
              focus === f ? "bg-violet-400 text-black font-bold border-violet-400" : "border-cyber-700 text-slate-300 hover:text-white"
            )}
          >
            {f === "general" ? "General" : `After ${EXERCISES[f].name}`}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-[auto,1fr] gap-5 items-center">
        <div className="flex flex-col items-center gap-3">
          <Ring value={running && cur ? ((cur.secs - remaining) / cur.secs) * 100 : done ? 100 : 0} size={128} stroke={10} color="#a78bfa">
            {done ? (
              <CheckCircle2 className="w-10 h-10 text-[#39FF14]" />
            ) : (
              <>
                <span className="text-3xl font-black font-mono text-white">{running ? remaining : Math.round(total / 60 * 10) / 10}</span>
                <span className="text-[10px] font-mono text-slate-400">{running ? "seconds" : "minutes"}</span>
              </>
            )}
          </Ring>
          <PulseStrip pattern="STEP" active={running && cur && remaining === cur.secs} />
          {!running ? (
            <Btn variant="primary" onClick={start}>
              <Play className="w-4 h-4" /> {done ? "Start again" : "Start routine"}
            </Btn>
          ) : (
            <div className="flex gap-2">
              <Btn onClick={() => setRemaining(0)}>
                <SkipForward className="w-3.5 h-3.5" /> Next
              </Btn>
              <Btn variant="danger" onClick={stop}>
                <Square className="w-3.5 h-3.5" /> Stop
              </Btn>
            </div>
          )}
        </div>
        <ol className="space-y-1.5">
          {list.map((s, i) => (
            <li
              key={s.name + i}
              className={cx(
                "p-2.5 rounded border text-xs font-mono flex items-center gap-3",
                running && i === index
                  ? "border-violet-400 bg-violet-500/10"
                  : running && i < index
                  ? "border-cyber-800 opacity-50"
                  : "border-cyber-800 bg-[#0a0f1d]"
              )}
            >
              <span className="w-5 h-5 rounded-full bg-cyber-800 text-slate-300 flex items-center justify-center text-[10px] shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold truncate">{s.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{s.hint}</div>
              </div>
              <span className="text-slate-400 shrink-0">{s.secs}s</span>
            </li>
          ))}
        </ol>
      </div>
      {done && <div className="mt-3 text-xs font-mono text-[#39FF14]">Recovery logged — nice work. It counts towards your streak.</div>}
    </Panel>
  );
}
export default RecoveryWidget;
