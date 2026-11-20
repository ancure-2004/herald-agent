"use client";

import React from "react";

interface ConfidencePillProps {
  score: number; // 0 - 100
}

export const ConfidencePill: React.FC<ConfidencePillProps> = ({ score }) => {
  const getLabel = () => {
    if (score >= 90) return "High";
    if (score >= 75) return "Good";
    if (score >= 50) return "Med";
    return "Low";
  };

  return (
    <div className="inline-flex items-center gap-2 font-mono text-xs tabular-nums select-none">
      <span className="font-bold text-zinc-800 dark:text-zinc-200">{score}%</span>
      <div className="w-12 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300 bg-zinc-900 dark:bg-zinc-100"
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-sans">{getLabel()}</span>
    </div>
  );
};
