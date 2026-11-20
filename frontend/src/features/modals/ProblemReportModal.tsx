"use client";

import React, { useState } from "react";
import { Bug } from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { apiFetch } from "@/lib/api/client";
import { Modal } from "@/components/ui/Modal";

export function ProblemReportModal() {
  const { problemModalOpen, setProblemModalOpen, activeHustleId, notify } = useCRM();

  const [problemText, setProblemText] = useState<string>("");
  const [problemBriefResult, setProblemBriefResult] = useState<string>("");

  if (!problemModalOpen) return null;

  const handleReportProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemText.trim()) return;

    try {
      const res = await apiFetch<{ brief: string }>("/api/diagnostics/capture-problem-brief", {
        method: "POST",
        body: JSON.stringify({
          hustle_id: activeHustleId,
          description: problemText.trim(),
        }),
      });
      setProblemBriefResult(res.brief);
      notify("Diagnostic brief captured! Ready for Antigravity IDE.");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to generate brief", "err");
    }
  };

  const handleClose = () => {
    setProblemBriefResult("");
    setProblemText("");
    setProblemModalOpen(false);
  };

  return (
    <Modal
      isOpen={problemModalOpen}
      onClose={handleClose}
      title="Capture Diagnostic Problem Brief"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {!problemBriefResult ? (
          <form onSubmit={handleReportProblem} className="space-y-3.5 text-xs">
            <p className="text-slate-600 dark:text-zinc-400">
              Describe what went wrong. The CRM will bundle recent run logs, failed gates, and telemetry into a structured Markdown brief ready for Antigravity IDE.
            </p>
            <textarea
              rows={4}
              required
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              placeholder="e.g. Run #14 failed on step 6: template preview HTTP 500 error on clinic xyz..."
              className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] rounded-xl p-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500 transition-all font-sans"
            />
            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={handleClose}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-zinc-300 font-medium cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-md shadow-rose-600/25 active:scale-[0.98] cursor-pointer transition-all"
              >
                Generate Diagnostic Brief
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3.5 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] max-h-60 overflow-y-auto whitespace-pre-wrap border border-slate-800">
              {problemBriefResult}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(problemBriefResult);
                notify("Copied diagnostic brief to clipboard!");
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer shadow-md shadow-indigo-600/25 transition-all"
            >
              Copy Brief to Clipboard
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
