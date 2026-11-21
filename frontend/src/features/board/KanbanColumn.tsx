"use client";

import React, { useMemo, useState, useCallback } from "react";
import { Plus, ChevronDown, ChevronRight, Layers } from "lucide-react";
import { LeadCard } from "./LeadCard";
import { Lead, Stage } from "@/types";

type BatchableLead = Lead & {
  custom_fields?: Record<string, unknown> | null;
  packages?: unknown[] | null;
};

type BatchableStage = Stage & {
  is_won?: boolean;
  is_lost?: boolean;
  order?: number;
};

interface KanbanColumnProps {
  stage: Stage;
  allStages: Stage[];
  leads: Lead[];
  isDragOver: boolean;
  draggingLeadId: number | null;
  selectedLeadId: number | null;
  hideEmpty: boolean;
  stageColorClass: string;
  batchGroupingEnabled?: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onLeadSelect: (id: number) => void;
  onAdvanceLeadStage: (lead: Lead, stageId: number) => void;
  onApproveAndSend?: (lead: Lead) => void;
  onAddLead: () => void;
}

const UNBATCHED = "UNBATCHED";

const HIGH_INTENT_KEYWORDS = [
  "viewed",
  "replied",
  "interested",
  "booked",
  "call",
  "meeting",
  "negotiating",
  "hot",
  "warm",
  "won",
  "lost",
  "closed",
];

const BATCH_STAGE_SLUGS = [
  "discovered",
  "staged",
  "new",
  "package_ready",
  "review_tray",
  "demo_ready",
  "contacted",
  "outreach_sent",
  "pitched",
];

export function isBatchStage(stage: Stage): boolean {
  const s = stage as BatchableStage;
  if (s.is_won || s.is_lost) return false;

  const slug = (s.slug ?? "").toLowerCase();
  const name = (s.name ?? "").toLowerCase();
  if (HIGH_INTENT_KEYWORDS.some((kw) => slug.includes(kw) || name.includes(kw))) return false;

  if (BATCH_STAGE_SLUGS.includes(slug)) return true;
  return (s.order ?? Number.POSITIVE_INFINITY) <= 3;
}

function getBatchId(lead: Lead): string {
  const raw = (lead as BatchableLead).custom_fields?.batch_id;
  return raw ? String(raw) : UNBATCHED;
}

