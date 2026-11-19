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
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Loader2,
  Send,
  Mail,
  MessageCircle,
  Square,
  Sparkles,
} from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { env } from "@/config/env";

export interface OutreachLogEntry {
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

export interface OutreachConsoleProps {
  activeBatchId: string;
  channelTab: "whatsapp" | "email" | "instagram";
  onChannelTabChange: (channel: "whatsapp" | "email" | "instagram") => void;
  allowedChannels?: string[];
  dryRunMode: boolean;
  isOutreachRunning: boolean;
  activeOutreachChannel?: string | null;
  handleSimulateSend: (channel: "WA" | "EMAIL" | "FALLBACK") => void;
  handleStopAutomation: () => void;
  // WhatsApp stats
  waSent: number;
  waLimit: number;
  waPct: number;
  waTargetLabel: string;
  // Email stats
  emailSent: number;
  emailLimit: number;
  emailPct: number;
  emailTargetLabel: string;
  // Instagram stats
  igSent: number;
  igLimit: number;
  igPct: number;
  igTargetLabel: string;
  // Collapsible state
  isOpen?: boolean;
  onToggleOpen?: () => void;
}

const OUTREACH_PIPELINE_STEPS = [
  { id: "batch", label: "Queued batch", keywords: ["queue", "batch", "loaded", "queued"] },
  { id: "dnc", label: "Validating DNC & 60s guard", keywords: ["dnc", "guard", "validat", "safety", "check"] },
  { id: "session", label: "Warming up channel session", keywords: ["warm", "session", "browser", "connect", "channel", "client"] },
  { id: "pitch", label: "Dispatching personalized pitch", keywords: ["dispatch", "send", "pitch", "message", "payload", "transmitting"] },
  { id: "telemetry", label: "Logging telemetry & pacing", keywords: ["log", "telemetry", "pacing", "jitter", "complete", "sent", "delay"] },
];

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

export const OutreachConsole: React.FC<OutreachConsoleProps> = ({
  activeBatchId,
  channelTab,
  onChannelTabChange,
  allowedChannels,
  dryRunMode,
  isOutreachRunning,
  activeOutreachChannel,
  handleSimulateSend,
  handleStopAutomation,
  waSent,
  waLimit,
  waPct,
  waTargetLabel,
  emailSent,
  emailLimit,
  emailPct,
  emailTargetLabel,
  igSent,
  igLimit,
  igPct,
  igTargetLabel,
  isOpen: propIsOpen,
  onToggleOpen,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(true);
  const isCollapsed = propIsOpen !== undefined ? !propIsOpen : !internalIsOpen;

  const [logs, setLogs] = useState<OutreachLogEntry[]>([]);
  const [levelFilter, setLevelFilter] = useState<"ALL" | "INFO" | "WARN" | "ERROR">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [newLogsCount, setNewLogsCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [expandedSqlIds, setExpandedSqlIds] = useState<Set<number | string>>(new Set());

  const [connectionStatus, setConnectionStatus] = useState<"streaming" | "reconnecting" | "offline">("streaming");
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const seenSeqsRef = useRef<Set<number>>(new Set());

  // Dynamic channels based on active hustle's enabled channels
  const configuredChannels = useMemo(() => {
    const raw = allowedChannels && allowedChannels.length > 0
      ? allowedChannels
      : ["whatsapp", "email", "instagram"];
    const normalized = raw.map((c) => c.toLowerCase());
    return (
      [
        { id: "whatsapp" as const, label: "WhatsApp", icon: Send, color: "text-emerald-400" },
        { id: "email" as const, label: "Email", icon: Mail, color: "text-sky-400" },
        { id: "instagram" as const, label: "Instagram", icon: MessageCircle, color: "text-pink-400" },
      ]
    ).filter((item) =>
      normalized.some(
        (c) =>
          c === item.id ||
          (c === "wa" && item.id === "whatsapp") ||
          (c === "mail" && item.id === "email") ||
          (c === "ig" && item.id === "instagram")
      )
    );
  }, [allowedChannels]);

  // Keep active channel in sync if configured channels change
  useEffect(() => {
    if (configuredChannels.length > 0 && !configuredChannels.some((c) => c.id === channelTab)) {
      onChannelTabChange(configuredChannels[0].id);
    }
  }, [configuredChannels, channelTab, onChannelTabChange]);

  const isWaRunning = activeOutreachChannel === "whatsapp";
  const isEmailRunning = activeOutreachChannel === "email";
  const isIgRunning = activeOutreachChannel === "instagram";

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
      const res = await apiFetch<OutreachLogEntry[] | { logs: OutreachLogEntry[]; latest_seq: number }>(
        "/api/terminal/logs?service=outreach&limit=150"
      );
      const items: OutreachLogEntry[] = Array.isArray(res) ? res : res?.logs || [];
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
          const entry: OutreachLogEntry = JSON.parse(e.data);
          const s = (entry.service || "").toLowerCase();
          if (s && !["outreach", "closer", "whatsapp", "email", "instagram", "system"].includes(s)) {
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
    if (!isOutreachRunning) {
      return logs.length > 0 ? 5 : 0;
    }
    const recent = logs.slice(-15).reverse();
    for (const log of recent) {
      const msg = (log.message || log.line || "").toLowerCase();
      if (OUTREACH_PIPELINE_STEPS[4].keywords.some((k) => msg.includes(k))) return 4;
      if (OUTREACH_PIPELINE_STEPS[3].keywords.some((k) => msg.includes(k))) return 3;
      if (OUTREACH_PIPELINE_STEPS[2].keywords.some((k) => msg.includes(k))) return 2;
      if (OUTREACH_PIPELINE_STEPS[1].keywords.some((k) => msg.includes(k))) return 1;
    }
    return 0;
  }, [isOutreachRunning, logs]);

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
    apiFetch("/api/terminal/clear?service=outreach", { method: "POST" }).catch(() => {});
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
    <div className="w-full rounded-2xl bg-zinc-950 text-zinc-200 border border-zinc-800/90 shadow-lg overflow-hidden transition-all duration-300">
      {/* Console Top Header Bar */}
      <div className="px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2.5 select-none">
        {/* Left: Terminal Icon, Title & Live Status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1 rounded-md bg-zinc-800 text-zinc-300 shrink-0">
            <Terminal className="w-3.5 h-3.5" />
          </div>
          <span className="font-mono font-bold text-xs text-white tracking-wide uppercase truncate">
            AUTOMATION TERMINAL
          </span>

          {/* Live Status Badge */}
          {isOutreachRunning ? (
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
            title={isCollapsed ? "Expand Terminal" : "Collapse Terminal"}
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2-Pane Split Body (Matching DiscoveryConsole with clean breathing room) */}
      {!isCollapsed && (
        <div className="grid grid-cols-12 min-h-[260px] border-t border-zinc-800/60 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800/80">
          {/* Left Pane (col-span-12 lg:col-span-8): Timestamped Monospace Log Stream */}
          <div className="col-span-12 lg:col-span-8 p-3.5 font-mono text-xs overflow-y-auto relative flex flex-col justify-between max-h-[320px]">
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto space-y-1 pr-1 max-h-[280px] select-text"
            >
              {filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-zinc-500 italic text-center">
                  <Database className="w-5 h-5 mb-1.5 text-zinc-600" />
                  <span>Waiting for incoming outreach automation events on stream...</span>
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
                    rawMsg.toLowerCase().includes("sent") ||
                    rawMsg.toLowerCase().includes("complete") ||
                    rawMsg.toLowerCase().includes("success") ||
                    rawMsg.toLowerCase().includes("dispatched")
                  ) {
                    icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 inline" />;
                  }

                  // SQL / parameters detection & truncation
                  const isLargeDump =
                    (rawMsg.includes("parameters: [") ||
                      rawMsg.includes("parameters: {") ||
                      rawMsg.includes("INSERT INTO") ||
                      rawMsg.includes("UPDATE leads")) &&
                    rawMsg.length > 90;

                  const isExpanded = expandedSqlIds.has(log.id ?? idx);

                  let displayMsg = rawMsg;
                  if (isLargeDump && !isExpanded) {
                    displayMsg = rawMsg.slice(0, 90) + "...";
                  }

                  return (
                    <div key={key} className="flex items-start gap-2 leading-relaxed break-all">
                      {ts && <span className="text-zinc-500 select-none shrink-0">[{ts}]</span>}
                      <span className="shrink-0">{icon}</span>
                      <span className="flex-1 text-zinc-300">
                        {displayMsg}
                        {isLargeDump && (
                          <button
                            type="button"
                            onClick={() => toggleSqlExpand(log.id ?? idx)}
                            className="ml-2 text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold underline cursor-pointer"
                          >
                            {isExpanded ? "[Hide raw query]" : "[Show raw query]"}
                          </button>
                        )}
                        {isLargeDump && isExpanded && (
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

          {/* Right Pane (col-span-12 lg:col-span-4): Channel Switcher, Quota/Delay & Aceternity Steps */}
          <div className="col-span-12 lg:col-span-4 border-l border-zinc-800/80 bg-zinc-900/40 p-4 pb-5 flex flex-col justify-between">
            {/* Top Area: Switcher + Telemetry + MultiStepLoader */}
            <div className="space-y-2.5">
              {/* Channel Tabs (Dynamic Segmented Switcher: shown only if >1 channel configured) */}
              {configuredChannels.length > 1 && (
                <div
                  className={`grid gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800 ${
                    configuredChannels.length === 2 ? "grid-cols-2" : "grid-cols-3"
                  }`}
                >
                  {configuredChannels.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onChannelTabChange(c.id)}
                      className={`py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        channelTab === c.id
                          ? "bg-zinc-800 text-white shadow-xs font-bold"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <c.icon className={`w-3 h-3 ${c.color}`} />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Tab Content & Telemetry */}
              {channelTab === "whatsapp" && (
                <div className="space-y-1.5 pt-0.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                      #1 PRIORITY
                    </span>
                    <span className="text-zinc-300">
                      {waSent} / {waLimit} Quota ({waPct}%)
                    </span>
                  </div>

                  <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${waPct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-0.5">
                    <span>Delay: <span className="text-zinc-300 font-medium">4-7m jitter</span></span>
                    <span className="text-[10px] text-zinc-500">Paced auto-throttle</span>
                  </div>

                  <div className="text-[10px] text-zinc-400 pt-0.5 flex items-center gap-1.5 min-w-0" title={waTargetLabel}>
                    <span className="text-zinc-500 shrink-0 font-mono">Next:</span>
                    <span className="font-semibold text-zinc-200 truncate">{waTargetLabel}</span>
                  </div>
                </div>
              )}

              {channelTab === "email" && (
                <div className="space-y-1.5 pt-0.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-sky-500/15 text-sky-400 font-bold border border-sky-500/30">
                      #2 PRIORITY
                    </span>
                    <span className="text-zinc-300">
                      {emailSent} / {emailLimit} Quota ({emailPct}%)
                    </span>
                  </div>

                  <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-sky-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${emailPct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-0.5">
                    <span>Delay: <span className="text-zinc-300 font-medium">2m spacing</span></span>
                    <span className="text-[10px] text-zinc-500">Fixed interval</span>
                  </div>

                  <div className="text-[10px] text-zinc-400 pt-0.5 flex items-center gap-1.5 min-w-0" title={emailTargetLabel}>
                    <span className="text-zinc-500 shrink-0 font-mono">Next:</span>
                    <span className="font-semibold text-zinc-200 truncate">{emailTargetLabel}</span>
                  </div>
                </div>
              )}

              {channelTab === "instagram" && (
                <div className="space-y-1.5 pt-0.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-pink-500/15 text-pink-400 font-bold border border-pink-500/30">
                      FALLBACK
                    </span>
                    <span className="text-zinc-300">
                      {igSent} / {igLimit} Quota ({igPct}%)
                    </span>
                  </div>

                  <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-pink-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${igPct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-0.5">
                    <span>Rule: <span className="font-semibold text-pink-400">On WA Fail</span></span>
                    <span className="text-[10px] text-zinc-500">Smart fallback</span>
                  </div>

                  <div className="text-[10px] text-zinc-400 pt-0.5 flex items-center gap-1.5 min-w-0" title={igTargetLabel}>
                    <span className="text-zinc-500 shrink-0 font-mono">Next:</span>
                    <span className="font-semibold text-zinc-200 truncate">{igTargetLabel}</span>
                  </div>
                </div>
              )}

              {/* Aceternity MultiStepLoader Outreach Steps */}
              <div className="mt-2 pt-2 border-t border-zinc-800/80">
                <div className="relative overflow-hidden [mask-image:linear-gradient(to_bottom,white_85%,transparent_100%)]">
                  <div className="space-y-1 py-0.5">
                    {OUTREACH_PIPELINE_STEPS.map((step, idx) => {
                      const isDone = activeStageIndex > idx;
                      const isActive = isOutreachRunning ? activeStageIndex === idx : activeStageIndex > 0 && activeStageIndex === idx;
                      const distance = Math.abs(idx - activeStageIndex);
                      const opacity = isDone ? 0.85 : isActive ? 1 : Math.max(1 - distance * 0.28, 0.25);

                      return (
                        <motion.div
                          key={step.id}
                          initial={{ opacity: 0, y: -(idx * 3) }}
                          animate={{
                            opacity,
                            y: -(activeStageIndex * 1.5),
                          }}
                          transition={{ duration: 0.45, ease: "easeInOut" }}
                          className="flex items-center justify-between text-[11px] font-mono py-0.5"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isDone ? (
                              <CheckFilled className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : isActive ? (
                              <div className="relative flex items-center justify-center w-3.5 h-3.5 shrink-0">
                                <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 opacity-60" />
                                <CheckOutline className="w-3.5 h-3.5 text-emerald-400 relative shrink-0" />
                              </div>
                            ) : (
                              <CheckOutline className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
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
                            className={`text-[9px] font-mono shrink-0 pl-1.5 ${
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
            </div>

            {/* Bottom: Primary Batch CTA Trigger */}
            <div className="pt-2">
              {channelTab === "whatsapp" && (
                isWaRunning ? (
                  <button
                    type="button"
                    onClick={handleStopAutomation}
                    className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop WhatsApp Automation</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSimulateSend("WA")}
                    className="w-full bg-white hover:bg-zinc-200 text-zinc-900 rounded-xl py-2 px-3 text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Send WA {dryRunMode ? "(Dry-Run)" : "Live"}</span>
                  </button>
                )
              )}

              {channelTab === "email" && (
                isEmailRunning ? (
                  <button
                    type="button"
                    onClick={handleStopAutomation}
                    className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop Email Automation</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSimulateSend("EMAIL")}
                    className="w-full bg-white hover:bg-zinc-200 text-zinc-900 rounded-xl py-2 px-3 text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-sky-600" />
                    <span>Send Mail {dryRunMode ? "(Dry-Run)" : "Live"}</span>
                  </button>
                )
              )}

              {channelTab === "instagram" && (
                isIgRunning ? (
                  <button
                    type="button"
                    onClick={handleStopAutomation}
                    className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop IG Automation</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSimulateSend("FALLBACK")}
                    className="w-full bg-white hover:bg-zinc-200 text-zinc-900 rounded-xl py-2 px-3 text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-pink-600" />
                    <span>Test Fallback Trigger</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
