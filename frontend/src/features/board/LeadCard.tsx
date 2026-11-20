"use client";

import React, { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Eye,
  Flame,
  MessageSquare,
  PhoneCall,
  Send,
  User,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { Lead, Stage } from "@/types";

interface LeadCardProps {
  lead: Lead;
  stageName: string;
  stageSlug?: string;
  allStages: Stage[];
  isSelected: boolean;
  isDragging: boolean;
  isNestedInBatch?: boolean;
  onSelect: () => void;
  onAdvanceStage: (nextStageId: number) => void;
  onApproveAndSend?: (lead: Lead) => void;
}

export function formatDoctorName(name?: string | null): string {
  if (!name || !name.trim()) return "Doctor";
  const trimmed = name.trim();
  const stripped = trimmed.replace(/^(dr\.?\s*)+/i, "");
  if (!stripped) return "Doctor";
  return `Dr. ${stripped}`;
}

export function LeadCard({
  lead,
  stageName,
  stageSlug,
  allStages,
  isSelected,
  isDragging,
  isNestedInBatch = false,
  onSelect,
  onAdvanceStage,
  onApproveAndSend,
}: LeadCardProps) {
  const { openLogCallModal, openInboxForLead } = useCRM();
  const [advanceDropdownOpen, setAdvanceDropdownOpen] = useState<boolean>(false);

  // Batch ID & Locality for eyebrow
  const batchId = (lead as Lead & { custom_fields?: Record<string, unknown> | null }).custom_fields?.batch_id;
  const locality = lead.locality || lead.city || "NCR";
  const eyebrowLabel = batchId ? `${locality} · ${String(batchId)}` : locality;

  const isOverdue =
    lead.next_action_due_at &&
    new Date(lead.next_action_due_at).getTime() < Date.now();

  const nextActionText = lead.next_action
    ? lead.next_action.replace(/Dr\.\s+Dr\./gi, "Dr.")
    : null;

  const isWon =
    stageSlug === "won" || stageName.toLowerCase().includes("won");
  const isLost =
    stageSlug === "lost" ||
    stageName.toLowerCase().includes("lost") ||
    stageName.toLowerCase().includes("closed");

  const formattedDate = lead.next_action_due_at
    ? new Date(lead.next_action_due_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border transition-all duration-150 select-none relative group bg-white dark:bg-[#18181B] ${
        isNestedInBatch ? "p-3 space-y-2.5" : "p-3.5 space-y-2.5"
      } ${
        isDragging ? "opacity-30 scale-95" : "opacity-100"
      } ${
        isSelected
          ? "border-zinc-900 dark:border-white shadow-md ring-1 ring-zinc-900/20 dark:ring-white/20"
          : "border-slate-200/80 dark:border-white/[0.08] shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700"
      }`}
    >
      {/* 1. Top Eyebrow Row: Locality & Batch + Clean Deal Value */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-[#27272A]/80">
        <span className="text-[11px] text-slate-400 font-medium truncate">
          {eyebrowLabel}
        </span>
        <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300 font-mono shrink-0">
          ₹{(lead.deal_value_inr || 25000).toLocaleString()}
        </span>
      </div>

      {/* 2. Middle Content Zone */}
      <div className="space-y-1.5 min-w-0">
        {/* Clinic Name */}
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white leading-snug truncate group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
          {lead.name}
        </h3>

        {/* Doctor & Pastel Badges Row */}
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-zinc-300 font-medium truncate">
            <User className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{formatDoctorName(lead.doctor_name)}</span>
          </div>

          {lead.intent_score >= 50 && (
            <span className="flex items-center gap-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 px-1.5 py-0.5 rounded shrink-0">
              <Flame className="w-2.5 h-2.5 fill-current" />
              <span>Hot {lead.intent_score}</span>
            </span>
          )}

          <span className="text-[10px] font-medium bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 px-1.5 py-0.5 rounded font-mono shrink-0">
            {lead.fit_score}% Fit
          </span>
        </div>

        {/* Sleek Single-Line Next Action (Taskk Style) */}
        {isWon ? (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-lg px-2.5 py-1.5 font-medium border border-emerald-200/60 dark:border-emerald-900/40">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>✓ Client Onboarded</span>
          </div>
        ) : isLost ? null : nextActionText ? (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400 bg-slate-50/90 dark:bg-white/[0.03] rounded-lg px-2.5 py-1.5 truncate border border-slate-200/50 dark:border-white/[0.04]">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isOverdue ? "bg-rose-500" : "bg-slate-400"
              }`}
            />
            <span className="truncate">{nextActionText}</span>
          </div>
        ) : null}
      </div>

      {/* 3. Bottom Footer Row: Telemetry + Clean Monochrome Action Controls */}
      <div
        className="pt-2 mt-1 border-t border-slate-100 dark:border-[#27272A]/80 flex items-center justify-between gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Compact Muted Telemetry & Date */}
        <div className="flex items-center gap-2.5 text-[11px] text-slate-400 shrink-0">
          <span className="flex items-center gap-1" title={`${lead.messages?.length || 0} messages`}>
            <MessageSquare className="w-3 h-3" />
            <span>{lead.messages?.length || 0}</span>
          </span>
          <span className="flex items-center gap-1" title="Demo views">
            <Eye className="w-3 h-3" />
            <span>{(lead as any).demo_views_count ?? lead.events?.length ?? 0}</span>
          </span>
          {formattedDate && (
            <span className="flex items-center gap-1 font-mono text-[10px]">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>{formattedDate}</span>
            </span>
          )}
        </div>

        {/* Right: Monochrome Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => openInboxForLead(lead.id)}
            className="bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-slate-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white border border-slate-200/70 dark:border-white/[0.08] rounded-lg px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Chat on WhatsApp"
          >
            Chat
          </button>

          <button
            type="button"
            onClick={() => openLogCallModal(lead.id)}
            className="bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-slate-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white border border-slate-200/70 dark:border-white/[0.08] rounded-lg px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Log Call"
          >
            Call
          </button>

          {/* Advance Stage Dropdown Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setAdvanceDropdownOpen(!advanceDropdownOpen)}
              className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-slate-100 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors flex items-center gap-0.5 cursor-pointer shadow-xs whitespace-nowrap shrink-0"
              title="Advance Stage"
            >
              <span>Advance</span>
              <ChevronRight className="w-3 h-3" />
            </button>

            {advanceDropdownOpen && (
              <div className="absolute right-0 bottom-full mb-1.5 w-44 rounded-2xl bg-white dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] shadow-xl p-1.5 z-40 space-y-0.5 text-xs animate-in fade-in zoom-in-95">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-[#3F3F46] mb-1">
                  Move to Stage:
                </div>
                {allStages.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onAdvanceStage(s.id);
                      setAdvanceDropdownOpen(false);
                    }}
                    disabled={s.id === lead.stage_id}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] transition-colors flex items-center justify-between ${
                      s.id === lead.stage_id
                        ? "opacity-40 font-bold bg-slate-100 dark:bg-slate-700/50 cursor-default"
                        : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                    }`}
                  >
                    <span className="truncate">{s.name}</span>
                    {s.id === lead.stage_id && <CheckCircle2 className="w-3 h-3 text-zinc-900 dark:text-white" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Tray Approve Button if in package_ready */}
      {stageSlug === "package_ready" && !lead.do_not_contact && onApproveAndSend && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onApproveAndSend(lead);
          }}
          className="w-full mt-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Approve &amp; Send Pitch</span>
        </button>
      )}
    </div>
  );
}
