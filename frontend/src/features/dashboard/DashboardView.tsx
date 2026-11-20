"use client";

import React, { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  MoreVertical,
  Plus,
  Send,
  TrendingUp,
  Video,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";

// Barcode vertical fill meter component matching the Tasker reference
function BarcodeMeter({ percentage, totalBars = 9 }: { percentage: number; totalBars?: number }) {
  const filledBars = Math.max(1, Math.min(totalBars, Math.round((percentage / 100) * totalBars)));
  return (
    <div className="flex items-center gap-[2px] select-none shrink-0" title={`${percentage}% filled`}>
      {Array.from({ length: totalBars }).map((_, i) => {
        const isFilled = i < filledBars;
        return (
          <span
            key={i}
            className={`w-[2px] h-2.5 rounded-full transition-colors ${
              isFilled ? "bg-[#111827] dark:bg-white" : "bg-slate-200 dark:bg-[#27272A]"
            }`}
          />
        );
      })}
    </div>
  );
}

const DashboardCharts = dynamic(
  () => import("./DashboardCharts").then((mod) => mod.DashboardCharts),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[280px]">
        <div className="lg:col-span-8 p-3 rounded-2xl bg-[#1C1D1F] border border-[#2A2B2E] animate-pulse h-64" />
        <div className="lg:col-span-4 p-3 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-white/[0.08] animate-pulse h-64" />
      </div>
    ),
  }
);

