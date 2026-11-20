"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Gauge,
  MessageSquare,
  PanelRightOpen,
  PhoneCall,
  RefreshCw,
  Send,
  Sparkles,
  TrendingUp,
  User,
  Zap,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { apiFetch } from "@/lib/api/client";

export interface AttentionCard {
  id: number;
  lead_id: number;
  name: string;
  doctor_name: string;
  locality: string;
  city: string;
  primary_phone: string;
  preferred_channel: string;
  status: string;
  stage: string;
  stage_slug: string;
  next_action: string;
  next_action_due_at: string | null;
  needs_followup: boolean;
  fit_score: number;
  intent_score: number;
  prep_brief: string;
  last_call_summary: string;
  last_message_text: string;
  last_message_direction: string;
  attention_reason: string;
  urgency: string;
}

export interface AttentionData {
  followup_required: AttentionCard[];
  unreplied_messages: AttentionCard[];
  todays_actions: AttentionCard[];
  call_preparation: AttentionCard[];
}

export function AttentionVelocityDashboard() {
  const { activeHustleId, openInboxForLead, openLogCallModal, setSelectedLeadId } = useCRM();
  const [data, setData] = useState<AttentionData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const shouldReduceMotion = useReducedMotion();

  const fetchAttention = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<AttentionData>(`/api/cockpit/attention?hustle_id=${activeHustleId}`);
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load attention dashboards";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeHustleId]);

  useEffect(() => {
    fetchAttention();
  }, [fetchAttention]);

  const followupList = data?.followup_required || [];
  const unrepliedList = data?.unreplied_messages || [];
  const actionsList = data?.todays_actions || [];
  const prepList = data?.call_preparation || [];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.05,
        delayChildren: shouldReduceMotion ? 0 : 0.02,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 380,
        damping: 28,
        duration: shouldReduceMotion ? 0 : 0.22,
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Refresh Controls */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white/90 dark:bg-[#18181B]/90 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Attention & Velocity Radar
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Telemetry
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Surfacing high-leverage follow-ups, unreplied inbounds, overdue actions, and pre-call prep briefs.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAttention}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#27272A] dark:hover:bg-slate-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Radar</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchAttention}
            className="font-bold underline hover:no-underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4 Summary Telemetry Gauges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#18181B]/80 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] hover:border-amber-500/40 shadow-sm transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Follow-ups Due</span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {followupList.length}
          </div>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5 block">
            Needs response touchpoint
          </span>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#18181B]/80 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] hover:border-rose-500/40 shadow-sm transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Unreplied Inbound</span>
            <div className="w-7 h-7 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {unrepliedList.length}
          </div>
          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5 block">
            Awaiting prompt reply
          </span>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#18181B]/80 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] hover:border-indigo-500/40 shadow-sm transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Today&apos;s Actions</span>
            <div className="w-7 h-7 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {actionsList.length}
          </div>
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 block">
            Scheduled commitments
          </span>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#18181B]/80 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] hover:border-emerald-500/40 shadow-sm transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Hot Intent &amp; Prep</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Flame className="w-3.5 h-3.5 fill-current" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {prepList.length}
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block">
            Warm leads &amp; pre-call briefs
          </span>
        </div>
      </div>

      {/* 4 Bento Attention Dashboards (Zero Terminals) */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6"
      >
        {/* Dashboard 1: Follow-ups Due */}
        <motion.div
          variants={itemVariants}
          className="p-4 sm:p-5 rounded-3xl bg-white/90 dark:bg-[#18181B]/90 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] hover:border-amber-500/40 shadow-sm flex flex-col transition-all group"
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-[#27272A]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  1. Follow-ups Required
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Leads with pending follow-up triggers or unacknowledged proposals
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
              {followupList.length}
            </span>
          </div>

          <div className="flex-1 space-y-3 pt-3 max-h-[380px] overflow-y-auto pr-1">
            {followupList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                <span>Zero pending follow-ups. Pipeline is shipshape!</span>
              </div>
            ) : (
              followupList.map((card) => (
                <div
                  key={`followup-${card.id}`}
                  className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-[#27272A]/60 border border-slate-200/80 dark:border-white/[0.06] hover:border-amber-500/40 transition-colors space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{card.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({card.doctor_name})
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                        {card.locality}, {card.city} &bull; Stage: {card.stage}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold uppercase">
                      {card.urgency || "Follow-up"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-zinc-300 bg-white dark:bg-[#18181B] p-2.5 rounded-xl border border-slate-200/80 dark:border-[#27272A] line-clamp-2">
                    {card.attention_reason || "Scheduled follow-up reminder is now due."}
                  </p>

                  <div className="flex items-center justify-between pt-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedLeadId(card.id)}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <PanelRightOpen className="w-3.5 h-3.5" />
                      <span>View Details</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openLogCallModal(card.id)}
                        className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>Log Call</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openInboxForLead(card.id)}
                        className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Open Inbox</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Dashboard 2: Unreplied Messages */}
        <motion.div
          variants={itemVariants}
          className="p-4 sm:p-5 rounded-3xl bg-white/90 dark:bg-[#18181B]/90 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] hover:border-rose-500/40 shadow-sm flex flex-col transition-all group"
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-[#27272A]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  2. Unreplied Inbound Messages
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Customers who replied and are waiting on an operational response
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
              {unrepliedList.length}
            </span>
          </div>

          <div className="flex-1 space-y-3 pt-3 max-h-[380px] overflow-y-auto pr-1">
            {unrepliedList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                <span>Zero unreplied inbound messages. Inbox is at zero!</span>
              </div>
            ) : (
              unrepliedList.map((card) => (
                <div
                  key={`unreplied-${card.id}`}
                  className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-[#27272A]/60 border border-slate-200/80 dark:border-white/[0.06] hover:border-rose-500/40 transition-colors space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{card.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({card.doctor_name})
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                        {card.city} &bull; Channel: {card.preferred_channel}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-bold uppercase">
                      Inbound Wait
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#18181B] border border-slate-200/80 dark:border-[#27272A] text-xs text-slate-700 dark:text-zinc-200 font-sans italic line-clamp-2">
                    &ldquo;{card.last_message_text || "Customer sent a new inbound WhatsApp inquiry."}&rdquo;
                  </div>

                  <div className="flex items-center justify-between pt-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedLeadId(card.id)}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <PanelRightOpen className="w-3.5 h-3.5" />
                      <span>View Details</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openInboxForLead(card.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Reply in WhatsApp</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Dashboard 3: Today's Actions */}
        <motion.div
          variants={itemVariants}
          className="p-4 sm:p-5 rounded-3xl bg-white/90 dark:bg-[#18181B]/90 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] hover:border-indigo-500/40 shadow-sm flex flex-col transition-all group"
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-[#27272A]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  3. Today&apos;s Actions &amp; Next Steps
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Explicit commitments and tasks scheduled for execution today
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
              {actionsList.length}
            </span>
          </div>

          <div className="flex-1 space-y-3 pt-3 max-h-[380px] overflow-y-auto pr-1">
            {actionsList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                <span>Zero pending actions for today. You&apos;re caught up!</span>
              </div>
            ) : (
              actionsList.map((card) => (
                <div
                  key={`action-${card.id}`}
                  className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-[#27272A]/60 border border-slate-200/80 dark:border-white/[0.06] hover:border-indigo-500/40 transition-colors space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{card.name}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({card.doctor_name})
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                        {card.city} &bull; Stage: {card.stage}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold uppercase">
                      Action Due
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 dark:text-zinc-200 bg-white dark:bg-[#18181B] p-2.5 rounded-xl border border-slate-200/80 dark:border-[#27272A] font-medium">
                    {card.next_action || "Pending agreed next step commitment."}
                  </p>

                  <div className="flex items-center justify-between pt-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedLeadId(card.id)}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <PanelRightOpen className="w-3.5 h-3.5" />
                      <span>View Details</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openInboxForLead(card.id)}
                        className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Inbox</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openLogCallModal(card.id)}
                        className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Log Call / Complete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Dashboard 4: Call Prep & Hot Intent */}
        <motion.div
          variants={itemVariants}
          className="p-4 sm:p-5 rounded-3xl bg-white/90 dark:bg-[#18181B]/90 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] hover:border-emerald-500/40 shadow-sm flex flex-col transition-all group"
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-[#27272A]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Flame className="w-4 h-4 fill-current" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  4. Call Prep &amp; Hot Intent
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  AI strategic briefing, objection battlecards &amp; high buyer intent leads
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
              {prepList.length}
            </span>
          </div>

          <div className="flex-1 space-y-3 pt-3 max-h-[380px] overflow-y-auto pr-1">
            {prepList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                <span>No pending call preps. Advance leads to warm stages!</span>
              </div>
            ) : (
              prepList.map((card) => {
                const isHotIntent = (card.intent_score && card.intent_score >= 70) || (card.fit_score && card.fit_score >= 70);

                return (
                  <div
                    key={`prep-${card.id}`}
                    className="p-3.5 rounded-2xl bg-slate-50/90 dark:bg-[#27272A]/60 border border-slate-200/80 dark:border-white/[0.06] hover:border-emerald-500/40 transition-colors space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{card.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({card.doctor_name})
                          </span>
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                            {card.city} &bull; Stage: {card.stage || "Warm"}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            Fit: {card.fit_score || 0}%
                          </span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Intent: {card.intent_score || 0}%
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {isHotIntent && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider animate-pulse">
                            <Flame className="w-3 h-3 fill-amber-500 text-amber-500" />
                            Hot Intent
                          </span>
                        )}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold uppercase">
                          Strategy Brief
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-zinc-300 bg-white dark:bg-[#18181B] p-2.5 rounded-xl border border-slate-200/80 dark:border-[#27272A] line-clamp-2">
                      {card.prep_brief || card.last_call_summary || card.attention_reason || "Pre-call strategy brief available"}
                    </p>

                    <div className="flex items-center justify-between pt-1 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedLeadId(card.id)}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <PanelRightOpen className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openLogCallModal(card.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Open Call Brief</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
