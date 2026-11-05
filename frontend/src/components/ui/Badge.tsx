import React from "react";
import { cn } from "@/lib/utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "purple" | "indigo";
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const variantStyles = {
    default: "bg-slate-100 text-slate-800 dark:bg-white/[0.08] dark:text-slate-200 border border-slate-200/80 dark:border-white/[0.1]",
    success: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300/80 dark:border-emerald-800/60",
    warning: "bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300/80 dark:border-amber-800/60",
    danger: "bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300/80 dark:border-rose-800/60",
    purple: "bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-300/80 dark:border-purple-800/60",
    indigo: "bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-300/80 dark:border-indigo-800/60",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide whitespace-nowrap",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
