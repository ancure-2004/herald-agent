"use client";

import React, { useState, useEffect } from "react";
import { DemoRun } from "../types";
import { EphemeralPreviewLink } from "./EphemeralPreviewLink";
import {
  MonitorSmartphone,
  RotateCcw,
  Loader2,
  AlertTriangle,
  Clock,
  Layers,
  Video,
} from "lucide-react";

interface RunMatrixTableProps {
  runs: DemoRun[];
  onOpenLogs: (run: DemoRun) => void;
  onOpenPreview: (run: DemoRun) => void;
  onRetryRun?: (runId: string) => void;
}

export const RunMatrixTable: React.FC<RunMatrixTableProps> = ({
  runs,
  onOpenPreview,
  onRetryRun,
}) => {
  const [elapsedSecs, setElapsedSecs] = useState<Record<string, number>>({});

  // Live Stopwatch for Active Builds
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSecs((prev) => {
        const next: Record<string, number> = { ...prev };
        runs.forEach((r) => {
          if (r.status === "BUILDING" || r.status === "RECORDING" || r.status === "DEPLOYING") {
            next[r.id] = (next[r.id] || Math.floor((r.totalDurationMs || 8400) / 1000)) + 1;
          }
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [runs]);

  const renderStatusToken = (run: DemoRun) => {
    switch (run.status) {
      case "READY":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-50/80 text-emerald-700 border border-emerald-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
            <span>Live / Ready</span>
          </span>
        );
      case "RECORDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-purple-50 text-purple-700 border border-purple-200/60 animate-pulse">
            <Video className="w-3 h-3 text-purple-600 animate-pulse" />
            <span>Recording...</span>
          </span>
        );
      case "BUILDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-sky-50 text-sky-700 border border-sky-200/60 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin text-sky-600" />
            <span>Building...</span>
          </span>
        );
      case "DEPLOYING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>Deploying Edge</span>
          </span>
        );
      case "QUEUED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
            <span className="w-1.5 h-1.5 rounded-full border border-amber-500" />
            <span>Queued</span>
          </span>
        );
      case "FAILED":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-rose-50 text-rose-700 border border-rose-200/60">
            <AlertTriangle className="w-3 h-3 text-rose-500" />
            <span>Failed (Step 3)</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs bg-white dark:bg-[#141721] overflow-hidden">
      <table className="w-full text-left text-xs border-collapse font-sans">
        <thead>
          <tr className="h-10 bg-slate-50/90 dark:bg-[#191C28]/95 border-b border-slate-200/80 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 font-semibold select-none text-[11px] uppercase tracking-wider font-mono">
            <th className="px-4 py-2.5 min-w-[200px]">Clinic &amp; City</th>
            <th className="px-3 py-2.5 min-w-[105px] whitespace-nowrap">Batch</th>
            <th className="px-3 py-2.5 min-w-[130px]">Status</th>
            <th className="px-3 py-2.5 min-w-[90px]">Duration</th>
            <th className="px-3 py-2.5 min-w-[160px]">Ephemeral Preview</th>
            <th className="px-4 py-2.5 min-w-[110px] text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
          {runs.map((run) => {
            const isLive = run.status === "BUILDING" || run.status === "RECORDING" || run.status === "DEPLOYING";
            const seconds = isLive
              ? elapsedSecs[run.id] || Math.floor((run.totalDurationMs || 8400) / 1000)
              : Math.floor((run.totalDurationMs || 0) / 1000);

            return (
              <tr
                key={run.id}
                className="h-[52px] hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors group cursor-pointer"
                onClick={() => onOpenPreview(run)}
              >
                {/* Clinic Name & City */}
                <td className="px-4 py-3">
                  <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate max-w-[220px]">
                    {run.clinic.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {run.clinic.city}, {run.clinic.state}
                  </div>
                </td>

                {/* Batch ID Badge */}
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.08] rounded-md px-2.5 py-1 text-[11px] font-mono font-medium whitespace-nowrap">
                    <Layers className="w-3 h-3 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span>{run.batchId || "BATCH-01"}</span>
                  </span>
                </td>

                {/* Status Indicator Token */}
                <td className="px-3 py-3 whitespace-nowrap">{renderStatusToken(run)}</td>

                {/* Duration Live Stopwatch */}
                <td className="px-3 py-3 font-mono text-[11px] text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {seconds}s
                  </span>
                </td>

                {/* Preview Link */}
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  {run.preview ? (
                    <EphemeralPreviewLink
                      preview={run.preview}
                      clinicName={run.clinic.name}
                      onOpenDrawer={() => onOpenPreview(run)}
                    />
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono">None</span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    {run.status === "FAILED" && onRetryRun && (
                      <button
                        type="button"
                        onClick={() => onRetryRun(run.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                        title="Retry Run"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onOpenPreview(run)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.06] hover:bg-zinc-900 dark:hover:bg-white text-zinc-700 dark:text-zinc-200 hover:text-white dark:hover:text-zinc-900 border border-slate-200/80 dark:border-white/[0.08] text-[11px] font-mono font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Open Unified Studio Workbench & Build Inspector"
                    >
                      <MonitorSmartphone className="w-3.5 h-3.5" />
                      <span>Studio</span>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
