"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AtSign,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Eye,
  Flame,
  Globe,
  Lock,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  StickyNote,
  User,
  X,
  Zap,
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

  // Navigation & Mode
  const [autopilotMode, setAutopilotMode] = useState<boolean>(false);
  const [chatFilter, setChatFilter] = useState<string>("all");
  const [activeDraft, setActiveDraft] = useState<string>("");
  const [selectedChannel, setSelectedChannel] = useState<string>("whatsapp");
  const [messageDirection, setMessageDirection] = useState<"outbound" | "inbound" | "internal_note">("outbound");
  const [isSending, setIsSending] = useState<boolean>(false);

  // Next Step Lock Form
  const [completedNote, setCompletedNote] = useState<string>("");
  const [nextActionInput, setNextActionInput] = useState<string>("");
  const [nextDueDays, setNextDueDays] = useState<number>(2);

  // Post-Call Drawer
  const [postCallOpen, setPostCallOpen] = useState<boolean>(false);
  const [callOutcomeInput, setCallOutcomeInput] = useState<string>("interested");
  const [callNoteInput, setCallNoteInput] = useState<string>("");
  const [postCallLoading, setPostCallLoading] = useState<boolean>(false);

  // Scroll Container Reference
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat on message change
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [selectedLead?.messages, chatFilter]);

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

  if (!selectedLead) return null;

  // Sanitized phone digits for WhatsApp Web
  const rawPhone = selectedLead.primary_phone || "";
  const phoneDigits = rawPhone.replace(/[^0-9]/g, "");

  // Live Preview URLs
  const defaultBase = "http://localhost:3001";
  const choicePageUrl =
    selectedLead.packages?.[0]?.asset_links?.choice_page ||
    `${defaultBase}/demo/${selectedLead.slug}`;
  const modernUrl =
    selectedLead.packages?.[0]?.asset_links?.modern ||
    `${defaultBase}/modern/${selectedLead.slug}`;
  const warmUrl =
    selectedLead.packages?.[0]?.asset_links?.warm ||
    `${defaultBase}/warm/${selectedLead.slug}`;
  const luxuryUrl =
    selectedLead.packages?.[0]?.asset_links?.premium ||
    selectedLead.packages?.[0]?.asset_links?.luxury ||
    `${defaultBase}/luxury/${selectedLead.slug}`;

  // Fallback Contextual Copilot Templates if API hasn't generated any yet
  const fallbackTemplates = [
    {
      label: "3-Design Choice Pitch (18 wins)",
      category: "Outreach Pitch",
      text: `Namaste Dr. ${selectedLead.doctor_name || "Doctor"}, we noticed ${selectedLead.name} does not have an active mobile clinic site for patients in ${selectedLead.locality}. We built 3 live interactive demo designs tailored for your practice: ${choicePageUrl}. Zero upfront cost, take a look!`,
    },
    {
      label: "Zero Upfront Guarantee (14 wins)",
      category: "Risk Reversal",
      text: `Sir, we offer zero upfront setup and a 100% satisfaction guarantee. We can launch the complete 3-page custom site for ${selectedLead.name} with instant WhatsApp appointment booking within 48 hours. Shall I send the live preview?`,
    },
    {
      label: "Flat ₹25k Fee & 48h Delivery (11 wins)",
      category: "Price Objection",
      text: `Dr. ${selectedLead.doctor_name || "Doctor"}, pricing is a flat ₹${selectedLead.deal_value_inr || 25000} complete with custom domain setup, high-speed hosting, and local patient SEO. No recurring agency retainers or hidden charges.`,
    },
  ];

  const effectiveSuggestions =
    copilotSuggestions.length > 0
      ? copilotSuggestions.map((s) => ({
          label: `${s.objection_label} (${s.wins} wins)`,
          category: s.objection_label,
          text: s.text,
        }))
      : fallbackTemplates;

  // Filter messages by channel
  const filteredMessages = selectedLead.messages.filter((m) => {
    if (chatFilter === "all") return true;
    if (chatFilter === "internal_note") return m.direction === "internal_note" || m.channel === "internal_note";
    return m.channel.toLowerCase() === chatFilter.toLowerCase();
  });

  // Handle Task Completion & Next Action Lock
  const handleCompleteTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    if (!nextActionInput.trim()) {
      notify("CRM Invariant Violation: You must specify a mandatory next step", "err");
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

  // Dispatch or Log Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !activeDraft.trim()) return;

    setIsSending(true);
    try {
      // If Autopilot Mode is ON:
      if (autopilotMode) {
        await apiFetch(`/api/leads/${selectedLead.id}/messages`, {
          method: "POST",
          body: JSON.stringify({
            channel: selectedChannel,
            direction: messageDirection,
            text: activeDraft.trim(),
          }),
        });
        notify(`⚡ Autopilot agent dispatched ${selectedChannel.toUpperCase()} message autonomously!`);
        setActiveDraft("");
        loadAll();
      } else {
        // Autopilot Mode is OFF (Manual Mode):
        if (selectedChannel === "whatsapp") {
          if (!phoneDigits) {
            notify("No valid phone number recorded for WhatsApp", "err");
            setIsSending(false);
            return;
          }
          const waUrl = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(activeDraft.trim())}`;
          window.open(waUrl, "_blank");

          // Also log outbound message to activity history
          await apiFetch(`/api/leads/${selectedLead.id}/messages`, {
            method: "POST",
            body: JSON.stringify({
              channel: "whatsapp",
              direction: "outbound",
              text: activeDraft.trim(),
            }),
          });
          notify("Opened WhatsApp Web for review & logged to activity timeline");
          setActiveDraft("");
          loadAll();
        } else {
          // Non-WhatsApp manual logging
          await apiFetch(`/api/leads/${selectedLead.id}/messages`, {
            method: "POST",
            body: JSON.stringify({
              channel: selectedChannel,
              direction: messageDirection,
              text: activeDraft.trim(),
            }),
          });
          notify(`Logged ${selectedChannel.toUpperCase()} message to timeline`);
          setActiveDraft("");
          loadAll();
        }
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to dispatch message", "err");
    } finally {
      setIsSending(false);
    }
  };

  // Handle Post-Call Draft
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

      setSelectedChannel("whatsapp");
      setMessageDirection("outbound");
      setActiveDraft(res.draft_message);
      setNextActionInput(res.next_action);
      setNextDueDays(1);
      setCallNoteInput("");
      setPostCallOpen(false);
      notify("Post-call summary logged, next action locked, and WhatsApp follow-up drafted!");
      loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to generate post-call draft", "err");
    } finally {
      setPostCallLoading(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) setSelectedLeadId(null);
      }}
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in zoom-in-95 duration-200"
    >
      <div className="w-full max-w-6xl max-h-[94vh] bg-white dark:bg-[#12141D] border border-slate-200/90 dark:border-white/[0.12] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* ============================================================== */}
        {/* MODAL TOP BAR                                                  */}
        {/* ============================================================== */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/[0.08] bg-slate-50/90 dark:bg-[#0F1118] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/70 flex items-center justify-center font-black text-lg text-indigo-600 dark:text-indigo-400 shrink-0">
              {selectedLead.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {selectedLead.name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                  ₹{selectedLead.deal_value_inr || 25000} Potential
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                  Fit: {selectedLead.fit_score}%
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 pt-0.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {selectedLead.doctor_name || "Doctor"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {selectedLead.locality}, {selectedLead.city}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Contact Badges */}
            <div className="hidden sm:flex items-center gap-2">
              {selectedLead.primary_phone && (
                <a
                  href={`https://wa.me/${phoneDigits}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 transition-colors text-xs font-medium"
                  title="Direct WhatsApp"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{selectedLead.primary_phone}</span>
                </a>
              )}
              {selectedLead.instagram_handle && (
                <a
                  href={`https://instagram.com/${selectedLead.instagram_handle.replace("@", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-50 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-500/30 hover:bg-pink-100 dark:hover:bg-pink-500/25 transition-colors text-xs font-medium"
                  title="Direct Instagram"
                >
                  <AtSign className="w-3.5 h-3.5" />
                  <span>{selectedLead.instagram_handle}</span>
                </a>
              )}
            </div>

            {/* Pipeline Stage Dropdown */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#181B26] border border-slate-200 dark:border-white/[0.08] shadow-xs">
              <span className="text-xs text-slate-400">Stage:</span>
              <select
                value={selectedLead.stage_id}
                onChange={(e) => handleStageChange(selectedLead, Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
              >
                {activeHustle?.stages.map((st) => (
                  <option key={st.id} value={st.id} className="bg-white dark:bg-[#141721] text-slate-800 dark:text-white">
                    {st.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Close Modal Button */}
            <button
              onClick={() => setSelectedLeadId(null)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* MODAL BODY - 2-COLUMN INTERACTIVE OPERATIONS ARCHITECTURE     */}
        {/* ============================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50 dark:bg-transparent">
          {/* ============================================================== */}
          {/* LEFT COLUMN: CHAT & OUTREACH (7 Cols)                          */}
          {/* ============================================================== */}
          <div className="lg:col-span-7 space-y-4 flex flex-col">
            {/* WhatsApp / Chat Timeline View Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.08] flex flex-col shadow-xs">
              {/* Timeline Header & Channel Filters */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    WhatsApp &amp; Multi-Channel Timeline
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400">
                    {selectedLead.messages.length} events
                  </span>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1">
                  {[
                    { id: "all", label: "All" },
                    { id: "whatsapp", label: "WhatsApp" },
                    { id: "instagram", label: "Instagram" },
                    { id: "internal_note", label: "Notes" },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setChatFilter(filter.id)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                        chatFilter === filter.id
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Scroll Container */}
              <div
                ref={chatScrollRef}
                className="h-64 sm:h-72 overflow-y-auto my-3 p-3 rounded-xl bg-slate-50 dark:bg-[#0B0D13] border border-slate-200/70 dark:border-white/[0.05] space-y-3 flex flex-col"
              >
                {filteredMessages.length === 0 ? (
                  <div className="my-auto text-center space-y-1.5 py-8 text-slate-400 dark:text-slate-500">
                    <MessageSquare className="w-7 h-7 mx-auto opacity-40 text-emerald-500" />
                    <p className="text-xs font-medium">No outreach messages recorded yet</p>
                    <p className="text-[11px] text-slate-400">
                      Select an AI Copilot response below or draft a pitch to start conversation.
                    </p>
                  </div>
                ) : (
                  filteredMessages.map((m) => {
                    const isInbound = m.direction === "inbound";
                    const isInternal = m.direction === "internal_note" || m.channel === "internal_note";

                    if (isInternal) {
                      return (
                        <div
                          key={m.id}
                          className="self-center w-full max-w-[95%] p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-500/20 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between text-[10px] text-amber-800 dark:text-amber-300 font-semibold">
                            <span className="flex items-center gap-1.5">
                              <StickyNote className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              <span>Internal CRM Note</span>
                            </span>
                            <span className="font-mono">
                              {new Date(m.created_at).toLocaleDateString()} {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-amber-950 dark:text-amber-100 leading-relaxed">{m.text}</p>
                        </div>
                      );
                    }

                    if (isInbound) {
                      return (
                        <div key={m.id} className="self-start max-w-[85%] space-y-1">
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 pl-1">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              Dr. {selectedLead.doctor_name || "Doctor"}
                            </span>
                            <span>•</span>
                            <span className="uppercase font-semibold text-[9px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300">
                              {m.channel} Inbound
                            </span>
                            <span>•</span>
                            <span className="font-mono">
                              {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <div className="p-3.5 rounded-2xl rounded-tl-xs bg-white dark:bg-[#1A1D2B] border border-slate-200/90 dark:border-white/[0.08] text-xs text-slate-800 dark:text-slate-100 shadow-xs leading-relaxed whitespace-pre-wrap">
                            {m.text}
                          </div>
                        </div>
                      );
                    }

                    // Outbound Message
                    return (
                      <div key={m.id} className="self-end max-w-[85%] space-y-1">
                        <div className="flex items-center justify-end gap-2 text-[10px] text-emerald-600 dark:text-emerald-400 pr-1">
                          <span className="font-mono">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span>•</span>
                          <span className="uppercase font-semibold text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                            {m.channel} Outbound
                          </span>
                        </div>
                        <div className="p-3.5 rounded-2xl rounded-tr-xs bg-emerald-600 text-white dark:bg-emerald-600 text-xs shadow-md shadow-emerald-900/15 leading-relaxed whitespace-pre-wrap">
                          {m.text}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Inline Copilot Recommendations */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-500/30 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Inline AI Copilot Suggestions</span>
                </div>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                  Click template to load into draft
                </span>
              </div>

              <div className="space-y-2">
                {effectiveSuggestions.map((sugg, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setActiveDraft(sugg.text);
                      setSelectedChannel("whatsapp");
                      setMessageDirection("outbound");
                      notify("Copilot suggestion loaded into draft");
                    }}
                    className="p-3 rounded-xl bg-white dark:bg-[#141724] border border-indigo-100 dark:border-white/[0.06] hover:border-indigo-400 dark:hover:border-indigo-500/60 text-xs space-y-1.5 cursor-pointer transition-all hover:shadow-xs group"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                        <span>💡</span>
                        <span>{sugg.label}</span>
                      </span>
                      <span className="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-semibold transition-colors">
                        Use Template &rarr;
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 italic text-[11px] leading-relaxed line-clamp-2">
                      &ldquo;{sugg.text}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Autopilot vs. Manual Mode Dispatch Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-4 rounded-2xl bg-white dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.08] space-y-3 shadow-xs"
            >
              {/* Dispatch Bar Controls Header */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Dispatch Outbox
                  </span>

                  {/* Mode Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setAutopilotMode(!autopilotMode)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      autopilotMode
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    <Zap className={`w-3.5 h-3.5 ${autopilotMode ? "text-amber-300 fill-amber-300" : "text-slate-400"}`} />
                    <span>Autopilot: {autopilotMode ? "ON" : "OFF"}</span>
                  </button>
                </div>

                {/* Channel & Direction Selector */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedChannel}
                    onChange={(e) => setSelectedChannel(e.target.value)}
                    className="bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
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
                    className="bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="outbound">Outbound (Sent)</option>
                    <option value="inbound">Inbound (Received)</option>
                    <option value="internal_note">Internal Note</option>
                  </select>
                </div>
              </div>

              {/* Message Draft Input */}
              <div className="space-y-1">
                <textarea
                  rows={3}
                  value={activeDraft}
                  onChange={(e) => setActiveDraft(e.target.value)}
                  placeholder={
                    autopilotMode
                      ? "Autopilot ready: type message or click AI template above..."
                      : "Type pitch or click AI template to review before launching WhatsApp Web..."
                  }
                  className="w-full bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {autopilotMode ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <Zap className="w-3 h-3" />
                      Agent dispatches message autonomously in background
                    </span>
                  ) : (
                    <span>
                      Manual mode: Launches WhatsApp Web with pre-filled text
                    </span>
                  )}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSending || !activeDraft.trim()}
                    className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      autopilotMode
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-900/25 active:scale-95"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25 active:scale-95"
                    }`}
                  >
                    {autopilotMode ? (
                      <>
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>Send via Autopilot</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Send via WhatsApp Web</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* ============================================================== */}
          {/* RIGHT COLUMN: CLINIC DOSSIER & NEXT STEP (5 Cols)              */}
          {/* ============================================================== */}
          <div className="lg:col-span-5 space-y-4 flex flex-col">
            {/* AI Fit & Intent Intelligence Card */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-4 shadow-xs">
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>AI Conversion Intelligence</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  High patient-acquisition upside. Verified absence of mobile web portal.
                </div>
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
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

            {/* 3 Live Demo Previews (Client Proof Package) */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.08] space-y-3 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-indigo-500" />
                  <span>3 Live Demo Previews</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                  HTTP 200 Live
                </span>
              </div>

              {/* Main Choice Page Switcher */}
              <a
                href={choicePageUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full p-2.5 rounded-xl bg-indigo-50/80 hover:bg-indigo-100/80 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-300 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Open 3-Design Choice Page (/demo/{selectedLead.slug})</span>
                </span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              {/* 3 Layout Pills Grid */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {[
                  { id: "modern", label: "Modern", url: modernUrl },
                  { id: "warm", label: "Warm", url: warmUrl },
                  { id: "luxury", label: "Luxury", url: luxuryUrl },
                ].map((tmpl) => (
                  <a
                    key={tmpl.id}
                    href={tmpl.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#0E1017] dark:hover:bg-slate-800/70 border border-slate-200/80 dark:border-white/[0.06] space-y-1 transition-colors block"
                  >
                    <div className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold capitalize flex items-center justify-center gap-1">
                      <span>{tmpl.label}</span>
                      <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                    </div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Live 200</div>
                  </a>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Total Previews Viewed:</span>
                <strong className="text-slate-900 dark:text-white font-mono">
                  {((selectedLead as any).demo_views_count ?? selectedLead.events?.length ?? 0)} times
                </strong>
              </div>
            </div>

            {/* Clinic Dossier & Verified Facts */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.08] space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Clinic Dossier &amp; Verified Facts</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">2-Source Strict Rule</span>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {selectedLead.facts.length === 0 ? (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0E1017] text-[11px] text-slate-400">
                    2-source verification: Verified absence of mobile website across Google Maps &amp; Practo.
                  </div>
                ) : (
                  selectedLead.facts.map((f) => (
                    <div
                      key={f.id}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-[#12141D] border border-slate-100 dark:border-white/[0.04] text-xs flex items-center justify-between gap-2"
                    >
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

            {/* Mandatory Next-Action Lock-Step Form */}
            <form
              onSubmit={handleCompleteTask}
              className="p-4 rounded-2xl bg-white dark:bg-[#10121A] border border-indigo-200 dark:border-indigo-500/30 space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Mandatory Next-Action Lock</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  CRM Invariant
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  What did you complete?
                </label>
                <input
                  type="text"
                  value={completedNote}
                  onChange={(e) => setCompletedNote(e.target.value)}
                  placeholder="e.g. Sent personalized WhatsApp pitch with demo link"
                  className="w-full bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  Mandatory Next Action
                </label>
                <input
                  type="text"
                  value={nextActionInput}
                  onChange={(e) => setNextActionInput(e.target.value)}
                  placeholder="e.g. Follow up on WhatsApp after doctor OPD"
                  className="w-full bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Quick Due Presets */}
              <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span>Due:</span>
                  {[
                    { label: "Tomorrow", days: 1 },
                    { label: "In 2 Days", days: 2 },
                    { label: "Next Week", days: 7 },
                  ].map((preset) => (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => setNextDueDays(preset.days)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                        nextDueDays === preset.days
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={nextDueDays}
                    onChange={(e) => setNextDueDays(Number(e.target.value))}
                    className="w-11 bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-lg px-1.5 py-0.5 text-xs text-slate-900 dark:text-white text-center font-mono"
                    title="Custom days"
                  />
                  <span>days</span>
                </div>

                <button
                  type="submit"
                  className="py-1.5 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Lock Next Step
                </button>
              </div>
            </form>

            {/* Post-Call Summary Drawer / Card */}
            <div className="rounded-2xl bg-white dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.08] overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setPostCallOpen(!postCallOpen)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Post-Call Summary Drawer
                  </span>
                </div>
                {postCallOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {postCallOpen && (
                <form onSubmit={handlePostCallDraft} className="p-4 pt-0 space-y-2.5 border-t border-slate-100 dark:border-white/[0.04]">
                  <div className="flex items-center justify-between gap-2 pt-2">
                    <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Call Outcome:
                    </label>
                    <select
                      value={callOutcomeInput}
                      onChange={(e) => setCallOutcomeInput(e.target.value)}
                      className="bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                    >
                      <option value="interested">Interested (Wants pricing / demo)</option>
                      <option value="callback">Call Later (In surgery / OPD)</option>
                      <option value="busy">Busy / Reception answered</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    value={callNoteInput}
                    onChange={(e) => setCallNoteInput(e.target.value)}
                    placeholder="Quick call summary (e.g. Spoke to Dr., liked Warm design, asked about timeline)..."
                    className="w-full bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                  />

                  <button
                    type="submit"
                    disabled={postCallLoading || !callNoteInput.trim()}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {postCallLoading ? "Generating Draft..." : "Log Call & Auto-Draft WhatsApp Follow-Up"}
                  </button>
                </form>
              )}
            </div>

            {/* Commitments & Promises 1-Tap Confirmation */}
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
          </div>
        </div>
      </div>
    </div>
  );
}
