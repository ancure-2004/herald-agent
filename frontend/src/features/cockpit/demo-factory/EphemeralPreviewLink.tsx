"use client";

import React, { useState } from "react";
import { PreviewConfig } from "../types";
import { ExternalLink, Copy, Check } from "lucide-react";

interface EphemeralPreviewLinkProps {
  preview: PreviewConfig;
  clinicName: string;
  onOpenDrawer?: () => void;
}

export const EphemeralPreviewLink: React.FC<EphemeralPreviewLinkProps> = ({ preview }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    navigator.clipboard.writeText(preview.ephemeralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="inline-flex items-center gap-1">
      <a
        href={preview.ephemeralUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        title="Open live website in new browser tab"
        className="bg-slate-50 dark:bg-white/[0.04] hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-zinc-900 text-zinc-700 dark:text-zinc-300 border border-slate-200/80 dark:border-white/[0.08] rounded-lg px-2.5 py-1 text-xs font-mono transition-colors inline-flex items-center gap-1.5 group"
      >
        <span className="truncate max-w-[135px]">
          {preview.ephemeralUrl.replace(/^https?:\/\//, "")}
        </span>
        <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-white dark:group-hover:text-zinc-900 shrink-0 transition-colors" />
      </a>

      <button
        type="button"
        onClick={handleCopy}
        title="Copy URL"
        className="p-1 rounded-md text-slate-400 hover:text-zinc-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors"
      >
        {copied ? (
          <Check className="w-3 h-3 text-emerald-600" />
        ) : (
          <Copy className="w-3 h-3" />
        )}
      </button>
    </div>
  );
};
