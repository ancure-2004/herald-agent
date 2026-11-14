"use client";

import React from "react";

interface RadialQuotaGaugeProps {
  sent: number;
  total: number;
  size?: number;
}

export const RadialQuotaGauge: React.FC<RadialQuotaGaugeProps> = ({
  sent,
  total,
  size = 110,
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((sent / (total || 1)) * 100)));
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage >= 100) return { stroke: "#EF4444", text: "text-rose-400" };
    if (percentage >= 90) return { stroke: "#F59E0B", text: "text-amber-400" };
    if (percentage >= 75) return { stroke: "#06B6D4", text: "text-sky-400" };
    return { stroke: "#10B981", text: "text-emerald-400" };
  };

  const style = getColor();

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Active Progress Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={style.stroke}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-base font-black text-white tracking-tight tabular-nums">
            {sent}
          </span>
          <span className="font-mono text-[10px] text-slate-400 tabular-nums">
            / {total}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
          Daily Send Quota
        </div>
        <div className={`text-sm font-bold font-mono tabular-nums ${style.text}`}>
          {percentage}% Utilized
        </div>
        <div className="text-[11px] text-slate-400">
          {total - sent > 0 ? `${total - sent} sends remaining` : "Daily ceiling reached"}
        </div>
      </div>
    </div>
  );
};
