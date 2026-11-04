"use client";

import React, { useMemo } from "react";
import {
  Activity,
  ArrowRight,
  Bug,
  Building,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Mail,
  MapPin,
  MessageSquare,
  Play,
  Send,
  Zap,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { env } from "@/config/env";

export function DashboardView() {
  const {
    leads,
    activeHustle,
    activeHustleId,
    stockPlan,
    sprintPlan,
    bufferHealthPct,
    setSelectedLeadId,
    setActiveTab,
    handleDayModeChange,
    setProblemModalOpen,
    dashScheduleFilter,
    setDashScheduleFilter,
    handleTriggerRefill,
    handleSyncBatchLinks,
  } = useCRM();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning, Captain";
    if (hour < 18) return "Good Afternoon, Captain";
    return "Good Evening, Captain";
  }, []);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, []);

  // Multi-channel send counts & safety caps
  const waSentToday = stockPlan?.today_channel_sends?.whatsapp ?? 0;
  const waDailyLimit = stockPlan?.channel_limits?.whatsapp ?? 15;
  const igSentToday = stockPlan?.today_channel_sends?.instagram ?? 0;
  const igDailyLimit = stockPlan?.channel_limits?.instagram ?? 20;
  const emailSentToday = stockPlan?.today_channel_sends?.email ?? 0;
  const emailDailyLimit = stockPlan?.channel_limits?.email ?? 50;

  const waPct = Math.min(100, Math.round((waSentToday / (waDailyLimit || 1)) * 100));
  const igPct = Math.min(100, Math.round((igSentToday / (igDailyLimit || 1)) * 100));
  const emailPct = Math.min(100, Math.round((emailSentToday / (emailDailyLimit || 1)) * 100));

  const todayMode = stockPlan?.upcoming_schedule?.[0]?.mode ?? "normal";

  // Dynamic stage map for calculating smart view counts
  const stageMap = useMemo(() => {
    const map: Record<string, number> = {};
    activeHustle?.stages.forEach((s) => {
      map[s.slug] = s.id;
    });
    return map;
  }, [activeHustle]);

  const reviewTrayCount = useMemo(() => {
    const pkgStageId = stageMap["package_ready"] ?? 2;
    return leads.filter(
      (l) => l.stage_id === pkgStageId || l.packages?.some((p) => !!p.video_file_path)
    ).length;
  }, [leads, stageMap]);

  const repliedWarmCount = useMemo(() => {
    const repliedStageId = stageMap["replied"] ?? 6;
    return leads.filter((l) => l.stage_id === repliedStageId).length;
  }, [leads, stageMap]);

  const contactedCount = useMemo(() => {
    const contactedStageId = stageMap["contacted"] ?? 4;
    return leads.filter((l) => l.stage_id === contactedStageId).length;
  }, [leads, stageMap]);

  const totalDealValue = useMemo(() => {
    return leads.length * (activeHustle?.deal_value_inr || 25000);
  }, [leads.length, activeHustle?.deal_value_inr]);

  const dashboardScheduleLeads = useMemo(() => {
    if (dashScheduleFilter === "today") {
      return leads.filter((l) => {
        if (!l.next_action_due_at) return false;
        const due = new Date(l.next_action_due_at);
        const today = new Date();
        return due.toDateString() === today.toDateString();
      });
    }
    if (dashScheduleFilter === "hot") {
      return leads.filter((l) => (l.intent_score || 0) >= 40);
    }
    return leads;
  }, [leads, dashScheduleFilter]);

  return (
    <div className="space-y-6">
      {/* 1. Header: Greeting, Subtitle, Day Mode Switcher & Top Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Control Room / Command Dashboard
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>{greeting}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {formattedDate} • Side Hustle Autopilot & Command Center
          </p>
        </div>

        {/* Top Controls: Day Mode Switcher, Export CSV, Report Problem */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-1 text-xs shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 hidden sm:inline">
              Day Mode:
            </span>
            {(["normal", "away", "off"] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleDayModeChange(m)}
                className={`px-3 py-1.5 rounded-xl capitalize font-semibold transition-all cursor-pointer ${
                  todayMode === m
                    ? m === "off"
                      ? "bg-rose-600 text-white shadow-sm"
                      : m === "away"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
                title={`Switch day mode to ${m} (controls autonomous send pacing)`}
              >
                {m}
              </button>
            ))}
          </div>

          <a
            href={`${env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"}/api/leads/export/csv?hustle_id=${activeHustleId}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
            title="Export CRM data to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </a>

          <button
            onClick={() => setProblemModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/50 text-xs font-semibold text-rose-700 dark:text-rose-300 transition-colors shadow-sm cursor-pointer"
            title="Capture run trace & diagnostic brief"
          >
            <Bug className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden sm:inline">Report Problem</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Strip: Stock Buffer Ring, Active Pipeline, Multi-Channel Send Limits, Ready Velocity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Stock Buffer Health Ring & Capacity */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-card flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Stock Buffer Health
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {bufferHealthPct}%
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {stockPlan?.effective_buffer_days ?? 3}-day buffer protected
            </div>
            <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              {stockPlan?.current_ready_packages ?? 0} / {stockPlan?.required_ready_packages ?? 15} ready
            </div>
          </div>

          {/* Circular Gauge SVG */}
          <div className="relative w-18 h-18 flex items-center justify-center shrink-0">
            <svg className="w-18 h-18 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100 dark:text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={bufferHealthPct >= 80 ? "text-emerald-500" : "text-amber-500"}
                strokeDasharray={`${bufferHealthPct}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-[10px] font-black font-mono text-slate-800 dark:text-white">
                KPI
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Active Pipeline Leads & Projected Value */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-card space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Pipeline</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {leads.length} <span className="text-xs font-normal text-slate-400">clinics</span>
            </div>
            <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
              ₹{(totalDealValue / 1000).toLocaleString()}k EV
            </div>
          </div>
          <div className="flex items-center gap-1.5 pt-1 text-[10px] flex-wrap">
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 font-semibold font-mono">
              {reviewTrayCount} Ready
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 font-semibold font-mono">
              {contactedCount} Pitched
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 font-semibold font-mono">
              {repliedWarmCount} Warm
            </span>
          </div>
        </div>

        {/* Metric 3: Multi-Channel Send Limits (WhatsApp / Instagram / Email) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-card space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Channel Send Limits</span>
            <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
              SAFE
            </span>
          </div>

          <div className="space-y-1.5 pt-0.5">
            {/* WhatsApp */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Send className="w-3 h-3 text-emerald-500" />
                  <span>WhatsApp</span>
                </span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {waSentToday} / {waDailyLimit}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${waPct}%` }} />
              </div>
            </div>

            {/* Instagram */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-pink-500" />
                  <span>Instagram DM</span>
                </span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {igSentToday} / {igDailyLimit}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-pink-500 h-1.5 rounded-full" style={{ width: `${igPct}%` }} />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-blue-500" />
                  <span>Cold Email</span>
                </span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {emailSentToday} / {emailDailyLimit}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${emailPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Metric 4: Evening Sprint Yield & Quick Refill Trigger */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-card flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Sprint Velocity</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {sprintPlan?.allocated_minutes ?? 0} / {sprintPlan?.budget_minutes ?? 60} <span className="text-xs font-normal text-slate-400">mins</span>
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              ₹{(sprintPlan?.total_expected_value_inr ?? 0).toLocaleString()} EV Yield • EV/min prioritized
            </div>
          </div>
          <button
            onClick={() => setActiveTab("sprint")}
            className="w-full py-1.5 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Open Evening Sprint →</span>
          </button>
        </div>
      </div>

      {/* 3. Middle Section: Outreach Schedule Card + Autopilot Safety */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Schedule Card with Filter Tabs & Warm Highlight */}
            <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-card space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    <span>Outreach Schedule & Action Queue</span>
                  </h2>
                  <p className="text-xs text-slate-400">Pipedrive mandatory next steps ordered by urgency</p>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/60 text-xs">
                  {[
                    { id: "all", label: "All Tasks" },
                    { id: "today", label: "Due Today" },
                    { id: "hot", label: "Hot Viewers" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setDashScheduleFilter(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                        dashScheduleFilter === tab.id
                          ? "bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-xs"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Featured Urgent Lead */}
              {dashboardScheduleLeads.length > 0 && (
                <div
                  onClick={() => setSelectedLeadId(dashboardScheduleLeads[0].id)}
                  className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 dark:border-amber-500/20 space-y-3 cursor-pointer hover:border-amber-500 transition-all shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider">
                          Priority Next Step
                        </span>
                        <span className="text-xs text-slate-400">
                          {dashboardScheduleLeads[0].doctor_name || "Doctor"} • {dashboardScheduleLeads[0].locality}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {dashboardScheduleLeads[0].name}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {dashboardScheduleLeads[0].next_action || "Send personalized walkthrough & demo preview links"}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                        ₹{dashboardScheduleLeads[0].deal_value_inr || 25000}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-amber-500/20 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#141721] border border-amber-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 font-medium">
                        WhatsApp Outreach
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        Fit Score: {dashboardScheduleLeads[0].fit_score}%
                      </span>
                    </div>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 group">
                      <span>Inspect Deal</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              )}

              {/* Queued Action List */}
              <div className="space-y-2">
                {dashboardScheduleLeads.slice(1, 6).map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0E1017] hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between gap-4 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {lead.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">{lead.name}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-sm">
                          {lead.next_action || "Schedule initial pitch"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-bold">
                        {lead.fit_score}% Fit
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Autopilot Velocity & Enforced Invariants */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-card flex flex-col justify-between space-y-5">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-500" />
                    <span>Autopilot & Velocity</span>
                  </h3>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    ONLINE
                  </span>
                </div>

                {/* 7-Step Gate Indicators */}
                <div className="pt-4 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Enforced Invariants
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/[0.04] text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>No Website Rule</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/[0.04] text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>2-Source Facts</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/[0.04] text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Idempotent Send</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/[0.04] text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Live HTTP 200</span>
                    </div>
                  </div>
                </div>

                {/* Autopilot Cockpit Quick Link */}
                <div className="pt-4">
                  <button
                    onClick={() => setActiveTab("autopilot")}
                    className="w-full p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center justify-between cursor-pointer hover:bg-indigo-100/70 dark:hover:bg-indigo-900/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Switch to Autopilot Cockpit</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Autopilot Quick Action Triggers */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleTriggerRefill}
                  className="w-full py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 transition-all cursor-pointer active:scale-95"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Run Stock Refill Batch</span>
                </button>
                <button
                  onClick={handleSyncBatchLinks}
                  className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Verify Live HTTP Links</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom: Active Priority Clinics Table */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Active Priority Clinics</h2>
                <p className="text-xs text-slate-400">Targeted prospects currently in active conversation stages</p>
              </div>
              <button
                onClick={() => setActiveTab("table")}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Leads Table ({leads.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/[0.06] text-slate-400 font-semibold text-[11px] uppercase tracking-wider pb-3">
                    <th className="py-3 px-3">Clinic & Doctor</th>
                    <th className="py-3 px-3">Locality</th>
                    <th className="py-3 px-3">Fit / Intent</th>
                    <th className="py-3 px-3">Mandatory Next Step</th>
                    <th className="py-3 px-3">Deal Potential</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {leads.slice(0, 6).map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLeadId(lead.id)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                            {lead.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{lead.name}</div>
                            <div className="text-[11px] text-slate-400">{lead.doctor_name || "Doctor"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{lead.locality || lead.city}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-semibold font-mono text-[10px]">
                            Fit {lead.fit_score}%
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 font-semibold font-mono text-[10px]">
                            Intent {lead.intent_score}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                        {lead.next_action || "None scheduled"}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                          ₹{lead.deal_value_inr || 25000}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLeadId(lead.id);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer transition-colors"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
    </div>
  );
}
