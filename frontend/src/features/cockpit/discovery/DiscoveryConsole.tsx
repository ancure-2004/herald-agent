"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Terminal,
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
  Check,
  Search,
  Pause,
  Play,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Loader2,
} from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { env } from "@/config/env";

const CheckFilled = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className || "w-4 h-4 text-emerald-400"}
  >
    <path
      fillRule="evenodd"
      d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.74-5.25Z"
      clipRule="evenodd"
    />
  </svg>
);

const CheckOutline = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.75}
    stroke="currentColor"
    className={className || "w-4 h-4 text-zinc-600"}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
    />
  </svg>
);

export interface DiscoveryLogEntry {
  id?: number;
  seq: number;
  source?: string;
  service: string;
  level: string;
  lead_id?: number | null;
  message: string;
  line?: string;
  created_at?: string;
  timestamp?: string;
}

export interface DiscoveryConsoleProps {
  locality: string;
  isTestingMode: boolean;
  isDiscovering: boolean;
  stagedCount: number;
  filteredCount: number;
  discoveredTodayCount: number;
  isOpen?: boolean;
  onToggleOpen?: () => void;
}

const PIPELINE_STEPS = [
  { id: "batch", label: "Queued locality batch", keywords: ["queue", "batch", "started", "starting"] },
  { id: "scrape", label: "Scraping Maps & clinic directories", keywords: ["scrap", "maps", "places", "directory", "search"] },
  { id: "normalize", label: "Normalizing Indian mobile numbers (+91)", keywords: ["phone", "normaliz", "+91", "mobile", "whatsapp"] },
  { id: "audit", label: "Auditing existing clinic websites", keywords: ["audit", "website", "site", "domain", "check"] },
  { id: "stage", label: "Staging qualified leads to buffer", keywords: ["stag", "qualified", "buffer", "saved", "complete"] },
];

