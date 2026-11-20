"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { Select } from "@/components/ui/Select";
import {
  Archive,
  Check,
  ChevronDown,
  ChevronRight,
  Filter,
  MapPin,
  Search,
  X,
  Send,
  Users,
  XCircle,
  Trophy,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SENT_STAGES = new Set(["contacted", "viewed_demo", "replied", "interested", "booked", "won"]);

/** Derive an outreach-sent timestamp for a lead (best-effort). */
function deriveOutreachSentAt(lead: any): string | null {
  // 1. Latest package's sent_at
  if (lead.packages?.length) {
    const pkg = lead.packages[lead.packages.length - 1];
    if (pkg?.sent_at) return pkg.sent_at as string;
  }
  // 2. Earliest outbound message
  const outbound = (lead.messages ?? []).find((m: any) => m.direction === "outbound");
  if (outbound?.created_at) return outbound.created_at as string;
  // 3. Stage-based fallback: if in a sent stage, use lead.updated_at
  const stage = (lead.stage_rel?.slug ?? lead.stage ?? "").toLowerCase();
  if (SENT_STAGES.has(stage) && lead.updated_at) return lead.updated_at as string;
  return null;
}

function isLeadSent(lead: any): boolean {
  const stage = (lead.stage_rel?.slug ?? lead.stage ?? "").toLowerCase();
  if (SENT_STAGES.has(stage)) return true;
  if (deriveOutreachSentAt(lead) !== null) return true;
  if (lead.packages && Array.isArray(lead.packages) && lead.packages.some((p: any) => p.sent_at)) return true;
  if (lead.messages && Array.isArray(lead.messages) && lead.messages.some((m: any) => m.direction === "outbound")) return true;
  return false;
}

function isLeadLost(lead: any): boolean {
  const stage = (lead.stage_rel?.slug ?? lead.stage ?? "").toLowerCase();
  if (stage === "lost" || stage === "archived" || stage === "dnc") return true;
  if (lead.stage_rel?.is_lost) return true;
  if (Boolean(lead.do_not_contact)) return true;
  if (Boolean(lead.is_archived)) return true;
  return false;
}

function isLeadWon(lead: any): boolean {
  const stage = (lead.stage_rel?.slug ?? lead.stage ?? "").toLowerCase();
  if (stage === "won" || stage === "closed_won" || stage === "client") return true;
  if (lead.stage_rel?.is_won) return true;
  return false;
}

function formatDoctorName(name?: string | null): string {
  if (!name || !name.trim()) return "Doctor";
  const trimmed = name.trim();
  if (/^dr\.?\s+/i.test(trimmed)) {
    return trimmed;
  }
  return `Dr. ${trimmed}`;
}

/** Format a YYYY-MM-DD (or ISO) date string as "Nov 2026" */
function formatMonth(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleString("en-US", { month: "short", year: "numeric" });
  } catch {
    return isoDate.slice(0, 7);
  }
}

