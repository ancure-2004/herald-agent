"use client";

import React, { useState, useEffect } from "react";
import { DemoRun, RunStatus } from "../types";
import { EphemeralPreviewLink } from "./EphemeralPreviewLink";
import {
  Check,
  Copy,
  Terminal,
  RotateCcw,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Clock,
  Layers,
} from "lucide-react";

interface RunMatrixTableProps {
  runs: DemoRun[];
  onOpenLogs: (run: DemoRun) => void;
  onOpenPreview: (run: DemoRun) => void;
  onRetryRun?: (runId: string) => void;
}

export const RunMatrixTable: React.FC<RunMatrixTableProps> = ({
  runs,
  onOpenLogs,
  onOpenPreview,
  onRetryRun,
}) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [elapsedSecs, setElapsedSecs] = useState<Record<string, number>>({});

  // Live Stopwatch for Active Builds
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSecs((prev) => {
        const next: Record<string, number> = { ...prev };
        runs.forEach((r) => {
          if (r.status === "BUILDING" || r.status === "DEPLOYING") {
            next[r.id] = (next[r.id] || Math.floor((r.totalDurationMs || 8400) / 1000)) + 1;
          }
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [runs]);

  const handleCopyHash = (hash: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 1500);
  };

  const renderStatusToken = (run: DemoRun) => {
    switch (run.status) {
      case "READY":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
            <span>Live / Ready</span>
          </span>
        );
      case "BUILDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
            <span>Building...</span>
          </span>
        );
      case "DEPLOYING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span>Deploying Edge</span>
          </span>
        );
      case "QUEUED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full border border-amber-400" />
            <span>Queued</span>
          </span>
        );
      case "FAILED":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>Failed (Step 3)</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full overflow-x-auto rounded-md border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#111215] shadow-sm">
      <table className="w-full text-left text-xs border-collapse font-sans">
        <thead>
          <tr className="h-10 bg-slate-50 dark:bg-[#17181D] border-b border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 font-medium select-none text-[11px]">
            <th className="px-4 py-2 min-w-[220px]">Clinic &amp; City</th>
            <th className="px-3 py-2 min-w-[100px]">Batch</th>
            <th className="px-3 py-2 min-w-[140px]">Template Theme</th>
            <th className="px-3 py-2 min-w-[130px]">Status</th>
            <th className="px-3 py-2 min-w-[100px]">Duration</th>
            <th className="px-3 py-2 min-w-[110px]">Version Hash</th>
            <th className="px-3 py-2 min-w-[160px]">Ephemeral Preview</th>
            <th className="px-4 py-2 min-w-[130px] text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
          {runs.map((run) => {
            const isLive = run.status === "BUILDING" || run.status === "DEPLOYING";
            const seconds = isLive
              ? elapsedSecs[run.id] || Math.floor((run.totalDurationMs || 8400) / 1000)
              : Math.floor((run.totalDurationMs || 0) / 1000);

            return (
              <tr
                key={run.id}
                className="h-[44px] hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors group cursor-pointer"
                onClick={() => (run.status === "READY" ? onOpenPreview(run) : onOpenLogs(run))}
              >
                {/* Clinic Name & City */}
                <td className="px-4 py-2">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[200px]">
                    {run.clinic.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {run.clinic.city}, {run.clinic.state}
                  </div>
                </td>

                {/* Batch ID Badge */}
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 font-mono text-[10px] font-bold">
                    <Layers className="w-3 h-3 text-indigo-500 opacity-70" />
                    <span>{run.batchId || "BATCH-01"}</span>
                  </span>
                </td>

                {/* Template Theme Badge */}
                <td className="px-3 py-2">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 font-mono text-[10px]">
                    {run.templateId}
                  </span>
                </td>

                {/* Status Indicator Token */}
                <td className="px-3 py-2">{renderStatusToken(run)}</td>

                {/* Duration Live Stopwatch */}
                <td className="px-3 py-2 font-mono text-[11px] text-slate-700 dark:text-slate-300 tabular-nums">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {seconds}s
                  </span>
                </td>

                {/* Short Hash */}
                <td className="px-3 py-2 font-mono text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span>#{run.versionTag}</span>
                    <button
                      onClick={(e) => handleCopyHash(run.versionTag, e)}
                      className="text-slate-500 hover:text-white"
                      title="Copy Commit Hash"
                    >
                      {copiedHash === run.versionTag ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </td>

                {/* Preview Link */}
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  {run.preview ? (
                    <EphemeralPreviewLink
                      preview={run.preview}
                      clinicName={run.clinic.name}
                      onOpenDrawer={() => onOpenPreview(run)}
                    />
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">None</span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onOpenLogs(run)}
                      className="p-1.5 rounded hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
                      title="Inspect Build Logs"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                    </button>

                    {run.status === "FAILED" && onRetryRun && (
                      <button
                        onClick={() => onRetryRun(run.id)}
                        className="p-1.5 rounded hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                        title="Retry Run"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {run.status === "READY" && (
                      <button
                        onClick={() => onOpenPreview(run)}
                        className="p-1.5 rounded hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-colors"
                        title="Multi-Device Workbench"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
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
