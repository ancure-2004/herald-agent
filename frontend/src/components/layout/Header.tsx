"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Bell,
  CheckCircle2,
  Clock,
  CornerDownLeft,
  Gauge,
  LayoutDashboard,
  LayoutGrid,
  MapPin,
  Play,
  Plus,
  Search,
  Table as TableIcon,
  X,
  Zap,
} from "lucide-react";
import { useCRM, CRMTab } from "@/context/CRMContext";

const DEFAULT_RECENT_SEARCHES = [
  "Dr. Sharma Dental",
  "South Delhi clinics",
  "Ready Demos",
  "Orthodontics",
];

export function Header() {
  const {
    activeTab,
    setActiveTab,
    surface,
    setSurface,
    cmdSearchQuery,
    setCmdSearchQuery,
    cmdKOpen,
    setCmdKOpen,
    notify,
    leads,
    setSelectedLeadId,
    setPipelineBoardExpanded,
    setNewLeadModalOpen,
    handleTriggerRefill,
    handleSyncBatchLinks,
  } = useCRM();

  const isCockpitActive = activeTab === "autopilot";
  const isCommandActive = activeTab !== "autopilot";

  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [recentSearches, setRecentSearches] = useState<string[]>(DEFAULT_RECENT_SEARCHES);

  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sync with localStorage for recent searches
  useEffect(() => {
    try {
      const saved = localStorage.getItem("crm_recent_searches_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentSearches(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const saveRecentSearches = useCallback((searches: string[]) => {
    setRecentSearches(searches);
    try {
      localStorage.setItem("crm_recent_searches_v1", JSON.stringify(searches));
    } catch {
      // ignore
    }
  }, []);

  const addRecentSearch = useCallback(
    (query: string) => {
      const q = query.trim();
      if (!q) return;
      const updated = [q, ...recentSearches.filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, 6);
      saveRecentSearches(updated);
    },
    [recentSearches, saveRecentSearches]
  );

  const removeRecentSearch = useCallback(
    (item: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const updated = recentSearches.filter((s) => s !== item);
      saveRecentSearches(updated);
    },
    [recentSearches, saveRecentSearches]
  );

  // Global Cmd+K / Ctrl+K & Escape shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => {
          if (!prev) {
            setTimeout(() => inputRef.current?.focus(), 50);
          }
          return !prev;
        });
        setCmdKOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        if (searchOpen || cmdKOpen) {
          e.preventDefault();
          setSearchOpen(false);
          setCmdKOpen(false);
          inputRef.current?.blur();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen, cmdKOpen, setCmdKOpen]);

  // Click outside listener for anchored dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setSearchOpen(false);
        setCmdKOpen(false);
      }
    };

    if (searchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchOpen, setCmdKOpen]);

  // Primary 2-Column Action Cards
  const primaryActions = useMemo(
    () => [
      {
        id: "add_lead",
        title: "+ Add New Lead",
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
        title: "Verify Links & Sync",
        subtitle: "Run HTTP 200 checks on demo previews",
        icon: CheckCircle2,
        badge: "Autopilot",
        run: () => handleSyncBatchLinks(),
      },
    ],
    [setNewLeadModalOpen, handleTriggerRefill, handleSyncBatchLinks]
  );

  // Navigation Shortcuts
  const navShortcuts = useMemo(
    () => [
      {
        id: "nav_board",
        title: "Pipeline Kanban Board",
        badge: "Board",
        icon: LayoutGrid,
        run: () => {
          setActiveTab("board");
          setPipelineBoardExpanded(true);
        },
      },
      {
        id: "nav_dashboard",
        title: "Executive Dashboard",
        badge: "Overview",
        icon: LayoutDashboard,
        run: () => setActiveTab("dashboard"),
      },
      {
        id: "nav_table",
        title: "Full Leads Table",
        badge: "Table",
        icon: TableIcon,
        run: () => setActiveTab("table"),
      },
      {
        id: "nav_sprint",
        title: "Evening Sprint Mode",
        badge: "Sprint",
        icon: Zap,
        run: () => setActiveTab("sprint"),
      },
    ],
    [setActiveTab, setPipelineBoardExpanded]
  );

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    if (!cmdSearchQuery.trim()) return [];
    const q = cmdSearchQuery.toLowerCase();
    return leads
      .filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.doctor_name && l.doctor_name.toLowerCase().includes(q)) ||
          (l.locality && l.locality.toLowerCase().includes(q)) ||
          (l.city && l.city.toLowerCase().includes(q)) ||
          (l.primary_phone && l.primary_phone.includes(q))
      )
      .slice(0, 6);
  }, [leads, cmdSearchQuery]);

  // Filtered Actions
  const filteredPrimaryActions = useMemo(() => {
    if (!cmdSearchQuery.trim()) return primaryActions;
    const q = cmdSearchQuery.toLowerCase();
    return primaryActions.filter(
      (a) => a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q)
    );
  }, [primaryActions, cmdSearchQuery]);

  const filteredNavShortcuts = useMemo(() => {
    if (!cmdSearchQuery.trim()) return navShortcuts;
    const q = cmdSearchQuery.toLowerCase();
    return navShortcuts.filter((a) => a.title.toLowerCase().includes(q));
  }, [navShortcuts, cmdSearchQuery]);

  // Flat list of selectable items for keyboard navigation
  const selectableItems = useMemo(() => {
    if (cmdSearchQuery.trim()) {
      const items: Array<{ type: "lead" | "action"; item: any }> = [];
      filteredLeads.forEach((l) => items.push({ type: "lead", item: l }));
      filteredPrimaryActions.forEach((a) => items.push({ type: "action", item: a }));
      filteredNavShortcuts.forEach((a) => items.push({ type: "action", item: a }));
      return items;
    }
    const items: Array<{ type: "lead" | "action"; item: any }> = [];
    primaryActions.forEach((a) => items.push({ type: "action", item: a }));
    navShortcuts.forEach((a) => items.push({ type: "action", item: a }));
    return items;
  }, [cmdSearchQuery, filteredLeads, filteredPrimaryActions, filteredNavShortcuts, primaryActions, navShortcuts]);

  // Handle keyboard navigation inside search input
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, selectableItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev <= 0 ? selectableItems.length - 1 : prev - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = selectableItems[selectedIndex];
      if (current) {
        if (current.type === "lead") {
          addRecentSearch(current.item.name);
          setSelectedLeadId(current.item.id);
          setSearchOpen(false);
          setCmdKOpen(false);
          setCmdSearchQuery("");
        } else if (current.type === "action") {
          addRecentSearch(current.item.title);
          current.item.run();
          setSearchOpen(false);
          setCmdKOpen(false);
          setCmdSearchQuery("");
        }
      }
    }
  };

  const isDropdownActive = searchOpen || cmdKOpen;

  return (
    <header className="px-4 sm:px-6 pt-3 pb-1 shrink-0 bg-transparent border-none shadow-none flex items-center justify-between gap-4 z-30 transition-colors">
      {/* 1. Left: Management | Cockpit Floating Pill Switcher */}
      <div className="flex items-center p-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-md shadow-slate-900/5 shrink-0">
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
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]"
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
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]"
          }`}
          title="Switch to Cockpit"
        >
          <Gauge className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Cockpit</span>
        </button>
      </div>

      {/* 2. Center: Anchored Morphing Search Bar (Dead-center, w-[420px] to w-[500px]) */}
      <div ref={searchContainerRef} className="flex-1 flex justify-center max-w-xl mx-auto relative">
        <div
          onClick={() => {
            setSearchOpen(true);
            setCmdKOpen(true);
            inputRef.current?.focus();
          }}
          className={`w-[420px] sm:w-[460px] md:w-[500px] max-w-xl flex items-center justify-between px-4 py-2 rounded-2xl transition-all duration-200 cursor-text ${
            isDropdownActive
              ? "bg-white dark:bg-slate-900 border border-zinc-900/20 dark:border-white/20 shadow-xl"
              : "bg-slate-200/70 hover:bg-slate-200/90 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-slate-300/80 dark:border-white/[0.1] shadow-[inset_0_2px_4px_rgba(15,23,42,0.07)]"
          }`}
        >
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={cmdSearchQuery}
              onChange={(e) => {
                setCmdSearchQuery(e.target.value);
                setSelectedIndex(0);
                if (!searchOpen) {
                  setSearchOpen(true);
                  setCmdKOpen(true);
                }
              }}
              onFocus={() => {
                setSearchOpen(true);
                setCmdKOpen(true);
              }}
              onKeyDown={handleInputKeyDown}
              placeholder="Search clinics, doctors, actions..."
              className="bg-transparent flex-1 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {cmdSearchQuery ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCmdSearchQuery("");
                  inputRef.current?.focus();
                }}
                className="p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/90 dark:border-slate-700 shadow-sm rounded-md px-1.5 py-0.5 text-[11px] font-mono font-medium">
                ⌘K
              </kbd>
            )}
          </div>
        </div>

        {/* Anchored Morphing Dropdown Panel Directly Below */}
        {isDropdownActive && (
          <div className="absolute top-full mt-2 w-full sm:w-[520px] left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl z-50 overflow-hidden text-left animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="p-3.5 max-h-[460px] overflow-y-auto space-y-3.5">
              {/* 1. Recent Searches Pill Row (when search query is empty) */}
              {!cmdSearchQuery.trim() && recentSearches.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                    Recent Searches
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {recentSearches.map((item) => (
                      <div
                        key={item}
                        onClick={() => {
                          setCmdSearchQuery(item);
                          setSelectedIndex(0);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-xs text-slate-700 dark:text-slate-300 cursor-pointer transition-colors border border-slate-200/60 dark:border-white/[0.06] group"
                      >
                        <Clock className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                        <span className="font-medium text-[11px]">{item}</span>
                        <button
                          type="button"
                          onClick={(e) => removeRecentSearch(item, e)}
                          className="hover:text-rose-500 p-0.5 text-slate-400 rounded-full"
                          title="Remove search"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Filtered Leads (when typing query) */}
              {cmdSearchQuery.trim() && filteredLeads.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 flex items-center justify-between">
                    <span>Matching Leads &amp; Clinics</span>
                    <span className="font-mono text-zinc-900 dark:text-white font-semibold">
                      {filteredLeads.length} results
                    </span>
                  </div>
                  <div className="space-y-1">
                    {filteredLeads.map((lead, idx) => {
                      const isSelected = selectedIndex === idx;
                      return (
                        <div
                          key={lead.id}
                          onClick={() => {
                            addRecentSearch(lead.name);
                            setSelectedLeadId(lead.id);
                            setSearchOpen(false);
                            setCmdKOpen(false);
                            setCmdSearchQuery("");
                          }}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                            isSelected
                              ? "bg-slate-100 dark:bg-white/[0.08] border-slate-300 dark:border-white/20"
                              : "border-transparent hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center font-bold text-xs shrink-0">
                              {lead.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {lead.name}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
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
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 font-bold">
                              ₹{(lead.deal_value_inr || 25000).toLocaleString()}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 font-semibold">
                              {lead.fit_score}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. Primary Actions (Compact 2-Column Grid) */}
              {filteredPrimaryActions.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                    Primary Actions
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {filteredPrimaryActions.map((action, idx) => {
                      const itemIdx = filteredLeads.length + idx;
                      const isSelected = selectedIndex === itemIdx;
                      const Icon = action.icon;
                      return (
                        <div
                          key={action.id}
                          onClick={() => {
                            addRecentSearch(action.title);
                            action.run();
                            setSearchOpen(false);
                            setCmdKOpen(false);
                            setCmdSearchQuery("");
                          }}
                          className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                            isSelected
                              ? "bg-slate-100 dark:bg-white/[0.08] border-slate-300 dark:border-white/20"
                              : "bg-slate-50/70 hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border-slate-200/60 dark:border-white/[0.06]"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center shrink-0">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {action.title}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {action.subtitle}
                              </div>
                            </div>
                          </div>
                          <CornerDownLeft className="w-3 h-3 text-slate-400 shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. Navigation Shortcuts (Compact Single-Row List) */}
              {filteredNavShortcuts.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                    Navigation Shortcuts
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {filteredNavShortcuts.map((item, idx) => {
                      const itemIdx = filteredLeads.length + filteredPrimaryActions.length + idx;
                      const isSelected = selectedIndex === itemIdx;
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            item.run();
                            setSearchOpen(false);
                            setCmdKOpen(false);
                            setCmdSearchQuery("");
                          }}
                          className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                            isSelected
                              ? "bg-slate-100 dark:bg-white/[0.08] border-slate-300 dark:border-white/20"
                              : "border-transparent hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                              {item.title}
                            </span>
                          </div>
                          <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 shrink-0 font-semibold">
                            {item.badge}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Zero Results State */}
              {cmdSearchQuery.trim() &&
                filteredLeads.length === 0 &&
                filteredPrimaryActions.length === 0 &&
                filteredNavShortcuts.length === 0 && (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No matching clinics, leads, or actions found for "{cmdSearchQuery}".
                  </div>
                )}
            </div>

            {/* Anchored Dropdown Footer */}
            <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-400 px-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[9px]">
                    ESC
                  </kbd>
                  <span>to close</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[9px]">
                    ↵
                  </kbd>
                  <span>to select</span>
                </span>
              </div>
              <div className="font-semibold text-[10px] text-zinc-500 dark:text-zinc-400 tracking-wide">
                FirstMate Command
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Far Right: Notification Bell Button Only */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={() => notify("All systems operational. No unhandled alerts.")}
          className="relative h-10 w-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
        </button>
      </div>
    </header>
  );
}
