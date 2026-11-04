"use client";

import React from "react";
import {
  Compass,
  FileCode2,
  Film,
  Inbox,
  Layers,
  Search,
  Sparkles,
} from "lucide-react";
import { NodeInspectionData, NodeStatus } from "./types";

interface PipelineNodeNetworkProps {
  nodes: NodeInspectionData[];
  selectedNodeId: number | null;
  onSelectNode: (node: NodeInspectionData) => void;
}

export function PipelineNodeNetwork({
  nodes,
  selectedNodeId,
  onSelectNode,
}: PipelineNodeNetworkProps) {
  const renderStatusPill = (status: NodeStatus) => {
    switch (status) {
      case "SUCCESS":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            OK
          </span>
        );
      case "RUNNING":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            RUN
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            ERR
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-semibold bg-slate-800 text-slate-400 border border-slate-700/60">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            WAIT
          </span>
        );
    }
  };

  const getNodeIcon = (step: number) => {
    switch (step) {
      case 1:
        return <Compass className="w-3.5 h-3.5 text-cyan-400" />;
      case 2:
        return <Search className="w-3.5 h-3.5 text-amber-400" />;
      case 3:
        return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
      case 4:
        return <FileCode2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 5:
        return <Film className="w-3.5 h-3.5 text-pink-400" />;
      case 6:
        return <Inbox className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 relative">
      {nodes.map((node, idx) => {
        const isSelected = selectedNodeId === node.id;
        return (
          <div key={node.id} className="relative flex items-center">
            <div
              onClick={() => onSelectNode(node)}
              className={`w-full p-3 rounded-2xl bg-white/90 dark:bg-[#141721]/90 backdrop-blur-md shadow-md border transition-all duration-200 cursor-pointer text-left select-none relative group ${
                isSelected
                  ? "border-indigo-500 dark:border-indigo-400 shadow-indigo-500/10 scale-[1.02] ring-2 ring-indigo-500/20"
                  : "border-slate-200/80 dark:border-white/[0.08] hover:border-indigo-400/60 dark:hover:border-white/[0.18]"
              }`}
            >
              {/* Header: Icon + Stage Title + Status Pill */}
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="p-1 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.06] shrink-0">
                    {getNodeIcon(node.stepNumber)}
                  </div>
                  <div className="truncate">
                    <span className="text-[11px] font-black text-slate-900 dark:text-white truncate block">
                      {node.stepNumber}. {node.name}
                    </span>
                  </div>
                </div>
                {renderStatusPill(node.status)}
              </div>

              {/* Subtitle / Tools */}
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mb-2 font-medium">
                {node.subtitle || node.tools}
              </div>

              {/* Footer: Count badge + Inspect indicator */}
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-white/[0.06] text-xs">
                <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[85px]">
                  {node.badge}
                </span>
                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline flex items-center gap-0.5 shrink-0">
                  Inspect →
                </span>
              </div>
            </div>

            {/* Connecting flow line to next node */}
            {idx < nodes.length - 1 && (
              <div className="hidden xl:flex absolute -right-3 z-10 w-3 items-center justify-center pointer-events-none">
                <div className="w-full h-0.5 bg-indigo-500/30 dark:bg-indigo-400/30 relative">
                  <span className="absolute -top-1 right-0 w-2 h-2 rounded-full bg-indigo-500 animate-ping opacity-75" />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
