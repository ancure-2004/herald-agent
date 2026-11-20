"use client";

import React, { useState } from "react";
import { Select } from "@/components/ui/Select";
import { PhoneCall, Clock, X, CheckCircle2, Sparkles, AlertCircle } from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { apiFetch } from "@/lib/api/client";

export function LogCallModal() {
  const {
    logCallModalOpen,
    setLogCallModalOpen,
    logCallLeadId,
    leads,
    loadAll,
    notify,
  } = useCRM();

  const [rawText, setRawText] = useState<string>("");
  const [durationSeconds, setDurationSeconds] = useState<number>(120);
  const [outcome, setOutcome] = useState<string>("connected");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const activeLead = leads.find((l) => l.id === logCallLeadId);

  if (!logCallModalOpen || !activeLead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) {
      notify("Please enter the raw call transcript or notes", "err");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        raw_text: rawText.trim(),
        duration_seconds: Number(durationSeconds) || 0,
        outcome,
      };

      await apiFetch<any>(`/api/leads/${activeLead.id}/calls`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      notify(
        `Call logged for ${activeLead.name}! 5-section AI notes generated.`,
        "ok"
      );
      await loadAll();
      setRawText("");
      setLogCallModalOpen(false);
    } catch (err: any) {
      notify(err.message || "Failed to log call", "err");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-2xl p-6 space-y-5 text-slate-900 dark:text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#27272A]/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Log Call Conversation</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {activeLead.name} - {activeLead.doctor_name || "Doctor"} ({activeLead.primary_phone || "No phone"})
              </p>
            </div>
          </div>
          <button
            onClick={() => setLogCallModalOpen(false)}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Outcome & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Call Outcome
              </label>
              <Select
                value={outcome}
                onChange={(val) => setOutcome(val)}
                options={[
                  { value: "connected", label: "Connected / Spoke to Doctor" },
                  { value: "booked", label: "Meeting / Demo Booked" },
                  { value: "gatekeeper", label: "Receptionist / Gatekeeper" },
                  { value: "voicemail", label: "Voicemail / No Answer" },
                  { value: "not_interested", label: "Not Interested" },
                ]}
                className="w-full"
                triggerClassName="!py-2.5 !px-3 font-semibold text-slate-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Call Duration (seconds)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex gap-1">
                  {[60, 180, 300].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setDurationSeconds(sec)}
                      className="px-2 py-2 rounded-lg text-[10px] font-mono bg-slate-100 dark:bg-[#27272A] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-zinc-400"
                    >
                      {sec / 60}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Raw transcript */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Raw Call Conversation Transcript or Notes
              </label>
              <span className="text-[10px] text-slate-400">
                AI structures this into 5 distinct categories
              </span>
            </div>
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Spoke with Dr. Sharma. He liked the mobile responsiveness of the demo website.
His main concern was how Google reviews would sync with his Practo page.
He committed to reviewing the pricing package with his clinic partner by Thursday 5pm.
Next step is to send the WhatsApp PDF brochure and call back Friday morning."
              className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-mono bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-zinc-100 resize-none leading-relaxed"
            />
          </div>

          {/* AI Structuring Notice */}
          <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 text-[11px] text-indigo-700 dark:text-indigo-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Automatic 5-Section AI Structuring:</span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-indigo-600 dark:text-indigo-400/90 pl-1">
              <span>• Executive Call Summary</span>
              <span>• Lead Interests & Needs</span>
              <span>• Objections Raised</span>
              <span>• Specific Commitments Made</span>
              <span className="col-span-2">• Next Steps & Pre-Call Brief</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setLogCallModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !rawText.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
            >
              {submitting ? (
                <>Structuring Call with AI...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Log & Structure Call</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
