"use client";
import React from "react";
import { Activity, ArrowRight, LogOut, KeyRound } from "lucide-react";
import type { AppUser } from "@/lib/types";

export type View = "landing" | "login" | "dashboard";

export function Navbar({ view, setView, user, onLogout }: { view: View; setView: (v: View) => void; user: AppUser | null; onLogout: () => void }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-cyber-800 bg-[#0F172A]/90 backdrop-blur-md">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button onClick={() => setView("landing")} className="flex items-center gap-3 group" aria-label="FitBuddy home">
          <div className="w-9 h-9 rounded bg-[#131e36] border border-[#39FF14]/40 flex items-center justify-center group-hover:border-[#39FF14] shadow-neon-sm">
            <Activity className="w-5 h-5 text-[#39FF14]" />
          </div>
          <div className="text-left">
            <div className="font-black text-xl tracking-wider text-white leading-none">
              FIT<span className="text-[#39FF14]">BUDDY</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono tracking-tight">screenless AI fitness coach</div>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {view !== "dashboard" && (
                <button
                  onClick={() => setView("dashboard")}
                  className="px-4 py-2 text-xs font-bold font-mono uppercase text-black bg-[#39FF14] hover:bg-[#32e012] rounded shadow-neon flex items-center gap-1.5"
                >
                  Dashboard <ArrowRight className="w-4 h-4" />
                </button>
              )}
              <span className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-[#131e36] border border-[#39FF14]/30 text-xs font-mono text-white">
                {user.name}
                <span className="text-[10px] text-[#39FF14]">{user.fitPoints.toLocaleString("en-IN")} pts</span>
              </span>
              <button onClick={onLogout} title="Sign out" aria-label="Sign out" className="p-1.5 rounded bg-cyber-850 hover:bg-cyber-800 text-slate-400 hover:text-red-400 border border-cyber-700">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            view !== "login" && (
              <button
                onClick={() => setView("login")}
                className="px-4 py-2 text-xs font-bold font-mono uppercase text-black bg-[#39FF14] hover:bg-[#32e012] rounded shadow-neon flex items-center gap-1.5"
              >
                <KeyRound className="w-4 h-4" /> Sign in
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
export default Navbar;
