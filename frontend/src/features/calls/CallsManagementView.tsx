"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  PhoneCall,
  Sparkles,
  Clock,
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
  User,
  X,
  PanelRightOpen,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { apiFetch } from "@/lib/api/client";
import { Lead } from "@/types";
import { LeadDetailContent } from "@/features/modals/LeadDetailModal";

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

export function CallsManagementView() {
  const {
    leads,
    selectedLeadId,
    sidebarCollapsed,
    setSidebarCollapsed,
    // Note: setSelectedLeadId intentionally NOT called when switching clinics
    // inside CallsManagementView to avoid opening the global LeadDetailModal.
    openLogCallModal,
    notify,
    loadAll,
  } = useCRM();

  // ---------------------------------------------------------------------------
  // Side-by-side docked Lead Card & sidebar auto-collapse tracking
  // ---------------------------------------------------------------------------
  const [isLeadCardDocked, setIsLeadCardDocked] = useState<boolean>(false);
  const prevSidebarCollapsedRef = useRef<boolean | null>(null);

  const handleToggleDockedLeadCard = () => {
    if (!isLeadCardDocked) {
      prevSidebarCollapsedRef.current = sidebarCollapsed;
      setSidebarCollapsed(true);
      setIsLeadCardDocked(true);
    } else {
      handleCloseDockedLeadCard();
    }
  };

  const handleCloseDockedLeadCard = () => {
    setIsLeadCardDocked(false);
    if (prevSidebarCollapsedRef.current !== null) {
      setSidebarCollapsed(prevSidebarCollapsedRef.current);
      prevSidebarCollapsedRef.current = null;
    }
  };

  // Restore sidebar state if unmounted while docked Lead Card is open
  useEffect(() => {
    return () => {
      if (prevSidebarCollapsedRef.current !== null) {
        setSidebarCollapsed(prevSidebarCollapsedRef.current);
      }
    };
  }, [setSidebarCollapsed]);

  // ---------------------------------------------------------------------------
  // Local clinic selection - does NOT touch the global selectedLeadId so the
  // LeadDetailModal stays closed while the user works inside this view.
  // ---------------------------------------------------------------------------
  const [activeCallLeadId, setActiveCallLeadId] = useState<number | null>(() => {
    return selectedLeadId || (leads[0]?.id ?? null);
  });

  // Keep combobox in sync when leads list first loads or selectedLeadId changes
  // from outside (e.g. user clicked a lead row in the table view before coming here).
  useEffect(() => {
    if (selectedLeadId && selectedLeadId !== activeCallLeadId) {
      setActiveCallLeadId(selectedLeadId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLeadId]);

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

  // Close combobox on outside click
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
  // Pre-call prep brief
  // ---------------------------------------------------------------------------
  const [callBrief, setCallBrief] = useState<CallBrief | null>(null);
  const [loadingBrief, setLoadingBrief] = useState<boolean>(false);
  const [copiedBrief, setCopiedBrief] = useState<boolean>(false);

  const fetchCallBrief = useCallback(async (leadId: number) => {
    setLoadingBrief(true);
    try {
      const res = await apiFetch<CallBrief>(`/api/leads/${leadId}/call-brief`);
      setCallBrief(res);
    } catch {
      const lead = leads.find((l) => l.id === leadId);
      setCallBrief({
        lead_id: leadId,
        clinic_name: lead?.name || "Dental Clinic",
        doctor_name: lead?.doctor_name || "Doctor",
        prep_brief: `Context for ${formatDoctorName(lead?.doctor_name)}:
1. Focus on mobile patient discovery in ${lead?.locality || "Delhi NCR"}.
2. Address objection regarding Practo integration by showing WhatsApp direct-to-OPD booking button.
3. Offer the 14-day risk-free preview link: https://preview.dentalos.in/${lead?.slug || "demo"}.
4. Goal for this call: Confirm partner decision meeting date.`,
      });
    } finally {
      setLoadingBrief(false);
    }
  }, [leads]);

  // ---------------------------------------------------------------------------
  // Past calls - loaded whenever active clinic changes
  // ---------------------------------------------------------------------------
  const [callsList, setCallsList] = useState<StructuredCall[]>([]);
  const [expandedCallId, setExpandedCallId] = useState<number | null>(null);

  const loadCallsForLead = useCallback(async (lead: any) => {
    // Optimistically seed from inline data if available
    const inlineCalls: StructuredCall[] = Array.isArray((lead as any)?.calls) ? (lead as any).calls : [];
    if (inlineCalls.length > 0) {
      setCallsList(inlineCalls);
      setExpandedCallId(inlineCalls[0]?.id ?? null);
    } else {
      setCallsList([]);
      setExpandedCallId(null);
    }

    // Then fetch from API
    try {
      const loaded = await apiFetch<StructuredCall[]>(`/api/leads/${lead.id}/calls`);
      const arr = Array.isArray(loaded) ? loaded : [];
      setCallsList(arr);
      setExpandedCallId(arr[0]?.id ?? null);
    } catch {
      // Keep inline seed
      if (inlineCalls.length === 0) setCallsList([]);
    }
  }, []);

  // Trigger on clinic switch
  useEffect(() => {
    if (!activeLead) return;
    fetchCallBrief(activeLead.id);
    loadCallsForLead(activeLead);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLead?.id]);

  // ---------------------------------------------------------------------------
  // Inline Log Call Form
  // ---------------------------------------------------------------------------
  const [rawText, setRawText] = useState<string>("");
  const [durationSeconds, setDurationSeconds] = useState<number>(180);
  const [outcome, setOutcome] = useState<string>("connected");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleLogCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim() || !activeLead) {
      notify("Please enter the raw call transcript or notes", "err");
      return;
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
      notify(`Call structured successfully for ${activeLead.name}!`, "ok");
      await loadAll();
      await fetchCallBrief(activeLead.id);
    } catch (err: any) {
      notify(err.message || "Failed to log call", "err");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyBrief = () => {
    if (!callBrief?.prep_brief) return;
    navigator.clipboard.writeText(callBrief.prep_brief);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2000);
    notify("Call preparation brief copied to clipboard", "ok");
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="h-full flex overflow-hidden gap-3 sm:gap-4 text-slate-900 dark:text-slate-100">
      {/* Calls & Briefs Main Workspace */}
      <div className="flex-1 min-w-0 h-full flex flex-col gap-4 overflow-y-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Floating Top Controls: Clinic Selector & Lead Card Action (No outer bar wrapper) */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shrink-0">
          {/* Unified Searchable Combobox */}
          <div ref={comboRef} className="w-full sm:w-80 md:w-96 relative">
            {/* Trigger button - shows currently selected clinic */}
            <button
              type="button"
              onClick={() => {
                setComboOpen((v) => !v);
                if (!comboOpen) {
                  setTimeout(() => comboInputRef.current?.focus(), 50);
                }
              }}
              className="w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-xs hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer text-left"
            >
              {activeLead ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center font-bold text-[11px] text-indigo-600 dark:text-indigo-400 shrink-0">
                    {activeLead.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{activeLead.name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {formatDoctorName(activeLead.doctor_name)} · {activeLead.locality || "Delhi NCR"}
                      {activeLead.primary_phone ? ` · ${activeLead.primary_phone}` : ""}
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

            {/* Dropdown */}
            {comboOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
                {/* Search inside dropdown */}
                <div className="p-2 border-b border-slate-100 dark:border-slate-800">
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
                      placeholder="Search clinic, doctor, locality, phone..."
                      className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                </div>

                {/* Results list */}
                <div className="max-h-72 overflow-y-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {filteredLeads.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
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
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                            isActive
                              ? "bg-indigo-50 dark:bg-indigo-950/60"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          }`}
                        >
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center font-bold text-[10px] text-indigo-600 dark:text-indigo-400 shrink-0">
                            {l.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">{l.name}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {formatDoctorName(l.doctor_name)} · {l.locality || "Delhi NCR"}
                              {l.primary_phone ? ` · ${l.primary_phone}` : ""}
                            </div>
                          </div>
                          {isActive && <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Lead Card Toggle Button */}
          {activeLead && (
            <button
              type="button"
              onClick={handleToggleDockedLeadCard}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ml-auto shadow-xs ${
                isLeadCardDocked
                  ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300"
                  : "bg-white dark:bg-[#141721] border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              }`}
              title="Toggle side-by-side Lead Card"
            >
              <PanelRightOpen className="w-3.5 h-3.5" />
              <span>Lead Card</span>
            </button>
          )}
        </div>

        {activeLead && (
          <div className={`grid grid-cols-1 ${isLeadCardDocked ? "xl:grid-cols-12" : "lg:grid-cols-12"} gap-6`}>
            {/* LEFT COLS: Pre-Call Prep Brief Card + Log Call Form */}
            <div className={`${isLeadCardDocked ? "xl:col-span-7" : "lg:col-span-7"} space-y-6`}>
              {/* 1. PRE-CALL PREP BRIEF CARD */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-500/5 via-white to-purple-500/5 dark:from-indigo-950/40 dark:via-slate-900 dark:to-purple-950/30 border border-indigo-200/80 dark:border-indigo-800/60 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Pre-Call Prep Brief: "What to Talk About"
                      </h2>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Doctor: {formatDoctorName(activeLead.doctor_name)} • Phone: {activeLead.primary_phone || "Not set"}
                      </p>
                    </div>
                  </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCopyBrief}
                    className="p-2 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1"
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
                    onClick={() => fetchCallBrief(activeLead.id)}
                    disabled={loadingBrief}
                    className="p-2 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                    title="Refresh brief"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingBrief ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Brief Content Box */}
              <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-indigo-100 dark:border-indigo-900/40 text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-sans shadow-inner">
                {loadingBrief ? (
                  <div className="flex items-center gap-2 py-4 justify-center text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Synthesizing past objections, commitments & doctor context...</span>
                  </div>
                ) : (
                  callBrief?.prep_brief || "No prep brief available for this lead yet."
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Combines structured call notes + WhatsApp thread history</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  Ready for follow-up call
                </span>
              </div>
            </div>

            {/* 2. LOG RAW CALL CONVERSATION FORM */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Log Raw Call Transcript
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      AI will automatically parse summary, interests, objections, commitments, and next steps in &lt;10s.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleLogCall} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Call Outcome
                    </label>
                    <select
                      value={outcome}
                      onChange={(e) => setOutcome(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="connected">Connected / Spoke to Doctor</option>
                      <option value="booked">Meeting / Demo Booked</option>
                      <option value="gatekeeper">Receptionist / Gatekeeper</option>
                      <option value="voicemail">Voicemail / No Answer</option>
                      <option value="not_interested">Not Interested</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Duration (seconds)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        value={durationSeconds}
                        onChange={(e) => setDurationSeconds(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="flex gap-1 shrink-0">
                        {[60, 180, 300].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setDurationSeconds(s)}
                            className="px-2 py-2 rounded-lg text-[10px] font-mono bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
                          >
                            {s / 60}m
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Raw Call Conversation Transcript or Freeform Notes
                  </label>
                  <textarea
                    rows={6}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Doctor was impressed with the patient appointment booking speed on mobile.
Expressed hesitation regarding pricing (Rs. 15,000 package).
Agreed to a partner follow-up on Thursday 5pm.
Next step: send the comparison PDF on WhatsApp."
                    className="w-full p-3.5 rounded-2xl text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || !rawText.trim()}
                    className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Structuring Call Notes...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Log Call & Run AI Structuring</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* RIGHT COLS: Previous Call Logs */}
          <div className={`${isLeadCardDocked ? "xl:col-span-5" : "lg:col-span-5"} space-y-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Previous Call Logs
                </h2>
              </div>
              <span className="text-[11px] text-slate-400">
                {callsList.length} call log{callsList.length !== 1 ? "s" : ""} for {activeLead.name}
              </span>
            </div>

            {callsList.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No Call Logs for {activeLead.name}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Log a raw call transcript on the left to see instant AI extraction of Summary, Interests, Objections, Commitments, and Next Steps.
                </p>
              </div>
            ) : (
              callsList.map((call) => {
                const isExpanded = expandedCallId === call.id;

                return (
                  <div
                    key={call.id}
                    className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all"
                  >
                    {/* Call Card Header */}
                    <div
                      onClick={() => setExpandedCallId(isExpanded ? null : call.id)}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 capitalize">
                              {call.outcome.replace("_", " ")}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
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
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>

                    {/* 5-Section Notes Body */}
                    {isExpanded && (
                      <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-4 text-xs bg-slate-50/50 dark:bg-slate-950/20">
                        {/* 1. Summary */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <FileText className="w-3.5 h-3.5 text-indigo-500" />
                            <span>1. Executive Summary</span>
                          </div>
                          <p className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 leading-relaxed">
                            {call.summary || "No summary generated."}
                          </p>
                        </div>

                        {/* 2. Lead Interests */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <Target className="w-3.5 h-3.5 text-emerald-500" />
                            <span>2. Lead Interests & Motivations</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                            {call.interests && call.interests.length > 0 ? (
                              call.interests.map((interest, idx) => (
                                <div key={idx} className="flex items-start gap-1.5 text-emerald-700 dark:text-emerald-300">
                                  <span>•</span>
                                  <span>{interest}</span>
                                </div>
                              ))
                            ) : (
                              <span className="text-slate-400 italic">No specific interests detected.</span>
                            )}
                          </div>
                        </div>

                        {/* 3. Objections */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                            <span>3. Objections Raised</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                            {call.objections && call.objections.length > 0 ? (
                              call.objections.map((obj, idx) => (
                                <div key={idx} className="flex items-start gap-1.5 text-amber-700 dark:text-amber-300">
                                  <span>•</span>
                                  <span>{obj}</span>
                                </div>
                              ))
                            ) : (
                              <span className="text-slate-400 italic">No major objections raised.</span>
                            )}
                          </div>
                        </div>

                        {/* 4. Commitments */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <CalendarCheck className="w-3.5 h-3.5 text-blue-500" />
                            <span>4. Commitments Made</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                            {call.commitments && call.commitments.length > 0 ? (
                              call.commitments.map((c, idx) => (
                                <div key={idx} className="text-blue-700 dark:text-blue-300 flex items-start gap-1.5">
                                  <Check className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                                  <span>
                                    {typeof c === "string"
                                      ? c
                                      : `${c.who_owes_it || "Lead"} committed to: ${c.what || c.raw_phrase || "follow-up"} ${
                                          c.due_at ? `(Due: ${new Date(c.due_at).toLocaleDateString()})` : ""
                                        }`}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span className="text-slate-400 italic">No formal commitments registered.</span>
                            )}
                          </div>
                        </div>

                        {/* 5. Next Steps */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <ArrowRight className="w-3.5 h-3.5 text-purple-500" />
                            <span>5. Actionable Next Steps</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                            {call.next_steps && call.next_steps.length > 0 ? (
                              call.next_steps.map((step, idx) => (
                                <div key={idx} className="text-purple-700 dark:text-purple-300 flex items-start gap-1.5">
                                  <span>→</span>
                                  <span>{step}</span>
                                </div>
                              ))
                            ) : (
                              <span className="text-slate-400 italic">No next steps noted.</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
      </div>

      {/* RIGHTMOST DOCKED PANEL: Side-by-Side Lead Card */}
      {isLeadCardDocked && activeLead && (
        <div className="w-full sm:w-[420px] md:w-[450px] lg:w-[460px] shrink-0 h-full flex flex-col rounded-3xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in slide-in-from-right duration-200">
          <LeadDetailContent lead={activeLead} onClose={handleCloseDockedLeadCard} isDocked={true} />
        </div>
      )}
    </div>
  );
}