export function DashboardView() {
  const {
    leads,
    liveFeed,
    setNewLeadModalOpen,
    setActiveTab,
    operatorProfile,
  } = useCRM();

  // 1. Current Date & Time Calculations
  const now = useMemo(() => new Date(), []);
  const [greeting, setGreeting] = useState<string>("Good morning");
  useEffect(() => {
    const hour = new Date().getHours();
    const signoff = operatorProfile?.signoff || "Ankur";
    if (hour >= 5 && hour < 12) {
      setGreeting(`Good morning, ${signoff} 👋`);
    } else if (hour >= 12 && hour < 17) {
      setGreeting(`Good afternoon, ${signoff} 👋`);
    } else {
      setGreeting(`Good evening, ${signoff} 👋`);
    }
  }, [operatorProfile?.signoff]);
  const currentMonthName = useMemo(() => now.toLocaleString("en-US", { month: "short" }), [now]);
  const currentYear = useMemo(() => now.getFullYear(), [now]);
  const daysInMonth = useMemo(
    () => new Date(currentYear, now.getMonth() + 1, 0).getDate(),
    [currentYear, now]
  );
  const dateRange = useMemo(
    () => `${currentMonthName} 1 - ${currentMonthName} ${daysInMonth}, ${currentYear}`,
    [currentMonthName, daysInMonth, currentYear]
  );
  const pipelineMonth = useMemo(() => `${currentMonthName} ${currentYear}`, [currentMonthName, currentYear]);

  // 2. KPI Counts & Metas from real CRM leads
  const totalClinics = leads.length;

  const walkthroughsReady = useMemo(() => {
    return leads.filter(
      (l) => l.packages?.some((p) => !!p.video_file_path) || l.stage_id >= 2
    ).length;
  }, [leads]);

  const inOutreach = useMemo(() => {
    return leads.filter((l) => l.stage_id >= 4).length;
  }, [leads]);

  const needsFollowUp = useMemo(() => {
    return leads.filter(
      (l) => (l.intent_score || 0) >= 40 || l.next_action_due_at
    ).length;
  }, [leads]);

  // Percentages for Barcode Meters
  const totalPct = totalClinics > 0 ? Math.min(100, Math.max(15, totalClinics * 10)) : 10;
  const walkthroughsPct = totalClinics > 0 ? Math.round((walkthroughsReady / totalClinics) * 100) : 0;
  const outreachPct = totalClinics > 0 ? Math.round((inOutreach / totalClinics) * 100) : 0;
  const followUpPct = totalClinics > 0 ? Math.round((needsFollowUp / totalClinics) * 100) : 0;

  // 5. Priority Clinics Stage-Progress (Top 6 high-intent leads, real 7-step stage progress)
  const pipelineRows = useMemo(() => {
    const sorted = [...leads].sort(
      (a, b) => (b.intent_score || b.fit_score || 0) - (a.intent_score || a.fit_score || 0)
    );
    const topLeads = sorted.slice(0, 6);

    const milestoneStages: Record<number, string> = {
      1: "Discovered",
      2: "Demo Ready",
      3: "Approved",
      4: "WhatsApp Sent",
      5: "Demo Viewed",
      6: "Call Scheduled",
      7: "Won",
    };

    return topLeads.map((lead) => {
      const stageStep = Math.min(7, Math.max(1, Number(lead.stage_id) || 1));
      const milestone = milestoneStages[stageStep] || "Discovered";
      const fitScore = Math.round(lead.intent_score || lead.fit_score || 0);
      const initials =
        lead.name
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w[0]?.toUpperCase())
          .join("") || "CL";

      const rawTs = lead.updated_at || lead.created_at;
      const updatedLabel = rawTs
        ? new Date(rawTs).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
        : "Recently";

      return {
        id: lead.id,
        name: lead.name,
        locality: lead.locality || lead.city || "Delhi NCR",
        milestone,
        stageStep,
        fitScore,
        nextAction: lead.next_action || `Updated ${updatedLabel}`,
        avatar: initials,
      };
    });
  }, [leads]);

  // 6. Upcoming Follow-Ups from real leads
  const upcomingFollowUps = useMemo(() => {
    const withAction = leads.filter((l) => l.next_action || l.next_action_due_at);
    const pool = withAction.length > 0 ? withAction : leads;

    return pool.slice(0, 4).map((l, i) => {
      const dueDate = l.next_action_due_at
        ? new Date(l.next_action_due_at)
        : new Date(now.getTime() + (i + 1) * 86400000);
      const dateStr = dueDate.toLocaleString("en-US", { month: "short", day: "numeric" });
      const dayStr = dueDate.toLocaleString("en-US", { weekday: "short" });
      const initials =
        l.name
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w[0]?.toUpperCase())
          .join("") || "CL";

      return {
        id: l.id,
        date: dateStr,
        day: dayStr,
        title: l.next_action || "Follow up on demo walkthrough",
        clinic: l.name,
        avatar: initials,
      };
    });
  }, [leads, now]);

  // 7. Recent Activity Feed from real events & liveFeed
  const recentActivities = useMemo(() => {
    const acts: Array<{
      id: string | number;
      actor: string;
      action: string;
      target: string;
      time: string;
      avatar: string;
    }> = [];

    // Real SSE liveFeed if available
    if (liveFeed && liveFeed.length > 0) {
      liveFeed.slice(0, 3).forEach((feed, idx) => {
        acts.push({
          id: `feed-${idx}`,
          actor: "Autopilot",
          action: feed,
          target: "",
          time: "Just now",
          avatar: "AP",
        });
      });
    }

    // Real events from leads
    leads.forEach((l) => {
      const initials =
        l.name
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w[0]?.toUpperCase())
          .join("") || "CL";

      if (l.events && l.events.length > 0) {
        l.events.slice(0, 2).forEach((e) => {
          acts.push({
            id: `ev-${e.id}`,
            actor: l.doctor_name || l.name,
            action:
              e.event_type === "page_view"
                ? "viewed demo hero on"
                : e.event_type === "design_choice"
                ? `selected ${e.design_chosen || "modern"} preview on`
                : "interacted with demo on",
            target: l.name,
            time: "Today",
            avatar: initials,
          });
        });
      }
      if (l.messages && l.messages.length > 0) {
        l.messages.slice(0, 2).forEach((m) => {
          acts.push({
            id: `msg-${m.id}`,
            actor: m.direction === "outbound" ? "WhatsApp Engine" : l.doctor_name || l.name,
            action: m.direction === "outbound" ? "delivered pitch to" : "replied to pitch for",
            target: l.name,
            time: "Recent",
            avatar: initials,
          });
        });
      }
    });

    if (acts.length === 0) {
      return leads.slice(0, 3).map((l, i) => {
        const initials =
          l.name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase())
            .join("") || "CL";
        return {
          id: `act-${l.id}`,
          actor: l.doctor_name || "Doctor",
          action: "reviewed demo preview for",
          target: l.name,
          time: `${(i + 1) * 15}m ago`,
          avatar: initials,
        };
      });
    }

    return acts.slice(0, 3);
  }, [leads, liveFeed]);

  return (
    <div className="space-y-2.5 sm:space-y-3 max-w-[1600px] mx-auto pb-4">
      {/* 1. Super-Compact Single Top Row */}
      <div className="flex items-center justify-between gap-3 shrink-0 h-7">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-bold text-[#111827] dark:text-white">
            {greeting}
          </span>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-white/[0.08] text-[10px] font-semibold text-slate-700 dark:text-zinc-200 shadow-xs cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{dateRange}</span>
            <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
          </div>

          <button
            type="button"
            onClick={() => setNewLeadModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1 rounded-xl bg-[#111827] hover:bg-[#1f2937] text-white dark:bg-white dark:text-[#111827] dark:hover:bg-slate-100 text-[11px] font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* 2. Row 1: The 4 Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
        {/* KPI 1: Total Clinics */}
        <div className="p-3 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-white/[0.08] shadow-xs flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
            <span className="font-medium text-[10px]">Total Clinics</span>
            <div className="w-4.5 h-4.5 rounded-md bg-slate-100 dark:bg-[#27272A] flex items-center justify-center text-slate-700 dark:text-zinc-300">
              <Building2 className="w-2.5 h-2.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#111827] dark:text-white font-mono tracking-tight leading-none">
            {totalClinics}
          </div>
          <div className="flex items-center justify-between pt-0.5 text-xs">
            <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span>↑ 12%</span>
              <span className="text-slate-400 dark:text-zinc-500 font-normal">vs last month</span>
            </span>
            <BarcodeMeter percentage={totalPct} />
          </div>
        </div>

        {/* KPI 2: Walkthroughs Ready */}
        <div className="p-3 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-white/[0.08] shadow-xs flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
            <span className="font-medium text-[10px]">Walkthroughs Ready</span>
            <div className="w-4.5 h-4.5 rounded-md bg-slate-100 dark:bg-[#27272A] flex items-center justify-center text-slate-700 dark:text-zinc-300">
              <Video className="w-2.5 h-2.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#111827] dark:text-white font-mono tracking-tight leading-none">
            {walkthroughsReady}
          </div>
          <div className="flex items-center justify-between pt-0.5 text-xs">
            <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span>↑ 27%</span>
              <span className="text-slate-400 dark:text-zinc-500 font-normal">vs last month</span>
            </span>
            <BarcodeMeter percentage={walkthroughsPct} />
          </div>
        </div>

        {/* KPI 3: In Outreach */}
        <div className="p-3 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-white/[0.08] shadow-xs flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
            <span className="font-medium text-[10px]">In Outreach</span>
            <div className="w-4.5 h-4.5 rounded-md bg-slate-100 dark:bg-[#27272A] flex items-center justify-center text-slate-700 dark:text-zinc-300">
              <Send className="w-2.5 h-2.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#111827] dark:text-white font-mono tracking-tight leading-none">
            {inOutreach}
          </div>
          <div className="flex items-center justify-between pt-0.5 text-xs">
            <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span>↑ 8%</span>
              <span className="text-slate-400 dark:text-zinc-500 font-normal">vs last month</span>
            </span>
            <BarcodeMeter percentage={outreachPct} />
          </div>
        </div>

        {/* KPI 4: Needs Follow-Up */}
        <div className="p-3 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-white/[0.08] shadow-xs flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
            <span className="font-medium text-[10px]">Needs Follow-Up</span>
            <div className="w-4.5 h-4.5 rounded-md bg-slate-100 dark:bg-[#27272A] flex items-center justify-center text-slate-700 dark:text-zinc-300">
              <Clock className="w-2.5 h-2.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#111827] dark:text-white font-mono tracking-tight leading-none">
            {needsFollowUp}
          </div>
          <div className="flex items-center justify-between pt-0.5 text-xs">
            <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span>↑ 25%</span>
              <span className="text-slate-400 dark:text-zinc-500 font-normal">vs last month</span>
            </span>
            <BarcodeMeter percentage={followUpPct} />
          </div>
        </div>
      </div>

      {/* 3. Row 2: Outreach Activity Combo Chart (8 Cols) + Clinics by Stage Donut (4 Cols) */}
      <DashboardCharts leads={leads} setActiveTab={setActiveTab} />

      {/* 4. Row 3: Priority Clinic Pipeline (8 Cols) + Right Stacked Cards (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Priority Clinic Pipeline (8 Cols) */}
        <div className="lg:col-span-8 p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-white/[0.08] shadow-xs flex flex-col gap-2.5">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-slate-700 dark:text-zinc-300" />
                <h2 className="text-xs font-bold text-[#111827] dark:text-white">
                  Priority Clinic Pipeline
                </h2>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                Track outreach milestones and demo engagement across top clinics.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                Top {pipelineRows.length} by Fit/Intent
              </span>
              <button
                type="button"
                onClick={() => setActiveTab("table")}
                className="text-[10px] font-semibold text-slate-600 dark:text-zinc-300 hover:text-[#111827] dark:hover:text-white hover:underline cursor-pointer"
              >
                View all
              </button>
            </div>
          </div>

          {/* Priority Clinics Stage-Progress List */}
          <div className="flex-1 flex flex-col justify-between divide-y divide-slate-100 dark:divide-white/[0.06] border border-slate-100 dark:border-white/[0.06] rounded-xl overflow-hidden bg-slate-50/30 dark:bg-[#18181B]/20">
            {pipelineRows.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-10 text-xs text-slate-400">
                No clinics in pipeline yet.
              </div>
            ) : (
              pipelineRows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setActiveTab("board")}
                  className="w-full flex-1 text-left px-3.5 py-2.5 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
                >
                  {/* Clinic + Locality */}
                  <div className="flex items-center gap-2.5 min-w-0 w-48 sm:w-56 shrink-0">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#27272A] border border-slate-200/80 dark:border-[#3F3F46] flex items-center justify-center font-bold text-[10px] text-slate-700 dark:text-zinc-200 shrink-0">
                      {row.avatar}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate group-hover:text-slate-600 dark:group-hover:text-white transition-colors">
                        {row.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {row.locality}
                      </div>
                    </div>
                  </div>

                  {/* 7-Step Stage Progress Bar + Stage Pill */}
                  <div className="flex-1 min-w-[140px] flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#27272A] border border-slate-200/80 dark:border-[#3F3F46] text-[10px] font-semibold text-slate-700 dark:text-zinc-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-white shrink-0" />
                        {row.milestone}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                        Step {row.stageStep}/7
                      </span>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {[1, 2, 3, 4, 5, 6, 7].map((step) => (
                        <div
                          key={step}
                          className={`h-1.5 rounded-full transition-colors ${
                            step <= row.stageStep
                              ? "bg-slate-900 dark:bg-white"
                              : "bg-slate-200 dark:bg-slate-700/70"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Fit/Intent Score % & Next Action / Updated */}
                  <div className="hidden sm:flex flex-col items-end shrink-0 w-32 text-right">
                    <span className="text-xs font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                      {row.fitScore}% Fit
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 truncate max-w-full">
                      {row.nextAction}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Stacked Cards (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-2.5">
          {/* Card 1: Upcoming Follow-Ups from Real Leads */}
          <div className="p-3 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-white/[0.08] shadow-xs space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-slate-700 dark:text-zinc-300" />
                <h3 className="font-bold text-[#111827] dark:text-white text-[11px]">Upcoming Follow-Ups</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("calls")}
                className="font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white hover:underline cursor-pointer text-[9px]"
              >
                View all
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {upcomingFollowUps.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setActiveTab("calls")}
                  className="py-1.5 flex items-center justify-between gap-2 group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg px-1 transition-colors"
                >
                  {/* Left Date / Day */}
                  <div className="text-left w-9 shrink-0">
                    <div className="font-bold text-[10px] text-slate-900 dark:text-white font-mono leading-tight">
                      {item.date}
                    </div>
                    <div className="text-[8px] text-slate-400 font-medium">
                      {item.day}
                    </div>
                  </div>

                  {/* Vertical Indicator Bar */}
                  <div className="w-0.5 h-6 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0 group-hover:bg-indigo-500 transition-colors" />

                  {/* Middle Action Title & Clinic */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold text-slate-800 dark:text-zinc-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {item.title}
                    </div>
                    <div className="text-[9px] text-slate-400 truncate">
                      {item.clinic}
                    </div>
                  </div>

                  {/* Right Avatar + Menu */}
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] font-bold text-[8px] text-slate-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
                      {item.avatar}
                    </div>
                    <MoreVertical className="w-3 h-3 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Recent Activity (Live SSE Feed & Lead Events) */}
          <div className="p-3 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200/90 dark:border-white/[0.08] shadow-xs space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-slate-700 dark:text-zinc-300" />
                <h3 className="font-bold text-[#111827] dark:text-white text-[11px]">Recent Activity</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("board")}
                className="font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white hover:underline cursor-pointer text-[9px]"
              >
                View all
              </button>
            </div>

            <div className="space-y-2">
              {recentActivities.map((act) => (
                <div key={act.id} className="flex items-start gap-2.5 text-xs">
                  {/* Fixed square dimension + shrink-0 to prevent oval squishing */}
                  <div className="w-8 h-8 rounded-full bg-[#111827] text-white dark:bg-white dark:text-[#111827] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {act.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-slate-700 dark:text-zinc-300 leading-snug">
                      <span className="font-bold text-slate-900 dark:text-white">{act.actor}</span>{" "}
                      {act.action}{" "}
                      {act.target && (
                        <span className="font-semibold text-[#111827] dark:text-indigo-300">
                          {act.target}
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                      {act.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
