"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { PreviewConfig } from "../types";
import { ExternalLink, Zap, ShieldCheck } from "lucide-react";

interface EphemeralPreviewLinkProps {
  preview: PreviewConfig;
  clinicName: string;
  onOpenDrawer?: () => void;
}

interface Coords {
  top: number;
  left: number;
  placement: "top" | "bottom";
}

export const EphemeralPreviewLink: React.FC<EphemeralPreviewLinkProps> = ({
  preview,
  clinicName,
  onOpenDrawer,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);

  const triggerRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Client-side hydration guard for createPortal
  useEffect(() => {
    setMounted(true);
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const cardHeight = 310;
    const cardWidth = 288; // w-72 = 18rem = 288px
    const margin = 8;
    const padding = 16;

    // Determine placement: prefer top if space allows; otherwise place bottom
    const showBelow = rect.top < cardHeight + margin && (window.innerHeight - rect.bottom) > rect.top;
    const top = showBelow ? rect.bottom + margin : rect.top - margin;
    const placement: "top" | "bottom" = showBelow ? "bottom" : "top";

    // Center horizontally on trigger button with boundary clamping
    let left = rect.left + rect.width / 2;
    const halfWidth = cardWidth / 2;
    if (left - halfWidth < padding) {
      left = halfWidth + padding;
    } else if (left + halfWidth > window.innerWidth - padding) {
      left = window.innerWidth - halfWidth - padding;
    }

    setCoords({ top, left, placement });
  }, []);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    updatePosition();
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 180);
  };

  // Keep popover coordinates synchronized on scroll or resize while open
  useEffect(() => {
    if (!isHovered) return;
    const handleScrollOrResize = () => {
      updatePosition();
    };
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isHovered, updatePosition]);

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={onOpenDrawer}
        className="bg-slate-50 hover:bg-zinc-900 hover:text-white text-zinc-700 border border-slate-200/80 rounded-lg px-2.5 py-1 text-xs font-mono transition-colors inline-flex items-center gap-1.5 cursor-pointer group"
      >
        <span className="truncate max-w-[130px]">
          {preview.ephemeralUrl.replace("https://", "").replace("http://", "")}
        </span>
        <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-white transition-colors" />
      </button>

      {/* Snapshot Card Popover Portaled to document.body to Escape Table Clipping */}
      {mounted &&
        isHovered &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform:
                coords.placement === "top"
                  ? "translate(-50%, -100%)"
                  : "translate(-50%, 0)",
              zIndex: 9999,
            }}
            className="w-72 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-2xl p-3.5 text-xs text-zinc-900 dark:text-zinc-100 pointer-events-auto animate-in fade-in zoom-in-95 duration-100"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-zinc-800">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[180px]">
                {clinicName}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20 font-medium">
                <ShieldCheck className="w-3 h-3" /> SSL Active
              </span>
            </div>

            {/* 320x180 Aspect Mockup Image */}
            <div className="w-full aspect-video rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 overflow-hidden relative mb-2.5">
              {preview.thumbnailUrl ? (
                <img
                  src={preview.thumbnailUrl}
                  alt="Demo Snapshot"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 font-mono text-[10px]">
                  Preview Rendered
                </div>
              )}
              <div className="absolute top-1.5 right-1.5 bg-black/80 backdrop-blur-xs px-1.5 py-0.5 rounded-md text-[10px] font-mono text-amber-400 flex items-center gap-1">
                <Zap className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>99/100</span>
              </div>
            </div>

            {/* Lighthouse Breakdown */}
            {preview.lighthouseScore && (
              <div className="grid grid-cols-4 gap-1 text-center font-mono text-[9px] text-slate-500 dark:text-zinc-400 pb-2 mb-2 border-b border-slate-100 dark:border-zinc-800">
                <div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {preview.lighthouseScore.performance}
                  </div>
                  <div>Perf</div>
                </div>
                <div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {preview.lighthouseScore.accessibility}
                  </div>
                  <div>A11y</div>
                </div>
                <div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {preview.lighthouseScore.bestPractices}
                  </div>
                  <div>Best</div>
                </div>
                <div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {preview.lighthouseScore.seo}
                  </div>
                  <div>SEO</div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={onOpenDrawer}
                className="text-[11px] text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold cursor-pointer"
              >
                Open Workbench Drawer &rarr;
              </button>
              <a
                href={preview.ephemeralUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-slate-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-mono"
              >
                Direct Link
              </a>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
