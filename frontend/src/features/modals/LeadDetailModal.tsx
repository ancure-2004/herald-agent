"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Phone,
  PhoneCall,
  MessageSquare,
  Globe,
  Video,
  Play,
  ExternalLink,
  Sparkles,
  FileText,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { leadsApi } from "@/api/leadsApi";
import { Lead } from "@/types";

export interface LeadDetailContentProps {
  lead: Lead;
  onClose: () => void;
  isDocked?: boolean;
}

export function LeadDetailContent({ lead, onClose, isDocked = false }: LeadDetailContentProps) {
  const {
    activeHustle,
    handleStageChange,
    openInboxForLead,
    openLogCallModal,
    activeTab,
  } = useCRM();

  const [checkingRecording, setCheckingRecording] = useState<boolean>(false);
  const [recordingInfo, setRecordingInfo] = useState<{ has_recording: boolean; size_mb?: number } | null>(null);
  const [showVideo, setShowVideo] = useState<boolean>(false);

  // Close on Escape Key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    setShowVideo(false);
    setRecordingInfo(null);
    if (lead?.id) {
      setCheckingRecording(true);
      leadsApi
        .getRecordingStatus(lead.id)
        .then((res) => setRecordingInfo(res))
        .catch(() => setRecordingInfo({ has_recording: false }))
        .finally(() => setCheckingRecording(false));
    }
  }, [lead?.id]);

  if (!lead) return null;

  const rawPhone = lead.primary_phone || "";
  const phoneDigits = rawPhone.replace(/[^0-9]/g, "");

  const demoBase = "http://localhost:3001";
  const demoThemes = [
    { id: "modern", name: "Modern", subtitle: "Minimalist", path: `/modern/${lead.slug}` },
    { id: "premium", name: "Premium", subtitle: "Luxury", path: `/premium/${lead.slug}` },
    { id: "warm", name: "Warm", subtitle: "Clinical", path: `/warm/${lead.slug}` },
  ];

  // Synthesize chronological activity timeline
  const timelineItems = [
    ...(lead.messages || []).map((m) => ({
      id: `msg-${m.id}`,
      type: "message" as const,
      timestamp: m.created_at,
      title: m.direction === "inbound" ? "Received WhatsApp Message" : "Sent WhatsApp Message",
      description: m.text,
      badge: m.direction === "inbound" ? "Inbound" : "Outbound",
    })),
    ...((lead as any).calls || []).map((c: any) => ({
      id: `call-${c.id}`,
      type: "call" as const,
      timestamp: c.created_at,
      title: `Logged Call (${c.outcome || "Interested"})`,
      description: c.summary || c.raw_text || "Call completed with clinic.",
      badge: `${c.duration_seconds || 60}s`,
    })),
    ...(lead.events || []).map((e) => ({
      id: `event-${e.id}`,
      type: "event" as const,
      timestamp: e.created_at,
      title: `Demo Interaction · ${e.event_type || "view"}`,
      description: `Viewed ${e.section || "demo"} section for ${e.duration_seconds || 15}s.`,
      badge: e.design_chosen || "Viewed",
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const lastContactDate = timelineItems[0]?.timestamp
    ? new Date(timelineItems[0].timestamp).toLocaleDateString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "No prior contact";

  return (
    <div className="w-full flex flex-col h-full overflow-hidden bg-white dark:bg-[#141721]">
      {/* 1. CLEAN DRAWER HEADER */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
        {/* Row 1: Status Dot + Clinic Name + Close Button */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <h2 id="drawer-title" className="text-base font-bold text-zinc-900 dark:text-white truncate">
              {lead.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-zinc-900 dark:hover:text-white rounded-lg p-1 transition-colors cursor-pointer shrink-0"
            title={isDocked ? "Close docked Lead Card (Esc)" : "Close drawer (Esc)"}
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Row 2: Doctor & Locality + Fit/Intent Inline */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
              {lead.doctor_name
                ? /^dr\.?\s+/i.test(lead.doctor_name)
                  ? lead.doctor_name
                  : `Dr. ${lead.doctor_name}`
                : "Doctor"}
            </span>
            <span>•</span>
            <span className="text-[11px]">BDS, MDS</span>
            <span>•</span>
            <span className="truncate">{lead.locality || lead.city || "Delhi NCR"}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="bg-slate-100 dark:bg-slate-800 text-zinc-800 dark:text-zinc-200 border border-slate-200/80 dark:border-slate-700 rounded-md px-1.5 py-0.5 text-[11px] font-medium font-mono">
              Fit {lead.fit_score || 0}%
            </span>
            <span className="bg-slate-100 dark:bg-slate-800 text-zinc-800 dark:text-zinc-200 border border-slate-200/80 dark:border-slate-700 rounded-md px-1.5 py-0.5 text-[11px] font-medium font-mono">
              Intent {lead.intent_score || 0}%
            </span>
          </div>
        </div>

        {/* Row 3: Balanced 2-Column Action & Stage Bar */}
        <div className="grid grid-cols-2 gap-2.5 mt-3">
          {phoneDigits ? (
            <a
              href={`https://wa.me/${phoneDigits}?text=Hi%20${encodeURIComponent(lead.doctor_name || lead.name)},`}
              target="_blank"
              rel="noreferrer"
              className="bg-slate-100 hover:bg-zinc-900 hover:text-white dark:bg-slate-800 dark:hover:bg-zinc-100 dark:hover:text-zinc-900 text-zinc-800 dark:text-zinc-200 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Phone className="w-3 h-3 fill-current shrink-0" />
              <span className="truncate">{lead.primary_phone}</span>
            </a>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-400 text-xs rounded-xl px-3 py-1.5 flex items-center justify-center italic">
              No phone registered
            </div>
          )}

          {activeHustle?.stages ? (
            <select
              value={lead.stage_id}
              onChange={(e) => handleStageChange(lead, Number(e.target.value))}
              className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 w-full focus:outline-none cursor-pointer"
            >
              {activeHustle.stages.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-400 text-xs rounded-xl px-3 py-1.5 flex items-center justify-center">
              Stage
            </div>
          )}
        </div>
      </div>

      {/* SCROLLABLE BODY */}
      <div className={`flex-1 overflow-y-auto p-5 space-y-5 ${isDocked ? "no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : ""}`}>
        {/* 2. REFINED LAST CONTACT & BRIEF (Executive Callout Box) */}
        <div className="bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-white min-w-0 truncate">
              <Sparkles className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />
              <span className="truncate">AI Strategy &amp; Account Summary</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono shrink-0">
              {lastContactDate}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words font-sans">
            {lead.what_changed_summary ||
              lead.next_action ||
              "Lead is evaluated for 3 bespoke dental clinic website themes. Ready for 1-on-1 WhatsApp outreach."}
          </p>
        </div>

        {/* 3. COMPACT 3-COLUMN DEMOS & WALKTHROUGH */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[11px]">
              3 Live Demos &amp; Walkthrough
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Engine Live</span>
          </div>

          {/* 3-Column Horizontal Switcher Card Grid */}
          <div className="grid grid-cols-3 gap-2">
            {demoThemes.map((theme) => {
              const url = `${demoBase}${theme.path}`;
              return (
                <a
                  key={theme.id}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/70 border border-slate-200/80 dark:border-slate-800 hover:border-zinc-900/40 dark:hover:border-slate-600 rounded-xl p-2.5 transition-all group flex flex-col justify-between cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <Globe className="w-3.5 h-3.5 text-slate-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
                    <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
                  </div>
                  <div className="mt-2">
                    <div className="text-xs font-semibold text-zinc-900 dark:text-white">
                      {theme.name}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {theme.subtitle}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>

          {/* Compact 45s Video Walkthrough Row */}
          <div className="mt-2 bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Video className="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-zinc-900 dark:text-white">
                  45s Video Walkthrough
                </div>
                <div className="text-[10px] text-slate-400">
                  High-converting personalized video pitch
                </div>
              </div>
            </div>

            <div>
              {checkingRecording ? (
                <span className="text-[10px] font-mono text-slate-400 animate-pulse">Checking...</span>
              ) : recordingInfo?.has_recording ? (
                <button
                  type="button"
                  onClick={() => setShowVideo((prev) => !prev)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{showVideo ? "Hide" : "Watch"}</span>
                </button>
              ) : (
                <span className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-medium px-2 py-0.5 rounded-md">
                  Auto-build ready
                </span>
              )}
            </div>
          </div>

          {showVideo && recordingInfo?.has_recording && (
            <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-white/[0.06]">
              <video
                controls
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
                src={`/api/leads/${lead.id}/recording/download`}
              />
            </div>
          )}
        </div>

        {/* 4. SLEEK VERTICAL ACTIVITY TIMELINE */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[11px]">
              Live Activity Timeline ({timelineItems.length})
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Chronological</span>
          </div>

          {timelineItems.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 text-center text-xs text-slate-400">
              No recorded activity yet.
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto pr-1 pl-1">
              <div className="ml-2.5 border-l border-slate-200 dark:border-slate-700 space-y-3 my-2">
                {timelineItems.map((item) => (
                  <div key={item.id} className="relative pl-4">
                    {/* Status dot on the vertical line */}
                    <div className="absolute -left-[5.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-white dark:bg-slate-900 border-2 border-zinc-800 dark:border-zinc-200" />

                    {/* Compact content row */}
                    <div className="bg-slate-50/60 hover:bg-slate-50 dark:bg-slate-900/40 dark:hover:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/80 rounded-xl px-3 py-2 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate min-w-0">
                          {item.title}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.badge && (
                            <span className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] px-1.5 py-0.5 rounded font-mono">
                              {item.badge}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(item.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. UNIFIED FOOTER ACTIONS */}
      <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#141721] grid grid-cols-2 gap-2.5 shrink-0">
        {activeTab === "calls" ? (
          <>
            <button
              type="button"
              onClick={() => {
                openInboxForLead(lead.id);
                onClose();
              }}
              className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 rounded-xl py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Jump to WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                setTimeout(() => {
                  const el = document.getElementById("raw-transcript-input");
                  el?.focus();
                  el?.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 100);
              }}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-zinc-900 dark:text-zinc-100 border border-slate-200/80 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Focus Call Form</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                openInboxForLead(lead.id);
                onClose();
              }}
              className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 rounded-xl py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Open WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => {
                openLogCallModal(lead.id);
              }}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-zinc-900 dark:text-zinc-100 border border-slate-200/80 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Log Call</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function LeadDetailModal() {
  const {
    selectedLead,
    setSelectedLeadId,
    activeTab,
  } = useCRM();

  // Suppress modal overlay when inside WhatsApp Inbox (rendered docked side-by-side)
  if (!selectedLead || activeTab === "inbox") return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      onClick={() => setSelectedLeadId(null)}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="my-2 mr-2 h-[calc(100vh-16px)] w-full max-w-[480px] sm:w-[480px] rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-2xl overflow-hidden flex flex-col z-50 animate-in slide-in-from-right duration-300"
      >
        <LeadDetailContent lead={selectedLead} onClose={() => setSelectedLeadId(null)} isDocked={false} />
      </div>
    </div>
  );
}
