"use client";

import React, { useRef, useEffect } from "react";
import {
  Bell,
  Gauge,
  LayoutGrid,
  Search,
  WifiOff,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";

export function Header() {
  const {
    activeTab,
    setActiveTab,
    surface,
    setSurface,
    cmdKOpen,
    setCmdKOpen,
    notify,
    isBackendOffline,
    checkBackendHealth,
  } = useCRM();

  const isCockpitActive = activeTab === "autopilot";
  const isCommandActive = activeTab !== "autopilot";

  const triggerInputRef = useRef<HTMLInputElement | null>(null);

  // Global Cmd+K / Ctrl+K shortcut is also handled here to toggle the CommandPaletteModal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdKOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setCmdKOpen]);

  return (
    <div className="flex flex-col w-full shrink-0">
      {/* Persistent Non-Intrusive Backend Offline Floating Banner (zero layout shift) */}
      {isBackendOffline && (
        <div
          role="alert"
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[calc(100%-2rem)] sm:w-auto px-4 py-2 rounded-xl bg-amber-500/90 dark:bg-amber-950/90 border border-amber-600/30 dark:border-amber-500/40 flex items-center justify-between gap-3 text-xs text-amber-950 dark:text-amber-200 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <WifiOff className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 animate-pulse" />
            <div className="truncate">
              <span className="font-bold tracking-wide">Backend Disconnected</span>
              <span className="hidden sm:inline text-amber-900/80 dark:text-amber-300/80 ml-1.5">
                - Unable to reach API server. Retrying automatically with cached data preserved.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => checkBackendHealth()}
            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] shadow-sm transition-all cursor-pointer shrink-0 ml-3"
          >
            Reconnect Now
          </button>
        </div>
      )}

      <header className="px-4 sm:px-6 pt-3 pb-1 shrink-0 bg-transparent border-none shadow-none flex items-center justify-between gap-4 z-30 transition-colors">
        {/* 1. Left: Management | Cockpit Floating Pill Switcher */}
        <div className="flex items-center p-1 rounded-full bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-[#27272A] shadow-md shadow-slate-900/5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setSurface("management");
              if (activeTab === "autopilot" || activeTab.startsWith("cockpit_")) {
                setActiveTab("dashboard");
              }
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
              isCommandActive && surface !== "cockpit"
                ? "bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]"
            }`}
            title="Switch to Management"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Management</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSurface("cockpit");
              setActiveTab("autopilot");
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
              isCockpitActive || surface === "cockpit"
                ? "bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]"
            }`}
            title="Switch to Cockpit"
          >
            <Gauge className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cockpit</span>
          </button>
        </div>

        {/* 2. Center: Sleek Header Search Bar Trigger (Opens centered Command Palette Modal on Click or Cmd+K) */}
        <div className="flex-1 flex justify-center max-w-xl mx-auto">
          <button
            type="button"
            onClick={() => setCmdKOpen(true)}
            className="w-[420px] sm:w-[460px] md:w-[500px] max-w-xl flex items-center justify-between px-4 py-2 rounded-2xl bg-slate-200/70 hover:bg-slate-200/90 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-slate-300/80 dark:border-white/[0.1] shadow-[inset_0_2px_4px_rgba(15,23,42,0.07)] transition-all duration-200 cursor-pointer text-left group"
            title="Open Command Palette (Cmd+K)"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Search className="w-4 h-4 text-slate-500 group-hover:text-slate-700 dark:text-zinc-400 dark:group-hover:text-white transition-colors shrink-0" />
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 truncate">
                Search clinics, doctors, settings, actions...
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <kbd className="bg-white text-slate-600 dark:bg-[#27272A] dark:text-zinc-300 border border-slate-200/90 dark:border-[#3F3F46] shadow-sm rounded-md px-1.5 py-0.5 text-[11px] font-mono font-semibold flex items-center gap-0.5">
                <span>⌘</span>
                <span>K</span>
              </kbd>
            </div>
          </button>
        </div>

        {/* 3. Far Right: Notification Bell Button */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => {
              if (isBackendOffline) {
                notify("Backend server is disconnected. Retrying connection...", "err");
              } else {
                notify("All systems operational. No unhandled alerts.");
              }
            }}
            className="relative h-10 w-10 rounded-full bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-[#27272A] shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
            title={isBackendOffline ? "Backend Offline" : "Notifications"}
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span
              className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                isBackendOffline ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
              }`}
            />
          </button>
        </div>
      </header>
    </div>
  );
}
