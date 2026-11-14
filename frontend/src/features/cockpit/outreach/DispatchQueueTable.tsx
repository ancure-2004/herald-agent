"use client";

import React, { useState, useEffect } from "react";
import { QueueItem, QueueItemStatus } from "../types";
import {
  Clock,
  Send,
  Loader2,
  AlertOctagon,
  CheckCheck,
  Pause,
  AlertTriangle,
  ExternalLink,
  Mail,
  Zap,
} from "lucide-react";

interface DispatchQueueTableProps {
  items: QueueItem[];
  onSendNow?: (id: string) => void;
}

export const DispatchQueueTable: React.FC<DispatchQueueTableProps> = ({
  items,
  onSendNow,
}) => {
  // Live Countdown Ticker
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (targetTimeStr: string, status: QueueItemStatus) => {
    if (status === "sent") return "Delivered";
    if (status === "sending") return "In Dispatch...";
    if (status === "paused") return "Paused";
    if (status === "throttled") return "Throttled (Backoff)";

    const target = new Date(targetTimeStr).getTime();
    const diffSec = Math.max(0, Math.floor((target - now) / 1000));

    if (diffSec === 0) return "Due Now";
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return `In ${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  const isNearSend = (targetTimeStr: string, status: QueueItemStatus) => {
    if (status !== "scheduled" && status !== "sending") return false;
    const target = new Date(targetTimeStr).getTime();
    const diffSec = Math.floor((target - now) / 1000);
    return diffSec > 0 && diffSec <= 60;
  };

  const renderStatusBadge = (status: QueueItemStatus) => {
    switch (status) {
      case "sending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
            <span>Sending</span>
          </span>
        );
      case "scheduled":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-zinc-800/60 text-zinc-300 border border-white/[0.08]">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Scheduled</span>
          </span>
        );
      case "throttled":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertOctagon className="w-3 h-3 text-amber-400" />
            <span>Throttled</span>
          </span>
        );
      case "paused":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-white/[0.05] text-slate-400 border border-white/[0.08]">
            <Pause className="w-3 h-3" />
            <span>Paused</span>
          </span>
        );
      case "sent":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCheck className="w-3 h-3 text-emerald-400" />
            <span>Sent</span>
          </span>
        );
      case "failed":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>Failed</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full overflow-x-auto rounded-md border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#111215] shadow-sm">
      <table className="w-full text-left text-xs border-collapse font-sans">
        <thead>
          <tr className="h-10 bg-slate-50 dark:bg-[#17181D] border-b border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 font-medium select-none text-[11px]">
            <th className="px-4 py-2 min-w-[200px]">Lead &amp; Company</th>
            <th className="px-3 py-2 min-w-[150px]">Sequence Step</th>
            <th className="px-3 py-2 min-w-[160px]">Time-to-Send</th>
            <th className="px-3 py-2 min-w-[160px]">Sending Mailbox</th>
            <th className="px-3 py-2 min-w-[120px]">Status</th>
            <th className="px-4 py-2 min-w-[120px] text-right">Instant Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
          {items.map((item) => {
            const isUrgent = isNearSend(item.scheduledSendTime, item.status);
            const countdownText = formatCountdown(item.scheduledSendTime, item.status);

            return (
              <tr
                key={item.id}
                className="h-[44px] hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors group"
              >
                {/* Lead Name & Company */}
                <td className="px-4 py-2">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                    {item.leadName}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                    {item.companyName}
                  </div>
                </td>

                {/* Sequence Step */}
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-[10px] font-bold">
                      Step {item.sequenceStep}/{item.totalSequenceSteps}
                    </span>
                    <span className="text-[11px] text-slate-400 truncate max-w-[100px]" title={item.stepTitle}>
                      {item.stepTitle}
                    </span>
                  </div>
                </td>

                {/* Time-to-Send / Countdown */}
                <td className="px-3 py-2 font-mono text-[11px] tabular-nums">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-semibold ${
                        isUrgent
                          ? "text-sky-400 animate-pulse"
                          : item.status === "sent"
                          ? "text-emerald-400"
                          : "text-slate-300"
                      }`}
                    >
                      {countdownText}
                    </span>
                    <span className="text-[10px] text-slate-500 font-sans">
                      ({item.prospectTimezone.split("/")[1] || "IST"})
                    </span>
                  </div>
                </td>

                {/* Sending Mailbox */}
                <td className="px-3 py-2 font-mono text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{item.sendingMailboxEmail}</span>
                  </div>
                </td>

                {/* Status Badge */}
                <td className="px-3 py-2">{renderStatusBadge(item.status)}</td>

                {/* Instant Send Action */}
                <td className="px-4 py-2 text-right">
                  {item.status !== "sent" ? (
                    <button
                      onClick={() => onSendNow?.(item.id)}
                      className="px-2.5 py-1 rounded bg-white/[0.05] hover:bg-indigo-600 text-slate-300 hover:text-white font-mono text-[10px] font-medium transition-colors inline-flex items-center gap-1"
                      title="Bypass countdown and send immediately"
                    >
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>Send Now</span>
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono text-emerald-400">Delivered</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
