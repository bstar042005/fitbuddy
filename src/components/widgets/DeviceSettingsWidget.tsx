"use client";
import React, { useEffect, useState } from "react";
import { Bluetooth, BluetoothOff, Sliders, Vibrate, UserCog, Save } from "lucide-react";
import { useDevice } from "../device/DeviceProvider";
import { Panel, PanelHeader, Btn, Toggle, cx } from "../ui";
import { PulseStrip } from "../HapticIndicator";
import { HAPTICS, HapticPattern } from "@/lib/haptics";
import { CHALLENGES } from "@/lib/exercises";
import { api } from "@/lib/client";
import type { AppUser, DeviceConfig } from "@/lib/types";

function Row({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="p-3 rounded bg-[#0a0f1d] border border-cyber-800 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-xs font-mono font-bold text-white">{title}</div>
        <div className="text-[11px] font-mono text-slate-400">{desc}</div>
      </div>
      {children}
    </div>
  );
}

function Choice<T extends string | number>({ value, options, onChange, render }: { value: T | undefined; options: T[]; onChange: (v: T) => void; render?: (v: T) => string }) {
  return (
    <div className="flex gap-1 shrink-0">
      {options.map((o) => (
        <button
          key={String(o)}
          onClick={() => onChange(o)}
          className={cx("px-2 py-1 text-[11px] font-mono rounded border", value === o ? "bg-[#39FF14] text-black font-bold border-[#39FF14]" : "border-cyber-700 text-slate-400 hover:text-white")}
        >
          {render ? render(o) : String(o)}
        </button>
      ))}
    </div>
  );
}

