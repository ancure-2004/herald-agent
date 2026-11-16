"use client";

import React from "react";
import { Sparkles, X } from "lucide-react";
import { useCRM } from "@/context/CRMContext";

export function AssistantDrawer() {
  const {
    assistantOpen,
    setAssistantOpen,
    assistantPrompt,
    setAssistantPrompt,
    assistantLoading,
    assistantHistory,
    setAssistantHistory,
    handleAskDoSubmit,
    handleAssistantUndo,
    setSelectedLeadId,
    setActiveInboxLeadId,
    setActiveTab,
    loadAll,
    notify,
  } = useCRM();

  return (
    <div className="fixed bottom-4 sm:bottom-5 right-4 sm:right-5 z-40 flex flex-col items-end gap-2">
      {assistantOpen && (
        <div className="w-[calc(100vw-2rem)] sm:w-[560px] md:w-[620px] h-[640px] max-h-[85vh] rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 py-3 bg-slate-50 dark:bg-[#0F1117] border-b border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Ask &amp; Do Copilot
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Unified
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAssistantOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-3.5 flex-1 overflow-y-auto space-y-3 text-xs">
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Pipeline stats & stages", q: "How many leads do we have right now, and how many are in each stage?" },
                { label: "Hot South Delhi leads", q: "Show hot leads in South Delhi" },
                { label: "Move clinic to replied", q: "Move lead #3 to replied" },
                { label: "Draft follow-up message", q: "Draft a WhatsApp follow-up to lead #3 confirming our demo" },
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setAssistantPrompt(chip.q);
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-[10px] text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {assistantHistory.length === 0 ? (
              <div className="py-12 text-center text-[12px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                Ask questions about pipeline metrics, search leads with RAG retrieval, log calls, or execute actions with automated safety confirmations and 1-click Undo.
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

                  {/* Executed Action Badges */}
                  {entry.executed_actions && entry.executed_actions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {entry.executed_actions.map((act, idx) => {
                        let detailText = act.badge || act.tool;
                        if (!act.badge && act.result && typeof act.result === "object") {
                          if (act.tool === "query_crm_stats" && "total_active_leads" in act.result) {
                            detailText = `Total ${act.result.total_active_leads} leads`;
                          } else if (act.tool === "search_leads" && Array.isArray(act.result)) {
                            detailText = `Found ${act.result.length} leads`;
                          }
                        }
                        return (
                          <span
                            key={idx}
                            title={typeof act.result === "object" ? JSON.stringify(act.result) : String(act.result || "")}
                            className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-semibold"
                          >
                            ✓ {detailText}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Confirmation Gate for External Sends */}
                  {entry.pending_confirmation && entry.pending_confirmation.length > 0 && (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 space-y-2 mt-1">
                      {entry.pending_confirmation.map((pc, idx) => (
                        <div key={idx} className="space-y-1.5 text-xs">
                          <div className="font-semibold text-amber-800 dark:text-amber-200 flex items-center justify-between">
                            <span>Confirm External {pc.channel.toUpperCase()} Send</span>
                            <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">Target: {pc.lead_name} (#{pc.lead_id})</span>
                          </div>
                          <div className="p-2 rounded bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-900 text-slate-700 dark:text-slate-300 font-mono text-[11px] whitespace-pre-wrap">
                            "{pc.draft_text}"
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  notify(`Sending ${pc.channel.toUpperCase()} message to ${pc.lead_name}...`);
                                  const res = await fetch("/api/assistant/ask-do", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      mode: "do",
                                      prompt: `Send message to lead #${pc.lead_id}: ${pc.draft_text}`,
                                      confirmed: true,
                                    }),
                                  });
                                  const data = await res.json();
                                  // Update history entry with confirmation
                                  setAssistantHistory((prev: any[]) =>
                                    prev.map((item: any) =>
                                      item.id === entry.id
                                        ? {
                                            ...item,
                                            pending_confirmation: [],
                                            reply: data.reply || `Message successfully sent to ${pc.lead_name} via ${pc.channel.toUpperCase()}.`,
                                            executed_actions: [...(item.executed_actions || []), ...(data.executed_actions || [{ tool: "send_message", badge: `Sent ${pc.channel.toUpperCase()}` }])],
                                          }
                                        : item
                                    )
                                  );
                                  notify(`Message sent to ${pc.lead_name}!`);
                                  // Refresh CRM data, select clinic and switch tab to WhatsApp Inbox
                                  loadAll();
                                  setSelectedLeadId(pc.lead_id);
                                  setActiveInboxLeadId(pc.lead_id);
                                  setActiveTab("inbox");
                                } catch (e) {
                                  notify("Failed to confirm message send", "err");
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer transition-colors shadow-xs"
                            >
                              Confirm &amp; Send
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAssistantHistory((prev: any[]) =>
                                  prev.map((item: any) =>
                                    item.id === entry.id
                                      ? {
                                          ...item,
                                          pending_confirmation: [],
                                          reply: `${item.reply}\n\n[Message to ${pc.lead_name} cancelled by user]`,
                                        }
                                      : item
                                  )
                                );
                                notify(`Outbound send to ${pc.lead_name} cancelled.`);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold cursor-pointer transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* RAG Source Citations */}
                  {entry.citations && entry.citations.length > 0 && (
                    <div className="pt-1.5 border-t border-slate-200/50 dark:border-white/[0.04] space-y-1">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        Sources &amp; Citations:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {entry.citations.map((c, idx) => (
                          <span
                            key={idx}
                            title={c.snippet}
                            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-[9px] font-mono text-slate-500 dark:text-slate-400"
                          >
                            [{c.doc_type} #{c.lead_id}]
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
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
              placeholder="Ask anything or run any action (e.g. 'How many leads in each stage?', 'Move lead #3 to replied')..."
              className="flex-1 bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-all"
            />
            <button
              type="submit"
              disabled={assistantLoading}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-100 text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {assistantLoading ? "..." : "Send"}
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
