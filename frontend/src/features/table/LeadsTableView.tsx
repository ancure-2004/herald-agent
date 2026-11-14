"use client";

import React, { useMemo, useState } from "react";
import { Check, ChevronDown, Filter, MapPin, Search, X } from "lucide-react";
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
  const stage = lead.stage_rel?.slug ?? lead.stage ?? "";
  if (SENT_STAGES.has(stage) && lead.updated_at) return lead.updated_at as string;
  return null;
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
  const { leads, setSelectedLeadId, activeHustle } = useCRM();

  // --- Search ---
  const [searchQuery, setSearchQuery] = useState("");

  // --- Filter state ---
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [outreachFilter, setOutreachFilter] = useState<"ALL" | "SENT" | "UNSENT">("ALL");
  const [foundMonthFilter, setFoundMonthFilter] = useState("");
  const [foundDateFilter, setFoundDateFilter] = useState("");
  const [sentMonthFilter, setSentMonthFilter] = useState("");
  const [sentDateFilter, setSentDateFilter] = useState("");
  const [batchFilter, setBatchFilter] = useState("");

  // --- Derived option lists ---
  const foundMonths = useMemo(() => {
    const seen = new Set<string>();
    leads.forEach((l: any) => {
      if (l.created_at) seen.add(l.created_at.slice(0, 7));
    });
    return Array.from(seen).sort().reverse();
  }, [leads]);

  const sentMonths = useMemo(() => {
    const seen = new Set<string>();
    leads.forEach((l: any) => {
      const ts = deriveOutreachSentAt(l);
      if (ts) seen.add(ts.slice(0, 7));
    });
    return Array.from(seen).sort().reverse();
  }, [leads]);

  const batchIds = useMemo(() => {
    const seen = new Set<string>();
    leads.forEach((l: any) => {
      const bid = l.custom_fields?.batch_id;
      if (bid) seen.add(bid);
    });
    return Array.from(seen).sort();
  }, [leads]);

  // --- Filtered leads ---
  const filteredLeads = useMemo(() => {
    let result = leads as any[];

    // 1. Search
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

    // 2. Outreach status filter
    if (outreachFilter === "SENT") {
      result = result.filter((l) => {
        const stage = l.stage_rel?.slug ?? l.stage ?? "";
        if (SENT_STAGES.has(stage)) return true;
        return !!deriveOutreachSentAt(l);
      });
    } else if (outreachFilter === "UNSENT") {
      result = result.filter((l) => {
        const stage = l.stage_rel?.slug ?? l.stage ?? "";
        if (SENT_STAGES.has(stage)) return false;
        return !deriveOutreachSentAt(l);
      });
    }

    // 3. Found month
    if (foundMonthFilter) {
      result = result.filter((l) => (l.created_at ?? "").startsWith(foundMonthFilter));
    }

    // 4. Found date
    if (foundDateFilter) {
      result = result.filter((l) => (l.created_at ?? "").slice(0, 10) === foundDateFilter);
    }

    // 5. Sent month
    if (sentMonthFilter) {
      result = result.filter((l) => {
        const ts = deriveOutreachSentAt(l);
        return ts ? ts.startsWith(sentMonthFilter) : false;
      });
    }

    // 6. Sent date
    if (sentDateFilter) {
      result = result.filter((l) => {
        const ts = deriveOutreachSentAt(l);
        return ts ? ts.slice(0, 10) === sentDateFilter : false;
      });
    }

    // 7. Batch
    if (batchFilter) {
      result = result.filter((l) => l.custom_fields?.batch_id === batchFilter);
    }

    return result;
  }, [leads, searchQuery, outreachFilter, foundMonthFilter, foundDateFilter, sentMonthFilter, sentDateFilter, batchFilter]);

  // Active filter count (for badge)
  const activeFilterCount = [
    outreachFilter !== "ALL",
    !!foundMonthFilter,
    !!foundDateFilter,
    !!sentMonthFilter,
    !!sentDateFilter,
    !!batchFilter,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setOutreachFilter("ALL");
    setFoundMonthFilter("");
    setFoundDateFilter("");
    setSentMonthFilter("");
    setSentDateFilter("");
    setBatchFilter("");
  };

  return (
    <div className="space-y-3">
      {/* ------------------------------------------------------------------ */}
      {/* Top Filter & Search Bar                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#141721] shadow-xs overflow-visible">
        {/* Main search row */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-white/[0.05]">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clinic, doctor, phone, locality, email, batch ID…"
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter toggle button */}
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              filtersOpen || activeFilterCount > 0
                ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/40"
                : "bg-slate-50 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/[0.08] hover:border-indigo-300 hover:text-indigo-600"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-black">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Count */}
          <span className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap font-mono">
            {filteredLeads.length} / {leads.length}
          </span>

          {/* Reset */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 hover:bg-rose-100 cursor-pointer transition-all"
            >
              <X className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        {/* Expandable filter strip */}
        {filtersOpen && (
          <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 border-b border-slate-100 dark:border-white/[0.05] bg-slate-50/60 dark:bg-white/[0.015]">
            {/* Outreach Status */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Outreach</label>
              <select
                value={outreachFilter}
                onChange={(e) => setOutreachFilter(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="ALL">All</option>
                <option value="SENT">Sent</option>
                <option value="UNSENT">Unsent</option>
              </select>
            </div>

            {/* Found Month */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Found Month</label>
              <select
                value={foundMonthFilter}
                onChange={(e) => setFoundMonthFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="">All Months</option>
                {foundMonths.map((m) => (
                  <option key={m} value={m}>{formatMonth(m + "-01")}</option>
                ))}
              </select>
            </div>

            {/* Found Date */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Found Date</label>
              <input
                type="date"
                value={foundDateFilter}
                onChange={(e) => setFoundDateFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            {/* Sent Month */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sent Month</label>
              <select
                value={sentMonthFilter}
                onChange={(e) => setSentMonthFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="">All Months</option>
                {sentMonths.map((m) => (
                  <option key={m} value={m}>{formatMonth(m + "-01")}</option>
                ))}
              </select>
            </div>

            {/* Sent Date */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sent Date</label>
              <input
                type="date"
                value={sentDateFilter}
                onChange={(e) => setSentDateFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            {/* Batch */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Batch</label>
              <select
                value={batchFilter}
                onChange={(e) => setBatchFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="">All Batches</option>
                {batchIds.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Table                                                             */}
        {/* ---------------------------------------------------------------- */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[860px]">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.03] text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Clinic & Doctor</th>
                <th className="py-3.5 px-3">Locality & City</th>
                <th className="py-3.5 px-3">Contacts</th>
                <th className="py-3.5 px-3">Batch</th>
                <th className="py-3.5 px-3">Outreach</th>
                <th className="py-3.5 px-3">Found</th>
                <th className="py-3.5 px-3">Fit & Intent</th>
                <th className="py-3.5 px-3">Next Step</th>
                <th className="py-3.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
                    No leads match the current filters.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead: any) => {
                  const batchId: string | undefined = lead.custom_fields?.batch_id;
                  const sentAt = deriveOutreachSentAt(lead);
                  const stageSlug: string = lead.stage_rel?.slug ?? lead.stage ?? "";
                  const isSent = SENT_STAGES.has(stageSlug) || !!sentAt;

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLeadId(lead.id)}
                      className="hover:bg-slate-50/80 dark:hover:bg-white/[0.04] cursor-pointer transition-colors"
                    >
                      {/* Clinic & Doctor */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center font-bold text-xs text-indigo-600 dark:text-indigo-400 shrink-0">
                            {lead.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white truncate">{lead.name}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{lead.doctor_name || "Doctor"}</div>
                          </div>
                        </div>
                      </td>

                      {/* Locality */}
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{lead.locality || lead.city}</span>
                        </div>
                      </td>

                      {/* Contacts */}
                      <td className="py-3.5 px-3 space-y-0.5 text-[11px]">
                        {lead.primary_phone && (
                          <div className="text-slate-700 dark:text-slate-300 font-mono">{lead.primary_phone}</div>
                        )}
                        {lead.instagram_handle && (
                          <div className="text-pink-600 dark:text-pink-400">@{lead.instagram_handle}</div>
                        )}
                      </td>

                      {/* Batch Badge */}
                      <td className="py-3.5 px-3">
                        {batchId ? (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/20 font-mono font-bold text-[10px] whitespace-nowrap">
                            {batchId}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px] italic">—</span>
                        )}
                      </td>

                      {/* Outreach Status Pill */}
                      <td className="py-3.5 px-3">
                        {isSent ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-500/20 font-semibold text-[10px] whitespace-nowrap">
                              <Check className="w-2.5 h-2.5" />
                              Sent
                            </span>
                            {sentAt && (
                              <span className="text-[10px] text-slate-400 font-mono">{sentAt.slice(0, 10)}</span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-500/20 font-semibold text-[10px] whitespace-nowrap">
                            Unsent
                          </span>
                        )}
                      </td>

                      {/* Found Date */}
                      <td className="py-3.5 px-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap">
                        {lead.created_at ? formatDate(lead.created_at) : "—"}
                      </td>

                      {/* Fit & Intent */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 flex-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-500/20 font-semibold font-mono text-[10px] whitespace-nowrap">
                            Fit {lead.fit_score}%
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-500/20 font-semibold font-mono text-[10px] whitespace-nowrap">
                            Intent {lead.intent_score}
                          </span>
                        </div>
                      </td>

                      {/* Next Step */}
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 max-w-[160px] truncate">
                        {lead.next_action || "None scheduled"}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLeadId(lead.id);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