export const DiscoveryConsole: React.FC<DiscoveryConsoleProps> = ({
  locality,
  isTestingMode,
  isDiscovering,
  stagedCount,
  filteredCount,
  discoveredTodayCount,
  isOpen: propIsOpen,
  onToggleOpen,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(true);
  const isCollapsed = propIsOpen !== undefined ? !propIsOpen : !internalIsOpen;

  const [logs, setLogs] = useState<DiscoveryLogEntry[]>([]);
  const [levelFilter, setLevelFilter] = useState<"ALL" | "INFO" | "WARN" | "ERROR">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [newLogsCount, setNewLogsCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [expandedSqlIds, setExpandedSqlIds] = useState<Set<number | string>>(new Set());

  const [connectionStatus, setConnectionStatus] = useState<"streaming" | "reconnecting" | "offline">("streaming");
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const seenSeqsRef = useRef<Set<number>>(new Set());

  const toggleCollapse = () => {
    if (onToggleOpen) {
      onToggleOpen();
    } else {
      setInternalIsOpen((prev) => !prev);
    }
  };

  // Hydrate initial logs
  const fetchLogs = useCallback(async () => {
    try {
      const res = await apiFetch<DiscoveryLogEntry[] | { logs: DiscoveryLogEntry[]; latest_seq: number }>(
        "/api/terminal/logs?service=discovery&limit=150"
      );
      const items: DiscoveryLogEntry[] = Array.isArray(res) ? res : res?.logs || [];
      const seen = new Set<number>();
      items.forEach((item) => {
        if (typeof item.seq === "number") seen.add(item.seq);
      });
      seenSeqsRef.current = seen;
      setLogs(items);
    } catch {
      // Backend may be offline or starting up
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Live SSE stream
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

      es.addEventListener("terminal_log", (e: MessageEvent) => {
        if (isCancelled) return;
        try {
          const entry: DiscoveryLogEntry = JSON.parse(e.data);
          if (entry.service && entry.service.toLowerCase() !== "discovery") {
            return;
          }
          if (typeof entry.seq === "number" && seenSeqsRef.current.has(entry.seq)) {
            return;
          }
          if (typeof entry.seq === "number") {
            seenSeqsRef.current.add(entry.seq);
          }
          setLogs((prev) => {
            const next = [...prev.slice(-250), entry];
            return next;
          });
          if (!autoScroll) {
            setNewLogsCount((c) => c + 1);
          }
        } catch {
          // Ignore malformed message
        }
      });
    } catch {
      setConnectionStatus("offline");
    }

    return () => {
      isCancelled = true;
      if (es) es.close();
    };
  }, [autoScroll]);

  // Auto-scroll handler
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    if (distanceFromBottom > 35 && autoScroll) {
      setAutoScroll(false);
    } else if (distanceFromBottom <= 10 && !autoScroll) {
      setAutoScroll(true);
      setNewLogsCount(0);
    }
  };

  useEffect(() => {
    if (autoScroll && scrollContainerRef.current && !isCollapsed) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll, isCollapsed]);

  const resumeAutoScroll = () => {
    setAutoScroll(true);
    setNewLogsCount(0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
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
        const q = searchQuery.toLowerCase();
        const text = `${log.message || ""} ${log.line || ""}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [logs, levelFilter, searchQuery]);

  // Derive active pipeline stage index
  const activeStageIndex = useMemo(() => {
    if (!isDiscovering) {
      return logs.length > 0 ? 5 : 0;
    }
    // Check recent logs
    const recent = logs.slice(-15).reverse();
    for (const log of recent) {
      const msg = (log.message || log.line || "").toLowerCase();
      if (PIPELINE_STEPS[4].keywords.some((k) => msg.includes(k))) return 4;
      if (PIPELINE_STEPS[3].keywords.some((k) => msg.includes(k))) return 3;
      if (PIPELINE_STEPS[2].keywords.some((k) => msg.includes(k))) return 2;
      if (PIPELINE_STEPS[1].keywords.some((k) => msg.includes(k))) return 1;
    }
    return 0;
  }, [isDiscovering, logs]);

  const handleCopyLogs = () => {
    const text = filteredLogs
      .map((l) => {
        const ts = l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : "";
        const lvl = (l.level || "INFO").toUpperCase();
        return `[${ts}] [${lvl}] ${l.message || l.line || ""}`;
      })
      .join("\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearLogs = () => {
    setLogs([]);
    setNewLogsCount(0);
    apiFetch("/api/terminal/clear?service=discovery", { method: "POST" }).catch(() => {});
  };

  const toggleSqlExpand = (id: number | string) => {
    setExpandedSqlIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="rounded-2xl bg-zinc-950 text-zinc-200 border border-zinc-800/90 shadow-lg overflow-hidden transition-all duration-300">
      {/* Console Top Header Bar */}
      <div className="px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2.5 select-none">
        {/* Left: Terminal icon, Title & Live Status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1 rounded-md bg-zinc-800 text-zinc-300 shrink-0">
            <Terminal className="w-3.5 h-3.5" />
          </div>
          <span className="font-mono font-bold text-xs text-white tracking-wide uppercase truncate">
            Lead Discovery Execution Stream
          </span>

          {/* Live Status Badge */}
          {isDiscovering ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              STREAMING
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-zinc-800/80 border border-zinc-700/60 text-zinc-400 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
              IDLE
            </span>
          )}

          {isCollapsed && (
            <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
              ({logs.length} events logged)
            </span>
          )}
        </div>

        {/* Right: Log level filters, search, clear, and collapse */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Level Filter Pills */}
          <div className="flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-mono">
            {(["ALL", "INFO", "WARN", "ERROR"] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevelFilter(lvl)}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                  levelFilter === lvl
                    ? lvl === "ERROR"
                      ? "bg-rose-600 text-white"
                      : lvl === "WARN"
                      ? "bg-amber-600 text-white"
                      : "bg-zinc-700 text-white font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative hidden md:block w-32">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter logs..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-6 pr-2 py-1 text-[11px] font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopyLogs}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors cursor-pointer"
            title="Copy logs to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Clear Button */}
          <button
            type="button"
            onClick={handleClearLogs}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors cursor-pointer"
            title="Clear visible logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Collapse Toggle Chevron */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors cursor-pointer"
            title={isCollapsed ? "Expand Execution Console" : "Collapse Execution Console"}
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2-Column Split Body */}
      {!isCollapsed && (
        <div className="grid grid-cols-12 min-h-[240px] border-t border-zinc-800/60 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800/80">
          {/* Left Pane (col-span-12 lg:col-span-4): Discovery Steps & Run Metadata */}
          <div className="col-span-12 lg:col-span-4 p-4 pb-5 flex flex-col justify-between bg-zinc-900/40">
            {/* Top: Discovery Steps Checklist */}
            <div>
              <div className="relative overflow-hidden [mask-image:linear-gradient(to_bottom,white_85%,transparent_100%)] pr-1">
                <div className="space-y-1.5 py-0.5">
                  {PIPELINE_STEPS.map((step, idx) => {
                    const isDone = activeStageIndex > idx;
                    const isActive = isDiscovering ? activeStageIndex === idx : activeStageIndex > 0 && activeStageIndex === idx;
                    const distance = Math.abs(idx - activeStageIndex);
                    const opacity = isDone ? 0.85 : isActive ? 1 : Math.max(1 - distance * 0.28, 0.25);

                    return (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, y: -(idx * 4) }}
                        animate={{
                          opacity,
                          y: -(activeStageIndex * 2),
                        }}
                        transition={{ duration: 0.45, ease: "easeInOut" }}
                        className="flex items-center justify-between text-xs font-mono py-1 group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isDone ? (
                            <CheckFilled className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : isActive ? (
                            <div className="relative flex items-center justify-center w-4 h-4 shrink-0">
                              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-60" />
                              <CheckOutline className="w-4 h-4 text-emerald-400 relative shrink-0" />
                            </div>
                          ) : (
                            <CheckOutline className="w-4 h-4 text-zinc-600 shrink-0" />
                          )}

                          <span
                            className={`truncate ${
                              isActive
                                ? "text-white font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                                : isDone
                                ? "text-zinc-300 font-medium"
                                : "text-zinc-500"
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>

                        <span
                          className={`text-[10px] font-mono shrink-0 pl-2 ${
                            isActive
                              ? "text-emerald-400 font-bold"
                              : isDone
                              ? "text-zinc-400"
                              : "text-zinc-600"
                          }`}
                        >
                          {isDone ? "done" : isActive ? "active" : "wait"}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom: Run Metadata Key-Value Grid */}
            <div className="border-t border-zinc-800/80 pt-3 mt-3 space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-zinc-500">Target Locality</span>
                <span className="text-zinc-200 font-semibold truncate max-w-[150px]">
                  {locality || "Delhi NCR"}
                </span>
              </div>

              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-zinc-500">Execution Mode</span>
                <span className={isTestingMode ? "text-amber-400 font-semibold" : "text-emerald-400 font-semibold"}>
                  {isTestingMode ? "Test Sandbox" : "Live Production"}
                </span>
              </div>

              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-zinc-500">Staged / Cap</span>
                <span className="text-zinc-200 font-semibold">
                  {stagedCount} <span className="text-zinc-500">/ 210</span>
                </span>
              </div>

              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-zinc-500">Dropped</span>
                <span className="text-zinc-300">
                  {filteredCount} filtered
                </span>
              </div>
            </div>
          </div>

          {/* Right Pane (col-span-12 lg:col-span-8): Monospace Log Console */}
          <div className="col-span-12 lg:col-span-8 p-3 font-mono text-xs overflow-y-auto relative flex flex-col justify-between max-h-[320px]">
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto space-y-1 pr-1 max-h-[280px] select-text"
            >
              {filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500 italic text-center">
                  <Database className="w-5 h-5 mb-1.5 text-zinc-600" />
                  <span>Waiting for incoming discovery events on stream...</span>
                </div>
              ) : (
                filteredLogs.map((log, idx) => {
                  const key = log.id ? `log-${log.id}` : `seq-${log.seq || idx}`;
                  const ts = log.timestamp
                    ? new Date(log.timestamp).toLocaleTimeString()
                    : log.created_at
                    ? new Date(log.created_at).toLocaleTimeString()
                    : "";
                  const lvl = (log.level || "INFO").toUpperCase();
                  const rawMsg = log.message || log.line || "";

                  // Semantic Icon & Colors
                  let icon = <span className="text-zinc-500">▸</span>;
                  if (lvl === "ERROR") {
                    icon = <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 inline" />;
                  } else if (lvl === "WARN") {
                    icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 inline" />;
                  } else if (
                    rawMsg.toLowerCase().includes("complete") ||
                    rawMsg.toLowerCase().includes("success") ||
                    rawMsg.toLowerCase().includes("saved")
                  ) {
                    icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 inline" />;
                  }

                  // SQL detection & truncation
                  const isSqlDump =
                    (rawMsg.includes("INSERT INTO") ||
                      rawMsg.includes("SELECT ") ||
                      rawMsg.includes("UPDATE ") ||
                      rawMsg.includes("parameters: [") ||
                      rawMsg.includes("parameters: {")) &&
                    rawMsg.length > 90;

                  const isExpanded = expandedSqlIds.has(log.id ?? idx);

                  let displayMsg = rawMsg;
                  let truncatedPart = "";
                  if (isSqlDump && !isExpanded) {
                    // Extract first 90 chars or line
                    const splitIdx = rawMsg.indexOf("VALUES") !== -1 ? rawMsg.indexOf("VALUES") + 6 : 90;
                    displayMsg = rawMsg.slice(0, splitIdx);
                    truncatedPart = rawMsg.slice(splitIdx);
                  }

                  return (
                    <div key={key} className="flex items-start gap-2 leading-relaxed break-all">
                      {ts && <span className="text-zinc-500 select-none shrink-0">[{ts}]</span>}
                      <span className="shrink-0">{icon}</span>
                      <span className="flex-1 text-zinc-300">
                        {displayMsg}
                        {isSqlDump && (
                          <button
                            type="button"
                            onClick={() => toggleSqlExpand(log.id ?? idx)}
                            className="ml-2 text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold underline cursor-pointer"
                          >
                            {isExpanded ? "[Hide raw query]" : "[Show raw query]"}
                          </button>
                        )}
                        {isSqlDump && isExpanded && (
                          <div className="mt-1 p-2 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 whitespace-pre-wrap">
                            {rawMsg}
                          </div>
                        )}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Paused Auto-Scroll banner */}
            {!autoScroll && newLogsCount > 0 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
                <button
                  type="button"
                  onClick={resumeAutoScroll}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-[11px] font-semibold shadow-lg border border-zinc-700 transition-all cursor-pointer animate-bounce"
                >
                  <ArrowDown className="w-3 h-3 text-emerald-400" />
                  <span>Auto-scroll paused ({newLogsCount} new) - Resume</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
