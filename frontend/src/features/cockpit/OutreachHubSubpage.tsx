"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Flame,
  Info,
  Mail,
  MessageCircle,
  MessageSquare,
  Play,
  RotateCw,
  Send,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  Zap,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { OutreachLogEntry, OutreachTelemetryState } from "./types";

const INITIAL_OUTREACH_LOGS: OutreachLogEntry[] = [
  {
    id: "log-1",
    timestamp: "00:44:50",
    channel: "SYSTEM",
    level: "info",
    message: "Outreach Dispatch Engine initialized. Multi-channel protocol armed.",
  },
  {
    id: "log-2",
    timestamp: "00:45:01",
    channel: "WA",
    level: "info",
    message: 'Preparing outreach payload for "Dentique Dental" (Dr. Rajeev Verma, +91 98112XXXXX)...',
  },
  {
    id: "log-3",
    timestamp: "00:45:02",
    channel: "WA",
    level: "info",
    message: "Attaching demo preview link: localhost:3001/modern/dentique-dental",
  },
  {
    id: "log-4",
    timestamp: "00:45:05",
    channel: "WA",
    level: "success",
    message: "[DELIVERED] Message delivered to WhatsApp recipient. Status: HTTP 200",
  },
  {
    id: "log-5",
    timestamp: "00:45:06",
    channel: "DB",
    level: "info",
    message: 'Lead #10 stage updated: "Package Ready" -> "Pitch Sent". Next action due in 2 days.',
  },
  {
    id: "log-6",
    timestamp: "00:45:10",
    channel: "EMAIL",
    level: "info",
    message: "Dispatching intro email to info@primedental.com with 3-design choice page link...",
  },
  {
    id: "log-7",
    timestamp: "00:45:12",
    channel: "EMAIL",
    level: "success",
    message: "[SENT] SMTP accepted for delivery (Message-ID: <prime.0921@sidehustle.com>)",
  },
  {
    id: "log-8",
    timestamp: "00:45:15",
    channel: "WA",
    level: "info",
    message: 'Attempting WhatsApp dispatch for "Apex Dental Care" (+91 11 2618XXXX)...',
  },
  {
    id: "log-9",
    timestamp: "00:45:17",
    channel: "FALLBACK",
    level: "warn",
    message: "[WA-ERR] Recipient is a landline/unregistered number. WhatsApp delivery failed!",
  },
  {
    id: "log-10",
    timestamp: "00:45:18",
    channel: "FALLBACK",
    level: "warn",
    message: "Triggering Instagram fallback protocol for @apexdental_official...",
  },
  {
    id: "log-11",
    timestamp: "00:45:22",
    channel: "IG",
    level: "success",
    message: "[DELIVERED] Instagram DM sent successfully with mobile walkthrough video!",
  },
];

