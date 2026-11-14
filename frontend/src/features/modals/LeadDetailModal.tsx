"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Phone,
  PhoneCall,
  MessageSquare,
  Globe,
  Video,
  Play,
  ExternalLink,
  Check,
  Calendar,
  Clock,
  Sparkles,
  ShieldCheck,
  User,
  MapPin,
  Flame,
  Layers,
  FileText,
  AlertCircle,
  Eye,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { leadsApi } from "@/api/leadsApi";

export function LeadDetailModal() {
  const {
    selectedLead,
    setSelectedLeadId,
    activeHustle,
    handleStageChange,
    openInboxForLead,
    openLogCallModal,
  } = useCRM();

  // Lazy check recording status per selected lead; never autoplay or prebuffer
  const [checkingRecording, setCheckingRecording] = useState<boolean>(false);
  const [recordingInfo, setRecordingInfo] = useState<{ has_recording: boolean; size_mb?: number } | null>(null);
  const [showVideo, setShowVideo] = useState<boolean>(false);

  // Close on Escape Key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedLeadId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setSelectedLeadId]);

  useEffect(() => {
    setShowVideo(false);
    setRecordingInfo(null);
    if (selectedLead?.id) {
      setCheckingRecording(true);
      leadsApi.getRecordingStatus(selectedLead.id)
        .then((res) => setRecordingInfo(res))
        .catch(() => setRecordingInfo({ has_recording: false }))
        .finally(() => setCheckingRecording(false));
    }
  }, [selectedLead?.id]);

  if (!selectedLead) return null;

  // Sanitized phone digits for WhatsApp Web
  const rawPhone = selectedLead.primary_phone || "";
  const phoneDigits = rawPhone.replace(/[^0-9]/g, "");

  // Base URL for dental clinic engine demos
  const demoBase = "http://localhost:3001";
  const demoThemes = [
    { id: "modern", name: "Minimalist Modern", path: `/modern/${selectedLead.slug}` },
    { id: "premium", name: "Premium Luxury", path: `/premium/${selectedLead.slug}` },
    { id: "warm", name: "Warm Clinical", path: `/warm/${selectedLead.slug}` },
  ];

  // Synthesize chronological activity timeline
  const timelineItems = [
    ...(selectedLead.messages || []).map((m) => ({
      id: `msg-${m.id}`,
      type: "message" as const,
      timestamp: m.created_at,
      title: m.direction === "inbound" ? "Received WhatsApp Message" : "Sent WhatsApp Message",
      description: m.text,
      badge: m.direction === "inbound" ? "Inbound" : "Outbound",
    })),
    ...((selectedLead as any).calls || []).map((c: any) => ({
      id: `call-${c.id}`,
      type: "call" as const,
      timestamp: c.created_at,
      title: `Logged Call (${c.outcome || "Interested"})`,
      description: c.summary || c.raw_text || "Call completed with clinic.",
      badge: `${c.duration_seconds || 60}s`,
    })),
    ...(selectedLead.events || []).map((e) => ({
      id: `event-${e.id}`,
      type: "event" as const,
      timestamp: e.created_at,
      title: `Demo Interaction (${e.event_type})`,
      description: `Viewed ${e.section || "demo"} section for ${e.duration_seconds || 15}s.`,
      badge: e.design_chosen || "Viewed",
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const lastContactDate = timelineItems[0]?.timestamp
    ? new Date(timelineItems[0].timestamp).toLocaleString()
    : "No prior contact";

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
        className="w-full max-w-md bg-white dark:bg-[#141721] border-l border-slate-200 dark:border-white/[0.08] shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-300"
      >
        {/* DRAWER SECTION 1: Header & Basic Info */}
        <div className="p-5 border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-slate-900/40 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <h2 id="drawer-title" className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {selectedLead.name}
                </h2>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {selectedLead.doctor_name || "Doctor"}
                </span>
                <span>&bull;</span>
                <span className="text-[11px]">BDS, MDS</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{selectedLead.locality}, {selectedLead.city}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedLeadId(null)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Close drawer (Esc)"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Metrics & Direct WhatsApp Button */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-200/60 dark:border-white/[0.06]">
            {phoneDigits ? (
              <a
                href={`https://wa.me/${phoneDigits}?text=Hi%20${encodeURIComponent(selectedLead.doctor_name || selectedLead.name)},`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Phone className="w-3 h-3 fill-current" />
                <span>{selectedLead.primary_phone}</span>
              </a>
            ) : (
              <span className="text-xs text-slate-400 italic">No phone registered</span>
            )}

            <span className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-mono font-bold">
              Fit: {selectedLead.fit_score || 0}%
            </span>

            <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-mono font-bold">
              Intent: {selectedLead.intent_score || 0}%
            </span>

            {/* Stage Selector */}
            {activeHustle?.stages && (
              <select
                value={selectedLead.stage_id}
                onChange={(e) => handleStageChange(selectedLead, Number(e.target.value))}
                className="ml-auto px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                {activeHustle.stages.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* DRAWER SECTION 2: Last Contacted & AI Brief */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-bold uppercase tracking-wider text-[11px]">Last Contact &amp; Brief</span>
              <span className="font-mono text-[10px]">{lastContactDate}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] space-y-2">
              <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Strategy &amp; Account Summary</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                {selectedLead.what_changed_summary ||
                  selectedLead.next_action ||
                  "Lead is evaluated for 3 bespoke dental clinic website themes. Ready for 1-on-1 WhatsApp outreach."}
              </p>
            </div>
          </div>

          {/* DRAWER SECTION 3: Demos & Walkthrough Video */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-bold uppercase tracking-wider text-[11px]">3 Live Demos &amp; Walkthrough</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Engine Live</span>
            </div>

            {/* 3 Live Website Theme Cards */}
            <div className="grid grid-cols-1 gap-2">
              {demoThemes.map((theme) => {
                const url = `${demoBase}${theme.path}`;
                return (
                  <a
                    key={theme.id}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] hover:border-indigo-500/50 dark:hover:border-indigo-500/40 flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                        <Globe className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {theme.name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {theme.path}
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  </a>
                );
              })}
            </div>

            {/* 45s Walkthrough Video Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Video className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      45s Video Walkthrough
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      High-converting personalized video pitch
                    </span>
                  </div>
                </div>

                {checkingRecording ? (
                  <span className="text-[10px] font-mono text-slate-400 animate-pulse">Checking...</span>
                ) : recordingInfo?.has_recording ? (
                  <button
                    type="button"
                    onClick={() => setShowVideo((prev) => !prev)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{showVideo ? "Hide" : "Watch"}</span>
                  </button>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-400">
                    Auto-build ready
                  </span>
                )}
              </div>

              {showVideo && recordingInfo?.has_recording && (
                <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-white/[0.06]">
                  <video
                    controls
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
                    src={`/api/leads/${selectedLead.id}/recording/download`}
                  />
                </div>
              )}
            </div>
          </div>

          {/* DRAWER SECTION 4: Live Engagement & Activity Timeline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-bold uppercase tracking-wider text-[11px]">
                Live Activity Timeline ({timelineItems.length})
              </span>
              <span className="text-[10px] text-slate-400">Chronological</span>
            </div>

            {timelineItems.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/40 text-center text-xs text-slate-400">
                No recorded activity yet. Use quick actions below to reach out.
              </div>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {timelineItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] flex items-start gap-3"
                  >
                    <div className="w-6 h-6 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                      {item.type === "message" ? (
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                      ) : item.type === "call" ? (
                        <PhoneCall className="w-3.5 h-3.5 text-indigo-500" />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-sky-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5">
                        {item.description}
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* DRAWER FOOTER: Quick Operational Actions */}
        <div className="p-4 border-t border-slate-200/80 dark:border-white/[0.08] bg-slate-50/80 dark:bg-slate-900/60 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              openInboxForLead(selectedLead.id);
              setSelectedLeadId(null);
            }}
            className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Open WhatsApp Thread</span>
          </button>

          <button
            type="button"
            onClick={() => {
              openLogCallModal(selectedLead.id);
              setSelectedLeadId(null);
            }}
            className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Log Call</span>
          </button>
        </div>
      </div>
    </div>
  );
}
