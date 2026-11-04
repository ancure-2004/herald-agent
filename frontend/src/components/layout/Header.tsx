"use client";

import React from "react";
import {
  Bell,
  Moon,
  PanelLeft,
  PanelLeftClose,
  Plus,
  Search,
  Sun,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";

export function Header() {
  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    activeHustleId,
    setActiveHustleId,
    hustles,
    setCmdSearchQuery,
    setCmdKOpen,
    isDarkMode,
    toggleDarkMode,
    notify,
    setNewLeadModalOpen,
  } = useCRM();

  return (
      <header className="h-16 shrink-0 border-b border-slate-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#0F1117]/95 backdrop-blur-md px-6 flex items-center justify-between gap-6 sticky top-0 z-30 transition-colors">
        {/* Left: Brand Identity, Sidebar Collapse Button & Compact Hustle Selector */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="w-5 h-5 text-indigo-500" />
            ) : (
              <PanelLeftClose className="w-5 h-5 text-slate-400" />
            )}
          </button>

          <div className="w-9 h-9 rounded-2xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/25 text-sm">
            OS
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">CustomerGo</span>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">/</span>
            <select
              value={activeHustleId}
              onChange={(e) => setActiveHustleId(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none cursor-pointer"
            >
              {hustles.map((h) => (
                <option key={h.id} value={h.id} className="bg-white dark:bg-[#141721] text-slate-800 dark:text-white">
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: Global Search Bar (Claude & CustomerGo style with ⌘K) */}
        <div className="flex-1 max-w-md hidden md:block">
          <div
            onClick={() => {
              setCmdSearchQuery("");
              setCmdKOpen(true);
            }}
            className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-slate-100/80 hover:bg-slate-200/70 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] border border-slate-200/80 dark:border-white/[0.08] text-xs text-slate-400 cursor-pointer transition-all shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-indigo-500" />
              <span>Search leads, doctors, tasks, commands...</span>
            </div>
            <kbd className="px-2 py-0.5 text-[10px] bg-white dark:bg-[#141721] rounded-lg border border-slate-200 dark:border-white/[0.1] font-mono text-slate-500 dark:text-slate-400 shadow-2xs">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right: Light/Dark Mode Switcher, Notifications, Captain Profile, Add Lead */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Light / Dark Mode Toggle Switch (CustomerGo Exact Style) */}
          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Dark Mode</span>
              </>
            )}
          </button>

          {/* Notifications Bell */}
          <button
            onClick={() => notify("All systems operational. No unhandled alerts.")}
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-[#0F1117]"></span>
          </button>

          {/* User Profile Chip (CustomerGo Style) */}
          <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-white/[0.08]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs shadow-sm">
              C
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">Captain</div>
              <div className="text-[10px] text-slate-400 font-medium">Lead Operator</div>
            </div>
          </div>

          {/* "+ Add Lead" Primary Action Button (CustomerGo Style) */}
          <button
            onClick={() => setNewLeadModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Lead</span>
          </button>
        </div>
      </header>

  );
}
