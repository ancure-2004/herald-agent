"use client";

import React from "react";
import { Sparkles, X } from "lucide-react";
import { useCRM } from "@/context/CRMContext";

export function AssistantDrawer() {
  const {
    assistantOpen,
    setAssistantOpen,
    assistantMode,
    setAssistantMode,
    assistantPrompt,
    setAssistantPrompt,
    assistantLoading,
    assistantHistory,
    handleAskDoSubmit,
    handleAssistantUndo,
    setSelectedLeadId,
  } = useCRM();

  return (
    <div className="fixed bottom-4 sm:bottom-5 right-4 sm:right-5 z-40 flex flex-col items-end gap-2">
      {assistantOpen && (
        <div className="w-[calc(100vw-2rem)] sm:w-[410px] max-h-[520px] rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 py-3 bg-slate-50 dark:bg-[#0F1117] border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-zinc-900 dark:text-white" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Ask &amp; Do CRM Copilot
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAssistantMode("ask")}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors ${
                  assistantMode === "ask"
                    ? "bg-zinc-900 text-white shadow-xs dark:bg-white dark:text-zinc-900"
                    : "bg-slate-200/70 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300"
                }`}
              >
                Ask (Query)
              </button>
              <button
                type="button"
                onClick={() => setAssistantMode("do")}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors ${
                  assistantMode === "do"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-200/70 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300"
                }`}
              >
                Do (Action + Undo)
              </button>
              <button
                type="button"
                onClick={() => setAssistantOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-3.5 flex-1 overflow-y-auto space-y-3 text-xs max-h-80">
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Hot South Delhi leads", mode: "ask" as const, q: "Show hot leads in South Delhi" },
                { label: "Snooze stale 2 days", mode: "do" as const, q: "Snooze stale leads for 2 days" },
                { label: "Confirm all promises", mode: "do" as const, q: "Confirm all pending commitments" },
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setAssistantMode(chip.mode);
                    setAssistantPrompt(chip.q);
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-[10px] text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {assistantHistory.length === 0 ? (
              <div className="py-6 text-center text-[11px] text-slate-400">
                Ask anything about your pipeline or switch to <strong>Do</strong> mode to bulk-move, snooze, or confirm tasks with 1-click Undo.
              </div>
            ) : (
              assistantHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] space-y-2"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono uppercase text-zinc-900 dark:text-white font-semibold">
                      {entry.mode}: {entry.prompt}
                    </span>
                    {entry.undo_available && !entry.undone && (
                      <button
                        type="button"
                        onClick={() => handleAssistantUndo(entry.undo_id, entry.id)}
                        className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 font-mono font-semibold cursor-pointer"
                      >
                        Undo 1-Click
                      </button>
                    )}
                    {entry.undone && (
                      <span className="text-emerald-500 font-mono">Reverted</span>
                    )}
                  </div>
                  <div className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {entry.reply}
                  </div>
                  {entry.matched_leads.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {entry.matched_leads.slice(0, 5).map((ml) => (
                        <button
                          key={ml.id}
                          type="button"
                          onClick={() => setSelectedLeadId(ml.id)}
                          className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/[0.08] text-zinc-800 dark:text-zinc-200 text-[10px] font-medium cursor-pointer"
                        >
                          {ml.name} ({ml.fit_score}%)
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <form
            onSubmit={handleAskDoSubmit}
            className="p-3 border-t border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#0F1117] flex items-center gap-2"
          >
            <input
              type="text"
              value={assistantPrompt}
              onChange={(e) => setAssistantPrompt(e.target.value)}
              placeholder={
                assistantMode === "ask"
                  ? "Ask e.g. Hot leads in South Delhi..."
                  : "Do e.g. Snooze stale leads for 2 days..."
              }
              className="flex-1 bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-all"
            />
            <button
              type="submit"
              disabled={assistantLoading}
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-100 text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {assistantLoading ? "..." : assistantMode === "ask" ? "Ask" : "Run"}
            </button>
          </form>
        </div>
      )}

      {/* Floating Ask Button (Bottom Right) */}
      <button
        type="button"
        onClick={() => setAssistantOpen(!assistantOpen)}
        className="px-4 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700/50 text-xs font-bold shadow-xl flex items-center gap-2 cursor-pointer transition-all active:scale-95"
      >
        <Sparkles className="w-4 h-4 text-emerald-400" />
        <span>Ask &amp; Do AI</span>
      </button>
    </div>
  );
}
