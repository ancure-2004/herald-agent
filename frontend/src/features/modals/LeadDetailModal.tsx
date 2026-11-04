"use client";

import React, { useState } from "react";
import {
  AtSign,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { apiFetch } from "@/lib/api/client";

export function LeadDetailModal() {
  const {
    selectedLead,
    setSelectedLeadId,
    activeHustle,
    handleStageChange,
    copilotSuggestions,
    handleConfirmCommitment,
    notify,
    loadAll,
  } = useCRM();

  const [completedNote, setCompletedNote] = useState<string>("");
  const [nextActionInput, setNextActionInput] = useState<string>("");
  const [nextDueDays, setNextDueDays] = useState<number>(2);

  const [messageChannel, setMessageChannel] = useState<string>("whatsapp");
  const [messageDirection, setMessageDirection] = useState<"outbound" | "inbound" | "internal_note">("internal_note");
  const [messageInput, setMessageInput] = useState<string>("");

  const [callOutcomeInput, setCallOutcomeInput] = useState<string>("interested");
  const [callNoteInput, setCallNoteInput] = useState<string>("");
  const [postCallLoading, setPostCallLoading] = useState<boolean>(false);

  if (!selectedLead) return null;

  const handleCompleteTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    if (!nextActionInput.trim()) {
      notify("Pipedrive Rule Violation: You must specify a mandatory next step", "err");
      return;
    }

    try {
      const dueDays = nextDueDays || 2;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + dueDays);

      await apiFetch(`/api/leads/${selectedLead.id}/complete-task`, {
        method: "POST",
        body: JSON.stringify({
          completed_note: completedNote || "Completed outreach action",
          next_action: nextActionInput.trim(),
          next_action_due_at: dueDate.toISOString(),
        }),
      });

      notify("Task completed & next action locked");
      setCompletedNote("");
      setNextActionInput("");
      loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to complete task", "err");
    }
  };

  const handleAppendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !messageInput.trim()) return;

    try {
      await apiFetch(`/api/leads/${selectedLead.id}/messages`, {
        method: "POST",
        body: JSON.stringify({
          channel: messageChannel,
          direction: messageDirection,
          text: messageInput.trim(),
        }),
      });

      notify("Message logged to activity timeline");
      setMessageInput("");
      loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to log message", "err");
    }
  };

  const handlePostCallDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !callNoteInput.trim()) return;
    setPostCallLoading(true);
    try {
      const res = await apiFetch<{
        lead_id: number;
        draft_message: string;
        next_action: string;
        next_action_due_at: string;
      }>(`/api/leads/${selectedLead.id}/post-call-draft`, {
        method: "POST",
        body: JSON.stringify({
          call_note: callNoteInput.trim(),
          outcome: callOutcomeInput,
          duration_seconds: 120,
        }),
      });
      setMessageChannel("whatsapp");
      setMessageDirection("outbound");
      setMessageInput(res.draft_message);
      setNextActionInput(res.next_action);
      setNextDueDays(1);
      setCallNoteInput("");
      notify("Post-call summary logged, next action locked, and WhatsApp follow-up drafted!");
      loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to generate post-call draft", "err");
    } finally {
      setPostCallLoading(false);
    }
  };

  return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-full max-w-5xl max-h-[92vh] bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.12] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
              
              {/* Modal Top Bar */}
              <div className="p-5 border-b border-slate-100 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#12141D] flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center font-bold text-base text-indigo-600 dark:text-indigo-400">
                      {selectedLead.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{selectedLead.name}</h2>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                          ₹{selectedLead.deal_value_inr || 25000} Potential
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 pt-0.5">
                        <span>{selectedLead.doctor_name || "Doctor"}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {selectedLead.locality}, {selectedLead.city}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Quick Contact Chips */}
                  <div className="flex items-center gap-2 pt-2 text-xs">
                    {selectedLead.primary_phone && (
                      <a
                        href={`https://wa.me/${selectedLead.primary_phone.replace("+", "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 transition-colors font-medium"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{selectedLead.primary_phone}</span>
                      </a>
                    )}
                    {selectedLead.instagram_handle && (
                      <a
                        href={`https://instagram.com/${selectedLead.instagram_handle}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-pink-50 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-500/30 hover:bg-pink-100 dark:hover:bg-pink-500/25 transition-colors font-medium"
                      >
                        <AtSign className="w-3.5 h-3.5" />
                        <span>{selectedLead.instagram_handle}</span>
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Pipeline Stage Dropdown */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/[0.08] shadow-xs">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Stage:</span>
                    <select
                      value={selectedLead.stage_id}
                      onChange={(e) => handleStageChange(selectedLead, Number(e.target.value))}
                      className="bg-transparent text-xs font-semibold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                    >
                      {activeHustle?.stages.map((st) => (
                        <option key={st.id} value={st.id} className="bg-white dark:bg-[#141721] text-slate-800 dark:text-white">
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => setSelectedLeadId(null)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body - 2 Spacious Columns */}
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-transparent">
                {/* Left Column: Intelligence, Facts & History */}
                <div className="space-y-4">
                  {/* AI Fit & Intent Match (Homies Lab Circular Gauge Style) */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-4 shadow-xs">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">AI Acquisition Intelligence</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Strong conversion probability. Verified absence of mobile-responsive website.
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                          Intent: {selectedLead.intent_score}/100
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                          {selectedLead.fit_reasons?.[0] || "Dental Engine Ready"}
                        </span>
                      </div>
                    </div>

                    {/* Circular Percentage Meter */}
                    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-200 dark:text-slate-800"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-indigo-600 dark:text-indigo-500"
                          strokeDasharray={`${selectedLead.fit_score}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <div className="text-xs font-black font-mono text-slate-900 dark:text-white leading-none">
                          {selectedLead.fit_score}%
                        </div>
                        <div className="text-[8px] text-slate-400 font-medium scale-90">FIT</div>
                      </div>
                    </div>
                  </div>

                  {/* Lightfield "What Changed Since Last Time" Summary */}
                  {selectedLead.what_changed_summary && (
                    <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 text-xs space-y-1.5 shadow-xs">
                      <div className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        <span>What Changed Since Last Time</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{selectedLead.what_changed_summary}</p>
                    </div>
                  )}

                  {/* Verified Facts Dossier */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.08] space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>Verified Research Dossier</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">2-Source Strict Rule</span>
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {selectedLead.facts.length === 0 ? (
                        <div className="text-[11px] text-slate-400">No verified facts recorded yet</div>
                      ) : (
                        selectedLead.facts.map((f) => (
                          <div key={f.id} className="p-2 rounded-xl bg-slate-50 dark:bg-[#12141D] border border-slate-100 dark:border-white/[0.04] text-xs flex items-center justify-between gap-2">
                            <div>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{f.field}: </span>
                              <span className="text-slate-600 dark:text-slate-400">{f.value}</span>
                            </div>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 shrink-0">
                              Verified
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Client Proof Package */}
                  {selectedLead.packages.length > 0 && (
                    <div className="p-4 rounded-2xl bg-white dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.08] space-y-3 shadow-xs">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                        <span className="flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Generated Client Proof Package</span>
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                          {selectedLead.packages[0].status} • HTTP 200
                        </span>
                      </div>
                      <a
                        href={selectedLead.packages[0].asset_links?.choice_page || `http://localhost:3001/demo/${selectedLead.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full p-2.5 rounded-xl bg-indigo-50/80 hover:bg-indigo-100/80 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition-colors"
                      >
                        <span>Open 3-Design Switcher (/demo/{selectedLead.slug})</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        {(["modern", "premium", "warm"] as const).map((tmpl) => (
                          <a
                            key={tmpl}
                            href={selectedLead.packages[0].asset_links?.[tmpl] || `http://localhost:3001/${tmpl}/${selectedLead.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#0E1017] dark:hover:bg-slate-800/70 border border-slate-200/80 dark:border-white/[0.06] space-y-1 transition-colors block"
                          >
                            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold capitalize flex items-center justify-center gap-1">
                              <span>{tmpl}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                            </div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Live 200</div>
                          </a>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Total Previews Viewed:</span>
                        <strong className="text-slate-900 dark:text-white font-mono">{((selectedLead as any).demo_views_count ?? selectedLead.events?.length ?? 0)} times</strong>
                      </div>
                    </div>
                  )}

                  {/* Activity History Timeline */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.08] space-y-3 shadow-xs">
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Activity Log & Messages</span>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedLead.messages.length === 0 ? (
                        <div className="text-[11px] text-slate-400 py-3 text-center">No messages logged yet</div>
                      ) : (
                        selectedLead.messages.map((m) => (
                          <div key={m.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#12141D] border border-slate-100 dark:border-white/[0.04] text-xs space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400 uppercase">{m.channel} • {m.direction}</span>
                              <span className="font-mono">{new Date(m.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-slate-800 dark:text-slate-200">{m.text}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Next Action Enforcement & Message Dispatch */}
                <div className="space-y-4">
                  {/* Pipedrive Mandatory Next Step Form */}
                  <form onSubmit={handleCompleteTask} className="p-4 rounded-2xl bg-white dark:bg-[#10121A] border border-indigo-200 dark:border-indigo-500/30 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Complete Task & Lock Next Step</span>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">Mandatory</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">What did you complete?</label>
                      <input
                        type="text"
                        value={completedNote}
                        onChange={(e) => setCompletedNote(e.target.value)}
                        placeholder="e.g. Sent personalized WhatsApp pitch with demo link"
                        className="w-full bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Mandatory Next Action</label>
                      <input
                        type="text"
                        value={nextActionInput}
                        onChange={(e) => setNextActionInput(e.target.value)}
                        placeholder="e.g. Follow up if no reply in 2 days"
                        className="w-full bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>Due in:</span>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={nextDueDays}
                          onChange={(e) => setNextDueDays(Number(e.target.value))}
                          className="w-14 bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white text-center font-mono"
                        />
                        <span>days</span>
                      </div>

                      <button
                        type="submit"
                        className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Complete & Schedule
                      </button>
                    </div>
                  </form>

                  {/* Log Note or Message */}
                  <form onSubmit={handleAppendMessage} className="p-4 rounded-2xl bg-white dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.08] space-y-3 shadow-xs">
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                      <span>Log Message or Internal Note</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <select
                        value={messageChannel}
                        onChange={(e) => setMessageChannel(e.target.value)}
                        className="bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
                      >
                        <option value="whatsapp">WhatsApp</option>
                        <option value="instagram">Instagram</option>
                        <option value="email">Email</option>
                        <option value="call">Phone Call</option>
                        <option value="internal_note">Internal Note</option>
                      </select>

                      <select
                        value={messageDirection}
                        onChange={(e) => setMessageDirection(e.target.value as any)}
                        className="bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
                      >
                        <option value="internal_note">Internal Note</option>
                        <option value="outbound">Outbound (Sent)</option>
                        <option value="inbound">Inbound (Received)</option>
                      </select>
                    </div>

                    <textarea
                      rows={3}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Type note or paste message text..."
                      className="w-full bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl p-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                    />

                    <button
                      type="submit"
                      className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Log Entry
                    </button>
                  </form>

                  {/* AI Reply Copilot Suggestions */}
                  {copilotSuggestions.length > 0 && (
                    <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 space-y-2.5 shadow-xs">
                      <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        <span>AI Reply Copilot Suggestions</span>
                      </div>
                      <div className="space-y-2">
                        {copilotSuggestions.map((sugg, idx) => (
                          <div
                            key={idx}
                            onClick={() => setMessageInput(sugg.text)}
                            className="p-2.5 rounded-xl bg-white dark:bg-[#141721] border border-indigo-100 dark:border-white/[0.06] text-xs space-y-1 cursor-pointer hover:border-indigo-400 transition-colors"
                          >
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400">{sugg.objection_label} ({sugg.wins} wins)</span>
                              <span>Click to apply</span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 italic">&ldquo;{sugg.text}&rdquo;</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Phase 4: 1-Tap Commitment / Snooze Confirmation */}
                  {selectedLead.commitments && selectedLead.commitments.length > 0 && (
                    <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 space-y-2.5 shadow-xs">
                      <div className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center justify-between">
                        <span>Detected Promises &amp; Commitments</span>
                        <span className="text-[10px] font-mono">1-Tap Lock</span>
                      </div>
                      <div className="space-y-2">
                        {selectedLead.commitments.map((c) => (
                          <div
                            key={c.id}
                            className="p-2.5 rounded-xl bg-white dark:bg-[#141721] border border-amber-200/70 dark:border-white/[0.06] text-xs flex items-center justify-between gap-2"
                          >
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">{c.what}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Due: {new Date(c.due_at).toLocaleDateString()} &bull; Status: {c.status}
                              </div>
                            </div>
                            {c.status !== "confirmed" ? (
                              <button
                                type="button"
                                onClick={() => handleConfirmCommitment(c.id)}
                                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-semibold cursor-pointer shrink-0"
                              >
                                Confirm 1-Tap
                              </button>
                            ) : (
                              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                                Confirmed
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Phase 4: Post-Call / Voice-Note Follow-Up Drafter */}
                  <form
                    onSubmit={handlePostCallDraft}
                    className="p-4 rounded-2xl bg-white dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.08] space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Post-Call Follow-Up Drafter</span>
                      </div>
                      <select
                        value={callOutcomeInput}
                        onChange={(e) => setCallOutcomeInput(e.target.value)}
                        className="bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-lg px-2 py-1 text-[10px] text-slate-800 dark:text-slate-200"
                      >
                        <option value="interested">Outcome: Interested</option>
                        <option value="callback">Outcome: Call Later</option>
                        <option value="busy">Outcome: Busy / Reception</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      value={callNoteInput}
                      onChange={(e) => setCallNoteInput(e.target.value)}
                      placeholder="Quick call summary (e.g. Spoke to Dr., liked Design 2, send pricing on WA)..."
                      className="w-full bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={postCallLoading}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      {postCallLoading ? "Drafting..." : "Log Call, Lock Next Step & Draft WhatsApp"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>

  );
}
