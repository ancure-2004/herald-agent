import { AlertCircle, CheckCircle2 } from "lucide-react";

export interface ToastProps {
  toast: { type: "ok" | "err"; text: string } | null;
  onClose: () => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-in slide-in-from-bottom-5 duration-200 border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
      {toast.type === "ok" ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
      )}
      <span className="text-slate-800 dark:text-slate-200">{toast.text}</span>
      <button
        onClick={onClose}
        className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
      >
        ✕
      </button>
    </div>
  );
}
