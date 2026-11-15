"use client";

import React, { useMemo, useState } from "react";
import { Plus, LayoutGrid, ChevronDown, ChevronRight, Layers } from "lucide-react";
import { LeadCard } from "./LeadCard";
import { Lead, Stage } from "@/types";

// Fields that may exist at runtime beyond the base Lead/Stage types.
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

// Warm / high-intent stages must stay as individual cards.
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

// Early, high-volume stages that are grouped into batch cards.
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

/** True for early/volume stages that should render as collapsible batch cards. */
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

/** Natural sort for BATCH-01, BATCH-02, ... with UNBATCHED always last. */
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
      ? "No locality"
      : localities.slice(0, 2).join(", ") + (localities.length > 2 ? ` +${localities.length - 2}` : "");

  return (
    <div
      className={`rounded-2xl border bg-white dark:bg-slate-900 transition-all ${
        expanded
          ? "border-indigo-300 dark:border-indigo-500/40 shadow-md"
          : "border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md"
      }`}
    >
      {/* Batch Card Header + Metrics */}
      <div onClick={onToggle} className="p-3.5 space-y-3 cursor-pointer select-none">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center shrink-0">
              <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 truncate">
              {isUnbatched ? "Unbatched Stock" : batchId}
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
            {count} Clinics
          </span>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          <div className="px-2 py-1.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
            <div className="font-mono font-bold text-indigo-700 dark:text-indigo-300">Avg Fit: {avgFit}%</div>
          </div>
          <div className="px-2 py-1.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
            <div className="font-mono font-bold text-emerald-700 dark:text-emerald-300">{demosReady} Demos Ready</div>
          </div>
          <div className="px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 min-w-0">
            <div className="text-slate-600 dark:text-slate-300 font-medium truncate" title={localities.join(", ")}>
              {localitySummary}
            </div>
          </div>
        </div>

        {/* Progress Bar: share of leads with packages / verified facts */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            <span>Ready</span>
            <span>
              {readyCount}/{count}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Inspect toggle */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            <span>Inspect {count} Leads</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* Expanded: individual draggable LeadCards */}
      {expanded && (
        <div className="p-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 rounded-b-2xl space-y-2.5">
          {batchLeads.map((lead) => renderLead(lead, true))}
        </div>
      )}
    </div>
  );
}

export function KanbanColumn({
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

  // If collapsed empty column: render slim interactive vertical bar with count
  if (isCollapsed) {
    return (
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => setManuallyExpanded(true)}
        className={`w-12 shrink-0 flex flex-col items-center py-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-dashed transition-all cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-850 ${
          isDragOver
            ? "border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/20"
            : "border-slate-200 dark:border-slate-800"
        }`}
        title={`Click to expand empty stage: ${stage.name}`}
      >
        <span className={`w-2 h-2 rounded-full ${stageColorClass} mb-2`} />
        <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
          0
        </span>
        <div className="flex-1 flex items-center justify-center my-3">
          <span
            className="text-[11px] font-bold text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 uppercase tracking-widest whitespace-nowrap"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            {stage.name}
          </span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
      </div>
    );
  }

  const renderLead = (lead: Lead, isNested = false) => (
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
  );

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`flex-1 min-w-[280px] sm:min-w-[310px] max-w-[360px] flex flex-col rounded-2xl bg-slate-50/90 dark:bg-slate-900/70 border transition-all duration-200 snap-start ${
        isDragOver
          ? "border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-500/[0.04]"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      {/* Column Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full ${stageColorClass}`} />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
            {stage.name}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-2xs">
            {leads.length}
          </span>
          {useBatchView && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
              {batchGroups.length} {batchGroups.length === 1 ? "batch" : "batches"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {hideEmpty && isEmpty && (
            <button
              onClick={() => setManuallyExpanded(false)}
              className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Collapse empty stage"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onAddLead}
            className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
            title="Add lead to stage"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Cards Container */}
      <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[450px]">
        {leads.length === 0 ? (
          <div className="h-44 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-400 p-4 text-center">
            <LayoutGrid className="w-6 h-6 opacity-40 mb-1" />
            <span className="text-xs font-medium">No leads in stage</span>
            <span className="text-[10px] opacity-70">Drag leads here to advance</span>
          </div>
        ) : useBatchView ? (
          batchGroups.map(([batchId, batchLeads]) => (
            <BatchGroup
              key={batchId}
              batchId={batchId}
              batchLeads={batchLeads}
              expanded={!!expandedBatches[batchId]}
              onToggle={() => setExpandedBatches((prev) => ({ ...prev, [batchId]: !prev[batchId] }))}
              renderLead={renderLead}
            />
          ))
        ) : (
          leads.map((lead) => renderLead(lead))
        )}
      </div>
    </div>
  );
}
