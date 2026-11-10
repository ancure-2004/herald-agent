"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, Calendar, X, Clock, Send, Sparkles, CheckCircle2 } from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { apiFetch } from "@/lib/api/client";

export function LogReplyModal() {
  const {
    logReplyModalOpen,
    setLogReplyModalOpen,
    logReplyLeadId,
    leads,
    loadAll,
    notify,
  } = useCRM();

  const [text, setText] = useState<string>("");
  const [timestamp, setTimestamp] = useState<string>("");
  const [channel, setChannel] = useState<string>("whatsapp");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [splitLines, setSplitLines] = useState<boolean>(true);

  const activeLead = leads.find((l) => l.id === logReplyLeadId);

  useEffect(() => {
    if (logReplyModalOpen) {
      // Default to current local time in ISO format YYYY-MM-DDTHH:mm
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setTimestamp(now.toISOString().slice(0, 16));
      setText("");
    }
  }, [logReplyModalOpen]);

  if (!logReplyModalOpen || !activeLead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      notify("Please enter reply message text", "err");
      return;
    }

    setSubmitting(true);
    try {
      const payload: { text: string; channel: string; created_at?: string } = {
        text: text.trim(),
        channel,
      };

      if (timestamp) {
        payload.created_at = new Date(timestamp).toISOString();
      }

      const res = await apiFetch<any>(`/api/leads/${activeLead.id}/messages/log-reply`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      notify(
        `Reply logged for ${activeLead.name}! Stage updated, follow-up cleared.`,
        "ok"
      );
      await loadAll();
      setLogReplyModalOpen(false);
    } catch (err: any) {
      notify(err.message || "Failed to log reply", "err");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Log Inbound Reply</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeLead.name} ({activeLead.doctor_name || "Doctor"})
              </p>
            </div>
          </div>
          <button
            onClick={() => setLogReplyModalOpen(false)}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Timestamp field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Reply Received At (Editable)
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Channel selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Channel
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setChannel("whatsapp")}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-2 ${
                  channel === "whatsapp"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                <span>WhatsApp Only (Dental Standard)</span>
              </button>
            </div>
          </div>

          {/* Multi-line message paste support */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Inbound Message Content (Supports Multi-line Paste)
              </label>
              <span className="text-[10px] text-slate-400">
                Pastes split line-by-line automatically
              </span>
            </div>
            <textarea
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste customer reply here...
e.g.
Yes, we saw the demo website!
Can we schedule a call on Tuesday at 4pm?"
              className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 resize-none leading-relaxed"
            />
          </div>

          {/* Action consequences notice */}
          <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-[11px] text-emerald-700 dark:text-emerald-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Automated Intelligence Actions:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[10px] text-emerald-600 dark:text-emerald-400/90 pl-1">
              <li>Marks lead as Replied in pipeline board</li>
              <li>Clears overdue "needs_followup" flag</li>
              <li>Triggers AI Copilot thread analysis & generates 3 instant reply suggestions</li>
            </ul>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setLogReplyModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !text.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
            >
              {submitting ? (
                <>Logging & Analyzing...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Log Reply & Run AI</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
