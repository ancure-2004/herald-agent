"use client";

import React, { useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Play,
  Terminal,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { apiFetch } from "@/lib/api/client";

export function AutopilotCockpitView() {
  const {
    handleSyncBatchLinks,
    handleTriggerRefill,
    handleRunScout,
    handleRunAuditor,
    handleRunCloser,
    terminalLogs,
    setTerminalLogs,
    activeTerminalJob,
    showPreviousRuns,
    setShowPreviousRuns,
    runs,
    appendTerminalLines,
    setSelectedLeadId,
    terminalContainerRef,
    notify,
    activeHustleId,
  } = useCRM();

  const [closerDryRun, setCloserDryRun] = useState<boolean>(true);
  const [copiedLast20, setCopiedLast20] = useState<boolean>(false);
  const [telegramCmd, setTelegramCmd] = useState<string>("/stock");
  const [telegramReply, setTelegramReply] = useState<string>("");

  const handleCopyLast20Logs = async () => {
    const last20 = terminalLogs.slice(-20).join("\n");
    try {
      await navigator.clipboard.writeText(last20);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = last20;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedLast20(true);
    notify(`Copied last ${Math.min(20, terminalLogs.length)} terminal logs to clipboard`);
    setTimeout(() => setCopiedLast20(false), 2000);
  };

  const handleTelegramCmdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramCmd.trim()) return;
    try {
      const res = await apiFetch<{ reply: string }>("/api/telegram/simulate", {
        method: "POST",
        body: JSON.stringify({ command: telegramCmd.trim(), hustle_id: activeHustleId }),
      });
      setTelegramReply(res.reply);
    } catch (err) {
      setTelegramReply(`Error: ${err instanceof Error ? err.message : "Failed to execute"}`);
    }
  };

  return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="p-5 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.08] shadow-xs flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                            7-Step Clinic Autopilot &amp; 4-Tier Lead Discovery Waterfall
                          </h2>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-semibold">
                            Strict DB Dedup Active
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold">
                            IG Discovery: OFF (Dental Rule)
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Tier 1: Google Places API &rarr; Tier 2: Serper Maps &rarr; Tier 3: Brave Search &rarr; Tier 4: Playwright Maps &bull; No-Website Filter &bull; 3 Live Demos &bull; Sync batch.json
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={handleSyncBatchLinks}
                          className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/30 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Verify Links &amp; Sync batch.json</span>
                        </button>
                        <button
                          onClick={handleTriggerRefill}
                          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Run Refill Batch Now</span>
                        </button>
                      </div>
                    </div>

                    {/* Phase 3 Specialized Sub-Agents Control Deck (Scout -> Auditor -> Closer) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {/* 1. Scout Agent */}
                      <div className="p-4 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.08] shadow-xs flex flex-col justify-between space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">1. Scout Agent</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                              4-Tier Maps + Dossier
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            Finds new no-website clinics via 4-Tier Waterfall (Places &rarr; Serper &rarr; Brave &rarr; Playwright), skips existing DB leads &amp; enriches Doctor/Email.
                          </p>
                        </div>
                        <button
                          onClick={handleRunScout}
                          className="w-full py-2 px-3 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Run Scout Agent
                        </button>
                      </div>

                      {/* 2. Auditor Agent */}
                      <div className="p-4 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.08] shadow-xs flex flex-col justify-between space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">2. Auditor Agent</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                              QA + Video Recorder
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            Verifies HTTP 200 across all 4 demo routes, syncs batch.json, and links MP4 walkthroughs.
                          </p>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleRunAuditor(false)}
                            className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold cursor-pointer transition-colors"
                          >
                            Audit &amp; Link MP4
                          </button>
                          <button
                            onClick={() => handleRunAuditor(true)}
                            className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                            title="Run Playwright record-batch.mjs on 1 verified clinic"
                          >
                            Record 1
                          </button>
                        </div>
                      </div>

                      {/* 3. Closer Agent */}
                      <div className="p-4 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.08] shadow-xs flex flex-col justify-between space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">3. Closer Agent</span>
                            <button
                              type="button"
                              onClick={() => setCloserDryRun((prev) => !prev)}
                              className={`text-[10px] font-mono px-2 py-0.5 rounded border cursor-pointer transition-colors ${
                                closerDryRun
                                  ? "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30"
                                  : "bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/40 font-bold"
                              }`}
                              title="Toggle between Dry-Run Safe Preview and LIVE Send"
                            >
                              {closerDryRun ? "Mode: DRY-RUN" : "Mode: LIVE SEND"}
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            Feeds CRM Outbox to wa_autopilot.mjs, ig_autopilot.mjs &amp; email_autopilot.py + drafts hot follow-ups.
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            onClick={() => handleRunCloser("whatsapp", closerDryRun)}
                            className="py-2 px-2 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold cursor-pointer"
                            title="Run wa_autopilot.mjs against CRM Outbox"
                          >
                            {closerDryRun ? "WA Dry" : "WA Live"}
                          </button>
                          <button
                            onClick={() => handleRunCloser("instagram", closerDryRun)}
                            className="py-2 px-2 rounded-xl bg-pink-600/15 hover:bg-pink-600/25 border border-pink-500/30 text-pink-700 dark:text-pink-300 text-[11px] font-semibold cursor-pointer"
                            title="Run ig_autopilot.mjs against CRM Outbox"
                          >
                            {closerDryRun ? "IG Dry" : "IG Live"}
                          </button>
                          <button
                            onClick={() => handleRunCloser("email", closerDryRun)}
                            className="py-2 px-2 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-700 dark:text-blue-300 text-[11px] font-semibold cursor-pointer"
                            title="Run email_autopilot.py against CRM Outbox"
                          >
                            {closerDryRun ? "Mail Dry" : "Mail Live"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Unified Live Execution Terminal (Refill Batch + Verify Links + Scout + Auditor + Closer) */}
                    <div className="rounded-3xl bg-[#0B0D14] border border-slate-800/90 shadow-xl overflow-hidden">
                      <div className="px-4 py-3 bg-[#121521] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                          </div>
                          <div className="flex items-center gap-2 pl-1">
                            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-xs font-bold font-mono text-slate-100 tracking-wide">
                              Live Execution Terminal
                            </span>
                          </div>
                          {activeTerminalJob ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              RUNNING: {activeTerminalJob}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono text-slate-400 bg-slate-800/70 border border-slate-700/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              STREAM READY ({terminalLogs.length} lines)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCopyLast20Logs}
                            className="px-2.5 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-[11px] font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Copy the last 20 log lines from this terminal"
                          >
                            {copiedLast20 ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-300">Copied Last 20!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Last 20 Logs</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setTerminalLogs([
                                `[${new Date().toLocaleTimeString()}] [SYSTEM] Terminal cleared. Ready for next Refill Batch or Sub-Agent run...`,
                              ])
                            }
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 text-[11px] font-mono transition-colors cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      <div
                        ref={terminalContainerRef}
                        className="p-4 h-72 overflow-y-auto font-mono text-xs leading-relaxed space-y-1.5 select-text"
                      >
                        {terminalLogs.map((line, idx) => {
                          const isError = line.includes("[ERROR]") || line.includes("[HTTP FAIL]") || line.includes("[DROP]");
                          const isSkip = line.includes("[SKIP]");
                          const isScout = line.includes("[1.SCOUT-AGENT]") || line.includes("[SCOUT]");
                          const isAuditor = line.includes("[2.AUDITOR-AGENT]") || line.includes("[AUDITOR]") || line.includes("[HTTP 200 OK]");
                          const isCloser = line.includes("[3.CLOSER") || line.includes("[CLOSER]");
                          const isRefill = line.includes("[REFILL-BATCH]") || line.includes("[VERIFY-LINKS]");

                          let textColor = "text-slate-300";
                          if (isError) textColor = "text-rose-400";
                          else if (isSkip) textColor = "text-amber-300/90";
                          else if (isAuditor) textColor = "text-emerald-300";
                          else if (isScout) textColor = "text-indigo-300";
                          else if (isCloser) textColor = "text-cyan-300";
                          else if (isRefill) textColor = "text-emerald-400";

                          return (
                            <div key={idx} className={`${textColor} break-words whitespace-pre-wrap`}>
                              <span className="text-slate-600 select-none mr-2">
                                {String(idx + 1).padStart(2, "0")}
                              </span>
                              {line}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Structured Latest Run Result + Option to Expand Previous Runs */}
                    {runs.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                              Latest Run Result (Structured Report)
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              (Showing latest 1 of {runs.length} runs)
                            </span>
                          </div>
                          {runs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setShowPreviousRuns((prev) => !prev)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <span>
                                {showPreviousRuns
                                  ? "Hide Previous Runs"
                                  : `Show Previous Runs (${runs.length - 1})`}
                              </span>
                              {showPreviousRuns ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Latest Run Card (runs[0]) */}
                        {[runs[0]].map((r) => {
                          const struct = r.drop_reasons?._structured;
                          const builtLeads = struct?.built_leads || [];
                          const droppedItems = struct?.dropped_items || [];
                          const tiersUsed = struct?.tiers_used || [];
                          const dropCounts = Object.entries(r.drop_reasons || {}).filter(
                            ([k, v]) => k !== "_structured" && typeof v === "number"
                          ) as Array<[string, number]>;

                          return (
                            <div
                              key={r.id}
                              className="p-4 rounded-2xl bg-white dark:bg-[#141721] border border-indigo-200/80 dark:border-indigo-500/30 shadow-xs space-y-3.5"
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold uppercase tracking-wider">
                                    Latest
                                  </span>
                                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                                    Run #{r.id}: {r.job_type}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-semibold font-mono">
                                    {r.status}
                                  </span>
                                  {tiersUsed.map((t, i) => (
                                    <span
                                      key={i}
                                      className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 font-mono"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                                <div className="flex items-center gap-2">
                                  {r.trace_logs && r.trace_logs.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        appendTerminalLines([
                                          `--- Loaded Trace Logs from Run #${r.id} (${r.job_type}) ---`,
                                          ...(r.trace_logs || []),
                                        ])
                                      }
                                      className="text-[10px] font-mono px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                                    >
                                      Replay in Terminal
                                    </button>
                                  )}
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    {new Date(r.started_at).toLocaleTimeString()}
                                  </span>
                                </div>
                              </div>

                              {/* Summary KPI Grid */}
                              <div className="text-xs text-slate-600 dark:text-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/[0.04]">
                                  <div className="text-[10px] text-slate-400">Candidates Scanned</div>
                                  <div className="font-bold font-mono text-slate-800 dark:text-white">{r.count_found}</div>
                                </div>
                                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/[0.04]">
                                  <div className="text-[10px] text-slate-400">Passed &amp; Built</div>
                                  <div className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{r.count_passed}</div>
                                </div>
                                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/[0.04]">
                                  <div className="text-[10px] text-slate-400">Filtered / Deduped</div>
                                  <div className="font-bold font-mono text-amber-600 dark:text-amber-400">{r.count_dropped}</div>
                                </div>
                                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/[0.04]">
                                  <div className="text-[10px] text-slate-400">Duration</div>
                                  <div className="font-bold font-mono text-slate-800 dark:text-white">
                                    {r.finished_at
                                      ? `${Math.max(1, Math.round((new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000))}s`
                                      : "active"}
                                  </div>
                                </div>
                              </div>

                              {/* Structured Table of Built / Verified / Targeted Clinics */}
                              {builtLeads.length > 0 && (
                                <div className="space-y-1.5">
                                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                    <span>Structured Run Output ({builtLeads.length} Clinics Processed)</span>
                                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                                      100% Deduplicated vs. CRM Database
                                    </span>
                                  </div>
                                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/[0.08]">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-slate-50 dark:bg-[#10121A] text-[10px] uppercase text-slate-400 font-semibold border-b border-slate-200 dark:border-white/[0.06]">
                                        <tr>
                                          <th className="py-2 px-2.5">Clinic &amp; Doctor</th>
                                          <th className="py-2 px-2.5">Locality</th>
                                          <th className="py-2 px-2.5">Phone</th>
                                          <th className="py-2 px-2.5">Fit</th>
                                          <th className="py-2 px-2.5">Source / Status</th>
                                          <th className="py-2 px-2.5 text-right">Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                                        {builtLeads.map((item) => (
                                          <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02]">
                                            <td className="py-2 px-2.5">
                                              <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                                              <div className="text-[10px] text-slate-400">{item.doctor || "Doctor"}</div>
                                            </td>
                                            <td className="py-2 px-2.5 text-[11px] text-slate-600 dark:text-slate-300">
                                              {item.locality}
                                            </td>
                                            <td className="py-2 px-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                                              {item.phone || "-"}
                                            </td>
                                            <td className="py-2 px-2.5">
                                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold">
                                                {item.fit_score}/100
                                              </span>
                                            </td>
                                            <td className="py-2 px-2.5">
                                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                                                {item.source_tier}
                                              </span>
                                            </td>
                                            <td className="py-2 px-2.5 text-right space-x-1.5">
                                              {(item.choice_url || item.demo_url) && (
                                                <a
                                                  href={item.choice_url || item.demo_url}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold hover:bg-emerald-100"
                                                >
                                                  <span>/demo/{item.slug}</span>
                                                  <ExternalLink className="w-2.5 h-2.5" />
                                                </a>
                                              )}
                                              <button
                                                type="button"
                                                onClick={() => setSelectedLeadId(item.id)}
                                                className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-semibold cursor-pointer hover:bg-slate-200"
                                              >
                                                Dossier
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* Structured Drop / Deduplication Breakdown */}
                              {(dropCounts.length > 0 || droppedItems.length > 0) && (
                                <div className="space-y-1.5 pt-1">
                                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                    <span>Filter &amp; Database Deduplication Gate Breakdown:</span>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {dropCounts.map(([reason, count]) => (
                                        <span
                                          key={reason}
                                          className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-500/20"
                                        >
                                          {reason}: {count}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  {droppedItems.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-28 overflow-y-auto pr-1">
                                      {droppedItems.map((d, i) => (
                                        <div
                                          key={i}
                                          className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#10121A] border border-slate-200/70 dark:border-white/[0.05] text-[11px] flex items-center justify-between gap-2"
                                        >
                                          <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                                            {d.name}
                                          </span>
                                          <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 shrink-0">
                                            {d.reason}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Collapsible Previous Runs List (runs.slice(1)) */}
                        {showPreviousRuns && runs.length > 1 && (
                          <div className="space-y-2.5 pt-1 max-h-96 overflow-y-auto pr-1">
                            {runs.slice(1).map((r) => {
                              const struct = r.drop_reasons?._structured;
                              const builtLeads = struct?.built_leads || [];
                              return (
                                <div
                                  key={r.id}
                                  className="p-3.5 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-2"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        Run #{r.id}: {r.job_type}
                                      </span>
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-semibold font-mono">
                                        {r.status}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {r.trace_logs && r.trace_logs.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            appendTerminalLines([
                                              `--- Loaded Trace Logs from Run #${r.id} (${r.job_type}) ---`,
                                              ...(r.trace_logs || []),
                                            ])
                                          }
                                          className="text-[10px] font-mono px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                                        >
                                          Replay in Terminal
                                        </button>
                                      )}
                                      <span className="text-[11px] text-slate-400 font-mono">
                                        {new Date(r.started_at).toLocaleTimeString()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-xs text-slate-600 dark:text-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                                    <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/[0.04]">
                                      <div className="text-[10px] text-slate-400">Found</div>
                                      <div className="font-bold font-mono text-slate-800 dark:text-white">{r.count_found}</div>
                                    </div>
                                    <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/[0.04]">
                                      <div className="text-[10px] text-slate-400">Passed</div>
                                      <div className="font-bold font-mono text-slate-800 dark:text-white">{r.count_passed}</div>
                                    </div>
                                    <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/[0.04]">
                                      <div className="text-[10px] text-slate-400">Dropped</div>
                                      <div className="font-bold font-mono text-amber-600 dark:text-amber-400">{r.count_dropped}</div>
                                    </div>
                                    <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/[0.04]">
                                      <div className="text-[10px] text-slate-400">Duration</div>
                                      <div className="font-bold font-mono text-slate-800 dark:text-white">
                                        {r.finished_at
                                          ? `${Math.max(1, Math.round((new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000))}s`
                                          : "active"}
                                      </div>
                                    </div>
                                  </div>
                                  {builtLeads.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                      {builtLeads.map((bl) => (
                                        <button
                                          key={bl.id}
                                          type="button"
                                          onClick={() => setSelectedLeadId(bl.id)}
                                          className="text-[10px] font-mono px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 cursor-pointer"
                                        >
                                          {bl.name} ({bl.locality}) &rarr;
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Telegram Remote CLI Simulator Console (Compact self-start height) */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-3.5 self-start h-fit">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-indigo-500" />
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Telegram Remote CLI Console
                      </h3>
                    </div>
                    <form onSubmit={handleTelegramCmdSubmit} className="space-y-2">
                      <input
                        type="text"
                        value={telegramCmd}
                        onChange={(e) => setTelegramCmd(e.target.value)}
                        placeholder="Try: /stock, /sprint, /today, /refill..."
                        className="w-full bg-slate-50 dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Simulate Telegram Command
                      </button>
                    </form>

                    {telegramReply && (
                      <div className="p-3 rounded-xl bg-slate-950 text-emerald-400 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                        {telegramReply}
                      </div>
                    )}
                  </div>
                </div>

  );
}
