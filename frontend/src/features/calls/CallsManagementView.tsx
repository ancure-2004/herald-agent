"use client";

import React, { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { apiFetch } from "@/lib/api/client";
import { Lead } from "@/types";

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
    setSelectedLeadId,
    openLogCallModal,
    notify,
    loadAll,
  } = useCRM();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [callBrief, setCallBrief] = useState<CallBrief | null>(null);
  const [loadingBrief, setLoadingBrief] = useState<boolean>(false);
  const [copiedBrief, setCopiedBrief] = useState<boolean>(false);

  // Inline Log Call Form state
  const [rawText, setRawText] = useState<string>("");
  const [durationSeconds, setDurationSeconds] = useState<number>(180);
  const [outcome, setOutcome] = useState<string>("connected");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Past calls
  const [callsList, setCallsList] = useState<StructuredCall[]>([]);
  const [expandedCallId, setExpandedCallId] = useState<number | null>(null);

  const activeLead = useMemo(() => {
    return leads.find((l) => l.id === selectedLeadId) || leads[0] || null;
  }, [leads, selectedLeadId]);

  // Fetch pre-call prep brief for active lead
  const fetchCallBrief = async (leadId: number) => {
    setLoadingBrief(true);
    try {
      const res = await apiFetch<CallBrief>(`/api/leads/${leadId}/call-brief`);
      setCallBrief(res);
    } catch {
      // Fallback structured brief
      setCallBrief({
        lead_id: leadId,
        clinic_name: activeLead?.name || "Dental Clinic",
        doctor_name: activeLead?.doctor_name || "Doctor",
        prep_brief: `Context for Dr. ${activeLead?.doctor_name || "Doctor"}:
1. Focus on mobile patient discovery in ${activeLead?.locality || "Delhi NCR"}.
2. Address objection regarding Practo integration by showing WhatsApp direct-to-OPD booking button.
3. Offer the 14-day risk-free preview link: https://preview.dentalos.in/${activeLead?.slug || "demo"}.
4. Goal for this call: Confirm partner decision meeting date.`,
      });
    } finally {
      setLoadingBrief(false);
    }
  };

  useEffect(() => {
    if (activeLead?.id) {
      fetchCallBrief(activeLead.id);
    }
  }, [activeLead?.id]);

  // Handle inline call logging
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

      // Add to calls list
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

  // Filtered leads for selector
  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return leads;
    const q = searchQuery.toLowerCase().trim();
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.doctor_name || "").toLowerCase().includes(q) ||
        (l.locality || "").toLowerCase().includes(q) ||
        (l.primary_phone || "").toLowerCase().includes(q)
    );
  }, [leads, searchQuery]);

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto text-slate-900 dark:text-slate-100 p-1">
      {/* Top Banner & Active Lead Selector */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
            <PhoneCall className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight">Calls & Structured Briefs</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                AI Copilot Active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Transform raw call conversations into 5 structured sections & pre-call intelligence briefs.
            </p>
          </div>
        </div>

        {/* Quick Search & Clinic Dropdown Selector */}
        <div className="w-full md:w-96 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Selected Lead / Clinic ({filteredLeads.length} of {leads.length}):
            </label>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Clear filter
              </button>
            )}
          </div>

          {/* Quick Prominent Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filteredLeads.length > 0) {
                  setSelectedLeadId(filteredLeads[0].id);
                }
              }}
              placeholder="Search clinic, doctor, or phone..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Real-time Filtered Dropdown */}
          <select
            value={activeLead?.id || ""}
            onChange={(e) => setSelectedLeadId(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {filteredLeads.length === 0 ? (
              <option value="" disabled>
                No clinics match "{searchQuery}"
              </option>
            ) : (
              filteredLeads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} - Dr. {l.doctor_name || "Doctor"} ({l.locality || "Delhi NCR"})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {activeLead && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT 7 COLS: Pre-Call Prep Brief Card + Log Call Form */}
          <div className="lg:col-span-7 space-y-6">
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
                      Doctor: Dr. {activeLead.doctor_name || "Doctor"} • Phone: {activeLead.primary_phone || "Not set"}
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

          {/* RIGHT 5 COLS: 5-Section AI Structured Notes Display */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  5-Section Structured Notes
                </h2>
              </div>
              <span className="text-[11px] text-slate-400">
                {callsList.length} calls logged this session
              </span>
            </div>

            {callsList.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No Calls Structured In Current Session
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
  );
}
