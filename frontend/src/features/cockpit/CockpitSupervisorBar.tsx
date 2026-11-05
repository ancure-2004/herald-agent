"use client";

import React, { useState } from "react";
import {
  AlertOctagon,
  Bot,
  Send,
  ToggleLeft,
  ToggleRight,
  X,
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
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [commandInput, setCommandInput] = useState<string>("" );
  const [autoRetry, setAutoRetry] = useState<boolean>(true);
  const [agentLogs, setAgentLogs] = useState<string[]>([
    "Supervisor initialized. Listening on SSE (/api/events/stream).",
    "Auto-recovery armed: 429 rate limit fallback (Serper -> Brave Search).",
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;
    const cmd = commandInput.trim();
    setAgentLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Captain: "${cmd}"`,
      `[${new Date().toLocaleTimeString()}] Agent: Processing instruction into pipeline dispatch...`,
    ]);
    onSendCommand(cmd);
    setCommandInput("");
  };

  return (
    <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-40">
      {!isOpen ? (
        /* Collapsed State: Sleek Floating Action Button */
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="px-4 py-3 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl shadow-emerald-900/30 flex items-center gap-2.5 hover:scale-105 active:scale-95 transition-all text-xs font-bold cursor-pointer"
          title="Open Cockpit Factory Agent"
        >
          <div className="relative flex items-center justify-center">
            <Bot className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <span>Factory Agent</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
        </button>
      ) : (
        /* Expanded State: Elegant Floating Card Popover */
        <div className="w-[calc(100vw-2rem)] sm:w-[420px] max-h-[500px] rounded-2xl bg-white dark:bg-[#141721] border border-emerald-500/30 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-600/10 via-teal-600/5 to-transparent border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/30">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Cockpit Factory Agent</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    {status === "MONITORING"
                      ? "MONITORING PIPELINE"
                      : status === "RUNNING"
                      ? "EXECUTING BATCH"
                      : status === "PAUSED"
                      ? "PAUSED"
                      : "STOPPED"}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              title="Minimize Factory Agent"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3 overflow-y-auto max-h-[340px]">
            {/* Broadcast reasoning box */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0B0D14] border border-slate-200/70 dark:border-white/[0.06] space-y-1.5">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Agent Reasoning &amp; Telemetry</span>
                <span className="text-emerald-500 font-bold">LIVE SSE</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {currentIntent}
              </p>
            </div>

            {/* Mode toggles */}
            <div className="flex items-center justify-between gap-2 pt-1">
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-900/25 transition-all cursor-pointer active:scale-95"
                title="Emergency abort: halts all scraping, probes, and video recording workers"
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Emergency Stop</span>
              </button>
            </div>

            {/* Recent Agent Logs */}
            {agentLogs.length > 0 && (
              <div className="p-2.5 rounded-xl bg-slate-900 text-slate-300 font-mono text-[10px] space-y-1 max-h-24 overflow-y-auto">
                {agentLogs.map((log, i) => (
                  <div key={i} className="truncate">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Command Input Prompt Footer */}
          <div className="p-3 bg-slate-50 dark:bg-white/[0.04] border-t border-slate-100 dark:border-white/[0.06]">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder="Instruct Factory Agent... e.g. 'Retry step 2'"
                className="flex-1 bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 font-medium"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-600/25 transition-all cursor-pointer active:scale-95 shrink-0"
              >
                <Send className="w-3 h-3" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
