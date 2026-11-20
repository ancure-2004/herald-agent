"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  X,
  Clock,
  Sparkles,
  Layers,
  Sliders,
  Cpu,
  Palette,
  User,
  Plus,
  Play,
  CheckCircle2,
  LayoutGrid,
  LayoutDashboard,
  Table as TableIcon,
  Zap,
  CornerDownLeft,
  Building2,
  Stethoscope,
  Settings as SettingsIcon,
  Shield,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  MapPin,
  Flame,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";

export type SearchFilterType = "all" | "clinics" | "doctors" | "actions" | "settings";

interface FilterChip {
  id: SearchFilterType;
  label: string;
  icon: React.ElementType;
}

const FILTER_CHIPS: FilterChip[] = [
  { id: "all", label: "All", icon: Search },
  { id: "clinics", label: "Clinics", icon: Building2 },
  { id: "doctors", label: "Doctors", icon: Stethoscope },
  { id: "actions", label: "Actions", icon: Zap },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

const DEFAULT_RECENT_SEARCHES = [
  "Dr. Sharma Dental",
  "South Delhi clinics",
  "Quotas & Safety Caps",
  "Run Stock Refill",
];

interface SettingsSectionIndex {
  id: string; // tab id in settings
  tabLabel: string;
  title: string;
  subtitle: string;
  keywords: string[];
  icon: React.ElementType;
}

const SETTINGS_SECTIONS: SettingsSectionIndex[] = [
  {
    id: "blueprint",
    tabLabel: "Hustle & Blueprint",
    title: "Hustle Blueprint & Autonomy",
    subtitle: "Configure target region, package value, and Copilot vs Autopilot mode",
    keywords: ["autonomy", "copilot", "autopilot", "blueprint", "hustle", "delhi ncr", "package value", "pipeline", "deal value"],
    icon: Sparkles,
  },
  {
    id: "waterfall",
    tabLabel: "Discovery Waterfall",
    title: "Discovery Waterfall & Sources",
    subtitle: "Configure 4-tier discovery routing, Google Places, Serper, Brave, and Instagram toggle",
    keywords: ["waterfall", "discovery", "sources", "places", "google places", "maps", "serper", "brave", "instagram", "search query"],
    icon: Layers,
  },
  {
    id: "quotas",
    tabLabel: "Quotas & Safety Caps",
    title: "Quotas, Caps & Safety Invariants",
    subtitle: "Daily outbound limits, WhatsApp/IG/Email caps, batch size, and Dry-Run toggle",
    keywords: ["quotas", "caps", "safety", "limits", "dry run", "dry_run", "batch size", "whatsapp limit", "instagram limit", "email limit", "safety invariant"],
    icon: Sliders,
  },
  {
    id: "mcp",
    tabLabel: "MCP & Integrations",
    title: "MCP Server & Tool Registry",
    subtitle: "AI Model config (Gemini/Groq keys) and Antigravity / Claude Code stdio MCP server",
    keywords: ["mcp", "tools", "gemini", "groq", "ai provider", "api key", "json-rpc", "antigravity", "claude code", "cursor", "stdio"],
    icon: Cpu,
  },
  {
    id: "appearance",
    tabLabel: "Appearance & UI",
    title: "Appearance & UI Preferences",
    subtitle: "Light / Dark / System theme, UI density, animations, and auto-expand consoles",
    keywords: ["appearance", "theme", "dark mode", "light mode", "density", "animations", "motion", "compact"],
    icon: Palette,
  },
  {
    id: "profile",
    tabLabel: "Operator Profile",
    title: "Operator Profile & Identity",
    subtitle: "Operator initials, full name, role credentials, and email/WhatsApp sign-off signature",
    keywords: ["profile", "operator", "signature", "signoff", "initials", "name", "role", "identity"],
    icon: User,
  },
];

export function CommandPaletteModal() {
  const {
    cmdKOpen,
    setCmdKOpen,
    cmdSearchQuery,
    setCmdSearchQuery,
    setSettingsModalOpen,
    leads,
    setSelectedLeadId,
    setActiveTab,
    setSettingsTab,
    setPipelineBoardExpanded,
    setNewLeadModalOpen,
    handleTriggerRefill,
    handleSyncBatchLinks,
    notify,
  } = useCRM();

  const [activeFilter, setActiveFilter] = useState<SearchFilterType>("all");
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [recentSearches, setRecentSearches] = useState<string[]>(DEFAULT_RECENT_SEARCHES);
  const [mounted, setMounted] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync recent searches from localStorage
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

  // Focus input on open
  useEffect(() => {
    if (cmdKOpen) {
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [cmdKOpen]);

  // Global Cmd+K / Ctrl+K and Esc listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
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

  // Quick / Primary Actions
  const primaryActions = useMemo(
    () => [
      {
        id: "add_lead",
        title: "+ Add New Lead",
        subtitle: "Register new clinic prospect into pipeline",
        icon: Plus,
        category: "actions" as const,
        shortcut: "N",
        badge: "Action",
        run: () => setNewLeadModalOpen(true),
      },
      {
        id: "run_refill",
        title: "Run Stock Refill Batch",
        subtitle: "Execute automated 7-step acquisition pipeline",
        icon: Play,
        category: "actions" as const,
        shortcut: "R",
        badge: "Autopilot",
        run: () => handleTriggerRefill(),
      },
      {
        id: "verify_links",
        title: "Verify Demo Previews & Sync",
        subtitle: "Run HTTP 200 health audits on preview themes",
        icon: CheckCircle2,
        category: "actions" as const,
        shortcut: "V",
        badge: "Autopilot",
        run: () => handleSyncBatchLinks(),
      },
      {
        id: "nav_board",
        title: "Pipeline Kanban Board",
        subtitle: "Visual stage progression & lead columns",
        icon: LayoutGrid,
        category: "actions" as const,
        shortcut: "B",
        badge: "View",
        run: () => {
          setActiveTab("board");
          setPipelineBoardExpanded(true);
        },
      },
      {
        id: "nav_table",
        title: "Full Leads Table",
        subtitle: "Filterable table with intent scores & inspect drawer",
        icon: TableIcon,
        category: "actions" as const,
        shortcut: "T",
        badge: "View",
        run: () => setActiveTab("table"),
      },
      {
        id: "nav_dashboard",
        title: "Executive Dashboard",
        subtitle: "Pipeline metrics, deal value & stage breakdown",
        icon: LayoutDashboard,
        category: "actions" as const,
        shortcut: "D",
        badge: "View",
        run: () => setActiveTab("dashboard"),
      },
      {
        id: "nav_sprint",
        title: "Evening Sprint Mode",
        subtitle: "Focused high-intent conversion sessions",
        icon: Zap,
        category: "actions" as const,
        shortcut: "S",
        badge: "Sprint",
        run: () => setActiveTab("sprint"),
      },
    ],
    [setNewLeadModalOpen, handleTriggerRefill, handleSyncBatchLinks, setActiveTab, setPipelineBoardExpanded]
  );

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    if (activeFilter === "actions" || activeFilter === "settings") return [];
    const q = cmdSearchQuery.trim().toLowerCase();

    let list = leads;
    if (activeFilter === "clinics") {
      // Clinic-focused match
      if (!q) return list.slice(0, 8);
      return list.filter((l) => l.name.toLowerCase().includes(q) || (l.locality && l.locality.toLowerCase().includes(q))).slice(0, 8);
    }
    if (activeFilter === "doctors") {
      // Doctor-focused match
      if (!q) return list.filter((l) => Boolean(l.doctor_name)).slice(0, 8);
      return list.filter((l) => l.doctor_name && l.doctor_name.toLowerCase().includes(q)).slice(0, 8);
    }

    // "all" filter
    if (!q) return [];
    return list
      .filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.doctor_name && l.doctor_name.toLowerCase().includes(q)) ||
          (l.locality && l.locality.toLowerCase().includes(q)) ||
          (l.city && l.city.toLowerCase().includes(q)) ||
          (l.primary_phone && l.primary_phone.includes(q))
      )
      .slice(0, 6);
  }, [leads, cmdSearchQuery, activeFilter]);

  // Filtered Actions
  const filteredActions = useMemo(() => {
    if (activeFilter === "clinics" || activeFilter === "doctors" || activeFilter === "settings") {
      return [];
    }
    const q = cmdSearchQuery.trim().toLowerCase();
    if (!q) {
      return activeFilter === "actions" ? primaryActions : primaryActions.slice(0, 4);
    }
    return primaryActions.filter(
      (a) => a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q)
    );
  }, [primaryActions, cmdSearchQuery, activeFilter]);

  // Filtered Settings Sections (Dynamic Settings Index Search)
  const filteredSettings = useMemo(() => {
    if (activeFilter === "clinics" || activeFilter === "doctors" || activeFilter === "actions") {
      return [];
    }
    const q = cmdSearchQuery.trim().toLowerCase();
    if (!q) {
      return activeFilter === "settings" ? SETTINGS_SECTIONS : [];
    }
    return SETTINGS_SECTIONS.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.subtitle.toLowerCase().includes(q) ||
        s.tabLabel.toLowerCase().includes(q) ||
        s.keywords.some((k) => k.includes(q))
    );
  }, [cmdSearchQuery, activeFilter]);

  // Unified Selectable Items List for Keyboard Navigation
  interface SelectableItem {
    type: "lead" | "action" | "setting";
    id: string;
    label: string;
    item: any;
  }

  const selectableItems: SelectableItem[] = useMemo(() => {
    const items: SelectableItem[] = [];

    filteredLeads.forEach((lead) => {
      items.push({
        type: "lead",
        id: `lead-${lead.id}`,
        label: lead.name,
        item: lead,
      });
    });

    filteredActions.forEach((act) => {
      items.push({
        type: "action",
        id: `act-${act.id}`,
        label: act.title,
        item: act,
      });
    });

    filteredSettings.forEach((set) => {
      items.push({
        type: "setting",
        id: `set-${set.id}`,
        label: set.title,
        item: set,
      });
    });

    return items;
  }, [filteredLeads, filteredActions, filteredSettings]);

  // Keep selected index in bounds
  useEffect(() => {
    if (selectedIndex >= selectableItems.length) {
      setSelectedIndex(Math.max(0, selectableItems.length - 1));
    }
  }, [selectableItems.length, selectedIndex]);

  // Scroll active item into view
  useEffect(() => {
    if (!listContainerRef.current) return;
    const activeEl = listContainerRef.current.querySelector('[data-selected="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const executeSelection = (item: SelectableItem) => {
    if (item.type === "lead") {
      addRecentSearch(item.item.name);
      setSelectedLeadId(item.item.id);
      setCmdKOpen(false);
      setCmdSearchQuery("");
    } else if (item.type === "action") {
      addRecentSearch(item.item.title);
      item.item.run();
      setCmdKOpen(false);
      setCmdSearchQuery("");
    } else if (item.type === "setting") {
      addRecentSearch(item.item.tabLabel);
      setSettingsTab(item.item.id);
      setSettingsModalOpen(true);
      notify(`Opened Settings: ${item.item.tabLabel}`, "ok");
      setCmdKOpen(false);
      setCmdSearchQuery("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (selectableItems.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % selectableItems.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (selectableItems.length > 0) {
        setSelectedIndex((prev) => (prev <= 0 ? selectableItems.length - 1 : prev - 1));
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = selectableItems[selectedIndex];
      if (current) {
        executeSelection(current);
      }
    }
  };

  if (!cmdKOpen || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cmd-palette-title"
      onClick={() => setCmdKOpen(false)}
      className="fixed inset-0 top-0 left-0 w-screen h-screen z-[99999] bg-black/60 dark:bg-black/75 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4 animate-in fade-in duration-150 overflow-hidden"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white dark:bg-[#12151E] rounded-2xl border border-slate-200/90 dark:border-white/[0.1] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
      >
        {/* Top Input Header Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-white/[0.08] flex items-center gap-3 bg-white dark:bg-[#161925]">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={cmdSearchQuery}
            onChange={(e) => {
              setCmdSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              activeFilter === "settings"
                ? "Search settings, quotas, MCP keys, appearance..."
                : activeFilter === "clinics"
                ? "Search clinics by name or locality..."
                : activeFilter === "doctors"
                ? "Search doctors by name..."
                : activeFilter === "actions"
                ? "Search quick actions and navigation..."
                : "Type a command or search clinics, doctors, settings..."
            }
            className="flex-1 bg-transparent text-sm sm:text-base font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
          />

          <div className="flex items-center gap-2 shrink-0">
            {cmdSearchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setCmdSearchQuery("");
                  setSelectedIndex(0);
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                title="Clear query"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}

            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08]">
              <span>ESC</span>
            </kbd>
          </div>
        </div>

        {/* Searching For Filter Chips Bar */}
        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/70 dark:bg-white/[0.02] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mr-1 shrink-0">
            Filter:
          </span>
          {FILTER_CHIPS.map((chip) => {
            const Icon = chip.icon;
            const isActive = activeFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => {
                  setActiveFilter(chip.id);
                  setSelectedIndex(0);
                  inputRef.current?.focus();
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs"
                    : "bg-white dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.08]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content / Results */}
        <div
          ref={listContainerRef}
          className="p-3.5 max-h-[460px] overflow-y-auto space-y-4 text-xs"
        >
          {/* 1. Recent Searches (when query is empty and filter is all) */}
          {!cmdSearchQuery.trim() && activeFilter === "all" && recentSearches.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1.5 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Recent Searches</span>
              </div>
              <div className="flex flex-wrap gap-1.5 px-1">
                {recentSearches.map((item) => (
                  <div
                    key={item}
                    onClick={() => {
                      setCmdSearchQuery(item);
                      setSelectedIndex(0);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer transition-colors border border-slate-200/60 dark:border-white/[0.06] group"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={(e) => removeRecentSearch(item, e)}
                      className="text-slate-400 hover:text-rose-500 p-0.5 rounded-full"
                      title="Remove from history"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Clinics & Leads Section */}
          {filteredLeads.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1.5 flex items-center justify-between">
                <span>Clinics &amp; Leads</span>
                <span className="font-mono text-slate-500">{filteredLeads.length} matches</span>
              </div>
              <div className="space-y-1">
                {filteredLeads.map((lead) => {
                  const itemIndex = selectableItems.findIndex((s) => s.id === `lead-${lead.id}`);
                  const isSelected = selectedIndex === itemIndex;
                  return (
                    <div
                      key={lead.id}
                      data-selected={isSelected}
                      onClick={() => executeSelection({ type: "lead", id: `lead-${lead.id}`, label: lead.name, item: lead })}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isSelected
                          ? "bg-slate-100 dark:bg-white/[0.08] border-slate-300 dark:border-white/20 shadow-xs"
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
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {lead.doctor_name || "Doctor"}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 truncate">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              {lead.locality || lead.city || "Delhi NCR"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 font-bold">
                          ₹{(lead.deal_value_inr || 25000).toLocaleString()}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 font-semibold">
                          Fit {lead.fit_score || 0}%
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Settings Sections Search */}
          {filteredSettings.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1.5 flex items-center justify-between">
                <span>Settings Sections &amp; Controls</span>
                <span className="font-mono text-slate-500">{filteredSettings.length} sections</span>
              </div>
              <div className="space-y-1">
                {filteredSettings.map((set) => {
                  const itemIndex = selectableItems.findIndex((s) => s.id === `set-${set.id}`);
                  const isSelected = selectedIndex === itemIndex;
                  const Icon = set.icon;
                  return (
                    <div
                      key={set.id}
                      data-selected={isSelected}
                      onClick={() => executeSelection({ type: "setting", id: `set-${set.id}`, label: set.title, item: set })}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isSelected
                          ? "bg-slate-100 dark:bg-white/[0.08] border-slate-300 dark:border-white/20 shadow-xs"
                          : "border-transparent hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
                            <span>{set.title}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300 font-mono">
                              {set.tabLabel}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {set.subtitle}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                        <span className="text-[10px] font-mono font-medium hidden sm:inline">Jump to</span>
                        <CornerDownLeft className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Quick Actions Grid */}
          {filteredActions.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1.5 flex items-center justify-between">
                <span>Quick Actions &amp; Navigation</span>
                <span className="font-mono text-slate-500">{filteredActions.length} actions</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {filteredActions.map((action) => {
                  const itemIndex = selectableItems.findIndex((s) => s.id === `act-${action.id}`);
                  const isSelected = selectedIndex === itemIndex;
                  const Icon = action.icon;
                  return (
                    <div
                      key={action.id}
                      data-selected={isSelected}
                      onClick={() => executeSelection({ type: "action", id: `act-${action.id}`, label: action.title, item: action })}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                        isSelected
                          ? "bg-slate-100 dark:bg-white/[0.08] border-slate-300 dark:border-white/20 shadow-xs"
                          : "bg-slate-50/60 hover:bg-slate-100/80 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] border-slate-200/60 dark:border-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center shrink-0">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {action.title}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                            {action.subtitle}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {action.shortcut && (
                          <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-white/[0.08] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08] font-mono text-[10px] font-bold">
                            {action.shortcut}
                          </kbd>
                        )}
                        <CornerDownLeft className="w-3 h-3 text-slate-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Zero Results State */}
          {selectableItems.length === 0 && (
            <div className="py-12 text-center space-y-2">
              <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No matches found
              </div>
              <div className="text-xs text-slate-400 max-w-sm mx-auto">
                No results for "{cmdSearchQuery}" in{" "}
                <span className="font-semibold text-slate-600 dark:text-slate-300">{activeFilter}</span>. Try switching filter chips or searching settings terms like "quotas" or "mcp".
              </div>
            </div>
          )}
        </div>

        {/* Bottom Keyboard Navigation Footer */}
        <div className="px-4 py-3 border-t border-slate-100 dark:border-white/[0.08] bg-slate-50/90 dark:bg-[#161925] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] font-mono text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] font-mono text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                ↓
              </kbd>
              <span className="ml-1">Move</span>
            </span>

            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] font-mono text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                ↵
              </kbd>
              <span className="ml-1">Select</span>
            </span>

            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] font-mono text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                ESC
              </kbd>
              <span className="ml-1">Quit</span>
            </span>
          </div>

          <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500 font-semibold tracking-wide">
            Herald Command Palette
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
