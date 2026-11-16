"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  ArrowDown,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Filter,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Search,
  Terminal,
  Trash2,
} from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { env } from "@/config/env";

export interface TerminalLogEntry {
  id?: number;
  seq: number;
  source?: string;
  service: string;
  level: string;
  lead_id?: number | null;
  hustle_id?: number;
  message: string;
  line?: string;
  created_at?: string;
  timestamp?: string;
}

export interface LiveLogTerminalProps {
  /** Title shown in terminal header bar */
  title?: string;
  /** Filter to a specific service or "all" */
  service?: "discovery" | "building" | "outreach" | "all" | string;
  /** When true, locks the service selector to the specified service */
  lockService?: boolean;
  /** Optional lead ID filter */
  leadId?: number | null;
  /** Initial level filter */
  initialLevel?: "ALL" | "INFO" | "WARN" | "ERROR";
  /** Custom container class */
  className?: string;
  /** Whether the terminal can be collapsed */
  collapsible?: boolean;
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
  /** External action buttons slot */
  headerActions?: React.ReactNode;
  /** Whether to show the 3 window dots */
  showWindowDots?: boolean;
  /** Compact mode for tighter header and padding */
  compact?: boolean;
}

export function LiveLogTerminal({
  title = "LIVE TELEMETRY STREAM",
  service = "all",
  lockService = false,
  leadId = null,
  initialLevel = "ALL",
  className = "h-72",
  collapsible = false,
  defaultCollapsed = false,
  headerActions,
  showWindowDots = false,
  compact = false,
}: LiveLogTerminalProps) {
  const [logs, setLogs] = useState<TerminalLogEntry[]>([]);
  const [selectedService, setSelectedService] = useState<string>(service);
  const [levelFilter, setLevelFilter] = useState<"ALL" | "INFO" | "WARN" | "ERROR">(initialLevel);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [newLogsCount, setNewLogsCount] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "streaming" | "reconnecting" | "offline">(
    "connecting"
  );
  const [jobStatus, setJobStatus] = useState<"idle" | "running">("idle");
  const [isCollapsed, setIsCollapsed] = useState<boolean>(defaultCollapsed);
  const [copied, setCopied] = useState<boolean>(false);

  const terminalRef = useRef<HTMLDivElement | null>(null);
  const seenSeqsRef = useRef<Set<number>>(new Set());

  // Keep selectedService in sync if prop changes
  useEffect(() => {
    setSelectedService(service);
  }, [service]);

  // Initial Log Hydration via REST
  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedService && selectedService.toLowerCase() !== "all") {
        params.set("service", selectedService.toLowerCase());
      }
      if (typeof leadId === "number") {
        params.set("lead_id", String(leadId));
      }
      params.set("limit", "200");

      const res = await apiFetch<TerminalLogEntry[] | { logs: TerminalLogEntry[]; latest_seq: number }>(
        `/api/terminal/logs?${params.toString()}`
      );

      const items: TerminalLogEntry[] = Array.isArray(res) ? res : res?.logs || [];
      const seen = new Set<number>();
      items.forEach((item) => {
        if (typeof item.seq === "number") seen.add(item.seq);
      });
      seenSeqsRef.current = seen;
      setLogs(items);
    } catch {
      // Backend may be initializing
    }
  }, [selectedService, leadId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Live SSE connection & event streaming
  useEffect(() => {
    let es: EventSource | null = null;
    let isCancelled = false;

    try {
      es = new EventSource(`${env.NEXT_PUBLIC_API_BASE_URL}/api/events`);

      es.onopen = () => {
        if (!isCancelled) setConnectionStatus("streaming");
      };

      es.onerror = () => {
        if (!isCancelled) setConnectionStatus("reconnecting");
      };

      // Named event: terminal_log
      es.addEventListener("terminal_log", (e: MessageEvent) => {
        if (isCancelled) return;
        try {
          const entry: TerminalLogEntry = JSON.parse(e.data);
          if (typeof entry.seq === "number" && seenSeqsRef.current.has(entry.seq)) {
            return;
          }
          if (typeof entry.seq === "number") {
            seenSeqsRef.current.add(entry.seq);
          }

          // Service category check
          const entryService = (entry.service || "").toLowerCase();
          if (
            selectedService &&
            selectedService.toLowerCase() !== "all" &&
            entryService !== selectedService.toLowerCase()
          ) {
            return;
          }

          // Lead ID filter check
          if (typeof leadId === "number" && entry.lead_id !== leadId) {
            return;
          }

          setLogs((prev) => [...prev.slice(-499), entry]);

          if (!autoScroll) {
            setNewLogsCount((c) => c + 1);
          }
        } catch {
          // ignore parsing error
        }
      });

      // Named event: autopilot_state
      es.addEventListener("autopilot_state", (e: MessageEvent) => {
        if (isCancelled) return;
        try {
          const data = JSON.parse(e.data);
          setJobStatus(data.is_running ? "running" : "idle");
        } catch {
          // ignore parsing error
        }
      });
    } catch {
      if (!isCancelled) setConnectionStatus("offline");
    }

    return () => {
      isCancelled = true;
      if (es) {
        es.close();
      }
    };
  }, [selectedService, leadId, autoScroll]);

  // Auto-scroll handler
  const handleScroll = () => {
    if (!terminalRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    if (distanceFromBottom > 40 && autoScroll) {
      setAutoScroll(false);
    } else if (distanceFromBottom <= 10 && !autoScroll) {
      setAutoScroll(true);
      setNewLogsCount(0);
    }
  };

  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const resumeAutoScroll = () => {
    setAutoScroll(true);
    setNewLogsCount(0);
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (levelFilter !== "ALL") {
        const lvl = (log.level || "").toUpperCase();
        if (lvl !== levelFilter) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const text = `${log.message || ""} ${log.line || ""} ${log.service || ""}`.toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });
  }, [logs, levelFilter, searchQuery]);

  // Utility actions
  const handleCopy = () => {
    const text = filteredLogs
      .map((l) => {
        const ts = l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : "";
        const s = (l.service || "SYSTEM").toUpperCase();
        const lvl = (l.level || "INFO").toUpperCase();
        return `[${ts}] [${lvl}] [${s}] ${l.message || l.line || ""}`;
      })
      .join("\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setLogs([]);
    setNewLogsCount(0);
  };

  return (
    <div
      className={`rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden font-mono text-xs flex flex-col transition-all duration-300 ease-in-out ${
        isCollapsed ? (compact ? "h-8" : "h-11") : className
      }`}
    >
      {/* Terminal Header */}
      <div
        className={`px-3 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between gap-2 shrink-0 select-none ${
          compact ? "h-8" : "h-10"
        }`}
      >
        {/* Left: Window Dots (Optional) & Title */}
        <div className="flex items-center gap-2 min-w-0">
          {showWindowDots && (
            <div className="flex items-center gap-1.5 pr-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
          )}

          <div className="flex items-center gap-1.5 min-w-0">
            <Terminal className="w-3 h-3 text-indigo-400 shrink-0" />
            <span className="font-bold text-white text-[10px] sm:text-[11px] tracking-wider uppercase truncate">
              {title}
            </span>
          </div>

          {/* Connection Status Indicator */}
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-semibold border shrink-0 ${
              connectionStatus === "streaming"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : connectionStatus === "reconnecting"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-400"
            }`}
          >
            <span
              className={`w-1 h-1 rounded-full ${
                connectionStatus === "streaming"
                  ? "bg-emerald-400 animate-pulse"
                  : connectionStatus === "reconnecting"
                  ? "bg-amber-400 animate-ping"
                  : "bg-rose-400"
              }`}
            />
            {connectionStatus.toUpperCase()}
          </span>

          {/* Autopilot Job Status */}
          {jobStatus === "running" && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-sky-500/10 border border-sky-500/30 text-sky-400 shrink-0">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              RUNNING
            </span>
          )}

          {isCollapsed && (
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              ({logs.length} events)
            </span>
          )}
        </div>

        {/* Right: Actions, Filters & Collapse */}
        <div className="flex items-center gap-1.5 shrink-0">
          {headerActions}

          {/* Level Filter Pills */}
          <div className="hidden sm:flex items-center p-0.5 rounded-md bg-black/40 border border-white/[0.08] text-[9px]">
            {(["ALL", "INFO", "WARN", "ERROR"] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevelFilter(lvl)}
                className={`px-1.5 py-0.2 rounded font-bold transition-all cursor-pointer ${
                  levelFilter === lvl
                    ? lvl === "ERROR"
                      ? "bg-rose-600 text-white"
                      : lvl === "WARN"
                      ? "bg-amber-600 text-white"
                      : "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Service Dropdown (if unlocked) */}
          {!lockService && (
            <div className="relative">
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="bg-slate-800/80 border border-slate-700/80 rounded-md px-1.5 py-0.5 text-[10px] text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">Service: All</option>
                <option value="discovery">Discovery</option>
                <option value="building">Building</option>
                <option value="outreach">Outreach</option>
              </select>
            </div>
          )}

          {/* Search Box */}
          <div className="relative hidden md:block w-28">
            <Search className="w-2.5 h-2.5 absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter..."
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-md pl-5 pr-1.5 py-0.5 text-[10px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Pause / Resume Auto-Scroll Button */}
          <button
            type="button"
            onClick={() => {
              if (!autoScroll) {
                resumeAutoScroll();
              } else {
                setAutoScroll(false);
              }
            }}
            className={`p-1 rounded-md border text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
              autoScroll
                ? "bg-slate-800/80 border-slate-700 text-emerald-400 hover:bg-slate-700/80"
                : "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
            }`}
            title={autoScroll ? "Pause auto-scroll" : "Resume auto-scroll"}
            aria-label={autoScroll ? "Pause auto-scroll" : "Resume auto-scroll"}
          >
            {autoScroll ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
          </button>

          {/* Copy Logs */}
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded-md bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 border border-white/[0.06] transition-colors cursor-pointer"
            title="Copy logs to clipboard"
            aria-label="Copy logs"
          >
            {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
          </button>

          {/* Clear Logs */}
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-md bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 border border-white/[0.06] transition-colors cursor-pointer"
            title="Clear visible logs"
            aria-label="Clear visible logs"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>

          {/* Collapse Toggle */}
          {collapsible && (
            <button
              type="button"
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="p-1 rounded-md bg-slate-800/60 hover:bg-slate-700/80 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={isCollapsed ? "Expand Terminal" : "Collapse Terminal"}
            >
              {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Terminal Body */}
      {!isCollapsed && (
        <div className="relative flex-1 min-h-0 flex flex-col">
          <div
            ref={terminalRef}
            onScroll={handleScroll}
            className={`flex-1 overflow-y-auto ${
              compact ? "p-2 space-y-0.5 text-[10px]" : "p-3 space-y-1 text-[11px]"
            } bg-slate-950 text-slate-200 select-text font-mono leading-relaxed`}
          >
            {filteredLogs.length === 0 ? (
              <div className="text-slate-500 py-6 text-center italic">
                Waiting for incoming events on stream...
              </div>
            ) : (
              filteredLogs.map((log, idx) => {
                const s = (log.service || "SYSTEM").toLowerCase();
                const lvl = (log.level || "info").toLowerCase();
                const ts = log.timestamp
                  ? new Date(log.timestamp).toLocaleTimeString()
                  : log.created_at
                  ? new Date(log.created_at).toLocaleTimeString()
                  : "";

                let badgeColor = "bg-white/[0.06] border-white/[0.08] text-slate-300";
                if (lvl === "warn") badgeColor = "bg-amber-500/15 border-amber-500/30 text-amber-300";
                if (lvl === "error") badgeColor = "bg-rose-500/20 border-rose-500/30 text-rose-300 font-bold";

                let serviceColor = "text-slate-400";
                if (s === "discovery") serviceColor = "text-indigo-400";
                if (s === "building" || s === "demo-factory") serviceColor = "text-amber-400";
                if (s === "outreach") serviceColor = "text-emerald-400";
                if (s === "autopilot") serviceColor = "text-sky-400";

                return (
                  <div key={log.id ? `log-${log.id}` : `seq-${log.seq || idx}`} className="flex items-start gap-2 break-all">
                    {ts && <span className="text-slate-600 select-none shrink-0">[{ts}]</span>}
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono border shrink-0 ${badgeColor}`}>
                      {lvl.toUpperCase()}
                    </span>
                    <span className={`font-bold shrink-0 ${serviceColor}`}>
                      [{s.toUpperCase()}]
                    </span>
                    {log.lead_id && (
                      <span className="text-slate-500 text-[10px] shrink-0 font-mono">
                        #{log.lead_id}
                      </span>
                    )}
                    <span className="flex-1 text-slate-200 whitespace-pre-wrap">{log.message || log.line}</span>
                  </div>
                );
              })
            )}
          </div>

          {/* Floating Auto-Scroll Paused Notification Banner */}
          {!autoScroll && newLogsCount > 0 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
              <button
                type="button"
                onClick={resumeAutoScroll}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer animate-bounce"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                <span>Auto-scroll paused ({newLogsCount} new logs) - Resume</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
