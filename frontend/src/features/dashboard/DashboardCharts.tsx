"use client";

import React, { useState, useMemo } from "react";
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  Layers,
} from "lucide-react";
import { CRMTab } from "@/context/CRMContext";

interface DashboardChartsProps {
  leads: any[];
  setActiveTab: (tab: CRMTab) => void;
}

export function DashboardCharts({ leads, setActiveTab }: DashboardChartsProps) {
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const totalClinics = leads.length;

  // Mock 30-Day Outreach Activity Timeline (Area + Bar Combo)
  const chartPoints = useMemo(() => {
    const totalDays = 28;
    const realSentByDay: Record<string, number> = {};
    const realViewsByDay: Record<string, number> = {};

    leads.forEach((l) => {
      l.messages?.forEach((m: any) => {
        if (m.direction === "outbound" && m.created_at) {
          const d = new Date(m.created_at);
          const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
          realSentByDay[key] = (realSentByDay[key] || 0) + 1;
        }
      });
      l.events?.forEach((e: any) => {
        if (e.created_at) {
          const d = new Date(e.created_at);
          const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
          realViewsByDay[key] = (realViewsByDay[key] || 0) + 1;
        }
      });
    });

    const pts = [];
    for (let i = 0; i < totalDays; i++) {
      const dayDate = new Date(now);
      dayDate.setDate(now.getDate() - (totalDays - 1 - i));
      const mName = dayDate.toLocaleString("en-US", { month: "short" });
      const dayNum = dayDate.getDate();
      const dateKey = `${dayDate.getFullYear()}-${dayDate.getMonth() + 1}-${dayNum}`;

      const pseudoSent = Math.round(12 + Math.sin(i * 0.7) * 7 + (i % 3) * 2);
      const pseudoViews = Math.round(8 + Math.cos(i * 0.6) * 5 + (i % 4) * 2);

      const actualSent = realSentByDay[dateKey] || 0;
      const actualViews = realViewsByDay[dateKey] || 0;

      pts.push({
        day: `${mName} ${dayNum}`,
        sent: Math.min(29, pseudoSent + actualSent),
        views: Math.min(26, pseudoViews + actualViews),
      });
    }
    return pts;
  }, [now, leads]);

  const [hoveredDayIndex, setHoveredDayIndex] = useState<number>(27);

  // Percentage-based SVG curve path for Demo Views (viewBox 0 0 100 100)
  const linePathPct = useMemo(() => {
    let d = "";
    const totalDays = chartPoints.length;
    chartPoints.forEach((pt, i) => {
      const x = ((i + 0.5) / totalDays) * 100;
      const y = 100 - (pt.views / 30) * 100;
      if (i === 0) {
        d += `M ${x} ${y}`;
      } else {
        const prev = chartPoints[i - 1];
        const prevX = ((i - 1 + 0.5) / totalDays) * 100;
        const prevY = 100 - (prev.views / 30) * 100;
        const cp1x = prevX + (x - prevX) / 2;
        const cp1y = prevY;
        const cp2x = prevX + (x - prevX) / 2;
        const cp2y = y;
        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y}`;
      }
    });
    return d;
  }, [chartPoints]);

  const activePoint = chartPoints[hoveredDayIndex] || chartPoints[chartPoints.length - 1];

  // Clinics by Stage (Donut Chart breakdown)
  const stageStats = useMemo(() => {
    const total = leads.length || 1;
    const s1 = leads.filter((l) => l.stage_id <= 2).length;
    const s2 = leads.filter((l) => l.stage_id === 3 || l.stage_id === 4).length;
    const s3 = leads.filter((l) => l.stage_id === 5).length;
    const s4 = leads.filter((l) => l.stage_id >= 6).length;

    const p1 = Math.round((s1 / total) * 100);
    const p2 = Math.round((s2 / total) * 100);
    const p3 = Math.round((s3 / total) * 100);
    const p4 = Math.max(0, 100 - (p1 + p2 + p3));

    return [
      {
        label: "New / Scraped",
        count: s1,
        pct: p1,
        color: "#111827",
        strokeClass: "stroke-slate-900 dark:stroke-[#F4F4F5]",
        dotClass: "bg-slate-900 dark:bg-[#F4F4F5]",
      },
      {
        label: "Contacted",
        count: s2,
        pct: p2,
        color: "#4B5563",
        strokeClass: "stroke-slate-600 dark:stroke-[#A1A1AA]",
        dotClass: "bg-slate-600 dark:bg-[#A1A1AA]",
      },
      {
        label: "Demo Viewed",
        count: s3,
        pct: p3,
        color: "#9CA3AF",
        strokeClass: "stroke-slate-400 dark:stroke-[#71717A]",
        dotClass: "bg-slate-400 dark:bg-[#71717A]",
      },
      {
        label: "Won / Closed",
        count: s4,
        pct: p4,
        color: "#10B981",
        strokeClass: "stroke-emerald-600 dark:stroke-[#10B981]",
        dotClass: "bg-emerald-600 dark:bg-[#10B981]",
      },
    ];
  }, [leads]);

  const donutR = 58;
  const donutCircumference = 2 * Math.PI * donutR;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[472px] lg:min-h-[242px]">
      {/* Left Combo Chart (8 Cols) */}
      <div className="lg:col-span-8 p-3 sm:p-3.5 rounded-2xl bg-[#1C1D1F] text-white border border-[#2A2B2E] shadow-sm space-y-2 flex flex-col justify-between h-[226px] sm:h-[242px]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-white/80" />
              <h2 className="text-xs font-bold text-white tracking-tight">
                Outreach &amp; Demo Activity
              </h2>
            </div>
            <p className="text-[10px] text-white/60">
              WhatsApp outreach sent and live doctor demo views over time.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                <span className="text-white/80 font-medium text-[9px]">Demo Views</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3B63FB]" />
                <span className="text-white/80 font-medium text-[9px]">Messages Sent</span>
              </div>
            </div>

            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/10 text-[9px] font-semibold text-white/90 border border-white/10">
              <span>Last 30 days</span>
              <ChevronDown className="w-2.5 h-2.5 text-white/60" />
            </div>
          </div>
        </div>

        {/* Full-Width Responsive Plot Container */}
        <div className="relative flex flex-col justify-between h-36 sm:h-40 select-none">
          <div className="flex items-stretch gap-2 flex-1 relative min-h-0">
            {/* Left Y-axis labels */}
            <div className="flex flex-col justify-between text-[8px] text-white/40 font-mono text-right w-4 shrink-0 pb-1">
              <span>30</span>
              <span>20</span>
              <span>10</span>
              <span>0</span>
            </div>

            {/* Full-Width Grid & Bars Container */}
            <div className="flex-1 relative min-w-0">
              {/* Horizontal Dashed Grid Guidelines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-1">
                <div className="w-full border-b border-dashed border-white/10" />
                <div className="w-full border-b border-dashed border-white/10" />
                <div className="w-full border-b border-dashed border-white/10" />
                <div className="w-full border-b border-dashed border-white/10" />
              </div>

              {/* Vertical Bars */}
              <div className="absolute inset-0 flex items-end justify-between gap-1 sm:gap-1.5 px-0.5 pb-1 z-0">
                {chartPoints.map((pt, i) => {
                  const isHovered = i === hoveredDayIndex;
                  const barHeightPct = Math.max(3, (pt.sent / 30) * 100);
                  return (
                    <div
                      key={i}
                      onMouseEnter={() => setHoveredDayIndex(i)}
                      className="flex-1 flex flex-col items-center justify-end h-full cursor-pointer group"
                    >
                      <div
                        className={`w-full max-w-[13px] rounded-t-[3px] transition-colors ${
                          isHovered
                            ? "bg-white"
                            : "bg-white/20 group-hover:bg-white/35"
                        }`}
                        style={{ height: `${barHeightPct}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* SVG Overlay for Smooth Bezier Curve Line */}
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10 pb-1"
              >
                <path
                  d={linePathPct}
                  fill="none"
                  stroke="#60A5FA"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                  className="opacity-90"
                />
              </svg>

              {/* Point Circles on Line */}
              <div className="absolute inset-0 pointer-events-none z-10 pb-1">
                {chartPoints.map((pt, i) => {
                  const isHovered = i === hoveredDayIndex;
                  const leftPct = ((i + 0.5) / chartPoints.length) * 100;
                  const bottomPct = (pt.views / 30) * 100;
                  return (
                    <div
                      key={i}
                      className="absolute -translate-x-1/2 translate-y-1/2 transition-transform pointer-events-none"
                      style={{
                        left: `${leftPct}%`,
                        bottom: `${bottomPct}%`,
                      }}
                    >
                      <div
                        className={`rounded-full transition-all ${
                          isHovered
                            ? "w-2.5 h-2.5 bg-[#3B63FB] ring-2 ring-white"
                            : "w-1.5 h-1.5 bg-white ring-1 ring-[#1C1D1F]"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Floating Tooltip Card */}
              {activePoint && (
                <div
                  className="absolute z-20 pointer-events-none transition-all duration-150 -translate-x-1/2 -translate-y-full"
                  style={{
                    left: `${Math.max(6, Math.min(94, ((hoveredDayIndex + 0.5) / chartPoints.length) * 100))}%`,
                    top: `${Math.max(0, 100 - (activePoint.views / 30) * 100 - 12)}%`,
                  }}
                >
                  <div className="bg-[#242528] border border-white/15 text-white shadow-xl rounded-lg px-2 py-1.5 min-w-[76px]">
                    <div className="text-[8px] font-bold text-white leading-tight">
                      {activePoint.day}, {currentYear}
                    </div>
                    <div className="flex items-center gap-1.5 text-[8px] text-white/70 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      <span>
                        Views:{" "}
                        <strong className="text-white font-mono">
                          {activePoint.views}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[8px] text-white/70">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3B63FB]" />
                      <span>
                        Sent:{" "}
                        <strong className="text-white font-mono">
                          {activePoint.sent}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom X-axis Date Labels */}
          <div className="flex justify-between pl-6 pr-1 pt-1 text-[8px] text-white/40 font-mono">
            {chartPoints
              .filter((_, i) => i % 5 === 0 || i === chartPoints.length - 1)
              .map((pt, i) => (
                <span key={i}>{pt.day}</span>
              ))}
          </div>
        </div>
      </div>

      {/* Right Donut Chart: Clinics by Stage (4 Cols) */}
      <div className="lg:col-span-4 p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-white/[0.08] shadow-xs flex flex-col justify-between space-y-2 h-[226px] sm:h-[242px]">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-700 dark:text-zinc-300" />
              <h2 className="text-xs font-bold text-[#111827] dark:text-white">
                Clinics by Stage
              </h2>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500">
              Overview of dental clinics across pipeline stages.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab("board")}
            className="text-[10px] font-semibold text-slate-600 dark:text-zinc-300 hover:text-[#111827] dark:hover:text-white hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
          >
            <span>View full board</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </button>
        </div>

        {/* Visual: Donut + Right Legend */}
        <div className="flex items-center justify-between gap-4 my-auto py-1">
          <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
              <circle
                cx={70}
                cy={70}
                r={donutR}
                fill="none"
                stroke="currentColor"
                strokeWidth={9}
                className="text-slate-100 dark:text-zinc-800"
              />
              {(() => {
                let accumulated = 0;
                return stageStats.map((st, i) => {
                  const strokeLen = (st.pct / 100) * donutCircumference;
                  accumulated += strokeLen;
                  return (
                    <circle
                      key={i}
                      cx={70}
                      cy={70}
                      r={donutR}
                      fill="none"
                      strokeWidth={9}
                      strokeDasharray={`${strokeLen} ${donutCircumference}`}
                      strokeDashoffset={-accumulated + strokeLen}
                      strokeLinecap="butt"
                      className={`transition-all duration-500 ${st.strokeClass}`}
                    />
                  );
                });
              })()}
            </svg>

            {/* Center Donut Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
              <span className="text-2xl font-black text-[#111827] dark:text-white font-mono leading-none">
                {totalClinics}
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                Clinics
              </span>
            </div>
          </div>

          {/* Right Legend Breakdown */}
          <div className="space-y-1.5 flex-1 min-w-0">
            {stageStats.map((st, i) => (
              <div key={i} className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dotClass}`}
                  />
                  <span className="text-slate-600 dark:text-zinc-300 font-medium truncate">
                    {st.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                  <span className="font-bold text-slate-900 dark:text-white">{st.count}</span>
                  <span className="text-slate-400 w-6 text-right text-[9px]">{st.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
