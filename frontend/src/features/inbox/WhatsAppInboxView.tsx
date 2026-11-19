"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  MessageSquare,
  Search,
  Send,
  Phone,
  Sparkles,
  ExternalLink,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  ShieldCheck,
  ArrowLeft,
  PanelRightOpen,
  X,
  Loader2,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { messagesApi } from "@/api/messagesApi";
import { Lead } from "@/types";
import { LeadDetailContent } from "@/features/modals/LeadDetailModal";

interface ReplySuggestion {
  category: string;
  text: string;
  tone: string;
}

const getLeadLatestActivity = (lead: Lead): number => {
  let latestTime = 0;
  const messages = lead.messages || [];
  for (const m of messages) {
    const t = new Date(m.created_at).getTime();
    if (!isNaN(t) && t > latestTime) {
      latestTime = t;
    }
  }
  const lastMsgAt = (lead as any).last_message_at ? new Date((lead as any).last_message_at).getTime() : 0;
  const updatedAt = lead.updated_at ? new Date(lead.updated_at).getTime() : 0;
  const createdAt = lead.created_at ? new Date(lead.created_at).getTime() : 0;
  return Math.max(latestTime, !isNaN(lastMsgAt) ? lastMsgAt : 0, !isNaN(updatedAt) ? updatedAt : 0, !isNaN(createdAt) ? createdAt : 0);
};

