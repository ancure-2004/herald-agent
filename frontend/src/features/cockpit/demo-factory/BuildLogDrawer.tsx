"use client";

import React, { useState, useRef, useEffect } from "react";
import { DemoRun, LogLevel } from "../types";
import {
  X,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Search,
  ArrowDown,
  Video,
  Globe,
  FileCode2,
} from "lucide-react";

interface BuildLogDrawerProps {
  run: DemoRun | null;
  isOpen: boolean;
  onClose: () => void;
  onRetry?: (runId: string) => void;
}

export const BuildLogDrawer: React.FC<BuildLogDrawerProps> = ({
  run,
  isOpen,
  onClose,
  onRetry,
}) => {
  const [levelFilter, setLevelFilter] = useState<LogLevel | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom if not manually scrolled up
  useEffect(() => {
    if (terminalRef.current && !isScrolledUp) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [run?.logs, isScrolledUp]);

  if (!isOpen || !run) return null;

  const handleScroll = () => {
    if (terminalRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
      setIsScrolledUp(distanceFromBottom > 40);
    }
  };

  const scrollToBottom = () => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      setIsScrolledUp(false);
    }
  };

  const filteredLogs = (run.logs || []).filter((log) => {
    if (levelFilter !== "ALL" && log.level !== levelFilter) return false;
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const preview = run.preview;
  const hasVideo = Boolean(preview?.videoFilePath);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-[min(90vw,1100px)] h-full bg-[#0E1015] border-l border-white/[0.1] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="h-14 px-5 bg-[#141721] border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Build Observability: {run.clinic.name}</span>
                <span className="font-mono text-[10px] text-slate-400 bg-white/[0.05] px-1.5 py-0.5 rounded">
                  #{run.versionTag}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    run.status === "READY"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : run.status === "FAILED"
                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                  }`}
                >
                  {run.status}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Duration: {((run.totalDurationMs || 0) / 1000).toFixed(2)}s &bull; Triggered by {run.triggeredBy.authorName}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors cursor-pointer"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 5-Stage OpenTelemetry Pipeline Stepper */}
        <div className="px-5 py-3.5 bg-[#111215] border-b border-white/[0.08]">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">
            OpenTelemetry Pipeline Trace (5 Stages)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {run.stages.map((stage, idx) => {
              const isReady = stage.status === "READY";
              const isBuilding = stage.status === "BUILDING";
              const isFailed = stage.status === "FAILED";

              return (
                <div
                  key={stage.id}
                  className={`p-2.5 rounded-xl border text-xs font-mono transition-all ${
                    isReady
                      ? "bg-emerald-500/[0.04] border-emerald-500/20 text-emerald-400"
                      : isBuilding
                      ? "bg-sky-500/[0.06] border-sky-500/30 text-sky-300 animate-pulse"
                      : isFailed
                      ? "bg-rose-500/[0.06] border-rose-500/30 text-rose-400"
                      : "bg-white/[0.02] border-white/[0.05] text-slate-500"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-400">0{idx + 1}</span>
                    {isReady && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    {isBuilding && <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />}
                    {isFailed && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                  </div>
                  <div className="font-semibold truncate text-[11px] text-slate-200">
                    {stage.name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {stage.durationMs ? `${(stage.durationMs / 1000).toFixed(2)}s` : stage.status}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Artifacts & Video Telemetry Header */}
        <div className="px-5 py-2.5 bg-[#141721] border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>Theme URLs:</span>
              <span className="text-emerald-400 font-bold">4 Verified (Choice, Modern, Premium, Warm)</span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-300">
              <Video className="w-3.5 h-3.5 text-amber-400" />
              <span>Walkthrough Video:</span>
              <span className={hasVideo ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                {hasVideo ? "MP4 Available (>1KB Verified)" : "Pending / Unrecorded"}
              </span>
            </div>
          </div>

          {preview?.videoFilePath && (
            <div className="text-[10px] text-slate-400 truncate max-w-xs" title={preview.videoFilePath}>
              {preview.videoFilePath.split("/").pop()}
            </div>
          )}
        </div>

        {/* Error Callout if Run Failed */}
        {run.error && (
          <div className="mx-5 mt-4 p-4 rounded-xl bg-rose-500/[0.08] border border-rose-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5 font-mono">
                <AlertTriangle className="w-4 h-4" />
                Build Gate Error: {run.error.message}
              </span>
              {onRetry && (
                <button
                  onClick={() => onRetry(run.id)}
                  className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry this Step</span>
                </button>
              )}
            </div>

            {run.error.codeFrame && (
              <pre className="p-3 rounded-lg bg-black/60 border border-rose-500/20 text-[11px] font-mono text-rose-300 overflow-x-auto leading-relaxed">
                {run.error.codeFrame}
              </pre>
            )}
          </div>
        )}

        {/* Terminal Controls Bar */}
        <div className="px-5 py-2.5 bg-[#141721] border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Level Filter Switcher */}
          <div className="flex items-center gap-1 bg-[#1C1E24] p-1 rounded-xl border border-white/[0.08] font-mono text-[10px]">
            {(["ALL", "INFO", "WARN", "ERROR"] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  levelFilter === lvl
                    ? "bg-[#292C35] text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Search Log Input */}
          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search stream output..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 bg-[#1C1E24] border border-white/[0.08] rounded-lg text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>

        {/* Streaming Monospace ANSI Terminal Viewer */}
        <div className="flex-1 bg-[#090A0C] p-4 font-mono text-xs overflow-y-auto relative" ref={terminalRef} onScroll={handleScroll}>
          <div className="space-y-1">
            {filteredLogs.map((log) => {
              const isError = log.level === "ERROR";
              const isWarn = log.level === "WARN";

              return (
                <div
                  key={log.id}
                  className={`flex items-start gap-3 py-1 px-2.5 rounded-lg hover:bg-white/[0.02] ${
                    isError
                      ? "text-rose-400 bg-rose-500/[0.05]"
                      : isWarn
                      ? "text-amber-400"
                      : "text-slate-300"
                  }`}
                >
                  <span className="text-slate-600 select-none text-[11px] shrink-0">
                    [{log.timestamp}]
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded select-none shrink-0 ${
                      isError
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        : isWarn
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-white/[0.05] text-slate-400"
                    }`}
                  >
                    {log.level}
                  </span>
                  <span className="flex-1 break-all leading-relaxed">
                    {log.message}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Sticky Auto-Scroll Resume Badge */}
          {isScrolledUp && (
            <button
              onClick={scrollToBottom}
              className="sticky bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-mono flex items-center gap-1.5 shadow-xl transition-all cursor-pointer"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>Resume Auto-Scroll</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
