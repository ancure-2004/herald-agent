"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  MessageSquare,
  Search,
  Send,
  Phone,
  Sparkles,
  Lock,
  ExternalLink,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  User,
  ShieldCheck,
  Bot,
  Zap,
  ArrowLeft,
  PanelRightOpen,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { apiFetch } from "@/lib/api/client";
import { Lead, Message } from "@/types";

interface ReplySuggestion {
  category: string;
  text: string;
  tone: string;
}

export function WhatsAppInboxView() {
  const {
    leads,
    activeInboxLeadId,
    setActiveInboxLeadId,
    setSelectedLeadId,
    globalAutomationEnabled,
    openLogReplyModal,
    openLogCallModal,
    loadAll,
    notify,
  } = useCRM();

  const [searchFilter, setSearchFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unreplied" | "followup" | "replied">("all");
  const [composerText, setComposerText] = useState<string>("");
  const [localAutomation, setLocalAutomation] = useState<boolean>(globalAutomationEnabled);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);
  const [aiSuggestions, setAiSuggestions] = useState<ReplySuggestion[]>([]);

  // Local thread state decoupled from global modal selectedLeadId
  const [activeThreadLeadId, setActiveThreadLeadId] = useState<number | null>(
    () => activeInboxLeadId || leads[0]?.id || null
  );
  const [mobileViewingThread, setMobileViewingThread] = useState<boolean>(Boolean(activeInboxLeadId));

  // Sync with activeInboxLeadId from context
  useEffect(() => {
    if (activeInboxLeadId) {
      setActiveThreadLeadId(activeInboxLeadId);
      setMobileViewingThread(true);
    }
  }, [activeInboxLeadId]);

  // Fall back to first lead if none selected
  useEffect(() => {
    if (!activeThreadLeadId && leads.length > 0) {
      setActiveThreadLeadId(leads[0].id);
    }
  }, [activeThreadLeadId, leads]);

  // Sync local automation default with global
  useEffect(() => {
    setLocalAutomation(globalAutomationEnabled);
  }, [globalAutomationEnabled]);

  const activeLead = useMemo(() => {
    return leads.find((l) => l.id === activeThreadLeadId) || leads[0] || null;
  }, [leads, activeThreadLeadId]);

  // Auto scroll chat to bottom
  const chatScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [activeLead?.messages, activeLead?.id]);

  // Fetch AI Reply Suggestions when active lead changes
  const fetchSuggestions = async (leadId: number) => {
    setLoadingSuggestions(true);
    try {
      const res = await apiFetch<{ lead_id: number; suggestions: ReplySuggestion[] }>(
        `/api/leads/${leadId}/reply-suggestions`
      );
      if (res.suggestions && res.suggestions.length > 0) {
        setAiSuggestions(res.suggestions);
      } else {
        // Fallback realistic suggestions
        setAiSuggestions([
          {
            category: "Direct Answer",
            text: `Hi Dr. ${activeLead?.doctor_name || "Doctor"}, thank you for reaching out! Here is the live link to your clinic's custom preview: https://preview.dentalos.in/${activeLead?.slug || "demo"}`,
            tone: "professional",
          },
          {
            category: "Value Reframe",
            text: `Hello Dr. ${activeLead?.doctor_name || "Doctor"}, we specifically built this for ${activeLead?.locality || "Delhi NCR"} patients searching on Google on mobile devices.`,
            tone: "persuasive",
          },
          {
            category: "Quick OPD Check-in",
            text: `Hi Dr. ${activeLead?.doctor_name || "Doctor"}, are you free for a quick 2-minute walkthrough between appointments this afternoon?`,
            tone: "conversational",
          },
        ]);
      }
    } catch {
      // Offline / fallback suggestions
      setAiSuggestions([
        {
          category: "Direct Answer",
          text: `Hi Dr. ${activeLead?.doctor_name || "Doctor"}, thank you for reaching out! Here is the link to your clinic preview: https://preview.dentalos.in/${activeLead?.slug || "demo"}`,
          tone: "professional",
        },
        {
          category: "Value Reframe",
          text: `Hello Dr. ${activeLead?.doctor_name || "Doctor"}, this demo is optimized to turn local Google map visitors into booked dental consultations.`,
          tone: "persuasive",
        },
        {
          category: "Quick OPD Check-in",
          text: `Hi Dr. ${activeLead?.doctor_name || "Doctor"}, would 4:30pm today work for a brief 2-minute demo call?`,
          tone: "conversational",
        },
      ]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    if (activeLead?.id) {
      fetchSuggestions(activeLead.id);
    }
  }, [activeLead?.id]);

  // Send message handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!composerText.trim() || !activeLead) return;

    const messageText = composerText.trim();
    setIsSending(true);

    try {
      const payload = {
        text: messageText,
        channel: "whatsapp",
        automation: localAutomation,
      };

      const res = await apiFetch<{
        status: string;
        wa_url?: string;
        delivery_status: string;
      }>(`/api/leads/${activeLead.id}/messages/send`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!localAutomation && res.wa_url) {
        // Open wa.me URL directly in a new tab
        window.open(res.wa_url, "_blank");
        notify("Opened WhatsApp with prefilled message & logged as sent manually", "ok");
      } else {
        notify(
          localAutomation
            ? "Sending message now via WhatsApp automation..."
            : "Message queued for autonomous Playwright dispatcher",
          "ok"
        );
      }

      setComposerText("");
      await loadAll();
    } catch (err: any) {
      notify(err.message || "Failed to send message", "err");
    } finally {
      setIsSending(false);
    }
  };

  // Filter leads for left list
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search text
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchesName = lead.name.toLowerCase().includes(q);
        const matchesDoc = (lead.doctor_name || "").toLowerCase().includes(q);
        const matchesLoc = (lead.locality || "").toLowerCase().includes(q);
        const matchesPhone = (lead.primary_phone || "").includes(q);
        if (!matchesName && !matchesDoc && !matchesLoc && !matchesPhone) return false;
      }

      // Status chip
      if (statusFilter === "unreplied") {
        // Leads with inbound messages where lead hasn't replied or needs_followup
        const lastMsg = lead.messages && lead.messages[lead.messages.length - 1];
        const isInboundLast = lastMsg?.direction === "inbound";
        return isInboundLast || (lead as any).needs_followup;
      }
      if (statusFilter === "followup") {
        return (lead as any).needs_followup || lead.stage_id === 3;
      }
      if (statusFilter === "replied") {
        return lead.stage_id >= 4;
      }

      return true;
    });
  }, [leads, searchFilter, statusFilter]);

  return (
    <div className="h-full flex flex-col sm:flex-row gap-4 overflow-hidden text-slate-900 dark:text-slate-100">
      {/* LEFT PANEL: Conversation List */}
      <div className={`w-full sm:w-80 md:w-96 shrink-0 flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden ${mobileViewingThread ? "hidden sm:flex" : "flex"}`}>
        {/* Search & Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h1 className="text-sm font-bold tracking-tight">WhatsApp Outreach Inbox</h1>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
              {filteredLeads.length} leads
            </span>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search clinic, doctor, phone..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {[
              { id: "all", label: "All" },
              { id: "unreplied", label: "Unreplied" },
              { id: "followup", label: "Follow-up Due" },
              { id: "replied", label: "Replied" },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setStatusFilter(chip.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                  statusFilter === chip.id
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lead Conversation Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredLeads.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No conversations matching "{searchFilter}"
            </div>
          ) : (
            filteredLeads.map((lead) => {
              const isSelected = activeLead?.id === lead.id;
              const messages = lead.messages || [];
              const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
              const hasInboundUnreplied = lastMessage?.direction === "inbound" || (lead as any).needs_followup;

              return (
                <button
                  key={lead.id}
                  onClick={() => {
                    setActiveThreadLeadId(lead.id);
                    setMobileViewingThread(true);
                  }}
                  className={`w-full text-left p-3.5 transition-all flex items-start gap-3 cursor-pointer ${
                    isSelected
                      ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-l-4 border-emerald-500 shadow-inner"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  {/* Lead Avatar */}
                  <div className="relative shrink-0 mt-0.5">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 dark:from-emerald-950/60 dark:to-teal-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                      {lead.name.slice(0, 2).toUpperCase()}
                    </div>
                    {hasInboundUnreplied && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 border-2 border-white dark:border-slate-900 animate-pulse" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {lead.name}
                      </h2>
                      {lastMessage && (
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {new Date(lastMessage.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate mb-1">
                      <span>{lead.doctor_name || "Doctor"}</span>
                      <span>•</span>
                      <span>{lead.locality || "Delhi NCR"}</span>
                    </div>

                    {/* Snippet */}
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate line-clamp-1">
                      {lastMessage ? (
                        <>
                          {lastMessage.direction === "outbound" && (
                            <span className="text-slate-400 font-medium">You: </span>
                          )}
                          {lastMessage.text}
                        </>
                      ) : (
                        <span className="italic text-slate-400">Ready for initial outreach</span>
                      )}
                    </p>

                    {/* Badges */}
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                        WhatsApp
                      </span>
                      {hasInboundUnreplied && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                          Needs Reply
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Active WhatsApp Conversation Thread */}
      <div className={`flex-1 flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-w-0 ${mobileViewingThread ? "flex" : "hidden sm:flex"}`}>
        {activeLead ? (
          <>
            {/* Thread Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/20">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileViewingThread(false)}
                  className="sm:hidden p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Back to conversations"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-emerald-500/20 shrink-0">
                  {activeLead.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {activeLead.name}
                    </h2>
                    <span className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      <Lock className="w-2.5 h-2.5" />
                      <span>WhatsApp Only</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{activeLead.doctor_name || "Doctor"}</span>
                    <span>•</span>
                    <span className="font-mono">{activeLead.primary_phone || "No phone"}</span>
                    <span>•</span>
                    <span>{activeLead.locality || "Delhi NCR"}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedLeadId(activeLead.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="View full lead details drawer"
                >
                  <PanelRightOpen className="w-3.5 h-3.5" />
                  <span>View Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => openLogReplyModal(activeLead.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Log Customer Reply</span>
                </button>

                <button
                  type="button"
                  onClick={() => openLogCallModal(activeLead.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Log Call</span>
                </button>
              </div>
            </div>

            {/* Conversation Messages Container */}
            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/30 dark:bg-slate-950/20"
            >
              {/* Channel Invariant Notice */}
              <div className="max-w-md mx-auto text-center p-2.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Channel Restricted: WhatsApp Only</span>
                </div>
                <p>Dental clinic outreach in Delhi NCR is strictly constrained to 1-on-1 WhatsApp messages.</p>
              </div>

              {/* Messages list */}
              {(!activeLead.messages || activeLead.messages.length === 0) ? (
                <div className="text-center py-12 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No messages logged yet. Use the composer or AI suggestions below to begin outreach!
                  </p>
                </div>
              ) : (
                activeLead.messages.map((msg) => {
                  const isOutbound = msg.direction === "outbound";
                  const isInbound = msg.direction === "inbound";
                  const deliveryStatus = (msg as any).delivery_status || "sent";

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isOutbound ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                        <span>{isInbound ? activeLead.doctor_name || activeLead.name : "Firstmate Autopilot"}</span>
                        <span>•</span>
                        <span>
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div
                        className={`max-w-[85%] sm:max-w-md rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm space-y-1.5 ${
                          isOutbound
                            ? "bg-emerald-600 text-white rounded-br-xs"
                            : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-xs"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>

                        {/* Status Footer for Outbound */}
                        {isOutbound && (
                          <div className="flex items-center justify-end gap-1.5 pt-1 text-[10px] text-emerald-100/90 font-mono">
                            {deliveryStatus === "queued" && (
                              <span className="flex items-center gap-1 bg-emerald-700/50 px-1.5 py-0.5 rounded">
                                <Clock className="w-3 h-3 animate-spin" />
                                <span>Queued</span>
                              </span>
                            )}
                            {deliveryStatus === "sent" && (
                              <span className="flex items-center gap-1 bg-emerald-700/50 px-1.5 py-0.5 rounded">
                                <CheckCheck className="w-3 h-3 text-emerald-200" />
                                <span>Sent (Playwright)</span>
                              </span>
                            )}
                            {deliveryStatus === "sent_manually" && (
                              <span className="flex items-center gap-1 bg-emerald-700/50 px-1.5 py-0.5 rounded">
                                <Check className="w-3 h-3 text-emerald-200" />
                                <span>Sent Manually</span>
                              </span>
                            )}
                            {deliveryStatus === "failed" && (
                              <span className="flex items-center gap-1 bg-rose-600 text-white px-1.5 py-0.5 rounded">
                                <AlertCircle className="w-3 h-3" />
                                <span>Failed</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* AI REPLY SUGGESTIONS BAR (3 Clickable Options) */}
            <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>3 AI Reply Suggestions (Click to Populate):</span>
                </div>
                <button
                  onClick={() => fetchSuggestions(activeLead.id)}
                  disabled={loadingSuggestions}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingSuggestions ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {aiSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setComposerText(item.text)}
                    className="p-2.5 rounded-xl text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 shadow-sm transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        {item.category}
                      </span>
                      <span className="text-[9px] text-slate-400 capitalize">{item.tone}</span>
                    </div>
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 line-clamp-2 leading-snug group-hover:text-slate-900 dark:group-hover:text-white">
                      {item.text}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* OUTGOING COMPOSER & AUTOMATION TOGGLE */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              {/* Automation Toggle */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Dispatch Mode:
                  </span>
                  <button
                    type="button"
                    onClick={() => setLocalAutomation(!localAutomation)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      localAutomation ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        localAutomation ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {localAutomation ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Automation ON (Queue for Playwright)
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        Automation OFF (Direct wa.me URL)
                      </span>
                    )}
                  </span>
                </div>

                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  Enter to send, Shift+Enter for new line
                </span>
              </div>

              {/* Message Box */}
              <div className="flex items-end gap-2.5">
                <textarea
                  rows={2}
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message or click an AI suggestion above..."
                  className="flex-1 p-3 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none leading-relaxed"
                />

                <button
                  type="submit"
                  disabled={isSending || !composerText.trim()}
                  className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
                >
                  {isSending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : localAutomation ? (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Queue</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4" />
                      <span>Open WhatsApp</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="h-full flex items-center justify-center p-8 text-center text-slate-400 text-sm">
            Select a conversation from the left to start messaging.
          </div>
        )}
      </div>
    </div>
  );
}