/** Format a YYYY-MM-DD date string as "12 Nov 2026" */
function formatDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return isoDate.slice(0, 10);
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeadsTableView() {
  const {
    leads,
    setSelectedLeadId,
    activeHustle,
    handleBatchStageChange,
    handleBatchArchive,
  } = useCRM();

  // --- Selection state for batch actions ---
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // --- Search ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        setSearchExpanded(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // --- Filter state ---
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterPopoverRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  const [monthFilter, setMonthFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [outreachFilter, setOutreachFilter] = useState<"ALL" | "SENT" | "UNSENT">("ALL");
  const [batchFilter, setBatchFilter] = useState("");
  const [foundDateFilter, setFoundDateFilter] = useState("");

  // Close filter popover on outside click or Escape key
  useEffect(() => {
    if (!filtersOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        filterPopoverRef.current &&
        !filterPopoverRef.current.contains(e.target as Node) &&
        filterButtonRef.current &&
        !filterButtonRef.current.contains(e.target as Node)
      ) {
        setFiltersOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFiltersOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [filtersOpen]);

  // --- Derived option lists ---
  const availableMonths = useMemo(() => {
    const seen = new Set<string>();
    leads.forEach((l: any) => {
      if (l.created_at) seen.add(l.created_at.slice(0, 7));
      const sentTs = deriveOutreachSentAt(l);
      if (sentTs) seen.add(sentTs.slice(0, 7));
    });
    return Array.from(seen).filter((m) => /^\d{4}-\d{2}$/.test(m)).sort().reverse();
  }, [leads]);

  const stages = useMemo(() => {
    return activeHustle?.stages || [];
  }, [activeHustle]);

  const batchIds = useMemo(() => {
    const seen = new Set<string>();
    leads.forEach((l: any) => {
      const bid = l.custom_fields?.batch_id;
      if (bid) seen.add(bid);
    });
    return Array.from(seen).sort();
  }, [leads]);

  // --- Filtered leads (Scopes both KPI cards & table) ---
  const filteredLeads = useMemo(() => {
    let result = leads as any[];

    // 1. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((l) => {
        const phones = Array.isArray(l.phones) ? l.phones.join(" ") : "";
        return (
          (l.name ?? "").toLowerCase().includes(q) ||
          (l.doctor_name ?? "").toLowerCase().includes(q) ||
          (l.primary_phone ?? "").toLowerCase().includes(q) ||
          phones.toLowerCase().includes(q) ||
          (l.locality ?? "").toLowerCase().includes(q) ||
          (l.city ?? "").toLowerCase().includes(q) ||
          (l.address ?? "").toLowerCase().includes(q) ||
          (l.email ?? "").toLowerCase().includes(q) ||
          (l.instagram_handle ?? "").toLowerCase().includes(q) ||
          (l.custom_fields?.batch_id ?? "").toLowerCase().includes(q)
        );
      });
    }

    // 2. Month filter (Derived from lead creation or outreach send date)
    if (monthFilter) {
      result = result.filter((l) => {
        const createdMonth = l.created_at ? l.created_at.slice(0, 7) : "";
        const sentTs = deriveOutreachSentAt(l);
        const sentMonth = sentTs ? sentTs.slice(0, 7) : "";
        return createdMonth === monthFilter || sentMonth === monthFilter;
      });
    }

    // 3. Stage / Status filter
    if (stageFilter) {
      if (stageFilter === "won") {
        result = result.filter(isLeadWon);
      } else if (stageFilter === "lost") {
        result = result.filter(isLeadLost);
      } else if (stageFilter === "sent") {
        result = result.filter(isLeadSent);
      } else if (stageFilter === "unsent") {
        result = result.filter((l) => !isLeadSent(l));
      } else {
        result = result.filter((l) => {
          const stageSlug = (l.stage_rel?.slug ?? l.stage ?? "").toLowerCase();
          return stageSlug === stageFilter.toLowerCase();
        });
      }
    }

    // 4. Outreach status filter
    if (outreachFilter === "SENT") {
      result = result.filter(isLeadSent);
    } else if (outreachFilter === "UNSENT") {
      result = result.filter((l) => !isLeadSent(l));
    }

    // 5. Batch filter
    if (batchFilter) {
      result = result.filter((l) => l.custom_fields?.batch_id === batchFilter);
    }

    // 6. Specific date filter
    if (foundDateFilter) {
      result = result.filter((l) => (l.created_at ?? "").slice(0, 10) === foundDateFilter);
    }

    return result;
  }, [leads, searchQuery, monthFilter, stageFilter, outreachFilter, batchFilter, foundDateFilter]);

  // ---------------------------------------------------------------------------
  // KPI Metrics (Calculated from filteredLeads to stay strictly in scope)
  // ---------------------------------------------------------------------------
  const totalInTable = filteredLeads.length;
  const totalSent = useMemo(() => filteredLeads.filter(isLeadSent).length, [filteredLeads]);
  const totalLost = useMemo(() => filteredLeads.filter(isLeadLost).length, [filteredLeads]);
  const totalWon = useMemo(() => filteredLeads.filter(isLeadWon).length, [filteredLeads]);

  // Active filter count (for badge)
  const activeFilterCount = [
    !!monthFilter,
    !!stageFilter,
    outreachFilter !== "ALL",
    !!batchFilter,
    !!foundDateFilter,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setMonthFilter("");
    setStageFilter("");
    setOutreachFilter("ALL");
    setBatchFilter("");
    setFoundDateFilter("");
    setSearchQuery("");
    setSearchExpanded(false);
    setSelectedIds(new Set());
  };

  const handleToggleSelect = (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredLeads.length && filteredLeads.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map((l: any) => l.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBatchMoveStage = async (stageId: number) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setSelectedIds(new Set());
    await handleBatchStageChange(ids, stageId);
  };

  const handleBatchArchiveSelected = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setSelectedIds(new Set());
    await handleBatchArchive(ids, true);
  };

  return (
    <div className="space-y-4 text-slate-900 dark:text-zinc-100">
      {/* ------------------------------------------------------------------ */}
      {/* 1. Four KPI Summary Cards Strip (Scoped to Active Filters)         */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Total Leads Sent */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
              Total Leads Sent
            </span>
            <Send className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight tabular-nums mt-2">
            {totalSent}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>
              {totalInTable > 0
                ? `${Math.round((totalSent / totalInTable) * 100)}% outreach rate`
                : "0% outreach rate"}
            </span>
          </div>
        </div>

        {/* KPI 2: Total Leads in Table */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
              Total Leads in Table
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight tabular-nums mt-2">
            {totalInTable}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
            <span>
              {monthFilter
                ? `Month: ${formatMonth(monthFilter + "-01")}`
                : `${leads.length} in database`}
            </span>
          </div>
        </div>

        {/* KPI 3: Total Lost Leads */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
              Total Lost Leads
            </span>
            <XCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight tabular-nums mt-2">
            {totalLost}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <span>Lost, DNC or archived</span>
          </div>
        </div>

        {/* KPI 4: Total Won Leads */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
              Total Won Leads
            </span>
            <Trophy className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight tabular-nums mt-2">
            {totalWon}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Closed-won clients</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Unified Leads Table Container with Attached Header Bar          */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#18181B] shadow-xs overflow-hidden">
        {/* Unified Table Header Bar */}
        <div className="border-b border-slate-100 dark:border-white/[0.08] px-5 py-3 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#18181B]">
          {/* Left Side: Section title, count badge, expandable [🔍] search */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">All Leads</h3>
              <span className="bg-slate-100 dark:bg-white/[0.08] text-slate-700 dark:text-zinc-200 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums">
                {totalInTable}
              </span>
            </div>

            {/* Expandable Search Pill */}
            <div className="relative flex items-center">
              {searchExpanded || searchQuery ? (
                <div className="relative flex items-center w-64 sm:w-72 transition-all duration-200">
                  <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => {
                      if (!searchQuery.trim()) setSearchExpanded(false);
                    }}
                    placeholder="Filter table... (Esc to clear)"
                    className="w-full pl-8 pr-7 py-1.5 rounded-full text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSearchExpanded(false);
                      }}
                      className="absolute right-2 p-0.5 rounded-full hover:bg-slate-200/50 dark:hover:bg-white/[0.08] text-slate-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSearchExpanded(false)}
                      className="absolute right-2 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      esc
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSearchExpanded(true);
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }}
                  title="Filter table (/)"
                  className="flex items-center gap-1.5 h-8 px-2.5 rounded-full text-xs font-medium text-slate-600 dark:text-zinc-300 bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-slate-200/80 dark:border-white/[0.08] transition-colors cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline text-[11px] text-slate-500 dark:text-zinc-400">Filter table</span>
                  <kbd className="hidden sm:inline text-[9px] text-slate-400 font-mono bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] rounded px-1">
                    /
                  </kbd>
                </button>
              )}
            </div>
          </div>

          {/* Right Side: Month Dropdown + Filters Popover Button + Reset */}
          <div className="flex items-center gap-2">
            {/* Month Filter Dropdown */}
            <Select
              value={monthFilter}
              onChange={(val) => setMonthFilter(val)}
              options={[
                { value: "", label: "All Months" },
                ...availableMonths.map((m) => ({
                  value: m,
                  label: formatMonth(m + "-01"),
                })),
              ]}
              triggerClassName="!py-1.5 !px-3 font-medium"
            />

            {/* Filters Popover Button */}
            <div className="relative">
              <button
                ref={filterButtonRef}
                type="button"
                onClick={() => setFiltersOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-slate-700 dark:text-zinc-200 border border-slate-200/80 dark:border-white/[0.08] rounded-xl px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  filtersOpen ? "ring-2 ring-indigo-500/30" : ""
                }`}
              >
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Filters Popover Drawer */}
              {filtersOpen && (
                <div
                  ref={filterPopoverRef}
                  className="absolute right-0 top-full mt-2 w-72 p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-white/[0.08] shadow-xl z-50 space-y-3.5 animate-in fade-in zoom-in-95 text-xs text-slate-900 dark:text-zinc-100"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#27272A]">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Filter Leads
                    </span>
                    <button
                      type="button"
                      onClick={() => setFiltersOpen(false)}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Filter Grid */}
                  <div className="space-y-3">
                    {/* Month Filter inside Popover */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                        Month
                      </label>
                      <Select
                        value={monthFilter}
                        onChange={(val) => setMonthFilter(val)}
                        options={[
                          { value: "", label: "All Months" },
                          ...availableMonths.map((m) => ({
                            value: m,
                            label: formatMonth(m + "-01"),
                          })),
                        ]}
                        className="w-full"
                        triggerClassName="!py-1.5 !px-2.5 font-medium"
                      />
                    </div>

                    {/* Stage / Status Filter */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                        Stage / Status
                      </label>
                      <Select
                        value={stageFilter}
                        onChange={(val) => setStageFilter(val)}
                        options={[
                          { value: "", label: "All Stages" },
                          { value: "won", label: "Won Leads" },
                          { value: "lost", label: "Lost / Closed / DNC" },
                          { value: "sent", label: "Outreach Sent" },
                          { value: "unsent", label: "Outreach Unsent" },
                          ...stages.map((st) => ({
                            value: st.slug,
                            label: st.name,
                          })),
                        ]}
                        className="w-full"
                        triggerClassName="!py-1.5 !px-2.5 font-medium"
                      />
                    </div>

                    {/* Outreach Status Filter */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                        Outreach
                      </label>
                      <Select
                        value={outreachFilter}
                        onChange={(val) => setOutreachFilter(val as any)}
                        options={[
                          { value: "ALL", label: "All" },
                          { value: "SENT", label: "Sent" },
                          { value: "UNSENT", label: "Unsent" },
                        ]}
                        className="w-full"
                        triggerClassName="!py-1.5 !px-2.5 font-medium"
                      />
                    </div>

                    {/* Batch Filter */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                        Batch
                      </label>
                      <Select
                        value={batchFilter}
                        onChange={(val) => setBatchFilter(val)}
                        options={[
                          { value: "", label: "All Batches" },
                          ...batchIds.map((b) => ({
                            value: b,
                            label: b,
                          })),
                        ]}
                        className="w-full"
                        triggerClassName="!py-1.5 !px-2.5 font-medium"
                      />
                    </div>

                    {/* Specific Date Picker */}
                    <div className="flex flex-col gap-1 pt-1">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                        Specific Date
                      </label>
                      <input
                        type="date"
                        value={foundDateFilter}
                        onChange={(e) => setFoundDateFilter(e.target.value)}
                        className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Reset Button */}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 hover:bg-rose-100 dark:hover:bg-rose-500/20 cursor-pointer transition-all"
              >
                <X className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/70 dark:border-white/[0.06] bg-slate-50/70 dark:bg-white/[0.02] text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3 w-8">
                  <input
                    type="checkbox"
                    aria-label="Select all leads"
                    checked={filteredLeads.length > 0 && selectedIds.size === filteredLeads.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-3.5 h-3.5"
                  />
                </th>
                <th className="py-2.5 px-3 w-[190px] max-w-[190px]">Clinic &amp; Doctor</th>
                <th className="py-2.5 px-2.5 w-[110px]">Locality</th>
                <th className="py-2.5 px-2.5 w-[115px]">Contacts</th>
                <th className="py-2.5 px-2.5 w-[82px]">Batch</th>
                <th className="py-2.5 px-2.5 w-[92px]">Outreach</th>
                <th className="py-2.5 px-2.5 w-[86px]">Found</th>
                <th className="py-2.5 px-2.5 w-[130px]">Fit &amp; Intent</th>
                <th className="py-2.5 px-2.5">Next Step</th>
                <th className="py-2.5 px-3 text-right w-[88px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-sm text-slate-400 dark:text-zinc-500">
                    No leads match the current filters.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead: any) => {
                  const batchId: string | undefined = lead.custom_fields?.batch_id;
                  const sentAt = deriveOutreachSentAt(lead);
                  const isSent = isLeadSent(lead);
                  const intentDot =
                    (lead.intent_score ?? 0) >= 8
                      ? "bg-emerald-500"
                      : (lead.intent_score ?? 0) >= 5
                      ? "bg-amber-500"
                      : "bg-slate-400";

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLeadId(lead.id)}
                      className={`hover:bg-slate-50/80 dark:hover:bg-white/[0.03] cursor-pointer transition-colors group ${
                        selectedIds.has(lead.id) ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-3 w-8" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${lead.name}`}
                          checked={selectedIds.has(lead.id)}
                          onChange={() => handleToggleSelect(lead.id)}
                          className="rounded border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-3.5 h-3.5"
                        />
                      </td>

                      {/* Clinic & Doctor */}
                      <td className="py-2.5 px-3 w-[190px] max-w-[190px]">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-200 border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-center font-semibold text-[11px] shrink-0">
                            {lead.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-zinc-900 dark:text-white truncate" title={lead.name}>
                              {lead.name}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate" title={formatDoctorName(lead.doctor_name)}>
                              {formatDoctorName(lead.doctor_name)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Locality & City */}
                      <td className="py-2.5 px-2.5 text-slate-600 dark:text-zinc-300 max-w-[110px]">
                        <div className="flex items-center gap-1 min-w-0">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{lead.locality || lead.city || "-"}</span>
                        </div>
                      </td>

                      {/* Contacts */}
                      <td className="py-2.5 px-2.5 space-y-0.5 text-[11px] max-w-[115px]">
                        {lead.primary_phone && (
                          <div className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200 font-mono whitespace-nowrap truncate">
                            {lead.primary_phone}
                          </div>
                        )}
                        {lead.instagram_handle && (
                          <div className="text-[11px] text-slate-400 hover:text-zinc-900 dark:hover:text-white transition-colors truncate">
                            @{lead.instagram_handle}
                          </div>
                        )}
                        {!lead.primary_phone && !lead.instagram_handle && (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      {/* Batch Badge */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        {batchId ? (
                          <span className="bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-zinc-300 border border-slate-200/70 dark:border-white/[0.08] rounded-md px-1.5 py-0.5 text-[10px] font-mono font-medium whitespace-nowrap">
                            {batchId}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px] italic">-</span>
                        )}
                      </td>

                      {/* Outreach Status Pill */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        {isSent ? (
                          <div className="flex flex-col gap-0.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40 text-[10px] font-medium whitespace-nowrap w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              Sent
                            </span>
                            {sentAt && (
                              <span className="text-[10px] text-slate-400 font-mono pl-0.5 whitespace-nowrap">
                                {sentAt.slice(0, 10)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-zinc-400 border border-slate-200/70 dark:border-white/[0.08] text-[10px] font-medium whitespace-nowrap">
                            Unsent
                          </span>
                        )}
                      </td>

                      {/* Found Date */}
                      <td className="py-2.5 px-2.5 text-[11px] text-slate-500 dark:text-zinc-400 font-mono whitespace-nowrap">
                        {lead.created_at ? formatDate(lead.created_at) : "-"}
                      </td>

                      {/* Fit & Intent */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-nowrap">
                          <span className="bg-slate-100 dark:bg-white/[0.06] text-zinc-800 dark:text-zinc-200 font-mono font-medium px-1.5 py-0.5 rounded text-[10px] border border-slate-200/60 dark:border-white/[0.06] whitespace-nowrap">
                            Fit {lead.fit_score}%
                          </span>
                          <span className="text-[11px] font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-1 whitespace-nowrap">
                            <span className={`w-1.5 h-1.5 rounded-full ${intentDot} shrink-0`} />
                            <span>{lead.intent_score}</span>
                          </span>
                        </div>
                      </td>

                      {/* Next Step */}
                      <td className="py-2.5 px-2.5 max-w-[140px]">
                        <div
                          className="text-slate-600 dark:text-zinc-300 truncate text-xs"
                          title={lead.next_action || "None scheduled"}
                        >
                          {lead.next_action || "None scheduled"}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3 text-right w-[92px] whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLeadId(lead.id);
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] text-slate-700 dark:text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
                          >
                            Inspect
                          </button>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-zinc-900/95 dark:bg-zinc-800/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-zinc-700/80 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 pr-3 border-r border-zinc-700 text-xs font-semibold text-zinc-300">
            <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[11px] font-bold">
              {selectedIds.size}
            </span>
            <span>selected</span>
          </div>

          {/* Move to Stage */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-400 font-medium">Stage:</span>
            <select
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val) handleBatchMoveStage(val);
              }}
              defaultValue=""
              aria-label="Move selected leads to stage"
              className="bg-zinc-800 hover:bg-zinc-700 text-xs text-white border border-zinc-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
            >
              <option value="" disabled>Move to Stage...</option>
              {stages.map((st: any) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>

          {/* Archive */}
          <button
            type="button"
            onClick={handleBatchArchiveSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-medium transition-colors cursor-pointer"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archive</span>
          </button>

          {/* Clear */}
          <button
            type="button"
            onClick={handleClearSelection}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer ml-1"
            title="Deselect all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
