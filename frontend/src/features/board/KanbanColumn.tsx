"use client";

import React, { useState } from "react";
import { Plus, LayoutGrid, ChevronDown, ChevronRight } from "lucide-react";
import { LeadCard } from "./LeadCard";
import { Lead, Stage } from "@/types";

interface KanbanColumnProps {
  stage: Stage;
  allStages: Stage[];
  leads: Lead[];
  isDragOver: boolean;
  draggingLeadId: number | null;
  selectedLeadId: number | null;
  hideEmpty: boolean;
  stageColorClass: string;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onLeadSelect: (id: number) => void;
  onAdvanceLeadStage: (lead: Lead, stageId: number) => void;
  onApproveAndSend?: (lead: Lead) => void;
  onAddLead: () => void;
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
  onDragOver,
  onDragLeave,
  onDrop,
  onLeadSelect,
  onAdvanceLeadStage,
  onApproveAndSend,
  onAddLead,
}: KanbanColumnProps) {
  const [manuallyExpanded, setManuallyExpanded] = useState<boolean>(false);

  const isEmpty = leads.length === 0;
  const isCollapsed = hideEmpty && isEmpty && !manuallyExpanded;

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
        ) : (
          leads.map((lead) => (
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
                onSelect={() => onLeadSelect(lead.id)}
                onAdvanceStage={(nextStageId) => onAdvanceLeadStage(lead, nextStageId)}
                onApproveAndSend={onApproveAndSend}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
