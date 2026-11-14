"use client";

import React from "react";

interface ConfidencePillProps {
  score: number; // 0 - 100
}

export const ConfidencePill: React.FC<ConfidencePillProps> = ({ score }) => {
  const getColor = () => {
    if (score >= 90) return { text: "text-emerald-700 dark:text-emerald-400", bar: "bg-emerald-500", label: "High" };
    if (score >= 70) return { text: "text-sky-700 dark:text-sky-400", bar: "bg-sky-500", label: "Good" };
    if (score >= 50) return { text: "text-amber-700 dark:text-amber-400", bar: "bg-amber-500", label: "Med" };
    return { text: "text-rose-700 dark:text-rose-400", bar: "bg-rose-500", label: "Low" };
  };

  const style = getColor();

  return (
    <div className="inline-flex items-center gap-2 font-mono text-[11px] tabular-nums">
      <span className={`font-semibold ${style.text}`}>{score}%</span>
      <div className="w-12 h-1.5 bg-slate-200 dark:bg-white/[0.08] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${style.bar}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">{style.label}</span>
    </div>
  );
};
