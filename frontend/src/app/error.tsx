"use client";

import React, { useEffect } from "react";
import { AlertOctagon, RotateCcw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Personal OS CRM App Error:", error);
  }, [error]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#FAF9F6] dark:bg-[#0B0C10] text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.08] shadow-2xl text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
          <AlertOctagon className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Something went wrong</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            An unexpected error occurred while rendering the workspace. You can retry loading or inspect the console for details.
          </p>
        </div>

        {error.message && (
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.06] text-left">
            <span className="text-[11px] font-mono text-rose-600 dark:text-rose-400 break-words">
              {error.message}
            </span>
          </div>
        )}

        <button
          onClick={() => reset()}
          className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
      </div>
    </div>
  );
}
