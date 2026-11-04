"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  FastForward,
  Pause,
  Play,
  RotateCw,
  Terminal,
  X,
  Zap,
} from "lucide-react";
import { NodeInspectionData } from "./types";

interface NodeInspectionDrawerProps {
  node: NodeInspectionData | null;
  isOpen: boolean;
  onClose: () => void;
  onRetryNode: (nodeId: number) => void;
  onSkipNode: (nodeId: number) => void;
  onRunOnlyStep: (nodeId: number) => void;
  onPauseNode: (nodeId: number) => void;
}

export function NodeInspectionDrawer({
  node,
  isOpen,
  onClose,
  onRetryNode,
  onSkipNode,
  onRunOnlyStep,
  onPauseNode,
}: NodeInspectionDrawerProps) {
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  if (!isOpen || !node) return null;

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(node.payload, null, 2));
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleRetryClick = () => {
    setIsRetrying(true);
    onRetryNode(node.id);
    setTimeout(() => setIsRetrying(false), 1200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Slide-over Drawer Pane */}
      <aside className="relative w-full max-w-2xl bg-white dark:bg-[#0E1017] border-l border-slate-200 dark:border-white/[0.08] shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-right duration-200 text-slate-900 dark:text-slate-100">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-[#141721]/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                Stage {node.stepNumber} Inspection
              </span>
              <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                {node.title}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {node.logicDescription}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            title="Close Drawer (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status & Timing Banner */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Node Status:</span>
                <span
                  className={`font-mono font-bold px-2.5 py-1 rounded-xl text-[11px] ${
                    node.status === "SUCCESS"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : node.status === "RUNNING"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
                      : node.status === "FAILED"
                      ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                      : "bg-slate-800 text-slate-300 border border-slate-700"
                  }`}
                >
                  {node.status}
                </span>
              </div>
              <span className="text-slate-400 font-mono text-[11px]">
                {node.progressText}
              </span>
            </div>

            <div className="font-mono text-[11px] text-slate-400">
              Duration: {node.duration || "42s elapsed"}
            </div>
          </div>

          {/* Live Intermediate Output Payload Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                <span>Live Intermediate Output Payload</span>
                <span className="text-[10px] font-mono text-slate-500">
                  ({node.payload.length} records processed)
                </span>
              </label>

              <button
                type="button"
                onClick={handleCopyJson}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedPayload ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#0B0D14] border border-slate-800/90 font-mono text-xs text-slate-200 max-h-72 overflow-y-auto leading-relaxed select-text shadow-inner">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(node.payload, null, 2)}
              </pre>
            </div>
          </div>

          {/* Error & Exception Trace Box */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Failure &amp; Exception Diagnostics</span>
            </label>

            {node.error && node.error.hasError ? (
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-rose-300">
                      {node.error.exceptionName || "Execution Error"} (Code: {node.error.httpCode || "429"})
                    </div>
                    <div className="text-[11px] text-rose-200/80 mt-0.5">
                      {node.error.message || "Rate limit threshold reached during provider crawl."}
                    </div>
                    {node.error.lineNumber && (
                      <div className="text-[10px] font-mono text-rose-400/90 mt-1">
                        Triggered at line: {node.error.lineNumber}
                      </div>
                    )}
                  </div>
                </div>

                {node.error.traceSnippet && (
                  <div className="p-3 rounded-xl bg-black/50 border border-rose-900/60 font-mono text-[11px] text-rose-200/90 whitespace-pre-wrap">
                    {node.error.traceSnippet}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-rose-900/50">
                  <button
                    onClick={handleRetryClick}
                    disabled={isRetrying}
                    className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-rose-900/30 transition-all cursor-pointer"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
                    <span>{isRetrying ? "Retrying Node..." : "Retry This Node"}</span>
                  </button>

                  <button
                    onClick={() => onSkipNode(node.id)}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FastForward className="w-3.5 h-3.5" />
                    <span>Skip &amp; Continue</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-950/20 dark:bg-emerald-950/30 border border-emerald-800/40 flex items-center justify-between text-xs text-emerald-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold">Healthy Stage: No exceptions or rate limits detected</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-500">HTTP 200 OK</span>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#141721]/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onRunOnlyStep(node.id)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Run Only This Step</span>
            </button>

            <button
              onClick={() => onPauseNode(node.id)}
              className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5 text-amber-500" />
              <span>Pause Node</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.06] text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </aside>
    </div>
  );
}
