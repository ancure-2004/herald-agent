"use client";

import React from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
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
  // Render status badge style
  const renderStatusPill = (status: NodeStatus) => {
    switch (status) {
      case "SUCCESS":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            SUCCESS
          </span>
        );
      case "RUNNING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            RUNNING
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-800 text-slate-400 border border-slate-700/60">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            QUEUED
          </span>
        );
    }
  };

  const getNodeIcon = (step: number) => {
    switch (step) {
      case 1:
        return <Compass className="w-4 h-4 text-cyan-400" />;
      case 2:
        return <Search className="w-4 h-4 text-amber-400" />;
      case 3:
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 4:
        return <FileCode2 className="w-4 h-4 text-emerald-400" />;
      case 5:
        return <Film className="w-4 h-4 text-pink-400" />;
      case 6:
        return <Inbox className="w-4 h-4 text-indigo-400" />;
      default:
        return <Layers className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="p-5 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-card space-y-4">
      {/* Network Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Visual n8n-Style Pipeline Network</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                Interactive Node Flow
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              6 stages connected with live intermediate payload inspection &amp; isolated node retry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Success
          </span>
          <span className="flex items-center gap-1.5 ml-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> Running
          </span>
          <span className="flex items-center gap-1.5 ml-2">
            <span className="w-2 h-2 rounded-full bg-slate-500" /> Queued
          </span>
        </div>
      </div>

      {/* Visual Pipeline Canvas: Row 1 (Nodes 1 -> 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative">
        {nodes.slice(0, 4).map((node, idx) => {
          const isSelected = selectedNodeId === node.id;
          return (
            <div key={node.id} className="relative flex items-center">
              <div
                onClick={() => onSelectNode(node)}
                className={`w-full p-4 rounded-2xl border transition-all duration-200 cursor-pointer text-left select-none relative group ${
                  isSelected
                    ? "bg-slate-50 dark:bg-[#1A1D2B] border-indigo-500 dark:border-indigo-400 shadow-lg shadow-indigo-500/10 scale-[1.02] ring-2 ring-indigo-500/20"
                    : "bg-slate-50/70 hover:bg-slate-100 dark:bg-[#0F1117] dark:hover:bg-[#151824] border-slate-200/90 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.18]"
                }`}
              >
                {/* Connector pulse dot */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white dark:bg-[#1A1D2B] border border-slate-200 dark:border-white/[0.08]">
                      {getNodeIcon(node.stepNumber)}
                    </div>
                    <div>
                      <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                        Stage {node.stepNumber}
                      </div>
                      <div className="text-xs font-black text-slate-900 dark:text-white">
                        {node.name}
                      </div>
                    </div>
                  </div>
                  {renderStatusPill(node.status)}
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mb-2.5 font-medium">
                  {node.tools}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-white/[0.06] text-xs">
                  <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    {node.badge}
                  </span>
                  <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline flex items-center gap-0.5">
                    Inspect →
                  </span>
                </div>
              </div>

              {/* Connecting line to next node (for items 1..3 in row 1) */}
              {idx < 3 && (
                <div className="hidden lg:flex absolute -right-3 z-10 w-3 items-center justify-center pointer-events-none">
                  <div className="w-full h-0.5 bg-indigo-500/30 dark:bg-indigo-400/30 relative">
                    <span className="absolute -top-1 right-0 w-2 h-2 rounded-full bg-indigo-500 animate-ping opacity-75" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Row Connector Bridge (Flowing from Node 4 Down to Row 2: Nodes 5 & 6) */}
      <div className="relative pt-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Spacer columns to place nodes 5 & 6 aligned at the end or left */}
          <div className="hidden lg:block lg:col-span-2 p-3 rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.06] bg-slate-50/30 dark:bg-[#0B0D14]/40 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Full Pipeline Flow: Discovery → QA → Dossier → Build → MP4 → Review Tray</span>
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
              100% End-to-End Autonomous
            </span>
          </div>

          {nodes.slice(4, 6).map((node, idx) => {
            const isSelected = selectedNodeId === node.id;
            return (
              <div key={node.id} className="relative flex items-center">
                <div
                  onClick={() => onSelectNode(node)}
                  className={`w-full p-4 rounded-2xl border transition-all duration-200 cursor-pointer text-left select-none relative group ${
                    isSelected
                      ? "bg-slate-50 dark:bg-[#1A1D2B] border-indigo-500 dark:border-indigo-400 shadow-lg shadow-indigo-500/10 scale-[1.02] ring-2 ring-indigo-500/20"
                      : "bg-slate-50/70 hover:bg-slate-100 dark:bg-[#0F1117] dark:hover:bg-[#151824] border-slate-200/90 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.18]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-white dark:bg-[#1A1D2B] border border-slate-200 dark:border-white/[0.08]">
                        {getNodeIcon(node.stepNumber)}
                      </div>
                      <div>
                        <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                          Stage {node.stepNumber}
                        </div>
                        <div className="text-xs font-black text-slate-900 dark:text-white">
                          {node.name}
                        </div>
                      </div>
                    </div>
                    {renderStatusPill(node.status)}
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mb-2.5 font-medium">
                    {node.tools}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-white/[0.06] text-xs">
                    <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      {node.badge}
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline flex items-center gap-0.5">
                      Inspect →
                    </span>
                  </div>
                </div>

                {/* Connector between 5 & 6 */}
                {idx === 0 && (
                  <div className="hidden lg:flex absolute -right-3 z-10 w-3 items-center justify-center pointer-events-none">
                    <div className="w-full h-0.5 bg-indigo-500/30 dark:bg-indigo-400/30 relative">
                      <span className="absolute -top-1 right-0 w-2 h-2 rounded-full bg-indigo-500 animate-ping opacity-75" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
