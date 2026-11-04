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
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
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

  // n8n-style vertical zig-zag offset classes
  const getZigZagClass = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return "xl:translate-y-0";
      case 2:
        return "xl:translate-y-8";
      case 3:
        return "xl:-translate-y-3";
      case 4:
        return "xl:translate-y-10";
      case 5:
        return "xl:-translate-y-2";
      case 6:
        return "xl:translate-y-6";
      default:
        return "xl:translate-y-0";
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5 xl:gap-8 relative py-6 xl:py-12">
      {nodes.map((node, idx) => {
        const isSelected = selectedNodeId === node.id;
        const isRunning = node.status === "RUNNING";
        const isSuccess = node.status === "SUCCESS";
        const isFailed = node.status === "FAILED";

        return (
          <div
            key={node.id}
            className={`relative flex items-center transition-transform duration-300 ${getZigZagClass(node.stepNumber)}`}
          >
            <div
              onClick={() => onSelectNode(node)}
              className={`w-full relative rounded-2xl cursor-pointer text-left select-none group transition-all duration-200 ${
                isSelected
                  ? "scale-[1.02] ring-2 ring-indigo-500 shadow-xl shadow-indigo-500/15"
                  : "hover:scale-[1.01]"
              }`}
            >
              {/* Rotating Loading Ring Animation for Active RUNNING Nodes */}
              {isRunning && (
                <div className="absolute -inset-[2px] rounded-2xl overflow-hidden pointer-events-none z-0">
                  <div
                    className="w-[200%] h-[200%] -left-[50%] -top-[50%] absolute animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_270deg,#6366f1_360deg)] opacity-100"
                  />
                </div>
              )}

              {/* Input Port Dot (Left) */}
              {node.stepNumber > 1 && (
                <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-[#141721] flex items-center justify-center z-20 shadow-xs">
                  <div
                    className={`w-1 h-1 rounded-full ${
                      isRunning
                        ? "bg-amber-400 animate-ping"
                        : isSuccess
                        ? "bg-emerald-400"
                        : "bg-slate-400"
                    }`}
                  />
                </div>
              )}

              {/* Output Port Dot (Right) */}
              {node.stepNumber < 6 && (
                <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-[#141721] flex items-center justify-center z-20 shadow-xs">
                  <div
                    className={`w-1 h-1 rounded-full ${
                      isRunning
                        ? "bg-amber-400"
                        : isSuccess
                        ? "bg-emerald-400"
                        : "bg-slate-400"
                    }`}
                  />
                </div>
              )}

              {/* Main Card Body */}
              <div
                className={`relative z-10 w-full p-3 rounded-2xl backdrop-blur-md shadow-md border transition-all ${
                  isRunning
                    ? "bg-white/95 dark:bg-[#141721]/95 border-transparent shadow-indigo-500/10"
                    : isSuccess
                    ? "bg-white/90 dark:bg-[#141721]/90 border-emerald-500/60 dark:border-emerald-500/50 shadow-xs shadow-emerald-500/10"
                    : isFailed
                    ? "bg-white/90 dark:bg-[#141721]/90 border-rose-500/60 dark:border-rose-500/50"
                    : "bg-white/90 dark:bg-[#141721]/90 border-slate-200/80 dark:border-white/[0.08] hover:border-indigo-400/50 dark:hover:border-white/[0.18]"
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
            </div>

            {/* n8n-style port connector curve to next node */}
            {idx < nodes.length - 1 && (
              <div className="hidden xl:block absolute -right-8 top-1/2 -translate-y-1/2 w-8 pointer-events-none z-10">
                <svg className="w-8 h-12 overflow-visible" viewBox="0 0 32 40">
                  <path
                    d={
                      idx === 0
                        ? "M 0 20 C 16 20, 16 52, 32 52"
                        : idx === 1
                        ? "M 0 20 C 16 20, 16 -24, 32 -24"
                        : idx === 2
                        ? "M 0 20 C 16 20, 16 72, 32 72"
                        : idx === 3
                        ? "M 0 20 C 16 20, 16 -28, 32 -28"
                        : "M 0 20 C 16 20, 16 52, 32 52"
                    }
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    className="text-indigo-500/40 dark:text-indigo-400/40 animate-pulse"
                  />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
