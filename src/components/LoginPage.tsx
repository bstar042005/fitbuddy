"use client";

import React, { useState } from "react";
import {
  Activity,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import type { AppUser } from "@/lib/types";

interface LoginPageProps {
  onLoginSuccess: (user: AppUser, token: string) => void;
  onNavigateLanding: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onNavigateLanding,
}) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [hostelBlock, setHostelBlock] = useState<string>("");
  const [department, setDepartment] = useState<string>("");
  const [weightKg, setWeightKg] = useState<string>("");
  const [deviceId, setDeviceId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // One-click demo accounts (created by `npm run db:setup`)
  const demoAthletes = [
    { name: "Devansh Sharma", email: "devansh@fitbuddy.demo", pass: "fitbuddy2026", info: "Hostel Block 4 · CSE · improving beginner" },
    { name: "Rohan Patel", email: "rohan@fitbuddy.demo", pass: "fitbuddy2026", info: "Hostel Block 2 · CSE · 2-week streak" },
    { name: "Priya Nair", email: "priya@fitbuddy.demo", pass: "fitbuddy2026", info: "Girls Hostel 1 · Design" },
  ];

  const handleSelectDemo = (demo: typeof demoAthletes[0]) => {
    setEmail(demo.email);
    setPassword(demo.pass);
    setErrorMsg(null);
    executeLogin(demo.email, demo.pass);
  };

  const executeLogin = async (loginEmail: string, loginPass: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`Welcome back, ${data.user.name}`);
        onLoginSuccess(data.user, data.token);
      } else {
        setErrorMsg(data.error || "Sign-in failed. Check your email and password.");
      }
    } catch {
      setErrorMsg("Network error — is the server running?");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      setErrorMsg("Please fill in your name and email");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, hostelBlock, department, weightKg: weightKg ? Number(weightKg) : undefined, deviceId: deviceId || undefined }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message);
        onLoginSuccess(data.user, data.token);
      } else {
        setErrorMsg(data.error || "Registration failed");
      }
    } catch {
      setErrorMsg("Network error — is the server running?");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      executeLogin(email, password);
    } else {
      handleRegister(e);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#0F172A] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Cyber Accents */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-[#39FF14]/15 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Terminal Header Badge */}
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#131e36] border border-[#39FF14]/30 text-xs font-mono text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#39FF14] animate-ping" />
            <span className="text-[#39FF14] font-bold">SIH 2026</span>
            <span>· PS 26213</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="cyber-panel p-6 sm:p-8 rounded-lg corner-accent shadow-2xl border-cyber-700">
          {/* Logo Title */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-lg bg-[#0a0f1d] border border-[#39FF14]/50 flex items-center justify-center mx-auto mb-3 shadow-neon-sm">
              <Activity className="w-6 h-6 text-[#39FF14]" />
            </div>
            <h2 className="text-2xl font-black font-mono text-white tracking-wider uppercase">
              FIT<span className="text-[#39FF14]">BUDDY</span> // AUTH
            </h2>
            <p className="text-xs font-mono text-slate-400 mt-1">
              {mode === "login"
                ? "Sign in to your FitBuddy dashboard"
                : "Create your account and join your hostel league"}
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#0a0f1d] rounded border border-cyber-800 mb-5 font-mono text-xs">
            <button
              onClick={() => {
                setMode("login");
                setErrorMsg(null);
              }}
              className={`py-2 rounded font-bold transition-colors ${
                mode === "login"
                  ? "bg-[#39FF14] text-black shadow-neon-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode("register");
                setErrorMsg(null);
              }}
              className={`py-2 rounded font-bold transition-colors ${
                mode === "register"
                  ? "bg-[#39FF14] text-black shadow-neon-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Register
            </button>
          </div>

          {/* 1-Click Demo Profiles (When in login mode) */}
          {mode === "login" && (
            <div className="mb-5">
              <div className="text-[10px] font-mono text-slate-400 uppercase font-bold mb-2 flex items-center justify-between">
                <span>⚡ Demo accounts (password fitbuddy2026)</span>
                <span className="text-[#39FF14]">one click</span>
              </div>
              <div className="space-y-1.5">
                {demoAthletes.map((demo) => (
                  <button
                    key={demo.email}
                    type="button"
                    onClick={() => handleSelectDemo(demo)}
                    className="w-full p-2 rounded bg-[#0a0f1d] hover:bg-[#152342] border border-cyber-800 hover:border-[#39FF14]/60 text-left transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-mono font-bold text-white group-hover:text-[#39FF14] flex items-center space-x-1.5">
                        <span>{demo.name}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {demo.info}
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#39FF14] group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Alert Messages */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded bg-red-950/40 border border-red-500/50 text-red-300 text-xs font-mono flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded bg-[#39FF14]/15 border border-[#39FF14]/50 text-[#39FF14] text-xs font-mono flex items-center space-x-2 animate-pulse">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === "register" && (
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Full name:
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Rohan Gupta"
                    className="w-full pl-9 pr-3 py-2 bg-[#0a0f1d] border border-cyber-700 rounded text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#39FF14] transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Email:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@college.ac.in"
                  className="w-full pl-9 pr-3 py-2 bg-[#0a0f1d] border border-cyber-700 rounded text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#39FF14] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Password:
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-[#0a0f1d] border border-cyber-700 rounded text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#39FF14] transition-colors"
                />
              </div>
            </div>

            {mode === "register" && (
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["Hostel / block", hostelBlock, setHostelBlock, "Hostel Block 4"],
                    ["Department", department, setDepartment, "CSE"],
                    ["Weight (kg, optional)", weightKg, setWeightKg, "62"],
                    ["Device ID (optional)", deviceId, setDeviceId, "FitBuddy-XXXX"],
                  ] as [string, string, (v: string) => void, string][]
                ).map(([label, value, set, ph]) => (
                  <label key={label} className="block">
                    <span className="block text-[11px] font-mono text-slate-400 mb-1">{label}:</span>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      placeholder={ph}
                      className="w-full px-3 py-2 bg-[#0a0f1d] border border-cyber-700 rounded text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#39FF14]"
                    />
                  </label>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#39FF14] hover:bg-[#32e012] text-black font-black font-mono uppercase tracking-wider text-xs rounded shadow-neon transition-transform active:translate-y-0.5 flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{mode === "login" ? "Sign in" : "Create account"}</span>
                </>
              )}
            </button>
          </form>

          {/* Back to Home / Pitch */}
          <div className="mt-4 pt-3 border-t border-cyber-800 text-center">
            <button
              type="button"
              onClick={onNavigateLanding}
              className="text-xs font-mono text-slate-400 hover:text-white transition-colors"
            >
              &larr; Back to Platform Overview
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 text-center text-[10px] font-mono text-slate-500">
          <span>Passwords are hashed (scrypt) · sessions use signed tokens</span>
        </div>
      </div>
    </div>
  );
};
export default LoginPage;
