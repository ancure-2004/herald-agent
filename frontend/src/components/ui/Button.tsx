import React from "react";
import { cn } from "@/lib/utils/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading = false, disabled, children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

    const variantStyles = {
      primary: "bg-indigo-600 hover:bg-indigo-500 text-white focus:ring-indigo-500 shadow-sm shadow-indigo-600/20 active:scale-[0.98]",
      secondary: "bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] dark:text-slate-100 border border-transparent dark:border-white/[0.08]",
      outline: "border border-slate-300 dark:border-white/[0.1] hover:bg-slate-50 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-200",
      ghost: "hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300",
      danger: "bg-rose-600 hover:bg-rose-500 text-white focus:ring-rose-500 shadow-sm active:scale-[0.98]",
    };

    const sizeStyles = {
      sm: "px-3 py-1.5 text-xs min-h-[34px]",
      md: "px-4 py-2 text-sm min-h-[40px]",
      lg: "px-5 py-2.5 text-base min-h-[46px]",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
