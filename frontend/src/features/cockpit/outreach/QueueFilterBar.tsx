import React from "react";
import { QueueItemStatus } from "../types";
import { RotateCcw, Play, Square, Loader2 } from "lucide-react";

interface QueueFilterBarProps {
  filter: "ALL" | QueueItemStatus;
  setFilter: (f: "ALL" | QueueItemStatus) => void;
  counts: {
    all: number;
    scheduled: number;
    sending: number;
    throttled: number;
    sent: number;
  };
  isSyncing: boolean;
  isWaRunning: boolean;
  onRefresh: () => void;
  onStartWa: () => void;
  onStopWa: () => void;
}

export const QueueFilterBar: React.FC<QueueFilterBarProps> = ({
  filter,
  setFilter,
  counts,
  isSyncing,
  isWaRunning,
  onRefresh,
  onStartWa,
  onStopWa,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
        <button
          onClick={() => setFilter("ALL")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
            filter === "ALL"
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          All Items ({counts.all})
        </button>

        <button
          onClick={() => setFilter("scheduled")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
            filter === "scheduled"
              ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          Scheduled ({counts.scheduled})
        </button>

        <button
          onClick={() => setFilter("sending")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
            filter === "sending"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          Sending ({counts.sending})
        </button>

        <button
          onClick={() => setFilter("throttled")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
            filter === "throttled"
              ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          Throttled ({counts.throttled})
        </button>

        <button
          onClick={() => setFilter("sent")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
            filter === "sent"
              ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          Sent ({counts.sent})
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          title="Refresh Queue from Database"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
        </button>

        {isWaRunning && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>WA Automation Running</span>
          </div>
        )}

        {isWaRunning ? (
          <button
            onClick={onStopWa}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors cursor-pointer active:scale-95"
          >
            <Square className="w-3.5 h-3.5 fill-white" />
            <span>Stop WA Automation</span>
          </button>
        ) : (
          <button
            onClick={onStartWa}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors cursor-pointer active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Start WA Automation</span>
          </button>
        )}
      </div>
    </div>
  );
};
