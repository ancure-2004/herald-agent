"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Select } from "@/components/ui/Select";
import {
  Archive,
  ArrowRight,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  Layers,
  RefreshCw,
  Clock,
  Eye,
  Flame,
  LayoutGrid,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { KanbanColumn } from "./KanbanColumn";
import { formatDoctorName } from "./LeadCard";
import { autopilotApi } from "@/api/autopilotApi";
import { leadsApi } from "@/api/leadsApi";
import { KanbanSkeleton } from "@/components/ui/Skeleton";
import type { Lead } from "@/types";

// Helper to check if a lead is closed/lost
function isLeadClosedLost(lead: any, allStages?: Array<{ id: number; slug: string; name: string; is_lost?: boolean }>): boolean {
  if (lead.status === "CLOSED_LOST" || lead.status === "LOST") return true;
  if (lead.is_archived || lead.do_not_contact) return true;
  if (lead.stage_rel?.is_lost) return true;
  const stageSlug = (lead.stage_rel?.slug ?? lead.stage ?? "").toLowerCase();
  if (stageSlug === "lost" || stageSlug === "closed_lost" || stageSlug === "dnc" || stageSlug === "archived") return true;
  if (allStages && lead.stage_id) {
    const s = allStages.find((st) => st.id === lead.stage_id);
    if (s && (s.is_lost || s.slug === "lost" || s.slug === "closed_lost")) return true;
  }
  return false;
}

export function KanbanBoardView() {
  const {
    activeHustle,
    leads,
    loading,
    activeSmartView,
    setActiveSmartView,
    filterPopoverOpen,
    setFilterPopoverOpen,
    filterMinFit,
    setFilterMinFit,
    filterVerifiedOnly,
    setFilterVerifiedOnly,
    sortPopoverOpen,
    setSortPopoverOpen,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    dragOverStageId,
    setDragOverStageId,
    draggingLeadId,
    setDraggingLeadId,
    handleStageChange,
    handleApproveAndSend,
    selectedLeadId,
    setSelectedLeadId,
    setNewLeadModalOpen,
    openLogCallModal,
    openInboxForLead,
    loadAll,
    notify,
  } = useCRM();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchExpanded, setSearchExpanded] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Keyboard shortcut: Press "/" to focus search
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
  const [hideEmptyStages, setHideEmptyStages] = useState<boolean>(true);
  const [batchGroupingEnabled, setBatchGroupingEnabled] = useState<boolean>(true);
  const [syncingBatches, setSyncingBatches] = useState<boolean>(false);
  const [archivedLeads, setArchivedLeads] = useState<Lead[]>([]);
  const [archivedLoading, setArchivedLoading] = useState<boolean>(false);
  const archivedLoadedRef = useRef<boolean>(false);

  // Lazily load archived leads only once on first selection of Archived smart view (cached thereafter)
  useEffect(() => {
    const isArchivedView = activeSmartView === "archived" || activeSmartView === "archived_dnc";
    if (isArchivedView && activeHustle?.id && !archivedLoadedRef.current) {
      let isMounted = true;
      setArchivedLoading(true);
      leadsApi
        .list({
          hustle_id: activeHustle.id,
          smart_view: "archived",
          include_archived: true,
        })
        .then((data) => {
          if (isMounted) {
            setArchivedLeads(data);
            archivedLoadedRef.current = true;
          }
        })
        .catch((err) => {
          if (isMounted) {
            notify(err instanceof Error ? err : "Failed to load archived leads", "err");
          }
        })
        .finally(() => {
          if (isMounted) {
            setArchivedLoading(false);
          }
        });
      return () => {
        isMounted = false;
      };
    }
  }, [activeSmartView, activeHustle?.id, notify]);

  // Invalidate cache when active hustle changes
  useEffect(() => {
    archivedLoadedRef.current = false;
    setArchivedLeads([]);
  }, [activeHustle?.id]);

  const refreshArchivedLeads = useCallback(async () => {
    if (!activeHustle?.id) return;
    setArchivedLoading(true);
    try {
      const data = await leadsApi.list({
        hustle_id: activeHustle.id,
        smart_view: "archived",
        include_archived: true,
      });
      setArchivedLeads(data);
      archivedLoadedRef.current = true;
    } catch (err) {
      notify(err instanceof Error ? err : "Failed to load archived leads", "err");
    } finally {
      setArchivedLoading(false);
    }
  }, [activeHustle?.id, notify]);

  const handleSyncBatches = async () => {
    if (!activeHustle || syncingBatches) return;
    setSyncingBatches(true);
    try {
      await autopilotApi.rebalanceBatches(activeHustle.id, false);
      await loadAll();
      notify("Organized unbatched leads into batches!");
    } catch (err) {
      notify(`Batch sync failed: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setSyncingBatches(false);
    }
  };

  const handleDragOverColumn = useCallback((e: React.DragEvent, stageId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverStageId !== stageId) {
      setDragOverStageId(stageId);
    }
  }, [dragOverStageId, setDragOverStageId]);

  const handleDragLeaveColumn = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverStageId(null);
  }, [setDragOverStageId]);

  const handleDropOnColumn = useCallback((e: React.DragEvent, stageId: number) => {
    e.preventDefault();
    setDragOverStageId(null);
    const leadIdStr = e.dataTransfer.getData("text/plain");
    if (leadIdStr) {
      const leadId = Number(leadIdStr);
      const l = leads.find((x) => x.id === leadId);
      if (l && l.stage_id !== stageId) {
        handleStageChange(l, stageId);
      }
    }
    setDraggingLeadId(null);
  }, [leads, handleStageChange, setDragOverStageId, setDraggingLeadId]);

  const handleOpenAddLead = useCallback(() => {
    setNewLeadModalOpen(true);
  }, [setNewLeadModalOpen]);

  const handleSelectLead = useCallback((id: number) => {
    setSelectedLeadId(id);
  }, [setSelectedLeadId]);

  const handleAdvanceStage = useCallback((lead: any, stageId: number) => {
    handleStageChange(lead, stageId);
  }, [handleStageChange]);

  const isAllActive = activeSmartView === "all_active";

  // Smart view metadata configuration
  const smartViewConfig: Record<
    string,
    { label: string; icon: React.ComponentType<{ className?: string }>; color: string; description: string }
  > = {
    all_active: {
      label: "All Active Pipeline",
      icon: LayoutGrid,
      color: "text-indigo-500",
      description: "Full-scale pipeline overview across all active deal stages",
    },
    review_tray: {
      label: "Review Tray (Ready to Pitch)",
      icon: CheckCircle2,
      color: "text-emerald-500",
      description: "Clinics with completed demo packages staged and awaiting pitch dispatch",
    },
    due_today: {
      label: "Due Today & Overdue",
      icon: Clock,
      color: "text-amber-500",
      description: "High-priority outreach and follow-up tasks scheduled for today",
    },
    hot_intent: {
      label: "Hot Demo Viewers",
      icon: Flame,
      color: "text-rose-500",
      description: "Clinics showing strong buying intent and active demo engagement",
    },
    replied_warm: {
      label: "Active Replies",
      icon: MessageSquare,
      color: "text-blue-500",
      description: "Interested dental clinics with active inbound replies",
    },
    archived: {
      label: "Archived & Do Not Contact",
      icon: Archive,
      color: "text-slate-400",
      description: "Archived clinics and leads marked as Do Not Contact",
    },
    archived_dnc: {
      label: "Archived & Do Not Contact",
      icon: Archive,
      color: "text-slate-400",
      description: "Archived clinics and leads marked as Do Not Contact",
    },
  };

  const currentViewInfo = smartViewConfig[activeSmartView] || {
    label: activeSmartView.replace(/_/g, " ").toUpperCase(),
    icon: LayoutGrid,
    color: "text-indigo-500",
    description: "Filtered subset of pipeline leads",
  };
  const CurrentViewIcon = currentViewInfo.icon;

  // Filtered leads for the focused list view when a specific smart view is selected
  const focusedLeads = useMemo(() => {
    const isArchivedView = activeSmartView === "archived" || activeSmartView === "archived_dnc";
    const sourceLeads = isArchivedView ? archivedLeads : leads;
    const query = searchQuery.trim().toLowerCase();
    const candidateLeads = sourceLeads.filter((lead) => {
      if (activeSmartView === "review_tray") {
        const stage = activeHustle?.stages.find((s) => s.id === lead.stage_id);
        if (stage && stage.slug !== "package_ready" && stage.slug !== "review_tray") return false;
      } else if (activeSmartView === "due_today") {
        if (!lead.next_action_due_at) return false;
        const due = new Date(lead.next_action_due_at).getTime();
        if (due > Date.now() + 24 * 3600 * 1000) return false;
      } else if (activeSmartView === "hot_intent") {
        const hasViews = ((lead as any).demo_views_count ?? lead.events?.length ?? 0) > 0;
        if (lead.intent_score < 40 && !hasViews) return false;
      } else if (activeSmartView === "replied_warm") {
        const stage = activeHustle?.stages.find((s) => s.id === lead.stage_id);
        if (stage && stage.slug !== "replied") return false;
      } else if (isArchivedView) {
        if (!isLeadClosedLost(lead, activeHustle?.stages)) return false;
      } else {
        // Active smart views: exclude CLOSED_LOST / archived / DNC leads
        if (isLeadClosedLost(lead, activeHustle?.stages)) return false;
      }
      return true;
    });

    // If client filter was stricter than backend-returned dataset, fallback to candidateLeads
    const baseSet = candidateLeads.length > 0 || isAllActive ? candidateLeads : sourceLeads;

    return baseSet
      .filter((l) => (filterMinFit > 0 ? l.fit_score >= filterMinFit : true))
      .filter((l) => (filterVerifiedOnly ? l.facts?.some((f) => f.verified_by_two_sources) : true))
      .filter((l) => {
        if (!query) return true;
        return (
          l.name.toLowerCase().includes(query) ||
          (l.doctor_name && l.doctor_name.toLowerCase().includes(query)) ||
          (l.locality && l.locality.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => {
        if (sortBy === "fit") return sortOrder === "asc" ? a.fit_score - b.fit_score : b.fit_score - a.fit_score;
        if (sortBy === "intent") return sortOrder === "asc" ? a.intent_score - b.intent_score : b.intent_score - a.intent_score;
        if (sortBy === "deal") return sortOrder === "asc" ? (a.deal_value_inr || 25000) - (b.deal_value_inr || 25000) : (b.deal_value_inr || 25000) - (a.deal_value_inr || 25000);
        if (sortBy === "name") return sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
        if (sortBy === "due") {
          const dA = a.next_action_due_at ? new Date(a.next_action_due_at).getTime() : 0;
          const dB = b.next_action_due_at ? new Date(b.next_action_due_at).getTime() : 0;
          return sortOrder === "asc" ? dA - dB : dB - dA;
        }
        return 0;
      });
  }, [leads, archivedLeads, activeSmartView, activeHustle?.stages, isAllActive, filterMinFit, filterVerifiedOnly, searchQuery, sortBy, sortOrder]);

  // Overall count for Total in View badge
  const totalCount = useMemo(() => {
    if (!isAllActive) return focusedLeads.length;
    const query = searchQuery.trim().toLowerCase();
    return leads.filter((l) => {
      // Exclude CLOSED_LOST from active board total
      if (isLeadClosedLost(l, activeHustle?.stages)) return false;
      if (filterMinFit > 0 && l.fit_score < filterMinFit) return false;
      if (filterVerifiedOnly && !l.facts?.some((f) => f.verified_by_two_sources)) return false;
      if (query) {
        const nameMatch = l.name.toLowerCase().includes(query);
        const doctorMatch = l.doctor_name?.toLowerCase().includes(query);
        const localityMatch = l.locality?.toLowerCase().includes(query);
        if (!nameMatch && !doctorMatch && !localityMatch) return false;
      }
      return true;
    }).length;
  }, [leads, isAllActive, focusedLeads.length, activeHustle?.stages, filterMinFit, filterVerifiedOnly, searchQuery]);

  if (loading || !activeHustle) {
    return <KanbanSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Floating Top Controls with Search, Filter, Sort, and Total in view (No outer bar wrapper) */}
      <div className="flex flex-wrap items-center justify-between gap-3 relative">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Expandable Search Button */}
          {searchExpanded || searchQuery.trim().length > 0 ? (
            <div className="relative flex items-center transition-all duration-200">
              <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => {
                  if (!searchQuery.trim()) {
                    setSearchExpanded(false);
                  }
                }}
                placeholder="Filter current board..."
                className="pl-8 pr-7 py-1.5 rounded-xl text-xs bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-white/[0.08] shadow-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 w-52 sm:w-60 transition-all"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchExpanded(false);
                }}
                className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                title="Clear filter"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSearchExpanded(true);
                setTimeout(() => searchInputRef.current?.focus(), 50);
              }}
              className="h-8 w-8 rounded-xl bg-white hover:bg-slate-50 dark:bg-[#18181B] dark:hover:bg-slate-800 border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white cursor-pointer transition-all"
              title="Filter current board (/)"
              aria-label="Filter board"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Interactive Filter Button & Popover */}
          <div className="relative">
            <button
              onClick={() => {
                setFilterPopoverOpen(!filterPopoverOpen);
                setSortPopoverOpen(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium shadow-xs transition-all cursor-pointer ${
                filterPopoverOpen || filterMinFit > 0 || filterVerifiedOnly
                  ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900"
                  : "bg-white hover:bg-slate-50 dark:bg-[#18181B] dark:hover:bg-slate-800 border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-zinc-200"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter</span>
              {(filterMinFit > 0 || filterVerifiedOnly) && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>

            {filterPopoverOpen && (
              <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#3F3F46] shadow-2xl p-4 z-40 space-y-3.5 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#27272A]">
                  <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">Quick Filters</span>
                  <button
                    onClick={() => {
                      setFilterMinFit(0);
                      setFilterVerifiedOnly(false);
                    }}
                    className="text-[10px] text-slate-400 hover:text-indigo-500 cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-600 dark:text-zinc-400">
                    Minimum AI Fit Score: {filterMinFit}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="10"
                    value={filterMinFit}
                    onChange={(e) => setFilterMinFit(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={filterVerifiedOnly}
                    onChange={(e) => setFilterVerifiedOnly(e.target.checked)}
                    className="rounded accent-indigo-600 cursor-pointer"
                  />
                  <span>Only show 2-source verified leads</span>
                </label>
              </div>
            )}
          </div>

          {/* Interactive Sort Button & CustomerGo Floating Sort Popover */}
          <div className="relative">
            <button
              onClick={() => {
                setSortPopoverOpen(!sortPopoverOpen);
                setFilterPopoverOpen(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium shadow-xs transition-all cursor-pointer ${
                sortPopoverOpen
                  ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900"
                  : "bg-white hover:bg-slate-50 dark:bg-[#18181B] dark:hover:bg-slate-800 border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-zinc-200"
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort</span>
            </button>

            {sortPopoverOpen && (
              <div className="absolute left-0 mt-2 w-80 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#3F3F46] shadow-2xl p-4 z-40 space-y-3.5 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#27272A]">
                  <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                    <span>Sort Options</span>
                    <span className="text-[10px] font-normal text-slate-400">(CustomerGo style)</span>
                  </div>
                  <button onClick={() => setSortPopoverOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-[#27272A]">
                    <div className="text-slate-400 text-xs font-mono pl-1">::</div>
                    <Select
                      value={sortBy}
                      onChange={(val) => setSortBy(val as any)}
                      options={[
                        { value: "fit", label: "AI Fit Score" },
                        { value: "intent", label: "Buyer Intent Score" },
                        { value: "deal", label: "Projected Deal Value" },
                        { value: "name", label: "Clinic / Lead Name" },
                        { value: "due", label: "Next Action Due Date" },
                      ]}
                      className="flex-1"
                      triggerClassName="!py-1 !px-2 !text-xs !bg-transparent !border-none !shadow-none font-medium"
                    />
                    <Select
                      value={sortOrder}
                      onChange={(val) => setSortOrder(val as any)}
                      options={[
                        { value: "desc", label: "Desc ↓" },
                        { value: "asc", label: "Asc ↑" },
                      ]}
                      className="w-24 shrink-0"
                      triggerClassName="!py-1 !px-2 !text-xs !bg-transparent !border-none !shadow-none font-semibold text-indigo-600 dark:text-indigo-400"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Total In View Badge & Hide Empty Stages Toggle */}
        <div className="flex items-center gap-2 text-xs">
          {isAllActive && (
            <>
              <button
                onClick={() => setBatchGroupingEnabled(!batchGroupingEnabled)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium shadow-xs transition-all cursor-pointer ${
                  batchGroupingEnabled
                    ? "bg-zinc-900 text-white border-zinc-900 shadow-sm dark:bg-white dark:text-zinc-900"
                    : "bg-white hover:bg-slate-50 dark:bg-[#18181B] dark:hover:bg-slate-800 border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-zinc-200"
                }`}
                title="Toggle batch grouping for early volume stages"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{batchGroupingEnabled ? "Mode: Hybrid Batches" : "Mode: All Individual Cards"}</span>
              </button>

              <button
                onClick={handleSyncBatches}
                disabled={syncingBatches}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium shadow-xs transition-all cursor-pointer bg-white hover:bg-slate-50 dark:bg-[#18181B] dark:hover:bg-slate-800 border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-zinc-200 disabled:opacity-50 disabled:cursor-wait"
                title="Assign unbatched leads into batches"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingBatches ? "animate-spin" : ""}`} />
                <span>{syncingBatches ? "Syncing…" : `Sync Batches (${activeHustle.channel_limits?.batch_size ?? 25}/batch)`}</span>
              </button>
            </>
          )}

          {isAllActive && (
            <button
              onClick={() => setHideEmptyStages(!hideEmptyStages)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium shadow-xs transition-all cursor-pointer ${
                hideEmptyStages
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 shadow-xs"
                  : "bg-white hover:bg-slate-50 dark:bg-[#18181B] dark:hover:bg-slate-800 border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-zinc-200"
              }`}
              title={hideEmptyStages ? "Empty stages collapsed. Click to show all." : "Showing all stages. Click to hide empty."}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{hideEmptyStages ? "Hide Empty Stages" : "Show All Stages"}</span>
            </button>
          )}

          {!isAllActive && (activeSmartView === "archived" || activeSmartView === "archived_dnc") && (
            <button
              onClick={refreshArchivedLeads}
              disabled={archivedLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium shadow-xs transition-all cursor-pointer bg-white hover:bg-slate-50 dark:bg-[#18181B] dark:hover:bg-slate-800 border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-zinc-200 disabled:opacity-50 disabled:cursor-wait"
              title="Refresh archived leads"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${archivedLoading ? "animate-spin" : ""}`} />
              <span>{archivedLoading ? "Refreshing…" : "Refresh"}</span>
            </button>
          )}

          <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 pl-1">
            {totalCount} clinics
          </span>
        </div>
      </div>

      {/* DUAL DISPLAY MODE: Full-Scale Kanban for All Active vs Focused List View for Smart Filters */}
      {isAllActive ? (
        /* ==================== 1. FULL-SCALE KANBAN COLUMNS ==================== */
        <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory touch-pan-x">
          {activeHustle.stages
            .filter((stage) => !stage.is_lost && stage.slug !== "lost" && stage.slug !== "closed_lost")
            .map((stage, sIdx) => {
            const stageLeads = leads.filter((l) => l.stage_id === stage.id && !isLeadClosedLost(l, activeHustle.stages));
            const query = searchQuery.trim().toLowerCase();
            const filteredLeads = stageLeads
              .filter((l) => (filterMinFit > 0 ? l.fit_score >= filterMinFit : true))
              .filter((l) => (filterVerifiedOnly ? l.facts?.some((f) => f.verified_by_two_sources) : true))
              .filter((l) => {
                if (!query) return true;
                return (
                  l.name.toLowerCase().includes(query) ||
                  (l.doctor_name && l.doctor_name.toLowerCase().includes(query)) ||
                  (l.locality && l.locality.toLowerCase().includes(query))
                );
              })
              .sort((a, b) => {
                if (sortBy === "fit") return sortOrder === "asc" ? a.fit_score - b.fit_score : b.fit_score - a.fit_score;
                if (sortBy === "intent") return sortOrder === "asc" ? a.intent_score - b.intent_score : b.intent_score - a.intent_score;
                if (sortBy === "deal") return sortOrder === "asc" ? (a.deal_value_inr || 25000) - (b.deal_value_inr || 25000) : (b.deal_value_inr || 25000) - (a.deal_value_inr || 25000);
                if (sortBy === "name") return sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
                if (sortBy === "due") {
                  const dA = a.next_action_due_at ? new Date(a.next_action_due_at).getTime() : 0;
                  const dB = b.next_action_due_at ? new Date(b.next_action_due_at).getTime() : 0;
                  return sortOrder === "asc" ? dA - dB : dB - dA;
                }
                return 0;
              });

            const stageColors = [
              "bg-indigo-500",
              "bg-amber-500",
              "bg-emerald-500",
              "bg-blue-500",
              "bg-purple-500",
              "bg-rose-500",
            ];
            const dotColor = stageColors[sIdx % stageColors.length];

            return (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                allStages={activeHustle.stages}
                leads={filteredLeads}
                isDragOver={dragOverStageId === stage.id}
                draggingLeadId={draggingLeadId}
                selectedLeadId={selectedLeadId}
                hideEmpty={hideEmptyStages}
                batchGroupingEnabled={batchGroupingEnabled}
                stageColorClass={dotColor}
                onDragOver={(e) => handleDragOverColumn(e, stage.id)}
                onDragLeave={handleDragLeaveColumn}
                onDrop={(e) => handleDropOnColumn(e, stage.id)}
                onLeadSelect={handleSelectLead}
                onAdvanceLeadStage={handleAdvanceStage}
                onApproveAndSend={handleApproveAndSend}
                onAddLead={handleOpenAddLead}
              />
            );
          })}
        </div>
      ) : (
        /* ==================== 2. FOCUSED LIST VIEW FOR SMART FILTERS ==================== */
        <div className="space-y-3 pb-6">
          {/* Focused List Rows / Empty State */}
          {archivedLoading ? (
            <KanbanSkeleton />
          ) : focusedLeads.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center mx-auto text-slate-400">
                <CurrentViewIcon className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                No leads found in &quot;{currentViewInfo.label}&quot;
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                There are currently no active leads matching this smart view filter or search criteria.
              </p>
              <button
                onClick={() => setActiveSmartView("all_active")}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 text-xs font-semibold transition-all cursor-pointer shadow-xs"
              >
                View All Active Pipeline
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {focusedLeads.map((lead) => {
                const stage = activeHustle.stages.find((s) => s.id === lead.stage_id);
                const intentDot =
                  (lead.intent_score ?? 0) >= 8
                    ? "bg-emerald-500"
                    : (lead.intent_score ?? 0) >= 5
                    ? "bg-amber-500"
                    : "bg-slate-400";

                return (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-white/[0.08] shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-white/[0.15] transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    {/* Left: Clinic / Doctor info */}
                    <div className="flex items-start gap-3 min-w-0 md:w-1/3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-200 border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-center font-semibold text-xs shrink-0">
                        {lead.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                          {lead.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5 truncate">
                          {lead.doctor_name && (
                            <span className="font-medium text-slate-700 dark:text-zinc-300">
                              {formatDoctorName(lead.doctor_name)} &bull;
                            </span>
                          )}
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{lead.locality || lead.city}</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Stage & Scores & Next Action */}
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 flex-1">
                      {/* Current Stage Badge */}
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-zinc-300 border border-slate-200/70 dark:border-white/[0.08]">
                        {stage?.name || "Pipeline Lead"}
                      </span>

                      {/* AI Fit & Intent Badges */}
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-slate-100 dark:bg-white/[0.06] text-zinc-800 dark:text-zinc-200 border border-slate-200/60 dark:border-white/[0.06]">
                          Fit {lead.fit_score}%
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-zinc-300 border border-slate-200/60 dark:border-white/[0.06] flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${intentDot} shrink-0`} />
                          Intent {lead.intent_score}
                        </span>
                      </div>

                      {/* Next Action & Due Date */}
                      {lead.next_action && (
                        <div className="text-xs text-slate-600 dark:text-zinc-300 flex items-center gap-1.5 max-w-xs truncate">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            <strong className="text-slate-800 dark:text-zinc-200">Next: </strong>
                            {lead.next_action}
                          </span>
                          {lead.next_action_due_at && (
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              ({new Date(lead.next_action_due_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })})
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Deal Value & Quick Actions */}
                    <div className="flex items-center justify-between md:justify-end gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-white/[0.08]">
                      <div className="text-right mr-1">
                        <div className="text-xs font-mono font-semibold text-slate-700 dark:text-zinc-300 tabular-nums">
                          ₹{(lead.deal_value_inr || 25000).toLocaleString()}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openInboxForLead(lead.id);
                        }}
                        className="py-1.5 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-slate-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white border border-slate-200/70 dark:border-white/[0.08] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Open WhatsApp chat"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                        <span>Chat</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openLogCallModal(lead.id);
                        }}
                        className="py-1.5 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-slate-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white border border-slate-200/70 dark:border-white/[0.08] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Log raw call & generate AI notes"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>Call</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLeadId(lead.id);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 text-xs font-semibold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
