"use client";

import React, { useState } from "react";
import {
  Calendar,
  Clock,
  Eye,
  Flame,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  ShieldCheck,
  Star,
  ChevronRight,
  ExternalLink,
  PhoneCall,
  CheckCircle2,
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
  onSelect: () => void;
  onAdvanceStage: (nextStageId: number) => void;
  onApproveAndSend?: (lead: Lead) => void;
}

export function LeadCard({
  lead,
  stageName,
  stageSlug,
  allStages,
  isSelected,
  isDragging,
  onSelect,
  onAdvanceStage,
  onApproveAndSend,
}: LeadCardProps) {
  const { openLogCallModal, openInboxForLead, notify } = useCRM();
  const [advanceDropdownOpen, setAdvanceDropdownOpen] = useState<boolean>(false);

  const isOverdue =
    lead.next_action_due_at &&
    new Date(lead.next_action_due_at).getTime() < Date.now();

  const currentStageIndex = allStages.findIndex((s) => s.id === lead.stage_id);
  const nextStage =
    currentStageIndex >= 0 && currentStageIndex < allStages.length - 1
      ? allStages[currentStageIndex + 1]
      : null;

  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all duration-150 select-none space-y-3 relative group ${
        isDragging ? "opacity-30 scale-95" : "opacity-100"
      } ${
        isSelected
          ? "border-indigo-500 shadow-md ring-2 ring-indigo-500/20"
          : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-700 shadow-xs hover:shadow-md"
      }`}
    >
      {/* Top Card Line: Deal Value + Fit Badge */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60 text-[11px]">
          ₹{(lead.deal_value_inr || 25000).toLocaleString()}
        </span>

        <div className="flex items-center gap-1.5">
          {lead.intent_score >= 50 && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded-md border border-rose-200 dark:border-rose-800/60">
              <Flame className="w-2.5 h-2.5 fill-rose-500" />
              <span>Hot ({lead.intent_score})</span>
            </span>
          )}

          <span
            className={`flex items-center gap-0.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${
              lead.fit_score >= 80
                ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
            }`}
          >
            <Star className="w-2.5 h-2.5 fill-current" />
            <span>{lead.fit_score}% Fit</span>
          </span>
        </div>
      </div>

      {/* Main Clinic & Doctor Info */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {lead.name}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
          <span>Dr. {lead.doctor_name || "Doctor"}</span>
          <span>•</span>
          <span className="font-mono text-[11px]">{lead.primary_phone || "No Phone"}</span>
        </p>
        {lead.locality && (
          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{lead.locality}</span>
          </p>
        )}
      </div>

      {/* Next Step / Action Box */}
      {lead.next_action && (
        <div
          className={`p-2 rounded-xl text-xs flex items-start gap-2 border ${
            isOverdue
              ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300"
              : "bg-slate-50 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300"
          }`}
        >
          <Clock className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isOverdue ? "text-rose-500" : "text-slate-400"}`} />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">
              {isOverdue ? "Overdue Action" : "Next Step"}
            </div>
            <div className="text-xs truncate font-medium">{lead.next_action}</div>
          </div>
        </div>
      )}

      {/* Card Footer: Metadata Counters */}
      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 dark:text-slate-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-300">
            <MessageSquare className="w-3 h-3" />
            <span>{lead.messages?.length || 0}</span>
          </span>
          <span className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-300">
            <Eye className="w-3 h-3" />
            <span>{(lead as any).demo_views_count ?? lead.events?.length ?? 0}</span>
          </span>
          <span className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-300">
            <ShieldCheck className="w-3 h-3" />
            <span>{lead.facts?.length || 0}</span>
          </span>
        </div>
        {lead.next_action_due_at && (
          <span className="flex items-center gap-1 font-mono text-[10px]">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>
              {new Date(lead.next_action_due_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          </span>
        )}
      </div>

      {/* QUICK ACTION BUTTONS ON CARD (R4 REQUIREMENT) */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        {/* 1. WhatsApp Button: opens Inbox for lead or wa.me */}
        <button
          type="button"
          onClick={() => openInboxForLead(lead.id)}
          className="flex-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 transition-colors flex items-center justify-center gap-1 cursor-pointer"
          title="Open WhatsApp Inbox for lead"
        >
          <MessageSquare className="w-3 h-3" />
          <span>Chat</span>
        </button>

        {/* 2. Log Call Button */}
        <button
          type="button"
          onClick={() => openLogCallModal(lead.id)}
          className="flex-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 transition-colors flex items-center justify-center gap-1 cursor-pointer"
          title="Log raw call & generate AI notes"
        >
          <PhoneCall className="w-3 h-3" />
          <span>Call</span>
        </button>

        {/* 3. Stage Advance Button / Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setAdvanceDropdownOpen(!advanceDropdownOpen)}
            className="py-1.5 px-2 rounded-xl text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-0.5 cursor-pointer"
            title="Advance stage"
          >
            <span>Advance</span>
            <ChevronRight className="w-3 h-3" />
          </button>

          {advanceDropdownOpen && (
            <div className="absolute right-0 bottom-full mb-1.5 w-44 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl p-1.5 z-40 space-y-0.5 text-xs animate-in fade-in zoom-in-95">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700 mb-1">
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
                      : "hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 cursor-pointer"
                  }`}
                >
                  <span className="truncate">{s.name}</span>
                  {s.id === lead.stage_id && <CheckCircle2 className="w-3 h-3 text-indigo-500" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review Tray Approve Button if in package_ready */}
      {stageSlug === "package_ready" && !lead.do_not_contact && onApproveAndSend && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onApproveAndSend(lead);
          }}
          className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Approve & Send Pitch</span>
        </button>
      )}
    </div>
  );
}
