"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  PhoneCall,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Target,
  ShieldAlert,
  CalendarCheck,
  ArrowRight,
  RefreshCw,
  Search,
  PanelRightOpen,
  Play,
  Square,
  ExternalLink,
  Calendar,
  Circle,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { apiFetch } from "@/lib/api/client";
import { leadsApi } from "@/api/leadsApi";

const formatDoctorName = (name?: string | null): string => {
  if (!name || !name.trim()) return "Doctor";
  const trimmed = name.trim();
  if (/^dr\.?\s+/i.test(trimmed)) {
    return trimmed;
  }
  return `Dr. ${trimmed}`;
};

interface StructuredCall {
  id: number;
  call_id?: number;
  lead_id: number;
  raw_text: string;
  summary: string;
  interests: string[];
  objections: string[];
  commitments: Array<{ who_owes_it?: string; what?: string; due_at?: string } | any>;
  next_steps: string[];
  prep_brief: string;
  duration_seconds: number;
  outcome: string;
  created_at: string;
}

interface CallBrief {
  lead_id: number;
  clinic_name: string;
  doctor_name: string;
  prep_brief: string;
}

const REBUTTAL_CARDS = [
  {
    id: "practo",
    title: "Practo vs Website ROI",
    badge: "Competitor Trap",
    points: [
      "Practo charges 30-40% cut or Rs. 800-1,200/lead while listing competing clinics right underneath your profile.",
      "A custom website gives direct WhatsApp OPD bookings with 100% patient ownership and zero recurring commission.",
    ],
  },
  {
    id: "pricing",
    title: "Rs. 15k Breakdown",
    badge: "Complete Turnkey",
    points: [
      "Includes 3 bespoke mobile designs, domain & high-speed cloud hosting, Google Business SEO, and 1-tap WhatsApp booking.",
      "Pays for itself with just 1 dental implant or aligner case from direct Google search discovery.",
    ],
  },
  {
    id: "domain",
    title: "Domain Ownership",
    badge: "100% Doctor-Owned",
    points: [
      "Doctor retains 100% legal ownership of domain, patient inquiries, and branding.",
      "No vendor lock-in or recurring hostage fees; transferrable to your custody anytime.",
    ],
  },
  {
    id: "maps",
    title: "Google Maps 4x Intent",
    badge: "Immediate Action",
    points: [
      "Patients searching 'Dentist near me' have 4x higher purchase intent than passive social media browsers.",
      "Connecting verified Google Maps to an instant-loading mobile site increases WhatsApp inquiries by up to 300%.",
    ],
  },
];

const QUICK_NOTE_CHIPS = [
  "+ Liked Mobile Booking",
  "+ Hesitant on Rs. 15k",
  "+ Needs Partner Approval",
  "+ Send Practo Comparison PDF",
  "+ Call Back Thursday 5pm",
];

