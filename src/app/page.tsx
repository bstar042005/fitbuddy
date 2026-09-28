"use client";
import React, { useCallback, useEffect, useState } from "react";
import { Navbar, View } from "@/components/Navbar";
import { HeroLanding } from "@/components/HeroLanding";
import { LoginPage } from "@/components/LoginPage";
import { DashboardView } from "@/components/DashboardView";
import { api, auth } from "@/lib/client";
import type { AppUser } from "@/lib/types";

export default function Home() {
  const [view, setView] = useState<View>("landing");
  const [user, setUser] = useState<AppUser | null>(null);
  const [checking, setChecking] = useState(true);

  // Restore session
  useEffect(() => {
    if (!auth.token) {
      setChecking(false);
      return;
    }
    api<{ user: AppUser }>("/api/auth/me")
      .then((r) => {
        setUser(r.user);
        setView("dashboard");
      })
      .catch(() => auth.set(null))
      .finally(() => setChecking(false));
  }, []);

  const logout = useCallback(() => {
    auth.set(null);
    setUser(null);
    setView("landing");
  }, []);

  useEffect(() => {
    const h = () => logout();
    window.addEventListener("fitbuddy:unauthorized", h);
    return () => window.removeEventListener("fitbuddy:unauthorized", h);
  }, [logout]);

  const go = (v: View) => setView(v === "dashboard" && !user ? "login" : v);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar view={view} setView={go} user={user} onLogout={logout} />
      {checking ? (
        <div className="flex-1 flex items-center justify-center text-xs font-mono text-slate-400">Loading…</div>
      ) : view === "landing" ? (
        <HeroLanding onStart={() => go("dashboard")} />
      ) : view === "login" || !user ? (
        <LoginPage
          onLoginSuccess={(u, token) => {
            auth.set(token);
            setUser(u);
            setView("dashboard");
          }}
          onNavigateLanding={() => setView("landing")}
        />
      ) : (
        <DashboardView user={user} onUserChange={setUser} />
      )}
    </div>
  );
}