export function WhatsAppInboxView() {
  const {
    leads,
    activeInboxLeadId,
    setActiveInboxLeadId,
    sidebarCollapsed,
    setSidebarCollapsed,
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

  // On-demand AI Replies popover state & click-outside ref
  const [showAiPopover, setShowAiPopover] = useState<boolean>(false);
  const aiPopoverRef = useRef<HTMLDivElement>(null);

  // Close AI Replies popover on outside click or Escape key
  useEffect(() => {
    if (!showAiPopover) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (aiPopoverRef.current && !aiPopoverRef.current.contains(e.target as Node)) {
        setShowAiPopover(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowAiPopover(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showAiPopover]);

  // Side-by-side docked Lead Card & sidebar auto-collapse tracking
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

  // Sync local automation default with global
  useEffect(() => {
    setLocalAutomation(globalAutomationEnabled);
  }, [globalAutomationEnabled]);

  // Filter & sort leads for left list (WhatsApp latest-activity sorting)
  const filteredLeads = useMemo(() => {
    const list = leads.filter((lead) => {
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchesName = lead.name.toLowerCase().includes(q);
        const matchesDoc = (lead.doctor_name || "").toLowerCase().includes(q);
        const matchesLoc = (lead.locality || "").toLowerCase().includes(q);
        const matchesPhone = (lead.primary_phone || "").includes(q);
        if (!matchesName && !matchesDoc && !matchesLoc && !matchesPhone) return false;
      }

      if (statusFilter === "unreplied") {
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

    return list.sort((a, b) => getLeadLatestActivity(b) - getLeadLatestActivity(a));
  }, [leads, searchFilter, statusFilter]);

  const activeLead = useMemo(() => {
    return leads.find((l) => l.id === activeThreadLeadId) || filteredLeads[0] || leads[0] || null;
  }, [leads, activeThreadLeadId, filteredLeads]);

  useEffect(() => {
    if (!activeThreadLeadId && filteredLeads.length > 0) {
      setActiveThreadLeadId(filteredLeads[0].id);
    }
  }, [activeThreadLeadId, filteredLeads]);

  // Auto scroll chat to bottom
  const chatScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [activeLead?.messages, activeLead?.id]);

  // Fetch AI Reply Suggestions when triggered by user
  const fetchSuggestions = async (leadId: number) => {
    setLoadingSuggestions(true);
    try {
      const res = await messagesApi.getReplySuggestions(leadId);
      if (res.suggestions && res.suggestions.length > 0) {
        setAiSuggestions(res.suggestions);
      } else {
        setAiSuggestions([]);
      }
    } catch (err: any) {
      const isNotConfigured = err?.status === 503 || String(err?.message || "").includes("ai_not_configured");
      if (isNotConfigured) {
        notify("AI provider not configured. Please configure an AI provider in Settings.", "err");
      } else {
        notify(err instanceof Error ? err.message : "Failed to generate AI suggestions", "err");
      }
      setAiSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    setShowAiPopover(false);
    setAiSuggestions([]);
  }, [activeLead?.id]);

  const handleToggleAiPopover = () => {
    if (!showAiPopover) {
      setShowAiPopover(true);
      if (activeLead?.id && aiSuggestions.length === 0 && !loadingSuggestions) {
        fetchSuggestions(activeLead.id);
      }
    } else {
      setShowAiPopover(false);
    }
  };

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

      const res = await messagesApi.send(activeLead.id, payload);

      if (!localAutomation && res.wa_url) {
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

  return (
    <div className="h-full flex flex-col sm:flex-row gap-4 overflow-hidden text-slate-900 dark:text-slate-100">
      {/* 1. MONOCHROME THREAD LIST (LEFT PANE) */}
      <div className={`w-full sm:w-64 md:w-72 shrink-0 flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden ${mobileViewingThread ? "hidden sm:flex" : "flex"}`}>
        {/* Search & Header */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center">
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
              <h1 className="text-xs font-bold tracking-tight text-zinc-900 dark:text-white">WhatsApp Inbox</h1>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
              {filteredLeads.length} leads
            </span>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search clinic, doctor, phone..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-slate-400 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 font-sans"
            />
          </div>

          {/* Filter Chips: Active is Dark Charcoal (bg-zinc-900 text-white) */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
            {[
              { id: "all", label: "All" },
              { id: "unreplied", label: "Unreplied" },
              { id: "followup", label: "Follow-up" },
              { id: "replied", label: "Replied" },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setStatusFilter(chip.id as any)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === chip.id
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs font-semibold"
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

              // Opted Out / DNC check
              const isDNC = Boolean(
                lead.do_not_contact ||
                (lastMessage?.text &&
                  /mat bhejo|stop|unsubscribe|don'?t message|not interested|remove me/i.test(lastMessage.text))
              );

              return (
                <button
                  key={lead.id}
                  onClick={() => {
                    setActiveThreadLeadId(lead.id);
                    setMobileViewingThread(true);
                  }}
                  className={`w-full text-left p-3 transition-all flex items-start gap-2.5 cursor-pointer ${
                    isSelected
                      ? "bg-slate-50/90 dark:bg-slate-800/50 border-l-3 border-l-zinc-900 dark:border-l-zinc-100"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/40 border-l-3 border-l-transparent"
                  }`}
                >
                  {/* Lead Avatar Monogram (Neutral Charcoal/Slate) */}
                  <div className="relative shrink-0 mt-0.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isSelected
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                          : "bg-slate-100 text-zinc-800 dark:bg-slate-800 dark:text-zinc-200 border border-slate-200/80 dark:border-slate-700"
                      }`}
                    >
                      {lead.name.slice(0, 2).toUpperCase()}
                    </div>
                    {hasInboundUnreplied && !isDNC && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white dark:border-slate-900 animate-pulse" />
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

                    {/* Status Badges: Redundant WhatsApp pill removed */}
                    {(isDNC || hasInboundUnreplied) && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {isDNC ? (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-800/40">
                            Opted Out / DNC
                          </span>
                        ) : hasInboundUnreplied ? (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/40">
                            Needs Reply
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 2. CENTER ACTIVE THREAD PANEL: WhatsApp Conversation */}
      <div className={`flex-1 flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-w-0 ${mobileViewingThread ? "flex" : "hidden sm:flex"}`}>
        {activeLead ? (
          <>
            {/* 2A. CLEAN MONOCHROME CHAT HEADER */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/20 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileViewingThread(false)}
                  className="sm:hidden p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Back to conversations"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                {/* Neutral Charcoal Monogram */}
                <div className="w-9 h-9 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                  {activeLead.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleDockedLeadCard}
                      className="text-sm font-bold text-zinc-900 dark:text-white hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors truncate text-left cursor-pointer"
                      title="Click to toggle Lead Card side-by-side"
                    >
                      {activeLead.name}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{activeLead.doctor_name || "Doctor"}</span>
                    <span>•</span>
                    <span className="font-mono">{activeLead.primary_phone || "No phone"}</span>
                    <span>•</span>
                    <span>{activeLead.locality || "Delhi NCR"}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Unified Neutral Palette */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleDockedLeadCard}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    isLeadCardDocked
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-xs"
                      : "bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-zinc-700 dark:text-zinc-200 border-slate-200/80 dark:border-slate-700"
                  }`}
                  title={isLeadCardDocked ? "Close docked Lead Card" : "Open Lead Card docked side-by-side"}
                >
                  <PanelRightOpen className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isLeadCardDocked ? "Hide Lead Card" : "Lead Card"}</span>
                  <span className="sm:hidden">Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => openLogReplyModal(activeLead.id)}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700 text-zinc-700 dark:text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Log Customer Reply</span>
                  <span className="md:hidden">Log Reply</span>
                </button>

                <button
                  type="button"
                  onClick={() => openLogCallModal(activeLead.id)}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700 text-zinc-700 dark:text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Log Call</span>
                </button>
              </div>
            </div>

            {/* 3. CONVERSATION CANVAS & BUBBLES */}
            <div
              ref={chatScrollRef}
              className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50 dark:bg-slate-950/20"
            >
              {/* Channel Invariant Notice */}
              <div className="max-w-md mx-auto text-center p-2.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
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
                        <span>{isInbound ? activeLead.doctor_name || activeLead.name : "Herald Autopilot"}</span>
                        <span>•</span>
                        <span>
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {/* Bubble Surface */}
                      <div
                        className={`max-w-[85%] sm:max-w-md rounded-2xl px-4 py-3 text-xs leading-relaxed space-y-1.5 ${
                          isOutbound
                            ? "bg-zinc-900 text-white rounded-tr-sm shadow-sm border border-zinc-800"
                            : "bg-white dark:bg-slate-800 text-zinc-800 dark:text-zinc-100 border border-slate-200/80 dark:border-slate-700 rounded-tl-sm shadow-xs"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>

                        {/* Status Footer for Outbound with Micro-Emerald delivery ticks */}
                        {isOutbound && (
                          <div className="flex items-center justify-end gap-1.5 pt-1">
                            {deliveryStatus === "queued" && (
                              <span className="flex items-center gap-1 bg-zinc-800/90 text-zinc-300 border border-zinc-700/80 rounded-full px-2 py-0.5 text-[10px] font-medium font-mono">
                                <Clock className="w-3 h-3 animate-spin text-zinc-400" />
                                <span>Queued</span>
                              </span>
                            )}
                            {deliveryStatus === "sent" && (
                              <span className="flex items-center gap-1 bg-zinc-800/90 text-zinc-300 border border-zinc-700/80 rounded-full px-2 py-0.5 text-[10px] font-medium font-mono">
                                <CheckCheck className="w-3 h-3 text-emerald-400" />
                                <span>Sent (Playwright)</span>
                              </span>
                            )}
                            {deliveryStatus === "sent_manually" && (
                              <span className="flex items-center gap-1 bg-zinc-800/90 text-zinc-300 border border-zinc-700/80 rounded-full px-2 py-0.5 text-[10px] font-medium font-mono">
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Sent Manually</span>
                              </span>
                            )}
                            {deliveryStatus === "failed" && (
                              <span className="flex items-center gap-1 bg-rose-950/80 text-rose-300 border border-rose-800/80 rounded-full px-2 py-0.5 text-[10px] font-medium font-mono">
                                <AlertCircle className="w-3 h-3 text-rose-400" />
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

            {/* 4. COMPOSER, ON-DEMAND AI REPLIES & SEND CTA */}
            <div className="relative border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              {/* Dark Charcoal On-Demand AI Replies Button */}
              <div className="absolute -top-3 left-4 z-20">
                <button
                  type="button"
                  onClick={handleToggleAiPopover}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border shadow-xs transition-all cursor-pointer ${
                    showAiPopover
                      ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 scale-105"
                      : "bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 border-zinc-800 dark:border-zinc-200"
                  }`}
                  title="Generate or view on-demand AI reply suggestions"
                >
                  <Sparkles className={`w-3 h-3 ${loadingSuggestions ? "animate-spin" : ""}`} />
                  <span>AI Replies</span>
                  {aiSuggestions.length > 0 && !showAiPopover && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>
              </div>

              {/* Floating AI Reply Suggestions Popover (Crisp White / Dark Charcoal Theme) */}
              {showAiPopover && (
                <div
                  ref={aiPopoverRef}
                  className="absolute bottom-full left-4 mb-2 z-30 w-[calc(100%-2rem)] sm:w-[480px] max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl p-3.5 space-y-2.5 animate-in fade-in zoom-in-95 duration-150"
                >
                  {/* Popover Header */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-white">
                      <Sparkles className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                      <span>3 AI Reply Suggestions (Click to Populate)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => activeLead?.id && fetchSuggestions(activeLead.id)}
                        disabled={loadingSuggestions}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white cursor-pointer disabled:opacity-50"
                        title="Generate fresh suggestions"
                      >
                        <RefreshCw className={`w-3 h-3 ${loadingSuggestions ? "animate-spin" : ""}`} />
                        <span>Refresh</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowAiPopover(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        title="Close popover (Esc)"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Popover Body */}
                  {loadingSuggestions ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin text-zinc-600 dark:text-zinc-400" />
                      <span>Crafting contextual suggestions for {activeLead.name}...</span>
                    </div>
                  ) : aiSuggestions.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 space-y-2">
                      <p>No AI suggestions loaded.</p>
                      <button
                        type="button"
                        onClick={() => activeLead?.id && fetchSuggestions(activeLead.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate Suggestions</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-0.5">
                      {aiSuggestions.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setComposerText(item.text);
                            setShowAiPopover(false);
                          }}
                          className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:border-zinc-900/20 dark:hover:border-slate-500 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                              {item.category}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium capitalize">
                              {item.tone}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed group-hover:text-zinc-900 dark:group-hover:text-white line-clamp-2">
                            {item.text}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Composer Form */}
              <form onSubmit={handleSendMessage} className="p-4 pt-4 space-y-2.5">
                {/* Row 1: Dispatch Mode Toggle & Keyboard Hint */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Dispatch Mode:
                    </span>
                    <button
                      type="button"
                      onClick={() => setLocalAutomation(!localAutomation)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        localAutomation ? "bg-zinc-900 dark:bg-zinc-100" : "bg-slate-300 dark:bg-slate-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white dark:bg-slate-900 shadow-lg ring-0 transition duration-200 ease-in-out ${
                          localAutomation ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {localAutomation ? (
                        <span className="text-zinc-900 dark:text-white font-semibold">
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

                {/* Row 2: Message Box + Primary Dark Charcoal CTA Button */}
                <div className={`flex items-end gap-2.5 ${!isLeadCardDocked ? "pr-36 sm:pr-40" : ""}`}>
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
                    placeholder="Type a message or click AI Replies above..."
                    className="flex-1 p-3 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none leading-relaxed font-sans"
                  />

                  {/* Primary Dark Charcoal CTA with Micro-Emerald Icon Accent */}
                  <button
                    type="submit"
                    disabled={isSending || !composerText.trim()}
                    className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-slate-200 disabled:text-slate-400 dark:bg-zinc-100 dark:hover:bg-white dark:disabled:bg-slate-800 dark:disabled:text-slate-500 text-white dark:text-zinc-900 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-sm transition-all flex items-center gap-2 shrink-0 cursor-pointer"
                  >
                    {isSending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : localAutomation ? (
                      <>
                        <Send className="w-4 h-4 text-emerald-400" />
                        <span>Queue</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4 text-emerald-400" />
                        <span>Open WhatsApp</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center p-8 text-center text-slate-400 text-sm">
            Select a conversation from the left to start messaging.
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
