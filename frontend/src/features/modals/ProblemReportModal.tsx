"use client";

import React, { useState } from "react";
import { Bug, X } from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { apiFetch } from "@/lib/api/client";

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
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.12] rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug className="w-4 h-4 text-rose-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Capture Diagnostic Problem Brief</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!problemBriefResult ? (
          <form onSubmit={handleReportProblem} className="space-y-3 text-xs">
            <p className="text-slate-600 dark:text-slate-400">
              Describe what went wrong. The CRM will bundle recent run logs, failed gates, and telemetry into a structured Markdown brief ready for Antigravity IDE.
            </p>
            <textarea
              rows={4}
              required
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              placeholder="e.g. Run #14 failed on step 6: template preview HTTP 500 error on clinic xyz..."
              className="w-full bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl p-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-md shadow-rose-600/30 cursor-pointer"
              >
                Generate Diagnostic Brief
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] max-h-60 overflow-y-auto whitespace-pre-wrap">
              {problemBriefResult}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(problemBriefResult);
                notify("Copied diagnostic brief to clipboard!");
              }}
              className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
            >
              Copy Brief to Clipboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