function compareBatchIds(a: string, b: string): number {
  if (a === UNBATCHED) return 1;
  if (b === UNBATCHED) return -1;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function hasPackages(lead: Lead): boolean {
  return ((lead as BatchableLead).packages?.length ?? 0) > 0;
}

function isReady(lead: Lead): boolean {
  return hasPackages(lead) || !!lead.facts?.some((f) => f.verified_by_two_sources);
}

interface BatchGroupProps {
  batchId: string;
  batchLeads: Lead[];
  expanded: boolean;
  onToggle: () => void;
  renderLead: (lead: Lead, isNested?: boolean) => React.ReactNode;
}

function BatchGroup({ batchId, batchLeads, expanded, onToggle, renderLead }: BatchGroupProps) {
  const count = batchLeads.length;
  const isUnbatched = batchId === UNBATCHED;

  const avgFit = Math.round(batchLeads.reduce((sum, l) => sum + (l.fit_score ?? 0), 0) / count);
  const demosReady = batchLeads.filter(hasPackages).length;
  const readyCount = batchLeads.filter(isReady).length;
  const progressPct = Math.round((readyCount / count) * 100);

  const localityCounts = new Map<string, number>();
  batchLeads.forEach((l) => {
    const loc = l.locality || l.city;
    if (loc) localityCounts.set(loc, (localityCounts.get(loc) ?? 0) + 1);
  });
  const localities = [...localityCounts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  const localitySummary =
    localities.length === 0
      ? "NCR Region"
      : localities.slice(0, 2).join(", ") + (localities.length > 2 ? ` +${localities.length - 2}` : "");

  return (
    <div className="space-y-2.5">
      {/* Redesigned Clean Batch Card Surface */}
      <div
        onClick={onToggle}
        className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#18181B] p-3.5 shadow-xs hover:shadow-md transition-all cursor-pointer select-none space-y-2.5"
      >
        {/* Top Row: Batch Pill + Full Locality + Count Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shrink-0">
              {isUnbatched ? "UNBATCHED" : batchId}
            </span>
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
              {localitySummary}
            </span>
          </div>
          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#27272A] text-slate-600 dark:text-zinc-400 shrink-0">
            {count} Clinics
          </span>
        </div>

        {/* Middle Row: Clean Inline Summary */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-zinc-400 font-medium">
            <span>{avgFit}% Avg Fit</span>
            <span>{demosReady}/{count} Demos Ready</span>
          </div>

          {/* Sleek 4px Progress Bar */}
          <div className="h-1 w-full rounded-full bg-slate-100 dark:bg-[#27272A] overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Bottom Toggle Trigger */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-[#27272A]/80">
          <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-1">
            <span>{expanded ? "Collapse Batch" : `Inspect ${count} Leads`}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </span>
        </div>
      </div>

      {/* Expanded: Individual Cleanly Stacked Child Cards without cramped nested borders */}
      {expanded && (
        <div className="space-y-2.5 pl-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          {batchLeads.map((lead) => renderLead(lead, true))}
        </div>
      )}
    </div>
  );
}

export const KanbanColumn = React.memo(function KanbanColumn({
  stage,
  allStages,
  leads,
  isDragOver,
  draggingLeadId,
  selectedLeadId,
  hideEmpty,
  stageColorClass,
  batchGroupingEnabled = true,
  onDragOver,
  onDragLeave,
  onDrop,
  onLeadSelect,
  onAdvanceLeadStage,
  onApproveAndSend,
  onAddLead,
}: KanbanColumnProps) {
  const [manuallyExpanded, setManuallyExpanded] = useState<boolean>(false);
  const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});
  const [visibleCount, setVisibleCount] = useState<number>(30);

  const isEmpty = leads.length === 0;
  const isCollapsed = hideEmpty && isEmpty && !manuallyExpanded;
  const useBatchView = batchGroupingEnabled && isBatchStage(stage) && leads.length > 0;

  const batchGroups = useMemo(() => {
    if (!useBatchView) return [] as [string, Lead[]][];
    const groups = new Map<string, Lead[]>();
    for (const lead of leads) {
      const id = getBatchId(lead);
      const bucket = groups.get(id);
      if (bucket) bucket.push(lead);
      else groups.set(id, [lead]);
    }
    return [...groups.entries()].sort(([a], [b]) => compareBatchIds(a, b));
  }, [leads, useBatchView]);

  const renderLead = useCallback(
    (lead: Lead, isNested = false) => (
      <div
        key={lead.id}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", String(lead.id));
          e.dataTransfer.effectAllowed = "move";
        }}
      >
        <LeadCard
          lead={lead}
          stageName={stage.name}
          stageSlug={stage.slug}
          allStages={allStages}
          isSelected={selectedLeadId === lead.id}
          isDragging={draggingLeadId === lead.id}
          isNestedInBatch={isNested}
          onSelect={() => onLeadSelect(lead.id)}
          onAdvanceStage={(nextStageId) => onAdvanceLeadStage(lead, nextStageId)}
          onApproveAndSend={onApproveAndSend}
        />
      </div>
    ),
    [
      stage.name,
      stage.slug,
      allStages,
      selectedLeadId,
      draggingLeadId,
      onLeadSelect,
      onAdvanceLeadStage,
      onApproveAndSend,
    ]
  );

  const PAGE_SIZE = 30;
  const displayedLeads = useMemo(() => {
    if (useBatchView) return leads;
    return leads.slice(0, visibleCount);
  }, [leads, useBatchView, visibleCount]);

  const hasMoreLeads = !useBatchView && visibleCount < leads.length;
  const remainingCount = leads.length - visibleCount;

  // Collapsed Empty Stage Column
  if (isCollapsed) {
    return (
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => setManuallyExpanded(true)}
        className={`w-12 shrink-0 flex flex-col items-center py-4 rounded-2xl bg-[#EAEEF3]/60 dark:bg-[#18181B]/60 border border-dashed transition-all cursor-pointer group hover:bg-[#EAEEF3] dark:hover:bg-slate-800 ${
          isDragOver
            ? "border-zinc-900 ring-2 ring-zinc-900/20 bg-zinc-100/50"
            : "border-slate-200/80 dark:border-[#27272A]"
        }`}
        title={`Click to expand empty stage: ${stage.name}`}
      >
        <span className={`w-1 h-4 rounded-full ${stageColorClass} mb-2`} />
        <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
          0
        </span>
        <div className="flex-1 flex items-center justify-center my-3">
          <span
            className="text-[11px] font-semibold text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 uppercase tracking-widest whitespace-nowrap"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            {stage.name}
          </span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-zinc-900 transition-colors" />
      </div>
    );
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`w-[350px] min-w-[350px] shrink-0 flex flex-col rounded-2xl bg-[#EAEEF3]/75 dark:bg-[#18181B]/60 border transition-all duration-200 snap-start p-3 ${
        isDragOver
          ? "border-zinc-900 dark:border-white ring-2 ring-zinc-900/10"
          : "border-slate-200/60 dark:border-[#27272A]"
      }`}
    >
      {/* Taskk-Style Single-Line Column Header with Vertical Accent Pill */}
      <div className="h-8 flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-1 h-4 rounded-full ${stageColorClass} shrink-0`} />
          <span className="font-semibold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200 truncate">
            {stage.name}
          </span>
          <span className="bg-slate-200/80 dark:bg-[#27272A] text-slate-700 dark:text-zinc-300 rounded-md px-1.5 py-0.5 text-[11px] font-medium shrink-0">
            {leads.length}
          </span>
          {useBatchView && (
            <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 bg-white/70 dark:bg-[#27272A]/80 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-[#3F3F46] shrink-0">
              {batchGroups.length} {batchGroups.length === 1 ? "batch" : "batches"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {hideEmpty && isEmpty && (
            <button
              onClick={() => setManuallyExpanded(false)}
              className="p-1 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Collapse empty stage"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onAddLead}
            className="p-1 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800 text-slate-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Add lead to stage"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto space-y-2.5 min-h-[450px] pr-0.5">
        {leads.length === 0 ? (
          <div className="h-36 border border-dashed border-slate-300/60 dark:border-[#27272A] rounded-xl flex flex-col items-center justify-center text-slate-400 p-4 text-center">
            <span className="text-xs font-medium">Empty stage</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Drag cards here</span>
          </div>
        ) : useBatchView ? (
          batchGroups.map(([batchId, batchLeads]) => (
            <BatchGroup
              key={batchId}
              batchId={batchId}
              batchLeads={batchLeads}
              expanded={!!expandedBatches[batchId]}
              onToggle={() =>
                setExpandedBatches((prev) => ({
                  ...prev,
                  [batchId]: !prev[batchId],
                }))
              }
              renderLead={renderLead}
            />
          ))
        ) : (
          <>
            {displayedLeads.map((lead) => renderLead(lead))}
            {hasMoreLeads && (
              <div className="pt-1 pb-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                  className="w-full py-2 px-3 rounded-xl bg-white dark:bg-[#18181B] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-white/[0.08] shadow-xs text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Show more ({remainingCount} remaining)</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});
