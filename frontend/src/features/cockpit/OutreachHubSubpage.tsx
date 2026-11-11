"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
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
  Zap,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { LiveLogTerminal } from "@/components/ui/LiveLogTerminal";

export function OutreachHubSubpage() {
  const { stockPlan, notify, handleRunCloser, setSelectedLeadId } = useCRM();
  const [dryRunMode, setDryRunMode] = useState<boolean>(true);

  // Telemetry counts
  const waSent = stockPlan?.today_channel_sends?.whatsapp ?? 0;
  const waLimit = stockPlan?.channel_limits?.whatsapp ?? 0;
  const waPct = Math.min(100, Math.round((waSent / (waLimit || 1)) * 100));

  const emailSent = stockPlan?.today_channel_sends?.email ?? 0;
  const emailLimit = stockPlan?.channel_limits?.email ?? 0;
  const emailPct = Math.min(100, Math.round((emailSent / (emailLimit || 1)) * 100));

  const igSent = stockPlan?.today_channel_sends?.instagram ?? 0;
  const igLimit = stockPlan?.channel_limits?.instagram ?? 0;
  const igPct = Math.min(100, Math.round((igSent / (igLimit || 1)) * 100));

  const handleSimulateSend = (channel: "WA" | "EMAIL" | "FALLBACK") => {
    if (channel === "WA") {
      handleRunCloser("whatsapp", dryRunMode);
      notify(`Dispatched WhatsApp ${dryRunMode ? "dry-run" : "live"} payload!`);
    } else if (channel === "EMAIL") {
      handleRunCloser("email", dryRunMode);
      notify(`Sent cold email ${dryRunMode ? "preview" : "outbound"}!`);
    } else {
      handleRunCloser("instagram", dryRunMode);
      notify("Executed Instagram DM fallback rule successfully!");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Protocol Invariant Banner */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
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
        {/* Card 1: WHATSAPP (Priority #1) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-emerald-500/30 dark:border-emerald-500/20 shadow-sm flex flex-col justify-between space-y-4">
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
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.05] text-xs space-y-1.5">
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

        {/* Card 2: COLD EMAIL (Priority #2) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-blue-500/30 dark:border-blue-500/20 shadow-sm flex flex-col justify-between space-y-4">
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
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.05] text-xs space-y-1.5">
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

        {/* Card 3: INSTAGRAM DM (Fallback Only) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-pink-500/30 dark:border-pink-500/20 shadow-sm flex flex-col justify-between space-y-4">
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

      {/* Real Live Outreach Terminal Embedded */}
      <LiveLogTerminal
        title="OUTREACH DISPATCH & AUTOMATION TERMINAL"
        service="outreach"
        lockService={false}
        className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl h-80"
        collapsible={true}
      />
    </div>
  );
}
