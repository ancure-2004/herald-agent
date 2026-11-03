"use client";

import React from "react";
import {
  ArrowUpDown,
  Calendar,
  Clock,
  Eye,
  LayoutGrid,
  MapPin,
  MessageSquare,
  Plus,
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

  if (!activeHustle) return null;

  return (
    <div className="space-y-4">
      {/* Top Bar with Filter, Sort and Pipeline Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/90 dark:border-white/[0.08] backdrop-blur-xl shadow-xs relative">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-600/15 border border-indigo-200 dark:border-indigo-500/30 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Pipeline Overview</span>
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

        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>Total In View: <strong className="text-slate-900 dark:text-white font-mono">{leads.length}</strong></span>
          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
          <span>Target Value: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">₹{leads.length * 25},000</strong></span>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-4 overflow-x-auto pb-6">
        {activeHustle.stages.map((stage, sIdx) => {
          const stageLeads = leads.filter((l) => l.stage_id === stage.id);
          const filteredLeads = stageLeads
            .filter((l) => (filterMinFit > 0 ? l.fit_score >= filterMinFit : true))
            .filter((l) => (filterVerifiedOnly ? l.facts?.some((f) => f.verified_by_two_sources) : true))
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
                const leadId = Number(leadIdStr) || draggingLeadId;
                if (!leadId) return;
                const targetLead = leads.find((l) => l.id === leadId);
                if (targetLead && targetLead.stage_id !== stage.id) {
                  handleStageChange(targetLead, stage.id);
                }
              }}
              className={`w-80 shrink-0 rounded-2xl backdrop-blur-xl border flex flex-col max-h-[calc(100vh-210px)] shadow-xs transition-all ${
                dragOverStageId === stage.id
                  ? "bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/40 shadow-md"
                  : "bg-slate-100/70 dark:bg-[#0E1017] border-slate-200/80 dark:border-white/[0.06]"
              }`}
            >
              {/* Column Header (CustomerGo Style) */}
              <div className="p-3.5 border-b border-slate-200/80 dark:border-white/[0.06] bg-white/60 dark:bg-[#12141D] flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${dotColor.split(' ')[0]}`}></span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-wide">{stage.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08]">
                    {filteredLeads.length}
                  </span>
                  <button
                    onClick={() => setNewLeadModalOpen(true)}
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                    title="Add lead to this stage"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Column Cards Container */}
              <div className="p-3 space-y-3 overflow-y-auto flex-1">
                {filteredLeads.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-200/60 dark:bg-slate-800/40 flex items-center justify-center border border-slate-300/40 dark:border-white/[0.04]">
                      <Plus className="w-4 h-4 text-slate-400" />
                    </div>
                    <span>No leads in this stage</span>
                  </div>
                ) : (
                  filteredLeads.map((lead) => {
                    const isSelected = selectedLeadId === lead.id;
                    const stars = Math.min(5, Math.max(1, Math.round(lead.fit_score / 20)));

                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggingLeadId(lead.id);
                          e.dataTransfer.setData("text/plain", String(lead.id));
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => {
                          setDraggingLeadId(null);
                          setDragOverStageId(null);
                        }}
                        onClick={() => {
                          if (!draggingLeadId) setSelectedLeadId(lead.id);
                        }}
                        className={`p-4 rounded-2xl border transition-all duration-200 cursor-grab active:cursor-grabbing space-y-3 group ${
                          draggingLeadId === lead.id
                            ? "border-2 border-dashed border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 opacity-60 scale-95 shadow-none"
                            : isSelected
                            ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 shadow-md ring-2 ring-indigo-500/40"
                            : "bg-white dark:bg-[#181B26] hover:bg-slate-50/90 dark:hover:bg-[#1F2332] border-slate-200/90 dark:border-white/[0.08] hover:border-indigo-400 dark:hover:border-indigo-500/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-card hover:-translate-y-0.5"
                        }`}
                      >
                        {/* Lead Header & Estimated Deal Value */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center font-bold text-xs text-indigo-600 dark:text-indigo-400 shrink-0">
                              {lead.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="space-y-0.5">
                              <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">
                                {lead.name}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[150px]">{lead.locality || lead.city}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 rounded-lg">
                              ₹{lead.deal_value_inr || 25000}
                            </div>
                          </div>
                        </div>

                        {/* CustomerGo Pastel Pill Tags */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 font-semibold">
                            Dental Clinic
                          </span>
                          {lead.doctor_name && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20 font-medium truncate max-w-[120px]">
                              {lead.doctor_name}
                            </span>
                          )}
                          {lead.do_not_contact ? (
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20 font-bold">
                              DNC
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-medium">
                              Verified
                            </span>
                          )}
                        </div>

                        {/* 5-Star Rating & Fit Score */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/[0.04]">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3 h-3 ${
                                  s <= stars
                                    ? "text-amber-400 fill-amber-400"
                                    : "text-slate-300 dark:text-slate-700"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            Fit: <strong className="text-slate-800 dark:text-slate-200">{lead.fit_score}%</strong>
                          </span>
                        </div>

                        {/* Next Action Box */}
                        {lead.next_action && (
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#10121A] border border-slate-200/80 dark:border-white/[0.06] text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                            <div className="leading-relaxed">
                              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Next: </span>
                              {lead.next_action}
                            </div>
                          </div>
                        )}

                        {/* Card Footer: Metadata Counters (like CustomerGo's [2] [2] [2]) */}
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
