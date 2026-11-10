"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Bell,
  Bot,
  ChevronDown,
  ChevronRight,
  Clock,
  Gauge,
  LayoutGrid,
  Moon,
  Power,
  Search,
  Settings,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";

export function Header() {
  const {
    activeTab,
    setActiveTab,
    surface,
    setSurface,
    globalAutomationEnabled,
    toggleGlobalAutomation,
    activeHustleId,
    setActiveHustleId,
    hustles,
    setCmdSearchQuery,
    setCmdKOpen,
    isDarkMode,
    toggleDarkMode,
    notify,
  } = useCRM();

  const [profileMenuOpen, setProfileMenuOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const isCockpitActive = activeTab === "autopilot";
  const isCommandActive = activeTab !== "autopilot";

  const currentHustle = hustles.find((h) => h.id === activeHustleId);

  // Close dropdown on click outside or Esc key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileMenuOpen]);

  return (
    <header className="h-16 shrink-0 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-3 sm:gap-6 sticky top-0 z-30 transition-colors">
      {/* Left: Brand Identity & Compact Hustle Selector */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/25 text-xs sm:text-sm">
          OS
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">/</span>
          <select
            value={activeHustleId}
            onChange={(e) => setActiveHustleId(Number(e.target.value))}
            className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none cursor-pointer max-w-[130px] sm:max-w-none truncate"
          >
            {hustles.map((h) => (
              <option key={h.id} value={h.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                {h.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Center: Dual-Surface Switcher (Management vs Cockpit) */}
      <div className="flex items-center p-1 rounded-2xl bg-slate-100/90 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08] shadow-inner shrink-0">
        {/* Surface 1: Management */}
        <button
          onClick={() => {
            setSurface("management");
            if (activeTab === "autopilot" || activeTab.startsWith("cockpit_")) {
              setActiveTab("dashboard");
            }
          }}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
            isCommandActive && surface !== "cockpit"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 dark:bg-indigo-600 dark:text-white"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/[0.04]"
          }`}
          title="Switch to Management"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Management</span>
        </button>

        {/* Surface 2: Cockpit */}
        <button
          onClick={() => {
            setSurface("cockpit");
            setActiveTab("autopilot");
          }}
          className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
            isCockpitActive || surface === "cockpit"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25 dark:bg-emerald-600 dark:text-white"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/[0.04]"
          }`}
          title="Switch to Cockpit"
        >
          <Gauge className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Cockpit</span>
        </button>
      </div>

      {/* Global Search Bar (Desktop: >= 1024px) */}
      <div className="flex-1 max-w-xs xl:max-w-sm hidden lg:block">
        <div
          onClick={() => {
            setCmdSearchQuery("");
            setCmdKOpen(true);
          }}
          className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-slate-100/80 hover:bg-slate-200/70 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] border border-slate-200/80 dark:border-white/[0.08] text-xs text-slate-400 cursor-pointer transition-all shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-indigo-500" />
            <span>Search leads, tasks, commands...</span>
          </div>
          <kbd className="px-2 py-0.5 text-[10px] bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-slate-500 dark:text-slate-400 shadow-2xs">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Utility Items */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Global Automation Toggle Pill */}
        <button
          type="button"
          onClick={toggleGlobalAutomation}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
            globalAutomationEnabled
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
              : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
          }`}
          title={
            globalAutomationEnabled
              ? "Automation Active: WhatsApp messages queued for Playwright automation"
              : "Automation Paused: Outbound messages generate prefilled wa.me links"
          }
          aria-label={`Toggle Automation: Currently ${globalAutomationEnabled ? "ON" : "OFF"}`}
        >
          {globalAutomationEnabled ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <Bot className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AUTO: ON</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <Power className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AUTO: OFF</span>
            </>
          )}
        </button>
        {/* Mobile Search Button (< 1024px) */}
        <button
          type="button"
          onClick={() => {
            setCmdSearchQuery("");
            setCmdKOpen(true);
          }}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          title="Search (⌘K)"
          aria-label="Open command search"
        >
          <Search className="w-4 h-4 text-indigo-500" />
        </button>

        {/* Compact Light / Dark Mode Toggle Icon Button */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          )}
        </button>

        {/* Notifications Bell */}
        <button
          onClick={() => notify("All systems operational. No unhandled alerts.")}
          className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-900"></span>
        </button>

        {/* Interactive Captain Profile Dropdown Popover */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 pl-1 sm:px-2.5 sm:py-1 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer border border-transparent hover:border-slate-200/80 dark:hover:border-slate-700"
            title="Captain Profile & Hustle Settings"
            aria-expanded={profileMenuOpen}
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center font-bold text-white text-xs shadow-sm shadow-indigo-600/30">
              C
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-1">
                <span>Captain</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${profileMenuOpen ? "rotate-180" : ""}`} />
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Lead Operator</div>
            </div>
          </button>

          {/* Floating Popover Menu */}
          {profileMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-3">
              {/* Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center font-bold text-white text-sm shadow-md shadow-indigo-500/20">
                  C
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white">Captain</div>
                  <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Lead Operator &bull; Active
                  </div>
                </div>
              </div>

              {/* Active Hustle Details */}
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 space-y-1">
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Active Hustle
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {currentHustle?.name || "Dental Clinic Websites"}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                  <span>Target Deal Value:</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    ₹{(currentHustle?.deal_value_inr || 25000).toLocaleString()} INR
                  </span>
                </div>
              </div>

              {/* Action Menu Items */}
              <div className="space-y-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("settings");
                    setProfileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className="w-4 h-4 text-indigo-500 group-hover:rotate-45 transition-transform" />
                    <span>Hustle Settings</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("sprint");
                    setProfileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span>Day Mode Schedule</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    notify("Telemetry diagnostic report saved to system log.");
                    setProfileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Diagnostics &amp; Health</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-500">OK</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
