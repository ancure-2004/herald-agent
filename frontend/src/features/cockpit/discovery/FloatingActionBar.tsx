"use client";

import React from "react";
import { Sparkles, ShieldCheck, Layers, Send, X } from "lucide-react";

interface FloatingActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onEnrichSelected?: () => void;
  onVerifyEmails?: () => void;
  onGenerateDemos?: () => void;
  onPushToOutreach?: () => void;
}

export const FloatingActionBar: React.FC<FloatingActionBarProps> = ({
  selectedCount,
  onClearSelection,
  onEnrichSelected,
  onVerifyEmails,
  onGenerateDemos,
  onPushToOutreach,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#111215]/95 backdrop-blur-md border border-white/[0.12] rounded-full px-4 py-2 flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-150">
      <div className="flex items-center gap-2 pr-3 border-r border-white/[0.1]">
        <span className="w-5 h-5 rounded-full bg-indigo-500 text-white font-mono text-[11px] font-bold flex items-center justify-center">
          {selectedCount}
        </span>
        <span className="text-xs font-medium text-slate-200">
          Selected
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onEnrichSelected}
          className="px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Enrich Lead</span>
        </button>

        <button
          onClick={onVerifyEmails}
          className="px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Verify SMTP</span>
        </button>

        <button
          onClick={onGenerateDemos}
          className="px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Generate Demos</span>
        </button>

        <button
          onClick={onPushToOutreach}
          className="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Push to Queue</span>
        </button>
      </div>

      <button
        onClick={onClearSelection}
        className="ml-1 p-1 rounded-full hover:bg-white/[0.1] text-slate-400 hover:text-white transition-colors"
        title="Deselect (Esc)"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