export function CallsManagementView() {
  const {
    leads,
    selectedLeadId,
    setSelectedLeadId,
    activeHustle,
    handleStageChange,
    notify,
    loadAll,
  } = useCRM();

  // ---------------------------------------------------------------------------
  // Local clinic selection
  // ---------------------------------------------------------------------------
  const [activeCallLeadId, setActiveCallLeadId] = useState<number | null>(() => {
    return selectedLeadId || (leads[0]?.id ?? null);
  });

  useEffect(() => {
    if (selectedLeadId && selectedLeadId !== activeCallLeadId) {
      setActiveCallLeadId(selectedLeadId);
    }
  }, [selectedLeadId, activeCallLeadId]);

  useEffect(() => {
    if (!activeCallLeadId && leads.length > 0) {
      setActiveCallLeadId(leads[0].id);
    }
  }, [leads, activeCallLeadId]);

  const activeLead = useMemo(
    () => leads.find((l) => l.id === activeCallLeadId) || leads[0] || null,
    [leads, activeCallLeadId]
  );

  // ---------------------------------------------------------------------------
  // Combobox state
  // ---------------------------------------------------------------------------
  const [comboOpen, setComboOpen] = useState(false);
  const [comboSearch, setComboSearch] = useState("");
  const comboRef = useRef<HTMLDivElement>(null);
  const comboInputRef = useRef<HTMLInputElement>(null);

  const filteredLeads = useMemo(() => {
    if (!comboSearch.trim()) return leads;
    const q = comboSearch.toLowerCase();
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.doctor_name ?? "").toLowerCase().includes(q) ||
        (l.locality ?? "").toLowerCase().includes(q) ||
        (l.primary_phone ?? "").toLowerCase().includes(q)
    );
  }, [leads, comboSearch]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false);
        setComboSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelectClinic = useCallback(
    (leadId: number) => {
      setActiveCallLeadId(leadId);
      setComboOpen(false);
      setComboSearch("");
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Demo Template Engagement & Most Interacted Template
  // ---------------------------------------------------------------------------
  const mostInteractedTheme = useMemo(() => {
    if (!activeLead?.events || activeLead.events.length === 0) return null;
    const scores: Record<string, number> = { modern: 0, premium: 0, warm: 0 };
    for (const ev of activeLead.events) {
      const text = `${ev.design_chosen || ""} ${ev.section || ""} ${ev.event_type || ""}`.toLowerCase();
      const dur = ev.duration_seconds || 20;
      if (text.includes("modern")) scores.modern += dur;
      if (text.includes("premium")) scores.premium += dur;
      if (text.includes("warm")) scores.warm += dur;
    }
    const maxVal = Math.max(scores.modern, scores.premium, scores.warm);
    if (maxVal === 0) return null;
    if (scores.modern === maxVal) return "modern";
    if (scores.premium === maxVal) return "premium";
    return "warm";
  }, [activeLead?.events]);

  const demoEngagement = useMemo(() => {
    if (!activeLead) return null;
    const events = activeLead.events || [];
    if (events.length > 0) {
      const latest = [...events].sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      )[0];
      const themeName = latest.design_chosen
        ? latest.design_chosen.charAt(0).toUpperCase() + latest.design_chosen.slice(1)
        : "Demo";
      const dur = latest.duration_seconds ? `${latest.duration_seconds}s` : "";
      return `Viewed ${themeName}${dur ? ` • ${dur}` : ""}`;
    }
    const viewsCount = (activeLead as any).demo_views_count;
    if (viewsCount) {
      return `${viewsCount} Demo Views`;
    }
    return "No demo views yet";
  }, [activeLead]);

  // ---------------------------------------------------------------------------
  // Pre-call prep brief & Interactive Battlecard
  // ---------------------------------------------------------------------------
  const [callBrief, setCallBrief] = useState<CallBrief | null>(null);
  const [loadingBrief, setLoadingBrief] = useState<boolean>(false);
  const [copiedBrief, setCopiedBrief] = useState<boolean>(false);
  const [checkedBriefItems, setCheckedBriefItems] = useState<Record<number, boolean>>({});
  const [activeRebuttalId, setActiveRebuttalId] = useState<string | null>(null);

  useEffect(() => {
    setCheckedBriefItems({});
    setActiveRebuttalId(null);
  }, [activeLead?.id]);

  const fetchCallBrief = useCallback(async (leadId: number, forceRegenerate = false) => {
    setLoadingBrief(true);
    try {
      const url = forceRegenerate ? `/api/leads/${leadId}/call-brief?force_regenerate=true` : `/api/leads/${leadId}/call-brief`;
      const res = await apiFetch<CallBrief>(url, { timeoutMs: 60000 });
      setCallBrief(res);
    } catch (err: any) {
      const isNotConfigured = err?.status === 503 || String(err?.message || "").includes("ai_not_configured");
      if (isNotConfigured) {
        notify("AI provider not configured. Please configure an AI provider in Settings.", "err");
      } else {
        notify(err instanceof Error ? err.message : "Failed to generate call brief", "err");
      }
      setCallBrief(null);
    } finally {
      setLoadingBrief(false);
    }
  }, [notify]);

  const toggleBriefItem = (index: number) => {
    setCheckedBriefItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleCopyBrief = () => {
    if (!callBrief?.prep_brief) return;
    navigator.clipboard.writeText(callBrief.prep_brief);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2000);
    notify("Call preparation brief copied to clipboard", "ok");
  };

  // ---------------------------------------------------------------------------
  // Past calls (Default index 0 to expanded on load & switch)
  // ---------------------------------------------------------------------------
  const [callsList, setCallsList] = useState<StructuredCall[]>([]);
  const [expandedCallId, setExpandedCallId] = useState<number | null>(null);

  const loadCallsForLead = useCallback(async (lead: any) => {
    const inlineCalls: StructuredCall[] = Array.isArray((lead as any)?.calls) ? (lead as any).calls : [];
    if (inlineCalls.length > 0) {
      setCallsList(inlineCalls);
      setExpandedCallId(inlineCalls[0]?.id ?? null);
    } else {
      setCallsList([]);
      setExpandedCallId(null);
    }

    try {
      const loaded = await apiFetch<StructuredCall[]>(`/api/leads/${lead.id}/calls`);
      const arr = Array.isArray(loaded) ? loaded : [];
      setCallsList(arr);
      // Default most recent call log to expanded
      if (arr.length > 0) {
        setExpandedCallId(arr[0].id);
      } else {
        setExpandedCallId(null);
      }
    } catch {
      if (inlineCalls.length === 0) setCallsList([]);
    }
  }, []);

  useEffect(() => {
    if (!activeLead) return;
    const cached = (activeLead as any)?.custom_fields?.cached_call_brief;
    if (cached && cached.prep_brief) {
      setCallBrief({
        lead_id: activeLead.id,
        clinic_name: activeLead.name,
        doctor_name: activeLead.doctor_name,
        prep_brief: cached.prep_brief,
      });
    } else {
      setCallBrief(null);
    }
    loadCallsForLead(activeLead);
  }, [activeLead?.id, loadCallsForLead]);

  const latestCall = callsList[0] || null;
  const hasUnresolvedFromLastCall = Boolean(
    latestCall &&
      ((latestCall.commitments && latestCall.commitments.length > 0) ||
        (latestCall.objections && latestCall.objections.length > 0))
  );

  // ---------------------------------------------------------------------------
  // Inline Log Call Form, Stopwatch & Follow-up Scheduler
  // ---------------------------------------------------------------------------
  const [rawText, setRawText] = useState<string>("");
  const [durationSeconds, setDurationSeconds] = useState<number>(180);
  const [outcome, setOutcome] = useState<string>("connected");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Stopwatch state
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const toggleStopwatch = () => {
    if (isTimerRunning) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsTimerRunning(false);
    } else {
      setIsTimerRunning(true);
      timerRef.current = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Next Follow-up Scheduler state
  const [followUpDate, setFollowUpDate] = useState<string>("");
  const [followUpNote, setFollowUpNote] = useState<string>("");

  const handleQuickFollowUp = (daysAhead: number, hour = 17) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    d.setHours(hour, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setFollowUpDate(localIso);
    if (!followUpNote.trim()) {
      setFollowUpNote("Follow-up call with doctor on website demo");
    }
  };

  const handleInsertQuickNote = (phrase: string) => {
    setRawText((prev) => {
      const clean = prev.trim();
      return clean ? `${clean}\n• ${phrase}` : `• ${phrase}`;
    });
    const el = document.getElementById("raw-transcript-input");
    el?.focus();
  };

  const handleLogCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim() || !activeLead) {
      notify("Please enter the raw call transcript or notes", "err");
      return;
    }

    if (isTimerRunning) {
      toggleStopwatch();
    }

    setIsSubmitting(true);
    try {
      const payload = {
        raw_text: rawText.trim(),
        duration_seconds: Number(durationSeconds) || 0,
        outcome,
      };

      const res = await apiFetch<StructuredCall>(`/api/leads/${activeLead.id}/calls`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setCallsList((prev) => [res, ...prev]);
      setExpandedCallId(res.id);
      setRawText("");

      if (followUpDate) {
        try {
          await leadsApi.update(activeLead.id, {
            next_action: followUpNote.trim() || "Follow-up call with doctor",
            next_action_due_at: new Date(followUpDate).toISOString(),
          });
          setFollowUpDate("");
          setFollowUpNote("");
        } catch {
          // Non-blocking follow-up update
        }
      }

      notify(`Call structured successfully for ${activeLead.name}!`, "ok");
      await loadAll();
      await fetchCallBrief(activeLead.id);
    } catch (err: any) {
      notify(err.message || "Failed to log call", "err");
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedBriefLines = useMemo(() => {
    const raw = callBrief?.prep_brief || "";
    if (!raw.trim()) return [];
    return raw.split("\n").filter((line) => line.trim().length > 0);
  }, [callBrief?.prep_brief]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="h-full flex flex-col overflow-hidden gap-3 text-slate-900 dark:text-zinc-100">
      {/* 1. POLISHED TOP LEAD CONTEXT BAR */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] px-4 py-2.5 shadow-xs flex items-center justify-between gap-3 flex-wrap shrink-0">
        {/* Left: Clinic Selector (min-w-[240px]) + Neutral Monogram + Inline Stage Selector */}
        <div className="flex flex-wrap items-center gap-2.5 min-w-0 flex-1">
          {/* Clinic Selector Combobox */}
          <div ref={comboRef} className="w-72 md:w-84 min-w-[240px] relative">
            <button
              type="button"
              onClick={() => {
                setComboOpen((v) => !v);
                if (!comboOpen) {
                  setTimeout(() => comboInputRef.current?.focus(), 50);
                }
              }}
              className="w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#18181B] border border-slate-200/80 dark:border-[#3F3F46]/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer text-left"
            >
              {activeLead ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Neutral slate/charcoal monogram */}
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#27272A] text-zinc-800 dark:text-zinc-200 border border-slate-200/80 dark:border-[#3F3F46] flex items-center justify-center font-semibold text-[11px] shrink-0">
                    {activeLead.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-zinc-900 dark:text-white truncate">{activeLead.name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">
                      {formatDoctorName(activeLead.doctor_name)} · {activeLead.locality || "Delhi NCR"}
                    </div>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-slate-400">Select a clinic...</span>
              )}
              <div className="flex items-center gap-1 shrink-0">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${comboOpen ? "rotate-180" : ""}`} />
              </div>
            </button>

            {comboOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-2xl shadow-2xl border border-slate-200 dark:border-[#3F3F46] bg-white dark:bg-[#18181B] overflow-hidden">
                <div className="p-2 border-b border-slate-100 dark:border-[#27272A]">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      ref={comboInputRef}
                      type="text"
                      value={comboSearch}
                      onChange={(e) => setComboSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && filteredLeads.length > 0) {
                          handleSelectClinic(filteredLeads[0].id);
                        }
                        if (e.key === "Escape") {
                          setComboOpen(false);
                          setComboSearch("");
                        }
                      }}
                      placeholder="Search clinic, doctor, locality..."
                      className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-[#27272A] rounded-xl border border-slate-200 dark:border-[#3F3F46] text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    />
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {filteredLeads.length === 0 ? (
                    <div className="py-5 text-center text-xs text-slate-400">
                      No clinics match "{comboSearch}"
                    </div>
                  ) : (
                    filteredLeads.map((l) => {
                      const isActive = l.id === activeCallLeadId;
                      return (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => handleSelectClinic(l.id)}
                          className={`w-full flex items-center gap-3 px-3.5 py-2 text-left transition-colors cursor-pointer ${
                            isActive
                              ? "bg-slate-100 dark:bg-[#27272A] font-semibold"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          }`}
                        >
                          <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-[#27272A] border border-slate-200/80 dark:border-[#3F3F46] text-zinc-800 dark:text-zinc-200 flex items-center justify-center font-semibold text-[10px] shrink-0">
                            {l.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">{l.name}</div>
                            <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">
                              {formatDoctorName(l.doctor_name)} · {l.locality || "Delhi NCR"}
                            </div>
                          </div>
                          {isActive && <Check className="w-3.5 h-3.5 text-zinc-800 dark:text-zinc-200 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Inline Stage Selector Dropdown */}
          {activeLead && activeHustle?.stages && (
            <div className="flex items-center gap-1.5 shrink-0">
              <select
                value={activeLead.stage_id}
                onChange={(e) => handleStageChange(activeLead, Number(e.target.value))}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#18181B] border border-slate-200/80 dark:border-[#3F3F46]/80 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer shadow-xs"
                title="Update Lead Stage directly"
              >
                {activeHustle.stages.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right: Sleek High-Contrast Telemetry Badge + Track Switcher + Lead Card Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sleek High-Contrast Telemetry Badge with subtle emerald dot */}
          {activeLead && demoEngagement && (
            <div className="bg-slate-100 dark:bg-[#27272A] text-zinc-800 dark:text-zinc-200 border border-slate-200/80 dark:border-[#3F3F46] font-medium px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-[11px] shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>{demoEngagement}</span>
            </div>
          )}

          {/* Track Switcher for Modern | Premium | Warm */}
          {activeLead && (
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-[#27272A]/80 p-0.5 rounded-xl border border-slate-200/80 dark:border-[#3F3F46]/80">
              {[
                { id: "modern", label: "Modern", path: `/modern/${activeLead.slug}` },
                { id: "premium", label: "Premium", path: `/premium/${activeLead.slug}` },
                { id: "warm", label: "Warm", path: `/warm/${activeLead.slug}` },
              ].map((theme) => {
                const isTop = mostInteractedTheme === theme.id;
                return (
                  <a
                    key={theme.id}
                    href={`http://localhost:3001${theme.path}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`px-2.5 py-1 text-xs transition-all flex items-center gap-1 ${
                      isTop
                        ? "bg-white dark:bg-[#18181B] shadow-xs rounded-lg text-zinc-900 dark:text-white font-medium"
                        : "text-slate-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg font-normal"
                    }`}
                    title={`Open ${theme.label} demo (${theme.path})${isTop ? " - Top doctor interaction" : ""}`}
                  >
                    <span>{theme.label}</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </a>
                );
              })}
            </div>
          )}

          {/* Universal Lead Card Button */}
          {activeLead && (
            <button
              type="button"
              onClick={() => setSelectedLeadId(activeLead.id)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 bg-white dark:bg-[#18181B] border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-zinc-200 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-xs"
              title="Open universal Lead Card drawer"
            >
              <PanelRightOpen className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
              <span>Lead Card</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN WORKSPACE */}
      {activeLead && (
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6 items-start">
            {/* LEFT COLS: Pre-Call Prep Brief Battlecard + Log Call Form */}
            <div className="lg:col-span-7 space-y-5">
              {/* 2A. UNIFIED PRE-CALL PREP BATTLECARD */}
              <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200/80 dark:border-[#27272A] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {/* Neutral Charcoal Icon Badge */}
                    <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl w-9 h-9 flex items-center justify-center shadow-xs shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                        <span>Pre-Call Prep Brief: "What to Talk About"</span>
                        <span className="bg-slate-100 dark:bg-[#27272A] text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-[#3F3F46] text-[11px] font-medium px-2 py-0.5 rounded-md">
                          Live Battlecard
                        </span>
                      </h2>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                        Doctor: {formatDoctorName(activeLead.doctor_name)} • Phone: {activeLead.primary_phone || "Not set"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleCopyBrief}
                      className="p-2 rounded-xl text-xs font-medium bg-white dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                      title="Copy brief"
                    >
                      {copiedBrief ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => fetchCallBrief(activeLead.id, true)}
                      disabled={loadingBrief}
                      className="p-2 rounded-xl text-xs font-medium bg-white dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                      title="Force regenerate brief"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingBrief ? "animate-spin" : ""}`} />
                      <span className="hidden sm:inline">Regenerate</span>
                    </button>
                  </div>
                </div>

                {/* Refined Split Alert Card: Unresolved from Last Call */}
                {hasUnresolvedFromLastCall && latestCall && (
                  <div className="bg-slate-50/90 dark:bg-[#27272A]/60 rounded-xl border border-slate-200/80 dark:border-[#3F3F46] p-3.5 space-y-2.5">
                    {/* Header Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        <span>Unresolved from Last Call</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(latestCall.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    </div>

                    {/* Clean Pill Rows */}
                    <div className="space-y-2 text-xs">
                      {latestCall.commitments && latestCall.commitments.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mr-1">
                            Commitments:
                          </span>
                          {latestCall.commitments.map((c: any, i: number) => (
                            <span
                              key={i}
                              className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-[#3F3F46] text-zinc-800 dark:text-zinc-200 rounded-lg px-2.5 py-1 text-xs flex items-center gap-1.5 shadow-2xs"
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span>{typeof c === "string" ? c : c.what || c.raw_phrase || "Follow-up"}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {latestCall.objections && latestCall.objections.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mr-1">
                            Objections:
                          </span>
                          {latestCall.objections.map((obj: string, i: number) => (
                            <span
                              key={i}
                              className="bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-[#3F3F46] text-zinc-800 dark:text-zinc-200 rounded-lg px-2.5 py-1 text-xs flex items-center gap-1.5 shadow-2xs"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              <span>{obj}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Talking Points Checklist */}
                <div className="space-y-1.5">
                  {loadingBrief ? (
                    <div className="flex items-center gap-2 py-4 justify-center text-slate-400 text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Synthesizing past objections, commitments & doctor context...</span>
                    </div>
                  ) : parsedBriefLines.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400 space-y-2">
                      <p>No call brief generated yet.</p>
                      <button
                        type="button"
                        onClick={() => fetchCallBrief(activeLead.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate Call Brief</span>
                      </button>
                    </div>
                  ) : (
                    parsedBriefLines.map((line, idx) => {
                      const isCheckable = /^(\d+[\.\)]|\*|-|\u2022)\s*/.test(line);
                      const cleanText = line.replace(/^(\d+[\.\)]|\*|-|\u2022)\s*/, "");
                      const isChecked = Boolean(checkedBriefItems[idx]);

                      if (!isCheckable) {
                        return (
                          <div key={idx} className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 pb-1 pt-0.5">
                            {line}
                          </div>
                        );
                      }

                      return (
                        <div
                          key={idx}
                          onClick={() => toggleBriefItem(idx)}
                          className={`rounded-xl px-3.5 py-2.5 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer flex items-start gap-2.5 ${
                            isChecked
                              ? "bg-slate-50/50 dark:bg-[#18181B]/40 text-slate-400 dark:text-zinc-500 line-through border border-transparent"
                              : "bg-slate-50/70 hover:bg-slate-100/80 dark:bg-[#27272A]/50 dark:hover:bg-slate-800/80 border border-slate-200/70 dark:border-[#3F3F46]/70 shadow-2xs"
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isChecked ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-400 hover:text-zinc-900 dark:hover:text-white transition-colors" />
                            )}
                          </div>
                          <span className="leading-relaxed flex-1">{cleanText}</span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Instant Objection Rebuttals */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#27272A]">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                    <span className="font-semibold uppercase tracking-wider">Instant Objection Rebuttals</span>
                    <span className="text-[10px]">Click pill to view talking points</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {REBUTTAL_CARDS.map((reb) => {
                      const isOpen = activeRebuttalId === reb.id;
                      return (
                        <button
                          key={reb.id}
                          type="button"
                          onClick={() => setActiveRebuttalId(isOpen ? null : reb.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-2 ${
                            isOpen
                              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                              : "bg-white hover:bg-slate-50 dark:bg-[#27272A] dark:hover:bg-slate-750 border border-slate-200/90 dark:border-[#3F3F46] hover:border-zinc-900/30 dark:hover:border-slate-500 text-zinc-800 dark:text-zinc-200 shadow-2xs"
                          }`}
                        >
                          <span>{reb.title}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              isOpen
                                ? "bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900"
                                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-zinc-300"
                            }`}
                          >
                            {reb.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {activeRebuttalId && (
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#27272A]/80 border border-slate-200/80 dark:border-[#3F3F46] space-y-2 animate-in fade-in duration-150">
                      {REBUTTAL_CARDS.find((r) => r.id === activeRebuttalId)?.points.map((pt, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-zinc-800 dark:text-zinc-200">
                          <span className="text-zinc-400 font-bold shrink-0">•</span>
                          <span className="leading-relaxed">{pt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 2B. SPEEDY CALL LOGGING FORM */}
              <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200/80 dark:border-[#27272A] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#27272A] text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
                      <PhoneCall className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                        Log Raw Call Transcript
                      </h2>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                        AI will automatically extract Summary, Interests, Objections, Commitments, and Next Steps in &lt;10s.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleLogCall} className="space-y-3.5">
                  {/* Outcome and Duration with Live Timer */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                        Call Outcome
                      </label>
                      <select
                        value={outcome}
                        onChange={(e) => setOutcome(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
                      >
                        <option value="connected">Connected / Spoke to Doctor</option>
                        <option value="booked">Meeting / Demo Booked</option>
                        <option value="gatekeeper">Receptionist / Gatekeeper</option>
                        <option value="voicemail">Voicemail / No Answer</option>
                        <option value="not_interested">Not Interested</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                        Duration (seconds)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          value={durationSeconds}
                          onChange={(e) => setDurationSeconds(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-20 px-2.5 py-2 rounded-xl text-xs font-mono bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
                        />

                        {/* Presets */}
                        <div className="flex gap-1 shrink-0">
                          {[60, 180, 300].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setDurationSeconds(s)}
                              className="px-2 py-1.5 rounded-lg text-[10px] font-mono bg-slate-100 dark:bg-[#27272A] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-zinc-400 cursor-pointer"
                            >
                              {s / 60}m
                            </button>
                          ))}
                        </div>

                        {/* Refined Live Timer Pill */}
                        <button
                          type="button"
                          onClick={toggleStopwatch}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ml-auto ${
                            isTimerRunning
                              ? "bg-rose-500 text-white animate-pulse shadow-sm"
                              : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                          }`}
                          title={isTimerRunning ? "Stop live timer" : "Start live call stopwatch"}
                        >
                          {isTimerRunning ? (
                            <>
                              <Square className="w-3 h-3 fill-current" />
                              <span>Stop ({Math.floor(durationSeconds / 60)}m {durationSeconds % 60}s)</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 fill-current" />
                              <span>Live Timer</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 1-Click Quick Note Chips */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                      <span className="font-semibold">1-Click Quick Note Inserts</span>
                      <span className="text-[10px]">Appends directly to transcript</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_NOTE_CHIPS.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => handleInsertQuickNote(chip.replace(/^\+\s*/, ""))}
                          className="bg-slate-50 hover:bg-zinc-900 hover:text-white dark:bg-[#27272A] dark:hover:bg-zinc-100 dark:hover:text-zinc-900 text-slate-700 dark:text-zinc-300 border border-slate-200/80 dark:border-[#3F3F46] rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Transcript Textarea */}
                  <div>
                    <textarea
                      id="raw-transcript-input"
                      rows={3}
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder="Doctor was impressed with mobile booking speed.
Hesitant on Rs. 15,000 package.
Agreed to partner follow-up on Thursday 5pm.
Send Practo comparison PDF on WhatsApp."
                      className="w-full p-3 rounded-2xl text-xs font-mono bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 resize-y min-h-[72px] leading-relaxed"
                    />
                  </div>

                  {/* Next Follow-up Scheduler Strip */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#27272A]/60 border border-slate-200/70 dark:border-[#3F3F46]/70 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-zinc-300">
                        <Calendar className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                        <span>Schedule Next Follow-up (Optional)</span>
                      </div>
                      {followUpDate && (
                        <button
                          type="button"
                          onClick={() => {
                            setFollowUpDate("");
                            setFollowUpNote("");
                          }}
                          className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleQuickFollowUp(1, 11)}
                          className="px-2 py-1 rounded-lg text-[10px] font-medium bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#3F3F46] text-slate-600 dark:text-zinc-300 hover:border-slate-400 cursor-pointer"
                        >
                          Tomorrow 11am
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickFollowUp(2, 17)}
                          className="px-2 py-1 rounded-lg text-[10px] font-medium bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#3F3F46] text-slate-600 dark:text-zinc-300 hover:border-slate-400 cursor-pointer"
                        >
                          In 2 Days 5pm
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickFollowUp(4, 17)}
                          className="px-2 py-1 rounded-lg text-[10px] font-medium bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#3F3F46] text-slate-600 dark:text-zinc-300 hover:border-slate-400 cursor-pointer"
                        >
                          Thursday 5pm
                        </button>
                      </div>

                      <input
                        type="datetime-local"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#3F3F46] text-slate-800 dark:text-zinc-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Sticky Footer Action Bar with Polished Primary Submit Button */}
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-[#27272A]">
                    <span className="text-[11px] text-slate-400">
                      Parses structured notes & updates timeline
                    </span>

                    <button
                      type="submit"
                      disabled={isSubmitting || !rawText.trim()}
                      className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-slate-200 disabled:text-slate-400 dark:bg-zinc-100 dark:hover:bg-white dark:disabled:bg-slate-800 dark:disabled:text-slate-500 text-white dark:text-zinc-900 font-medium text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Structuring Call Notes...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Save &amp; Parse Call Log</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* RIGHT COLS: PREVIOUS CALL LOGS (Sticky on Desktop, Crisp Cards, Refined 4-Part AI Breakdown) */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4 self-start">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                    Previous Call Logs
                  </h2>
                </div>
                <span className="text-[11px] text-slate-400">
                  {callsList.length} call log{callsList.length !== 1 ? "s" : ""}
                </span>
              </div>

              {callsList.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-[#27272A] text-center space-y-3 shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#27272A] text-zinc-600 dark:text-zinc-400 flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    No Call Logs for {activeLead.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
                    Log a raw call transcript on the left to see instant AI extraction of Summary, Interests, Objections, Commitments, and Next Steps.
                  </p>
                </div>
              ) : (
                callsList.map((call) => {
                  const isExpanded = expandedCallId === call.id;

                  return (
                    <div
                      key={call.id}
                      className="bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200/80 dark:border-[#27272A] shadow-xs overflow-hidden transition-all"
                    >
                      {/* Call Card Header */}
                      <div
                        onClick={() => setExpandedCallId(isExpanded ? null : call.id)}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#27272A] text-zinc-800 dark:text-zinc-200 flex items-center justify-center font-bold text-xs shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 capitalize">
                                {call.outcome.replace("_", " ")}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#27272A] text-slate-500">
                                {call.duration_seconds}s
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(call.created_at || Date.now()).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        </div>

                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </div>

                      {/* Collapsed 1-Line Preview + Actionable Next Steps Badge */}
                      {!isExpanded && (
                        <div className="px-4 pb-3.5 pt-1 border-t border-slate-100/80 dark:border-[#27272A]/80 flex flex-col gap-1.5 text-xs bg-slate-50/40 dark:bg-[#09090B]/20">
                          <p className="text-[11px] text-slate-600 dark:text-zinc-300 line-clamp-1 leading-relaxed">
                            <span className="font-semibold text-slate-700 dark:text-zinc-200">Summary: </span>
                            {call.summary || call.raw_text || "No summary recorded."}
                          </p>

                          {call.next_steps && call.next_steps.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-[#27272A] text-zinc-700 dark:text-zinc-300 border border-slate-200 dark:border-[#3F3F46] flex items-center gap-1 truncate max-w-full">
                                <ArrowRight className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                                <span className="truncate">Next: {call.next_steps[0]}</span>
                              </span>
                              {call.next_steps.length > 1 && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  +{call.next_steps.length - 1} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Expanded 4-Part AI Breakdown Body */}
                      {isExpanded && (
                        <div className="p-4 border-t border-slate-100 dark:border-[#27272A] space-y-3.5 text-xs bg-slate-50/40 dark:bg-[#09090B]/20">
                          {/* 1. Executive Summary */}
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5 mb-2">
                              <FileText className="w-3.5 h-3.5" />
                              <span>1. Executive Summary</span>
                            </div>
                            <p className="p-2.5 rounded-xl bg-white dark:bg-[#27272A]/90 border border-slate-200/70 dark:border-[#3F3F46]/70 text-zinc-800 dark:text-zinc-200 leading-relaxed shadow-2xs">
                              {call.summary || "No summary generated."}
                            </p>
                          </div>

                          {/* 2. Lead Interests & Motivations */}
                          <div className="border-t border-slate-100 dark:border-[#27272A]/80 pt-3 mt-3">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5 mb-2">
                              <Target className="w-3.5 h-3.5" />
                              <span>2. Lead Interests &amp; Motivations</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white dark:bg-[#27272A]/90 border border-slate-200/70 dark:border-[#3F3F46]/70 space-y-1 shadow-2xs">
                              {call.interests && call.interests.length > 0 ? (
                                call.interests.map((interest, idx) => (
                                  <div key={idx} className="flex items-start gap-1.5 text-zinc-800 dark:text-zinc-200">
                                    <span className="text-emerald-500 font-bold">•</span>
                                    <span>{interest}</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-slate-400 italic">No specific interests detected.</span>
                              )}
                            </div>
                          </div>

                          {/* 3. Objections Raised */}
                          <div className="border-t border-slate-100 dark:border-[#27272A]/80 pt-3 mt-3">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5 mb-2">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>3. Objections Raised</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white dark:bg-[#27272A]/90 border border-slate-200/70 dark:border-[#3F3F46]/70 space-y-1 shadow-2xs">
                              {call.objections && call.objections.length > 0 ? (
                                call.objections.map((obj, idx) => (
                                  <div key={idx} className="flex items-start gap-1.5 text-zinc-800 dark:text-zinc-200">
                                    <span className="text-amber-500 font-bold">•</span>
                                    <span>{obj}</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-slate-400 italic">No major objections raised.</span>
                              )}
                            </div>
                          </div>

                          {/* 4. Commitments Made (Structured Rows with You vs Doctor Badges) */}
                          <div className="border-t border-slate-100 dark:border-[#27272A]/80 pt-3 mt-3">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5 mb-2">
                              <CalendarCheck className="w-3.5 h-3.5" />
                              <span>4. Commitments Made</span>
                            </div>
                            <div className="space-y-1.5">
                              {call.commitments && call.commitments.length > 0 ? (
                                call.commitments.map((c, idx) => {
                                  const whoStr = typeof c === "object" && c.who_owes_it ? String(c.who_owes_it).trim() : "";
                                  const isYou = /^(us|me|our|we|you)$/i.test(whoStr);
                                  const whatStr = typeof c === "string" ? c : c.what || c.raw_phrase || "Follow-up commitment";
                                  const dueStr = typeof c === "object" && c.due_at ? ` (Due: ${new Date(c.due_at).toLocaleDateString()})` : "";

                                  return (
                                    <div
                                      key={idx}
                                      className="bg-slate-50 dark:bg-[#27272A]/60 border border-slate-200/70 dark:border-[#3F3F46]/70 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 flex items-start gap-2 shadow-2xs"
                                    >
                                      {isYou ? (
                                        <span className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0">
                                          You
                                        </span>
                                      ) : (
                                        <span className="bg-slate-200 dark:bg-slate-700 text-zinc-800 dark:text-zinc-200 text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0">
                                          Doctor
                                        </span>
                                      )}
                                      <span className="leading-relaxed flex-1">
                                        {whatStr}{dueStr}
                                      </span>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="p-2.5 rounded-xl bg-white dark:bg-[#27272A]/90 border border-slate-200/70 dark:border-[#3F3F46]/70 text-slate-400 italic shadow-2xs">
                                  No formal commitments registered.
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 5. Actionable Next Steps (if present) */}
                          {call.next_steps && call.next_steps.length > 0 && (
                            <div className="border-t border-slate-100 dark:border-[#27272A]/80 pt-3 mt-3">
                              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5 mb-2">
                                <ArrowRight className="w-3.5 h-3.5" />
                                <span>5. Actionable Next Steps</span>
                              </div>
                              <div className="p-2.5 rounded-xl bg-white dark:bg-[#27272A]/90 border border-slate-200/70 dark:border-[#3F3F46]/70 space-y-1 shadow-2xs">
                                {call.next_steps.map((step, idx) => (
                                  <div key={idx} className="text-zinc-800 dark:text-zinc-200 flex items-start gap-1.5">
                                    <span className="text-purple-500 font-bold">→</span>
                                    <span>{step}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
