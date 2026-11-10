"use client";

import React from "react";
import { DailyCapacityMetrics } from "../types";

interface StackedCapacityBarProps {
  metrics: DailyCapacityMetrics;
}

export const StackedCapacityBar: React.FC<StackedCapacityBarProps> = ({ metrics }) => {
  const total = metrics.totalDailyCap || 500;
  const warmupPct = (metrics.warmupSentToday / total) * 100;
  const campaignPct = (metrics.campaignSentToday / total) * 100;
  const inFlightPct = (metrics.inFlightScheduled / total) * 100;
  const headroomPct = Math.max(0, 100 - (warmupPct + campaignPct + inFlightPct));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-slate-400 font-sans">Pool Allocation Breakdown</span>
        <span className="text-slate-300 font-bold tabular-nums">
          {metrics.totalSentToday} / {total} Total
        </span>
      </div>

      {/* 10px Tall Stacked Bar */}
      <div className="w-full h-2.5 rounded-full bg-[#1C1E24] overflow-hidden flex border border-white/[0.08]">
        {/* Warmup Pool (Cyan) */}
        <div
          style={{ width: `${warmupPct}%` }}
          className="bg-cyan-500 h-full transition-all duration-300 hover:brightness-110"
          title={`Warmup: ${metrics.warmupSentToday} sends`}
        />
        {/* Campaign Pool (Indigo) */}
        <div
          style={{ width: `${campaignPct}%` }}
          className="bg-indigo-600 h-full transition-all duration-300 hover:brightness-110"
          title={`Campaign: ${metrics.campaignSentToday} sends`}
        />
        {/* Scheduled In-Flight (Sky Pulse) */}
        <div
          style={{ width: `${inFlightPct}%` }}
          className="bg-sky-400/70 h-full transition-all duration-300 animate-pulse hover:brightness-110"
          title={`In-Flight: ${metrics.inFlightScheduled} sends`}
        />
        {/* Headroom (Dark) */}
        <div
          style={{ width: `${headroomPct}%` }}
          className="h-full bg-transparent"
          title={`Safe Headroom: ${metrics.remainingSafeHeadroom} sends`}
        />
      </div>

      {/* Segment Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[10px] font-mono">
        <div className="flex items-center gap-1.5 text-cyan-400">
          <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0" />
          <span className="truncate">Warmup: {metrics.warmupSentToday}</span>
        </div>
        <div className="flex items-center gap-1.5 text-indigo-300">
          <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
          <span className="truncate">Campaign: {metrics.campaignSentToday}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sky-400">
          <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
          <span className="truncate">In-Flight: {metrics.inFlightScheduled}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="w-2 h-2 rounded-full bg-slate-700 shrink-0" />
          <span className="truncate">Headroom: {metrics.remainingSafeHeadroom}</span>
        </div>
      </div>
    </div>
  );
};
