"use client";

import React, { useEffect, useMemo } from "react";
import {
  Activity,
  ArrowRight,
  Bug,
  CheckCircle2,
  ChevronRight,
  CornerDownLeft,
  Download,
  Flame,
  LayoutDashboard,
  LayoutGrid,
  MapPin,
  Moon,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sun,
  Table as TableIcon,
  X,
  Zap,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { env } from "@/config/env";

export function CommandPaletteModal() {
  const {
    cmdKOpen,
    setCmdKOpen,
    cmdSearchQuery,
    setCmdSearchQuery,
    leads,
    setSelectedLeadId,
    setActiveTab,
    setPipelineBoardExpanded,
    setNewLeadModalOpen,
    setProblemModalOpen,
    handleTriggerRefill,
    handleSyncBatchLinks,
    isDarkMode,
    toggleDarkMode,
    activeHustleId,
  } = useCRM();

  // Global keyboard shortcuts (Cmd+K to open/close, Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdKOpen((prev) => !prev);
      } else if (e.key === "Escape" && cmdKOpen) {
        e.preventDefault();
        setCmdKOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cmdKOpen, setCmdKOpen]);

  const quickActions = useMemo(
    () => [
      {
        id: "add_lead",
        title: "Add New Lead",
        subtitle: "Register clinic prospect into pipeline",
        icon: Plus,
        badge: "Action",
        run: () => setNewLeadModalOpen(true),
      },
      {
        id: "run_refill",
        title: "Run Stock Refill Batch",
        subtitle: "Execute 7-step acquisition pipeline",
        icon: Play,
        badge: "Autopilot",
        run: () => handleTriggerRefill(),
      },
      {
        id: "verify_links",
        title: "Verify Links & Sync batch.json",
        subtitle: "Run HTTP 200 checks on demo previews",
        icon: CheckCircle2,
        badge: "Autopilot",
        run: () => handleSyncBatchLinks(),
      },
      {
        id: "view_board",
        title: "Pipeline Kanban Board",
        subtitle: "CustomerGo drag & drop pipeline view",
        icon: LayoutGrid,
        badge: "Navigation",
        run: () => {
          setActiveTab("board");
          setPipelineBoardExpanded(true);
        },
      },
      {
        id: "view_dashboard",
        title: "Executive Dashboard",
        subtitle: "Homies Lab metrics & daily command center",
        icon: LayoutDashboard,
        badge: "Navigation",
        run: () => setActiveTab("dashboard"),
      },
      {
        id: "view_table",
        title: "Full Leads Table",
        subtitle: "Inspect all leads with data attributes",
        icon: TableIcon,
        badge: "Navigation",
        run: () => setActiveTab("table"),
      },
      {
        id: "view_sprint",
        title: "Evening Sprint Mode",
        subtitle: "90-minute focused closing buffer",
        icon: Zap,
        badge: "Navigation",
        run: () => setActiveTab("sprint"),
      },
      {
        id: "view_autopilot",
        title: "Autopilot Traces & CLI Console",
        subtitle: "View logs, metrics, and Telegram CLI",
        icon: Activity,
        badge: "Navigation",
        run: () => setActiveTab("autopilot"),
      },
      {
        id: "toggle_theme",
        title: isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode",
        subtitle: "Toggle between Homies Lab Cream and Obsidian Carbon",
        icon: isDarkMode ? Sun : Moon,
        badge: "Preference",
        run: () => toggleDarkMode(),
      },
      {
        id: "export_csv",
        title: "Export Leads to CSV",
        subtitle: "Download full pipeline data snapshot",
        icon: Download,
        badge: "Data",
        run: () => {
          const apiBase = env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
          window.open(`${apiBase}/api/leads/export/csv?hustle_id=${activeHustleId}`, "_blank");
        },
      },
      {
        id: "report_problem",
        title: "Report Diagnostic Problem",
        subtitle: "Capture trace and report issue",
        icon: Bug,
        badge: "Help",
        run: () => {
          setProblemModalOpen(true);
        },
      },
    ],
    [isDarkMode, activeHustleId, setActiveTab, setPipelineBoardExpanded, setNewLeadModalOpen, setProblemModalOpen, handleTriggerRefill, handleSyncBatchLinks, toggleDarkMode]
  );

  const filteredQuickActions = useMemo(() => {
    if (!cmdSearchQuery.trim()) return quickActions;
    const q = cmdSearchQuery.toLowerCase();
    return quickActions.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.subtitle.toLowerCase().includes(q) ||
        a.badge.toLowerCase().includes(q)
    );
  }, [quickActions, cmdSearchQuery]);

  const filteredSearchLeads = useMemo(() => {
    if (!cmdSearchQuery.trim()) return [];
    const q = cmdSearchQuery.toLowerCase();
    return leads
      .filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.doctor_name && l.doctor_name.toLowerCase().includes(q)) ||
          (l.locality && l.locality.toLowerCase().includes(q)) ||
          (l.city && l.city.toLowerCase().includes(q)) ||
          (l.primary_phone && l.primary_phone.includes(q)) ||
          (l.next_action && l.next_action.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [leads, cmdSearchQuery]);

  if (!cmdKOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-24 px-4 animate-in fade-in duration-150"
      onClick={() => setCmdKOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/[0.08] flex items-center gap-3 bg-slate-50/50 dark:bg-[#0F1117]/80">
                <Search className="w-5 h-5 text-indigo-500 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={cmdSearchQuery}
                  onChange={(e) => setCmdSearchQuery(e.target.value)}
                  placeholder="Type a command or search leads, doctors, localities..."
                  className="flex-1 bg-transparent text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                />
                {cmdSearchQuery ? (
                  <button
                    onClick={() => setCmdSearchQuery("")}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <kbd className="px-2 py-0.5 text-[10px] bg-slate-200/60 dark:bg-white/[0.08] text-slate-500 dark:text-slate-400 rounded-lg border border-slate-300/60 dark:border-white/[0.08] font-mono">
                    ESC
                  </kbd>
                )}
              </div>

              {/* Results / Quick Actions Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* If matching leads exist */}
                {filteredSearchLeads.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 flex items-center justify-between">
                      <span>Matching Leads & Clinics</span>
                      <span className="font-mono text-indigo-500 font-semibold">{filteredSearchLeads.length} results</span>
                    </div>
                    <div className="space-y-1">
                      {filteredSearchLeads.map((lead) => (
                        <div
                          key={lead.id}
                          onClick={() => {
                            setSelectedLeadId(lead.id);
                            setCmdKOpen(false);
                            setCmdSearchQuery("");
                          }}
                          className="p-3 rounded-2xl hover:bg-indigo-50/80 dark:hover:bg-white/[0.05] border border-transparent hover:border-indigo-200 dark:hover:border-white/[0.08] flex items-center justify-between gap-3 cursor-pointer transition-all group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center font-bold text-xs text-indigo-600 dark:text-indigo-400 shrink-0">
                              {lead.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                                {lead.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                                <span>{lead.doctor_name || "Doctor"}</span>
                                <span>•</span>
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  {lead.locality || lead.city}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 font-bold">
                              ₹{lead.deal_value_inr || 25000}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-semibold">
                              {lead.fit_score}% Fit
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Actions (Claude style) */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2">
                    <span>{cmdSearchQuery ? "Matching Actions & Commands" : "Quick Actions"}</span>
                  </div>
                  <div className="space-y-1">
                    {filteredQuickActions.length === 0 && filteredSearchLeads.length === 0 ? (
                      <div className="py-10 text-center text-xs text-slate-400">
                        No matching leads or actions found for "{cmdSearchQuery}".
                      </div>
                    ) : (
                      filteredQuickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                          <div
                            key={action.id}
                            onClick={() => {
                              action.run();
                              setCmdKOpen(false);
                              setCmdSearchQuery("");
                            }}
                            className="p-3 rounded-2xl hover:bg-slate-100/80 dark:hover:bg-white/[0.05] border border-transparent hover:border-slate-200 dark:hover:border-white/[0.08] flex items-center justify-between gap-3 cursor-pointer transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-center shrink-0 transition-colors">
                                <Icon className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                  {action.title}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {action.subtitle}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 font-mono">
                                {action.badge}
                              </span>
                              <CornerDownLeft className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

        {/* Footer Navigation Hints */}
        <div className="p-3.5 border-t border-slate-100 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#0F1117]/80 flex items-center justify-between text-[11px] text-slate-400 px-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/[0.08] font-mono text-[9px]">ESC</kbd>
              <span>to close</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/[0.08] font-mono text-[9px]">↵</kbd>
              <span>to select</span>
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <span>CustomerGo Command Palette</span>
          </div>
        </div>
      </div>
    </div>
  );
}
