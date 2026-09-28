"use client";
import React, { useCallback, useEffect, useState } from "react";
import { Salad, Send, Trash2, Info, Sparkles } from "lucide-react";
import { api } from "@/lib/client";
import { Panel, PanelHeader, Btn, Empty, cx } from "../ui";

interface Item { name: string; qty: number; unit: string; calories: number; protein: number; carbs: number; fats: number }
interface Picture {
  meals: { id: string; text: string; items: Item[]; calories: number; protein: number; source: string; createdAt: string }[];
  day: { calories: number; protein: number; carbs: number; fats: number };
  activity: { level: "low" | "moderate" | "active"; activeDaysLast7: number; repsLast7: number };
  target: { grams: number; perKg: number; weightUsed: number; weightIsDefault: boolean };
  deficit: number;
  alternatives: { name: string; serving: string; protein: number; costInr: number; tip: string; proteinPerRupee: number; suggestedServings: number; coversGrams: number }[];
  llm: boolean;
}

const SAMPLES = ["2 roti, dal and curd", "Rice, rajma and 1 bowl sabzi", "1 plate poha and chai", "Maggi with 2 boiled eggs", "3 idli and sambar"];

export function NutritionWidget({ onProfileNeeded }: { onProfileNeeded?: () => void }) {
  const [pic, setPic] = useState<Picture | null>(null);
  const [meal, setMeal] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [lastParsed, setLastParsed] = useState<{ items: Item[]; source: string } | null>(null);

  const load = useCallback(() => api<Picture>("/api/nutrition").then(setPic).catch((e) => setNote(e.message)), []);
  useEffect(() => {
    load();
  }, [load]);

  const log = async (text: string) => {
    if (!text.trim()) return;
    setBusy(true);
    setNote(null);
    try {
      const d = await api<Picture & { recognised: boolean; message?: string; meal?: { items: Item[]; source: string } }>("/api/nutrition", { body: { meal: text } });
      setPic(d);
      if (!d.recognised) setNote(d.message ?? "Couldn't recognise that meal.");
      else {
        setLastParsed(d.meal ?? null);
        setMeal("");
      }
    } catch (e: any) {
      setNote(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      setPic(await api<Picture>(`/api/nutrition?id=${id}`, { method: "DELETE" }));
    } catch (e: any) {
      setNote(e.message);
    }
  };

  const pct = pic ? Math.min(100, Math.round((pic.day.protein / pic.target.grams) * 100)) : 0;
  return (
    <Panel>
      <PanelHeader icon={<Salad className="w-5 h-5" />} title="Fitness & Nutrition Engine" badge={pic?.llm ? "AI + RULES" : "RULE-BASED"} />

      <div className="grid lg:grid-cols-2 gap-5">
        <div>
          <label className="block text-[11px] font-mono text-slate-400 mb-1">What did you eat? (hostel / mess / home food)</label>
          <div className="flex gap-2">
            <input
              value={meal}
              onChange={(e) => setMeal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && log(meal)}
              placeholder="e.g. 3 roti, dal, rice and curd"
              className="flex-1 min-w-0 px-3 py-2 bg-[#0a0f1d] border border-cyber-700 rounded text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#39FF14]"
            />
            <Btn variant="primary" onClick={() => log(meal)} disabled={busy}>
              <Send className="w-3.5 h-3.5" /> Log
            </Btn>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {SAMPLES.map((s) => (
              <button key={s} onClick={() => log(s)} disabled={busy} className="px-2 py-0.5 text-[10px] font-mono rounded border border-cyber-700 text-slate-400 hover:text-white hover:border-cyber-600">
                {s}
              </button>
            ))}
          </div>
          {note && <div className="mt-2 text-[11px] font-mono text-amber-300">{note}</div>}
          {lastParsed && (
            <div className="mt-3 p-2.5 rounded bg-[#0a0f1d] border border-cyber-800">
              <div className="text-[10px] font-mono text-slate-400 mb-1 flex items-center gap-1">
                {lastParsed.source === "llm" && <Sparkles className="w-3 h-3 text-cyan-400" />}
                Last meal breakdown ({lastParsed.source === "llm" ? "AI estimate" : "food table"})
              </div>
              <table className="w-full text-[11px] font-mono text-slate-300">
                <tbody>
                  {lastParsed.items.map((i) => (
                    <tr key={i.name}>
                      <td className="py-0.5">
                        {i.qty} × {i.name} <span className="text-slate-500">({i.unit})</span>
                      </td>
                      <td className="text-right">{i.calories} kcal</td>
                      <td className="text-right text-[#39FF14] w-16">{i.protein} g P</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="text-[10px] font-mono text-slate-400 uppercase font-bold mt-4 mb-1.5">Logged today</div>
          {pic && pic.meals.length ? (
            <ul className="space-y-1">
              {pic.meals.map((m) => (
                <li key={m.id} className="flex items-center gap-2 p-2 rounded bg-[#0a0f1d] border border-cyber-800 text-[11px] font-mono">
                  <span className="text-slate-500 shrink-0">{new Date(m.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="flex-1 text-slate-200 truncate">{m.text}</span>
                  <span className="text-[#39FF14] shrink-0">{m.protein} g</span>
                  <button onClick={() => remove(m.id)} className="text-slate-500 hover:text-red-400" aria-label="Delete meal">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No meals logged today.</Empty>
          )}
        </div>

        <div>
          <div className="p-3 rounded bg-[#0a0f1d] border border-cyber-800">
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-mono text-slate-300 font-bold">Protein today</span>
              <span className="text-xs font-mono text-slate-400">
                {pic?.day.calories ?? 0} kcal · {pic?.day.carbs ?? 0} g carbs · {pic?.day.fats ?? 0} g fat
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black font-mono text-white">{pic?.day.protein ?? 0}</span>
              <span className="text-sm font-mono text-slate-400">/ {pic?.target.grams ?? "—"} g</span>
            </div>
            <div className="h-2 rounded-full bg-cyber-800 overflow-hidden mt-2">
              <div className={cx("h-full transition-all", pct >= 90 ? "bg-[#39FF14]" : pct >= 60 ? "bg-amber-400" : "bg-orange-500")} style={{ width: `${pct}%` }} />
            </div>
            {pic && (
              <div className="mt-2 text-[10px] font-mono text-slate-400 flex gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Target ≈ {pic.target.perKg} g/kg × {pic.target.weightUsed} kg
                  {pic.target.weightIsDefault && (
                    <>
                      {" "}(default weight —{" "}
                      <button className="underline text-cyan-400" onClick={onProfileNeeded}>
                        add yours
                      </button>
                      )
                    </>
                  )}
                  , adjusted for your <b className="text-slate-200">{pic.activity.level}</b> activity ({pic.activity.activeDaysLast7} active days,{" "}
                  {pic.activity.repsLast7} reps this week). Based on the ICMR-NIN adult RDA (~0.8 g/kg) scaled for training. Estimates only — not medical advice.
                </span>
              </div>
            )}
          </div>

          <div className="text-[10px] font-mono text-slate-400 uppercase font-bold mt-4 mb-1.5">
            {pic && pic.deficit > 0 ? `Close the ${pic.deficit} g gap — cheapest protein per rupee` : "Affordable protein options"}
          </div>
          {pic && pic.deficit === 0 ? (
            <div className="p-3 rounded border border-[#39FF14]/40 bg-[#39FF14]/10 text-xs font-mono text-[#39FF14]">You've hit today's protein estimate. 🎯</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {(pic?.alternatives ?? []).map((a) => (
                <div key={a.name} className="p-2.5 rounded bg-[#0a0f1d] border border-cyber-800">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-white font-bold">{a.name}</span>
                    <span className="text-[#39FF14]">~₹{Math.round(a.costInr * a.suggestedServings)}</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    {a.suggestedServings} × {a.serving} → ~{a.coversGrams} g protein
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-1">{a.tip}</div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] font-mono text-slate-500 mt-2">Prices are rough averages and vary by city.</p>
        </div>
      </div>
    </Panel>
  );
}
export default NutritionWidget;
