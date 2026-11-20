import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "6xl";
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
  maxWidth = "2xl",
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "4xl": "max-w-4xl",
    "6xl": "max-w-6xl",
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex min-h-[100dvh] items-center justify-center p-3 sm:p-4 text-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity animate-in fade-in duration-200 cursor-pointer"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Dialog panel */}
        <div
          className={cn(
            "relative transform overflow-hidden rounded-3xl bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-white/[0.12] text-left shadow-2xl transition-all my-6 w-full max-h-[90vh] flex flex-col p-5 sm:p-6 animate-in zoom-in-95 duration-200",
            maxWidthStyles[maxWidth],
            className
          )}
        >
          {title && (
            <div className="flex items-center justify-between pb-3 sm:pb-4 mb-4 border-b border-slate-100 dark:border-white/[0.08] shrink-0">
              <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {title}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto min-h-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
