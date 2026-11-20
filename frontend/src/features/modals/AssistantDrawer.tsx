"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Sparkles } from "lucide-react";
import { useCRM } from "@/context/CRMContext";

const AssistantChatDrawer = dynamic(
  () => import("./AssistantChatDrawer").then((mod) => mod.AssistantChatDrawer),
  {
    ssr: false,
    loading: () => (
      <div className="w-[calc(100vw-2rem)] sm:w-[560px] md:w-[620px] h-[640px] max-h-[85vh] rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-white/[0.08] shadow-2xl flex items-center justify-center animate-pulse">
        <span className="text-xs font-mono text-slate-400">Loading Assistant...</span>
      </div>
    ),
  }
);

export function AssistantDrawer() {
  const { assistantOpen, setAssistantOpen } = useCRM();

  return (
    <div className="fixed bottom-4 sm:bottom-5 right-4 sm:right-5 z-40 flex flex-col items-end gap-2">
      {assistantOpen && <AssistantChatDrawer />}

      {/* Floating Ask Button (Bottom Right) */}
      <button
        type="button"
        onClick={() => setAssistantOpen(!assistantOpen)}
        className="px-4 py-2.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700/50 text-xs font-bold shadow-xl flex items-center gap-2 cursor-pointer transition-all active:scale-95"
      >
        <Sparkles className="w-4 h-4 text-emerald-400" />
        <span>Ask &amp; Do AI</span>
      </button>
    </div>
  );
}