export function DeviceSettingsWidget({ user, onUserChange }: { user: AppUser | null; onUserChange: (u: AppUser) => void }) {
  const d = useDevice();
  const c = d.config;
  const [profile, setProfile] = useState({ weightKg: "", hostelBlock: "", department: "", deviceId: "" });
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user)
      setProfile({
        weightKg: user.weightKg ? String(user.weightKg) : "",
        hostelBlock: user.hostelBlock,
        department: user.department,
        deviceId: user.deviceId ?? "",
      });
  }, [user]);

  const saveProfile = async () => {
    try {
      const r = await api<{ user: AppUser }>("/api/auth/me", {
        method: "PATCH",
        body: { ...profile, weightKg: profile.weightKg ? Number(profile.weightKg) : null, deviceId: profile.deviceId || null },
      });
      onUserChange(r.user);
      await d.refreshConfig();
      setProfileMsg("Saved");
    } catch (e: any) {
      setProfileMsg(e.message);
    }
    setTimeout(() => setProfileMsg(null), 3000);
  };

  const testPattern = (p: HapticPattern) => {
    d.flashHaptic(p);
    d.sendCommand({ c: "hap", p });
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        <Panel>
          <PanelHeader icon={<Bluetooth className="w-5 h-5" />} title="Wearable Connection" badge="BLE · NORDIC UART" />
          <div className="flex items-center justify-between gap-3 p-3 rounded bg-[#0a0f1d] border border-cyber-800">
            <div className="text-xs font-mono">
              <div className="flex items-center gap-2 text-white font-bold">
                <span className={cx("w-2.5 h-2.5 rounded-full", d.bleState === "connected" ? "bg-[#39FF14] shadow-[0_0_8px_#39FF14]" : "bg-slate-500")} />
                {d.bleState === "connected" ? d.deviceName : d.bleState === "connecting" ? "Connecting…" : "No device connected"}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {d.bleState === "connected"
                  ? `Firmware ${d.firmware ?? "?"} · battery ${d.battery ?? "?"}%`
                  : d.bleAvailable
                  ? "Power on the module, then connect. Reps are processed on the device and synced here."
                  : "Web Bluetooth needs Chrome or Edge (desktop or Android). The simulator works everywhere."}
              </div>
            </div>
            {d.bleState === "connected" ? (
              <Btn onClick={d.disconnectBle}>
                <BluetoothOff className="w-3.5 h-3.5" /> Disconnect
              </Btn>
            ) : (
              <Btn variant="primary" onClick={d.connectBle} disabled={!d.bleAvailable || d.bleState === "connecting"}>
                <Bluetooth className="w-3.5 h-3.5" /> Connect
              </Btn>
            )}
          </div>
          {d.bleError && <div className="mt-2 text-[11px] font-mono text-red-400">{d.bleError}</div>}
          <p className="mt-2 text-[10px] font-mono text-slate-500">
            Settings below are stored on the server and pushed to the module whenever it connects; the module keeps them in flash so it works
            offline.
          </p>
        </Panel>

        <Panel>
          <PanelHeader icon={<UserCog className="w-5 h-5" />} title="Profile" />
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["weightKg", "Body weight (kg)", "e.g. 62"],
                ["deviceId", "Paired device ID", "FitBuddy-XXXX"],
                ["hostelBlock", "Hostel / block", "Hostel Block 4"],
                ["department", "Department / class", "CSE"],
              ] as const
            ).map(([k, label, ph]) => (
              <label key={k} className="block">
                <span className="text-[10px] font-mono text-slate-400">{label}</span>
                <input
                  value={profile[k]}
                  placeholder={ph}
                  inputMode={k === "weightKg" ? "decimal" : undefined}
                  onChange={(e) => setProfile((p) => ({ ...p, [k]: e.target.value }))}
                  className="w-full mt-0.5 px-2.5 py-1.5 bg-[#0a0f1d] border border-cyber-700 rounded text-xs font-mono text-white focus:outline-none focus:border-[#39FF14]"
                />
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3">
            <Btn variant="primary" onClick={saveProfile}>
              <Save className="w-3.5 h-3.5" /> Save profile
            </Btn>
            {profileMsg && <span className="text-[11px] font-mono text-slate-300">{profileMsg}</span>}
          </div>
          <p className="mt-2 text-[10px] font-mono text-slate-500">Weight is only used to estimate your protein target.</p>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel>
          <PanelHeader icon={<Sliders className="w-5 h-5" />} title="Device Behaviour" />
          <div className="space-y-2.5">
            <Row title="Mode" desc="Workout: form coaching · Study: posture + breaks · Recovery: guided cooldown">
              <Choice<DeviceConfig["mode"]> value={c?.mode} options={["WORKOUT", "STUDY", "RECOVERY"]} onChange={(m) => d.updateConfig({ mode: m })} render={(m) => m[0] + m.slice(1).toLowerCase()} />
            </Row>
            <Row title="Strict form mode" desc="Tighter tolerances around your baseline">
              <Toggle label="Strict form mode" on={!!c?.strictFormMode} onChange={(v) => d.updateConfig({ strictFormMode: v })} />
            </Row>
            <Row title="Haptic feedback" desc="Vibration cues for reps, reminders and challenges">
              <Toggle label="Haptic feedback" on={!!c?.hapticFeedback} onChange={(v) => d.updateConfig({ hapticFeedback: v })} />
            </Row>
            <Row title="Confirm good reps" desc="A tiny pulse on every clean rep">
              <Toggle label="Confirm good reps" on={!!c?.confirmPulses} disabled={!c?.hapticFeedback} onChange={(v) => d.updateConfig({ confirmPulses: v })} />
            </Row>
            <Row title="Vibration strength" desc="Motor PWM level">
              <Choice value={c?.hapticIntensity} options={[1, 2, 3]} onChange={(v) => d.updateConfig({ hapticIntensity: v })} render={(v) => ["Low", "Med", "High"][v - 1]} />
            </Row>
            <Row title="Sedentary alert after" desc="Minutes of stillness before a movement challenge">
              <Choice value={c?.sedentaryAlertMins} options={[30, 45, 60, 90]} onChange={(v) => d.updateConfig({ sedentaryAlertMins: v })} render={(v) => `${v}m`} />
            </Row>
            <Row title="Movement challenge" desc={CHALLENGES[c?.challengeType ?? "arm_circles"]?.hint ?? ""}>
              <select
                value={c?.challengeType ?? "arm_circles"}
                onChange={(e) => d.updateConfig({ challengeType: e.target.value })}
                className="px-2 py-1 bg-[#090d16] border border-cyber-700 rounded text-[11px] font-mono text-white"
              >
                {Object.entries(CHALLENGES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.name} × {v.target}
                  </option>
                ))}
              </select>
            </Row>
          </div>
        </Panel>

        <Panel>
          <PanelHeader icon={<Vibrate className="w-5 h-5" />} title="Haptic Pattern Language" badge="TAP TO TEST" />
          <div className="space-y-1.5">
            {(Object.keys(HAPTICS) as Exclude<HapticPattern, "NONE">[]).map((p) => (
              <button
                key={p}
                onClick={() => testPattern(p)}
                className="w-full flex items-center gap-3 p-2 rounded bg-[#0a0f1d] border border-cyber-800 hover:border-cyber-600 text-left"
              >
                <div className="w-28 shrink-0">
                  <PulseStrip pattern={p} active={d.haptic?.pattern === p && Date.now() - d.haptic.at < 1500} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-mono font-bold text-white">{HAPTICS[p].label}</div>
                  <div className="text-[10px] font-mono text-slate-400 truncate">{HAPTICS[p].meaning}</div>
                </div>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] font-mono text-slate-500">
            {d.bleState === "connected" ? "Tapping a pattern also plays it on the module." : "Connect the module to feel these on your body."}
          </p>
        </Panel>
      </div>
    </div>
  );
}
export default DeviceSettingsWidget;
