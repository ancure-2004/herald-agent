import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export interface ToastProps {
  toast: { type: "ok" | "err"; text: string } | null;
  onClose: () => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl text-xs sm:text-sm font-semibold animate-in slide-in-from-bottom-5 duration-200 border bg-white dark:bg-[#141721] border-slate-200/80 dark:border-white/[0.12] backdrop-blur-md">
      {toast.type === "ok" ? (
        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 shrink-0" />
      )}
      <span className="text-slate-800 dark:text-slate-200">{toast.text}</span>
      <button
        onClick={onClose}
        aria-label="Dismiss notification"
        className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold p-1 cursor-pointer"
      >
        ✕
      </button>
    </div>
  );
}
