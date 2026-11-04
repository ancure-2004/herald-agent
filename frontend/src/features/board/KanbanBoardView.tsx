"use client";

import React, { useState, useMemo } from "react";
import {
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Flame,
  LayoutGrid,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";

export function KanbanBoardView() {
  const {
    activeHustle,
    leads,
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
  } = useCRM();

  const [searchQuery, setSearchQuery] = useState<string>("");

  // Overall count for Total in View badge
  const totalCount = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return leads.filter((l) => {
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
  }, [leads, filterMinFit, filterVerifiedOnly, searchQuery]);

  if (!activeHustle) return null;

  return (
    <div className="space-y-4">
      {/* Top Bar with Search, Filter, Sort, and Total in view */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/90 dark:border-white/[0.08] backdrop-blur-xl shadow-xs relative">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Compact Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pipeline..."
              className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 w-36 sm:w-48 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Interactive Filter Button & Popover */}
          <div className="relative">
            <button
              onClick={() => {
                setFilterPopoverOpen(!filterPopoverOpen);
                setSortPopoverOpen(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                filterPopoverOpen || filterMinFit > 0 || filterVerifiedOnly
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-700 border-slate-200 dark:border-white/[0.06] text-slate-700 dark:text-slate-300"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter</span>
              {(filterMinFit > 0 || filterVerifiedOnly) && (
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              )}
            </button>

            {filterPopoverOpen && (
              <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.12] shadow-2xl p-4 z-40 space-y-3.5 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Quick Filters</span>
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
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
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
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                sortPopoverOpen
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-700 border-slate-200 dark:border-white/[0.06] text-slate-700 dark:text-slate-300"
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort</span>
            </button>

            {sortPopoverOpen && (
              <div className="absolute left-0 mt-2 w-80 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.12] shadow-2xl p-4 z-40 space-y-3.5 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Sort Options</span>
                    <span className="text-[10px] font-normal text-slate-400">(CustomerGo style)</span>
                  </div>
                  <button onClick={() => setSortPopoverOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-white/[0.06]">
                    <div className="text-slate-400 text-xs font-mono">::</div>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="flex-1 bg-transparent text-xs font-medium text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                    >
                      <option value="fit" className="bg-white dark:bg-[#141721] text-slate-800 dark:text-white">AI Fit Score</option>
                      <option value="intent" className="bg-white dark:bg-[#141721] text-slate-800 dark:text-white">Buyer Intent Score</option>
                      <option value="deal" className="bg-white dark:bg-[#141721] text-slate-800 dark:text-white">Projected Deal Value</option>
                      <option value="name" className="bg-white dark:bg-[#141721] text-slate-800 dark:text-white">Clinic / Lead Name</option>
                      <option value="due" className="bg-white dark:bg-[#141721] text-slate-800 dark:text-white">Next Action Due Date</option>
                    </select>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as any)}
                      className="bg-transparent text-xs font-semibold text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer"
                    >
                      <option value="desc" className="bg-white dark:bg-[#141721] text-slate-800 dark:text-white">Descending ↓</option>
                      <option value="asc" className="bg-white dark:bg-[#141721] text-slate-800 dark:text-white">Ascending ↑</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Total In View Badge */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 font-medium">
            Total in view: <strong className="text-slate-900 dark:text-white font-mono font-bold">{totalCount}</strong>
          </div>
        </div>
      </div>

      {/* FULL-SCALE KANBAN BOARD */}
      <div className="flex gap-4 overflow-x-auto pb-6">
        {activeHustle.stages.map((stage, sIdx) => {
          const stageLeads = leads.filter((l) => l.stage_id === stage.id);
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
            "bg-indigo-500 text-indigo-500",
            "bg-amber-500 text-amber-500",
            "bg-emerald-500 text-emerald-500",
            "bg-blue-500 text-blue-500",
            "bg-purple-500 text-purple-500",
            "bg-rose-500 text-rose-500",
          ];
          const dotColor = stageColors[sIdx % stageColors.length];

          return (
            <div
              key={stage.id}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverStageId !== stage.id) {
                  setDragOverStageId(stage.id);
                }
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setDragOverStageId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverStageId(null);
                const leadIdStr = e.dataTransfer.getData("text/plain");
                if (leadIdStr) {
                  const leadId = Number(leadIdStr);
                  const l = leads.find((x) => x.id === leadId);
                  if (l && l.stage_id !== stage.id) {
                    handleStageChange(l, stage.id);
                  }
                }
                setDraggingLeadId(null);
              }}
              className={`flex-1 min-w-[280px] sm:min-w-[310px] max-w-[360px] flex flex-col rounded-3xl bg-slate-100/70 dark:bg-[#0D0F16]/90 border transition-all duration-200 ${
                dragOverStageId === stage.id
                  ? "border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-500/[0.04]"
                  : "border-slate-200/80 dark:border-white/[0.06]"
              }`}
            >
              {/* Stage Column Header */}
              <div className="p-4 flex items-center justify-between border-b border-slate-200/60 dark:border-white/[0.05]">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                    {stage.name}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-white/[0.06] shadow-2xs">
                    {filteredLeads.length}
                  </span>
                </div>

                <button
                  onClick={() => setNewLeadModalOpen(true)}
                  className="p-1 rounded-lg hover:bg-white dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                  title="Add lead to stage"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Stage Cards Container */}
              <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[450px]">
                {filteredLeads.length === 0 ? (
                  <div className="h-44 border-2 border-dashed border-slate-200 dark:border-white/[0.06] rounded-2xl flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                    <LayoutGrid className="w-6 h-6 opacity-40 mb-1" />
                    <span className="text-xs font-medium">No leads in stage</span>
                    <span className="text-[10px] opacity-70">Drag leads here to advance</span>
                  </div>
                ) : (
                  filteredLeads.map((lead) => {
                    const isSelected = selectedLeadId === lead.id;
                    const isDragging = draggingLeadId === lead.id;
                    const isOverdue =
                      lead.next_action_due_at &&
                      new Date(lead.next_action_due_at).getTime() < Date.now();

                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", String(lead.id));
                          e.dataTransfer.effectAllowed = "move";
                          setDraggingLeadId(lead.id);
                        }}
                        onDragEnd={() => {
                          setDraggingLeadId(null);
                          setDragOverStageId(null);
                        }}
                        onClick={() => setSelectedLeadId(lead.id)}
                        className={`p-4 rounded-2xl bg-white dark:bg-[#141721] border transition-all duration-150 cursor-grab active:cursor-grabbing select-none space-y-2.5 relative group ${
                          isDragging ? "opacity-30 scale-95" : "opacity-100"
                        } ${
                          isSelected
                            ? "border-indigo-500 shadow-md ring-2 ring-indigo-500/20"
                            : "border-slate-200/90 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.18] shadow-xs hover:shadow-md"
                        }`}
                      >
                        {/* Top Card Line: Deal Value + Fit Badge */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/20 text-[11px]">
                            ₹{(lead.deal_value_inr || 25000).toLocaleString()}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {lead.intent_score >= 50 && (
                              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 rounded-md border border-rose-200 dark:border-rose-500/20">
                                <Flame className="w-2.5 h-2.5 fill-rose-500" />
                                {lead.intent_score}
                              </span>
                            )}
                            <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                              {lead.fit_score}% fit
                            </span>
                          </div>
                        </div>

                        {/* Clinic Title & Locality */}
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-sm tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {lead.name}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1 pt-0.5">
                            {lead.doctor_name && (
                              <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                                {lead.doctor_name}
                              </span>
                            )}
                            {lead.doctor_name && <span>•</span>}
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{lead.locality || lead.city}</span>
                          </div>
                        </div>

                        {/* Highlight Reason / 2-Source Tag */}
                        {lead.facts && lead.facts.some((f) => f.verified_by_two_sources) && (
                          <div className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-lg">
                            <ShieldCheck className="w-3 h-3" />
                            <span>2-Source Verified</span>
                          </div>
                        )}

                        {/* Next Action Step (Pipedrive Rule Display) */}
                        {lead.next_action && (
                          <div
                            className={`p-2 rounded-xl text-xs flex items-start gap-2 border ${
                              isOverdue
                                ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300"
                                : "bg-slate-50 dark:bg-white/[0.03] border-slate-200/60 dark:border-white/[0.05] text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <Clock className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isOverdue ? "text-rose-500" : "text-slate-400"}`} />
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                                {isOverdue ? "Overdue Action" : "Next Step"}
                              </div>
                              <div className="text-xs truncate font-medium">
                                {lead.next_action}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Card Footer: Metadata Counters */}
                        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 dark:text-slate-500">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-300">
                              <MessageSquare className="w-3 h-3" />
                              <span>{lead.messages?.length || 0}</span>
                            </span>
                            <span className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-300">
                              <Eye className="w-3 h-3" />
                              <span>{((lead as any).demo_views_count ?? lead.events?.length ?? 0)}</span>
                            </span>
                            <span className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-300">
                              <ShieldCheck className="w-3 h-3" />
                              <span>{lead.facts?.length || 0}</span>
                            </span>
                          </div>
                          {lead.next_action_due_at && (
                            <span className="flex items-center gap-1 font-mono text-[10px]">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{new Date(lead.next_action_due_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                            </span>
                          )}
                        </div>

                        {/* Quick Review Tray Approve Button if in package_ready */}
                        {stage.slug === "package_ready" && !lead.do_not_contact && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApproveAndSend(lead);
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Approve & Send Pitch</span>
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
