"use client";

import React, { useState } from "react";
import {
  AlertOctagon,
  Bot,
  CheckCircle2,
  ChevronRight,
  Flame,
  Radio,
  Send,
  ShieldAlert,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface CockpitSupervisorBarProps {
  status: "MONITORING" | "RUNNING" | "PAUSED" | "STOPPED";
  currentIntent: string;
  onSendCommand: (command: string) => void;
  onEmergencyStop: () => void;
}

export function CockpitSupervisorBar({
  status,
  currentIntent,
  onSendCommand,
  onEmergencyStop,
}: CockpitSupervisorBarProps) {
  const [commandInput, setCommandInput] = useState<string>("");
  const [autoRetry, setAutoRetry] = useState<boolean>(true);
  const [agentLogs, setAgentLogs] = useState<string[]>([
    "Supervisor initialized. Listening on Server-Sent Events (/api/events/stream).",
    "Auto-recovery rules enabled: 429 rate limit fallback (Serper -> Brave Search) armed.",
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;
    const cmd = commandInput.trim();
    setAgentLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Captain Command: "${cmd}"`,
      `[${new Date().toLocaleTimeString()}] Supervisor: Processing instruction and applying to pipeline dispatch...`,
    ]);
    onSendCommand(cmd);
    setCommandInput("");
  };

  return (
    <div className="rounded-3xl bg-white dark:bg-[#141721] border border-indigo-200/80 dark:border-indigo-500/30 shadow-[0_4px_25px_-4px_rgba(99,102,241,0.1)] space-y-3 p-4">
      {/* Top Status Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/30">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 dark:text-white tracking-tight">
                COCKPIT FACTORY SUPERVISOR AGENT
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-500/30">
                AUTONOMOUS CONTROLLER
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {status === "MONITORING"
                  ? "MONITORING PIPELINE"
                  : status === "RUNNING"
                  ? "EXECUTING BATCH"
                  : status === "PAUSED"
                  ? "PAUSED"
                  : "STOPPED"}
              </span>
              <span>•</span>
              <span className="truncate max-w-md">{currentIntent}</span>
            </div>
          </div>
        </div>

        {/* Right Mode & Auto-Retry Toggles */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAutoRetry((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
              autoRetry
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
            }`}
            title="Toggle autonomous retry upon rate limits & provider timeouts"
          >
            {autoRetry ? (
              <ToggleRight className="w-4 h-4 text-emerald-500" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-slate-400" />
            )}
            <span>Auto-Retry: {autoRetry ? "ON" : "OFF"}</span>
          </button>

          <button
            type="button"
            onClick={onEmergencyStop}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-900/25 transition-all cursor-pointer active:scale-95"
            title="Emergency abort: halts all scraping, probes, and video recording workers"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Emergency Stop</span>
          </button>
        </div>
      </div>

      {/* Command Input Bar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="Instruct Supervisor Agent... e.g. 'Focus on Sec 76 Noida clinics', 'Pause before video recording', 'Verify links'..."
            className="w-full bg-slate-50 dark:bg-[#0B0D14] border border-slate-200 dark:border-white/[0.08] rounded-2xl px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 font-medium"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Send Command</span>
        </button>
      </form>
    </div>
  );
}