export function OutreachHubSubpage() {
  const { stockPlan, notify, handleRunCloser, setSelectedLeadId } = useCRM();

  const [channelFilter, setChannelFilter] = useState<string>("ALL");
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [logs, setLogs] = useState<OutreachLogEntry[]>(INITIAL_OUTREACH_LOGS);
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);
  const [dryRunMode, setDryRunMode] = useState<boolean>(true);

  const terminalRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll when new logs arrive
  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Telemetry counts
  const waSent = stockPlan?.today_channel_sends?.whatsapp ?? 8;
  const waLimit = stockPlan?.channel_limits?.whatsapp ?? 20;
  const waPct = Math.min(100, Math.round((waSent / (waLimit || 1)) * 100));

  const emailSent = stockPlan?.today_channel_sends?.email ?? 4;
  const emailLimit = stockPlan?.channel_limits?.email ?? 30;
  const emailPct = Math.min(100, Math.round((emailSent / (emailLimit || 1)) * 100));

  const igSent = stockPlan?.today_channel_sends?.instagram ?? 1;
  const igLimit = stockPlan?.channel_limits?.instagram ?? 15;
  const igPct = Math.min(100, Math.round((igSent / (igLimit || 1)) * 100));

  const handleCopyLogs = async () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.channel}] ${l.message}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLogs(true);
      notify("Copied outreach terminal logs to clipboard");
      setTimeout(() => setCopiedLogs(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleClearTerminal = () => {
    setLogs([
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        channel: "SYSTEM",
        level: "info",
        message: "Terminal buffer cleared. Listening for live webhook and send dispatches...",
      },
    ]);
  };

  const handleSimulateSend = (channel: "WA" | "EMAIL" | "FALLBACK") => {
    const time = new Date().toLocaleTimeString();
    if (channel === "WA") {
      setLogs((prev) => [
        ...prev,
        {
          id: `log-${Date.now()}-1`,
          timestamp: time,
          channel: "WA",
          level: "info",
          message: `[OUTBOUND] Dispatching ${dryRunMode ? "DRY-RUN" : "LIVE"} WhatsApp pitch to next queued lead...`,
        },
        {
          id: `log-${Date.now()}-2`,
          timestamp: time,
          channel: "WA",
          level: "success",
          message: `[DELIVERED] WhatsApp HTTP 200 verified. Randomized jitter sleep: 5m 24s.`,
        },
      ]);
      notify(`Dispatched WhatsApp ${dryRunMode ? "dry-run" : "live"} payload!`);
    } else if (channel === "EMAIL") {
      setLogs((prev) => [
        ...prev,
        {
          id: `log-${Date.now()}-1`,
          timestamp: time,
          channel: "EMAIL",
          level: "info",
          message: `[OUTBOUND] Dispatching 3-template choice page to next verified email...`,
        },
        {
          id: `log-${Date.now()}-2`,
          timestamp: time,
          channel: "EMAIL",
          level: "success",
          message: `[ACCEPTED] SMTP relay queued Message-ID: <batch.${Date.now()}@sidehustle.com>`,
        },
      ]);
      notify(`Sent cold email ${dryRunMode ? "preview" : "outbound"}!`);
    } else {
      setLogs((prev) => [
        ...prev,
        {
          id: `log-${Date.now()}-1`,
          timestamp: time,
          channel: "FALLBACK",
          level: "warn",
          message: `[FALLBACK] Checked next phone number: Landline detected! Aborting WhatsApp.`,
        },
        {
          id: `log-${Date.now()}-2`,
          timestamp: time,
          channel: "IG",
          level: "success",
          message: `[IG DELIVERED] Dispatched fallback Instagram DM with mobile walkthrough MP4 video!`,
        },
      ]);
      notify("Executed Instagram DM fallback rule successfully!");
    }
  };

  const filteredLogs = useMemo(() => {
    if (channelFilter === "ALL") return logs;
    return logs.filter((l) => {
      if (channelFilter === "WHATSAPP") return l.channel === "WA";
      if (channelFilter === "EMAIL") return l.channel === "EMAIL";
      if (channelFilter === "INSTAGRAM") return l.channel === "IG" || l.channel === "FALLBACK";
      if (channelFilter === "WEBHOOKS") return l.message.includes("DELIVERED") || l.message.includes("SENT") || l.channel === "DB";
      return true;
    });
  }, [logs, channelFilter]);

  return (
    <div className="space-y-6">
      {/* Top Protocol Invariant Banner */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-card flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Dental Clinic Multi-Channel Outreach Protocol
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-semibold">
              Strict Priority Rules Active
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Priority 1: WhatsApp (4-7m delay) &bull; Priority 2: Cold Email &bull; Fallback: Instagram DM (only on WA failure)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDryRunMode((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-colors cursor-pointer ${
              dryRunMode
                ? "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40"
                : "bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/50 font-black"
            }`}
          >
            {dryRunMode ? "Mode: DRY-RUN (Safe)" : "Mode: LIVE SEND (Active)"}
          </button>
        </div>
      </div>

      {/* 3 Multi-Channel Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: 🟢 WHATSAPP (Priority #1) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#141721] border border-emerald-500/30 dark:border-emerald-500/20 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.08)] flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>WHATSAPP</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                      #1 PRIORITY
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    Status: ACTIVE (Window Open)
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                {waSent} / {waLimit}
              </span>
            </div>

            {/* Quota Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Daily Quota</span>
                <span className="font-mono">{waPct}% consumed</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${waPct}%` }}
                />
              </div>
            </div>

            {/* Pacing & Target Details */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0E1017] border border-slate-200/70 dark:border-white/[0.05] text-xs space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Pacing Delay:</span>
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">4-7 mins (jittered)</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Current Target:</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 truncate max-w-[140px]">
                  Dentique Dental
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Action:</span>
                <span className="text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
                  Pitch with video demo
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
            <button
              onClick={() => handleSimulateSend("WA")}
              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send WA {dryRunMode ? "(Dry-Run)" : "Live"}</span>
            </button>
          </div>
        </div>

        {/* Card 2: 🔵 COLD EMAIL (Priority #2) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#141721] border border-blue-500/30 dark:border-blue-500/20 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.08)] flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>COLD EMAIL</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold">
                      #2 PRIORITY
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-semibold">
                    Status: ACTIVE (Domain Warmed)
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                {emailSent} / {emailLimit}
              </span>
            </div>

            {/* Quota Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Daily Quota</span>
                <span className="font-mono">{emailPct}% consumed</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${emailPct}%` }}
                />
              </div>
            </div>

            {/* Pacing & Target Details */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0E1017] border border-slate-200/70 dark:border-white/[0.05] text-xs space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Pacing Delay:</span>
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">2 mins spacing</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Current Target:</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 truncate max-w-[140px]">
                  Dr Pratibha (Prime)
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Action:</span>
                <span className="text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
                  3-design choice page link
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
            <button
              onClick={() => handleSimulateSend("EMAIL")}
              className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Send Mail {dryRunMode ? "(Dry-Run)" : "Live"}</span>
            </button>
          </div>
        </div>

        {/* Card 3: 🟣 INSTAGRAM DM (Fallback Only) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#141721] border border-pink-500/30 dark:border-pink-500/20 shadow-[0_4px_20px_-4px_rgba(236,72,153,0.08)] flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-400 flex items-center justify-center font-bold">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>INSTAGRAM DM</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 font-bold">
                      FALLBACK ONLY
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-pink-600 dark:text-pink-400 font-semibold">
                    Status: STANDBY (Safety Rule)
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                {igSent} / {igLimit}
              </span>
            </div>

            {/* Quota Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Daily Quota</span>
                <span className="font-mono">{igPct}% consumed</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-pink-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${igPct}%` }}
                />
              </div>
            </div>

            {/* Invariant Rule Banner */}
            <div className="p-3 rounded-2xl bg-pink-50/50 dark:bg-pink-950/20 border border-pink-200/80 dark:border-pink-800/40 text-xs space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400 font-medium">Enforced Rule:</span>
                <span className="font-bold text-pink-600 dark:text-pink-300">Triggered ONLY on WA Fail</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Last Trigger:</span>
                <span className="text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                  WA number was landline
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Fallback Lead:</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 truncate max-w-[140px]">
                  @apexdental_official
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
            <button
              onClick={() => handleSimulateSend("FALLBACK")}
              className="w-full py-2 px-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-md shadow-pink-600/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Test Fallback Trigger</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dedicated Outreach Dispatch Terminal */}
      <div className="rounded-3xl bg-[#0B0D14] border border-slate-800/90 shadow-2xl overflow-hidden space-y-0">
        {/* Terminal Header */}
        <div className="px-5 py-3.5 bg-[#121521] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <div className="flex items-center gap-2 pl-1">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black font-mono text-slate-100 tracking-wide">
                OUTREACH DISPATCH TERMINAL
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              DISPATCH BUS ONLINE
            </span>
          </div>

          {/* Terminal Controls: Filter & Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Pills */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono">
              {["ALL", "WHATSAPP", "EMAIL", "INSTAGRAM", "WEBHOOKS"].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setChannelFilter(f)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    channelFilter === f
                      ? "bg-indigo-600 text-white font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Auto-Scroll Toggle */}
            <button
              type="button"
              onClick={() => setAutoScroll((prev) => !prev)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-mono border transition-colors cursor-pointer ${
                autoScroll
                  ? "bg-slate-800 text-emerald-400 border-slate-700"
                  : "bg-slate-900 text-slate-500 border-slate-800"
              }`}
            >
              Scroll: {autoScroll ? "ON" : "OFF"}
            </button>

            {/* Copy Logs */}
            <button
              type="button"
              onClick={handleCopyLogs}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              {copiedLogs ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {/* Clear */}
            <button
              type="button"
              onClick={handleClearTerminal}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Terminal Log Console */}
        <div
          ref={terminalRef}
          className="p-4 h-80 overflow-y-auto font-mono text-xs leading-relaxed space-y-1.5 select-text bg-[#0B0D14]"
        >
          {filteredLogs.map((log) => {
            let badgeBg = "bg-slate-800 text-slate-300 border-slate-700";
            if (log.channel === "WA") badgeBg = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
            if (log.channel === "EMAIL") badgeBg = "bg-blue-500/20 text-blue-300 border-blue-500/30";
            if (log.channel === "IG") badgeBg = "bg-pink-500/20 text-pink-300 border-pink-500/30";
            if (log.channel === "FALLBACK") badgeBg = "bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold";
            if (log.channel === "DB") badgeBg = "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";

            let msgColor = "text-slate-300";
            if (log.level === "success") msgColor = "text-emerald-300";
            if (log.level === "warn") msgColor = "text-amber-300";
            if (log.level === "error") msgColor = "text-rose-400";

            return (
              <div key={log.id} className="flex items-start gap-2 break-words whitespace-pre-wrap">
                <span className="text-slate-600 select-none shrink-0 font-mono">
                  [{log.timestamp}]
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border shrink-0 ${badgeBg}`}>
                  {log.channel}
                </span>
                <span className={`${msgColor} flex-1`}>{log.message}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
