"use client";

import React from "react";
import {
  Activity,
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Flame,
  LayoutDashboard,
  LayoutGrid,
  MessageSquare,
  PanelLeft,
  PanelLeftClose,
  Settings,
  Table as TableIcon,
  Zap,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { MainTab } from "@/types";

export function Sidebar() {
  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    activeTab,
    setActiveTab,
    pipelineBoardExpanded,
    setPipelineBoardExpanded,
    activeSmartView,
    setActiveSmartView,
    bufferHealthPct,
  } = useCRM();

  if (sidebarCollapsed) {
    return (
      /* COLLAPSED FLOATING DOCK: Fits height to icons, big centered icons */
      <aside className="w-20 shrink-0 self-start m-3 rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#0F1117]/95 backdrop-blur-md shadow-xl p-2.5 flex flex-col items-center gap-2.5 transition-all duration-200 z-20">
        {/* Expand Toggle */}
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="w-11 h-11 rounded-2xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          title="Expand Sidebar"
        >
          <PanelLeft className="w-5 h-5 text-indigo-500" />
        </button>

        <div className="w-8 h-px bg-slate-200 dark:bg-white/[0.08]" />

        {/* Big Icons Navigation */}
        <nav className="flex flex-col items-center gap-2">
          {[
            { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
            { id: "board", label: "Pipeline Board", icon: LayoutGrid },
            { id: "table", label: "Leads Table", icon: TableIcon },
            { id: "sprint", label: "Evening Sprint", icon: Zap },
            { id: "autopilot", label: "Autopilot & Traces", icon: Activity },
            { id: "settings", label: "Hustle Settings", icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as MainTab);
                  if (item.id === "board") setPipelineBoardExpanded(true);
                }}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative group ${
                  active
                    ? "bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-lg shadow-slate-900/25 dark:shadow-indigo-600/35 scale-105"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                }`}
                title={item.label}
              >
                <Icon className="w-5 h-5" />
                {active && (
                  <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-5 rounded-full bg-indigo-500" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="w-8 h-px bg-slate-200 dark:bg-white/[0.08]" />

        {/* Mini Autopilot Indicator */}
        <button
          onClick={() => setActiveTab("autopilot")}
          className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/50 flex items-center justify-center relative cursor-pointer hover:scale-105 transition-transform"
          title={`Autopilot Engine: ONLINE (${bufferHealthPct}% buffer health)`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        </button>
      </aside>
    );
  }

  return (
    /* EXPANDED FULL SIDEBAR: Menu with File-Tree Smart Queues under Pipeline Board */
    <aside className="w-64 shrink-0 h-full border-r border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0F1117] backdrop-blur-md p-4 flex flex-col justify-between overflow-y-auto transition-all duration-200 z-20">
      <div className="space-y-6">
        {/* Main Navigation Menu */}
        <div>
          <div className="px-2 pb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <span>Menu</span>
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              title="Collapse Sidebar"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          </div>
          <nav className="space-y-1">
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { id: "board", label: "Pipeline Board", icon: LayoutGrid },
              { id: "table", label: "Leads Table", icon: TableIcon },
              { id: "sprint", label: "Evening Sprint", icon: Zap },
              { id: "autopilot", label: "Autopilot & Traces", icon: Activity },
              { id: "settings", label: "Hustle Settings", icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;

              // Specialized Subtree for Pipeline Board (File-Tree Structure with Smart Queues)
              if (item.id === "board") {
                return (
                  <div key="board" className="space-y-1">
                    <button
                      onClick={() => {
                        setActiveTab("board");
                        setPipelineBoardExpanded((prev) => (activeTab === "board" ? !prev : true));
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                        active
                          ? "bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-md shadow-slate-900/20 dark:shadow-indigo-600/30"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setPipelineBoardExpanded(!pipelineBoardExpanded);
                        }}
                        className="p-1 rounded-md hover:bg-white/10 transition-colors"
                      >
                        {pipelineBoardExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                        )}
                      </div>
                    </button>

                    {/* Dragdown Subpart: File Structure of Smart Queues */}
                    {pipelineBoardExpanded && (
                      <div className="ml-5 pl-3 border-l-2 border-slate-200 dark:border-white/[0.1] space-y-0.5 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                        {[
                          { slug: "all_active", label: "All Active Pipeline", icon: LayoutGrid, color: "text-indigo-500" },
                          { slug: "review_tray", label: "Review Tray (Ready)", icon: CheckCircle2, color: "text-emerald-500" },
                          { slug: "due_today", label: "Due Today & Overdue", icon: Clock, color: "text-amber-500" },
                          { slug: "hot_intent", label: "Hot Demo Viewers", icon: Flame, color: "text-rose-500" },
                          { slug: "replied_warm", label: "Active Replies", icon: MessageSquare, color: "text-blue-500" },
                          { slug: "archived", label: "Archived & DNC", icon: Archive, color: "text-slate-400" },
                        ].map((v) => {
                          const SubIcon = v.icon;
                          const isSubActive = activeTab === "board" && activeSmartView === v.slug;
                          return (
                            <button
                              key={v.slug}
                              onClick={() => {
                                setActiveSmartView(v.slug);
                                setActiveTab("board");
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer relative group ${
                                isSubActive
                                  ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-500/30"
                                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    isSubActive ? "bg-indigo-500 scale-125" : "bg-slate-300 dark:bg-slate-600"
                                  }`}
                                />
                                <SubIcon className={`w-3.5 h-3.5 ${v.color} shrink-0`} />
                                <span className="truncate">{v.label}</span>
                              </div>
                              {isSubActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as MainTab)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? "bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-md shadow-slate-900/20 dark:shadow-indigo-600/30"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Autopilot Status Card in Sidebar (CustomerGo "Unlock More Feature" card style) */}
      <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-[#12141D] border border-indigo-100 dark:border-white/[0.08] space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Autopilot Engine</span>
          </span>
          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">ONLINE</span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
          7-step verification active. Enforcing no-website and 2-source check.
        </p>
        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${bufferHealthPct}%` }}></div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
          <span>Stock Buffer</span>
          <span className="font-mono">{bufferHealthPct}% full</span>
        </div>
      </div>
    </aside>
  );
}
