"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Activity,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Download,
  Eye,
  MessageSquare,
  Pause,
  PhoneCall,
  Play,
  Plus,
  RefreshCw,
  Send,
  Square,
  Video,
  Zap,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { apiFetch } from "@/lib/api/client";
import { autopilotApi, type AutopilotStatusResponse } from "@/api/autopilotApi";

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

export interface DailyTask {
  id: string;
  text: string;
  done: boolean;
}

const DEFAULT_DAILY_TASKS: DailyTask[] = [
  { id: "task-1", text: "Review unreplied WhatsApp leads", done: false },
  { id: "task-2", text: "Record pending Clinic-{slug}.mp4 demos", done: false },
  { id: "task-3", text: "Run Discovery batch for NCR", done: false },
  { id: "task-4", text: "Follow up on hot demo views", done: false },
];

interface CockpitOverviewDashboardProps {
  onNavigate: (tab: "attention" | "discovery" | "factory" | "outreach") => void;
}

export const CockpitOverviewDashboard: React.FC<CockpitOverviewDashboardProps> = ({
  onNavigate,
}) => {
  const {
    leads,
    runs,
    activeHustleId,
    activeHustle,
    globalAutomationEnabled,
    toggleGlobalAutomation,
    bufferHealthPct,
    latestPipelineStep,
    syncTerminalLogs,
    openInboxForLead,
    openLogCallModal,
    setSelectedLeadId,
    notify,
  } = useCRM();

  // Telemetry state
  const [attentionData, setAttentionData] = useState<AttentionData | null>(null);
  const [cockpitState, setCockpitState] = useState<AutopilotStatusResponse | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeDayIndex, setActiveDayIndex] = useState<number>(6); // Default to today (index 6)
  const [engineActionLoading, setEngineActionLoading] = useState<string | null>(null);

  // Daily Tasks state persisted in localStorage
  const [tasks, setTasks] = useState<DailyTask[]>(() => {
    if (typeof window === "undefined") return DEFAULT_DAILY_TASKS;
    try {
      const saved = localStorage.getItem("cockpit_daily_tasks_v1");
      return saved ? JSON.parse(saved) : DEFAULT_DAILY_TASKS;
    } catch {
      return DEFAULT_DAILY_TASKS;
    }
  });
  const [newTaskInput, setNewTaskInput] = useState("");

  const handleToggleTask = (id: string) => {
    setTasks((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
      try {
        localStorage.setItem("cockpit_daily_tasks_v1", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    const newTask: DailyTask = {
      id: `task-${Date.now()}`,
      text: newTaskInput.trim(),
      done: false,
    };
    setTasks((prev) => {
      const updated = [...prev, newTask];
      try {
        localStorage.setItem("cockpit_daily_tasks_v1", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setNewTaskInput("");
  };

  const tasksDoneCount = tasks.filter((t) => t.done).length;

  // 1. Fetch real attention and cockpit state from API
  const fetchTelemetry = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [attRes, stateRes] = await Promise.allSettled([
        apiFetch<AttentionData>(`/api/cockpit/attention?hustle_id=${activeHustleId}`),
        autopilotApi.getCockpitState(activeHustleId),
      ]);

      if (attRes.status === "fulfilled") {
        setAttentionData(attRes.value);
      }
      if (stateRes.status === "fulfilled") {
        setCockpitState(stateRes.value);
      }
    } catch {
      // Graceful fallback to local lead state
    } finally {
      setIsRefreshing(false);
    }
  }, [activeHustleId]);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  const handleManualRefresh = async () => {
    await Promise.all([fetchTelemetry(), syncTerminalLogs()]);
    notify("Cockpit telemetry refreshed", "ok");
  };

  // 2. Real metric calculations
  const totalClinics = leads.length;

  const phoneReadyCount = useMemo(
    () => leads.filter((l) => Boolean(l.primary_phone)).length,
    [leads]
  );

  const demosBuiltCount = useMemo(
    () =>
      leads.filter((l) => l.packages && l.packages.length > 0).length,
    [leads]
  );

  const dispatchedCount = useMemo(
    () =>
      leads.filter((l) =>
        l.messages?.some((m) => m.direction === "outbound")
      ).length,
    [leads]
  );

  const dncBlockedCount = useMemo(
    () => leads.filter((l) => l.do_not_contact).length,
    [leads]
  );

  const unrepliedCount = attentionData?.unreplied_messages?.length ?? 0;
  const followupCount = attentionData?.followup_required?.length ?? 0;
  const attentionCount = unrepliedCount + followupCount;

  // 3. Real 7-Day activity buckets
  const weeklyData = useMemo(() => {
    const days: Array<{
      date: Date;
      label: string;
      demos: number;
      sent: number;
    }> = [];

    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const weekdayLetter = d.toLocaleDateString("en-US", { weekday: "narrow" });

      const dayRuns = runs.filter(
        (r) => r.started_at && r.started_at.startsWith(dateStr)
      ).length;

      const dayPackages = leads.filter((l) =>
        l.packages?.some((p) => p.created_at && p.created_at.startsWith(dateStr))
      ).length;

      let dayMessages = 0;
      leads.forEach((l) => {
        l.messages?.forEach((m) => {
          if (
            m.direction === "outbound" &&
            m.created_at &&
            m.created_at.startsWith(dateStr)
          ) {
            dayMessages++;
          }
        });
      });

      days.push({
        date: d,
        label: i === 0 ? "Today" : weekdayLetter,
        demos: dayRuns + dayPackages,
        sent: dayMessages,
      });
    }

    return days;
  }, [leads, runs]);

  // Scaled SVG coordinates for 7-day activity curve
  const chartMetrics = useMemo(() => {
    const maxVal = Math.max(
      1,
      ...weeklyData.map((d) => Math.max(d.demos, d.sent))
    );

    const getX = (idx: number) => 15 + idx * ((280 - 30) / 6);
    const getY = (val: number) => 82 - (val / maxVal) * 58;

    const demoPoints = weeklyData.map((d, idx) => ({
      x: getX(idx),
      y: getY(d.demos),
    }));

    const sentPoints = weeklyData.map((d, idx) => ({
      x: getX(idx),
      y: getY(d.sent),
    }));

    const buildPath = (pts: Array<{ x: number; y: number }>) => {
      if (pts.length === 0) return "";
      let path = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i];
        const p1 = pts[i + 1];
        const cx = (p0.x + p1.x) / 2;
        path += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
      }
      return path;
    };

    return {
      maxVal,
      demoPoints,
      sentPoints,
      demoPath: buildPath(demoPoints),
      sentPath: buildPath(sentPoints),
    };
  }, [weeklyData]);

  const activeDayStats = weeklyData[activeDayIndex] || weeklyData[6];
  const activeMarkerX = chartMetrics.demoPoints[activeDayIndex]?.x ?? 250;

  // 4. Real Pipeline Coverage Percentages
  const phonePct = totalClinics > 0 ? Math.round((phoneReadyCount / totalClinics) * 100) : 0;
  const demoPct = totalClinics > 0 ? Math.round((demosBuiltCount / totalClinics) * 100) : 0;
  const outreachPct = totalClinics > 0 ? Math.round((dispatchedCount / totalClinics) * 100) : 0;
  const overallReadinessPct =
    totalClinics > 0
      ? Math.round(phonePct * 0.35 + demoPct * 0.35 + outreachPct * 0.3)
      : 0;

  // 5. Real Priority Attention / Queue leads
  const priorityQueue = useMemo(() => {
    const list: Array<{
      leadId: number;
      name: string;
      doctor: string;
      locality: string;
      phone: string;
      reason: string;
      isUnreplied: boolean;
      created: string;
    }> = [];

    attentionData?.unreplied_messages?.forEach((card) => {
      list.push({
        leadId: card.lead_id,
        name: card.name,
        doctor: card.doctor_name || "Doctor / Owner",
        locality: card.locality || card.city || "NCR",
        phone: card.primary_phone || "",
        reason: card.attention_reason || "Unreplied message",
        isUnreplied: true,
        created: "Awaiting Reply",
      });
    });

    attentionData?.followup_required?.forEach((card) => {
      if (list.length < 4 && !list.some((i) => i.leadId === card.lead_id)) {
        list.push({
          leadId: card.lead_id,
          name: card.name,
          doctor: card.doctor_name || "Doctor / Owner",
          locality: card.locality || card.city || "NCR",
          phone: card.primary_phone || "",
          reason: card.next_action || card.attention_reason || "Scheduled Follow-up",
          isUnreplied: false,
          created: card.next_action_due_at ? "Due Soon" : "Pending",
        });
      }
    });

    if (list.length < 2 && leads.length > 0) {
      const candidates = leads.filter(
        (l) => !list.some((item) => item.leadId === l.id)
      );
      candidates.slice(0, 2 - list.length).forEach((l) => {
        list.push({
          leadId: l.id,
          name: l.name,
          doctor: l.doctor_name || "Doctor / Owner",
          locality: l.locality || l.city || "Delhi NCR",
          phone: l.primary_phone || "",
          reason:
            l.packages && l.packages.length > 0
              ? "Demo ready for dispatch"
              : "Demo package pending build",
          isUnreplied: false,
          created: l.created_at
            ? new Date(l.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "Queued",
        });
      });
    }

    return list;
  }, [attentionData, leads]);

  // 6. Real JSON Telemetry Export
  const handleExportTelemetry = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      hustle_id: activeHustleId,
      summary: {
        total_clinics: totalClinics,
        phone_ready: phoneReadyCount,
        demos_built: demosBuiltCount,
        outreach_dispatched: dispatchedCount,
        dnc_blocked: dncBlockedCount,
        readiness_pct: overallReadinessPct,
        buffer_health_pct: bufferHealthPct,
        global_automation_active: globalAutomationEnabled,
      },
      cockpit_state: cockpitState,
      attention_queue: attentionData,
      recent_runs: runs.slice(0, 10),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cockpit-telemetry-hustle-${activeHustleId}-${
      new Date().toISOString().split("T")[0]
    }.json`;
    link.click();
    URL.revokeObjectURL(url);
    notify("Exported telemetry JSON successfully", "ok");
  };

  // 7. Engine execution helpers
  const isDiscoveryRunning = Boolean(
    cockpitState?.is_running &&
      (cockpitState?.active_task?.toLowerCase().includes("scout") ||
        cockpitState?.active_task?.toLowerCase().includes("discovery") ||
        latestPipelineStep?.step_name === "DISCOVERY")
  );

  const isFactoryRunning = Boolean(
    cockpitState?.is_running &&
      (cockpitState?.active_task?.toLowerCase().includes("auditor") ||
        cockpitState?.active_task?.toLowerCase().includes("build") ||
        cockpitState?.active_task?.toLowerCase().includes("factory") ||
        latestPipelineStep?.step_name === "SCAFFOLD" ||
        latestPipelineStep?.step_name === "WALKTHROUGH")
  );

  const isOutreachRunning = Boolean(
    cockpitState?.is_running &&
      (cockpitState?.active_task?.toLowerCase().includes("closer") ||
        cockpitState?.active_task?.toLowerCase().includes("outreach") ||
        latestPipelineStep?.step_name === "REVIEW_TRAY")
  );

  const handleStopEngine = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setEngineActionLoading("stop");
      await autopilotApi.stop();
      await fetchTelemetry();
      notify("Engine run stopped", "ok");
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Failed to stop engine", "err");
    } finally {
      setEngineActionLoading(null);
    }
  };

  const handleStartDiscovery = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setEngineActionLoading("discovery");
      notify("Launching Discovery Scout agent...", "ok");
      await autopilotApi.runScoutAgent({ hustle_id: activeHustleId, batch_size: 5 });
      await fetchTelemetry();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Failed to run scout", "err");
    } finally {
      setEngineActionLoading(null);
    }
  };

  const handleStartFactory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setEngineActionLoading("factory");
      notify("Launching Demo Factory recording...", "ok");
      await autopilotApi.runAuditorAgent({ hustle_id: activeHustleId, record_video: true });
      await fetchTelemetry();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Failed to run auditor", "err");
    } finally {
      setEngineActionLoading(null);
    }
  };

  const handleStartOutreach = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setEngineActionLoading("outreach");
      const isDryRun = activeHustle?.channel_limits?.dry_run !== false;
      notify(`Launching Outreach Closer agent (${isDryRun ? "Dry-Run" : "Live"})...`, "ok");
      await autopilotApi.runCloserAgent({
        hustle_id: activeHustleId,
        channel: "whatsapp",
        dry_run: isDryRun,
      });
      await fetchTelemetry();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Failed to run closer", "err");
    } finally {
      setEngineActionLoading(null);
    }
  };

  return (
    <div className="w-full max-w-[1480px] mx-auto space-y-3.5 pb-2 font-sans selection:bg-[#1C1D1F] selection:text-white">
      {/* =========================================================================
          ROW 1: Pipeline Overview (Matte Charcoal) + 7-Day Activity (Soft Grey) + Pipeline Coverage (White)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* -------------------------------------------------------------------
            ROW 1, BOX 1: Pipeline Overview (Matte Charcoal Card #1C1D1F, 5 cols)
           ------------------------------------------------------------------- */}
        <div className="lg:col-span-5 bg-[#1C1D1F] text-white rounded-[28px] p-4.5 sm:p-5 shadow-sm flex flex-col justify-between space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-white/95">
                Pipeline Overview
              </h2>
              {/* Live Status Pill */}
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                  cockpitState?.is_running
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-white/10 text-white/70 border border-white/10"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    cockpitState?.is_running
                      ? "bg-emerald-400 animate-pulse"
                      : "bg-white/40"
                  }`}
                />
                <span className="truncate max-w-[130px]">
                  {cockpitState?.is_running
                    ? `RUNNING: ${cockpitState.active_task || "Active"}`
                    : "IDLE"}
                </span>
              </span>
            </div>

            {/* Real Refresh Button */}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh telemetry"
            >
              <RefreshCw
                className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          {/* Big Numbers Row with Vertical Divider */}
          <div className="grid grid-cols-2 gap-3 items-center py-0.5">
            {/* Left Big Number */}
            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                {totalClinics}
              </span>
              <span className="text-[10px] text-white/60 font-medium leading-tight max-w-[90px]">
                Total clinics in CRM
              </span>
            </div>

            {/* Right Big Number */}
            <div className="flex items-baseline gap-2.5 pl-3 border-l border-white/15">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                {attentionCount}
              </span>
              <div className="space-y-0.5">
                <span className="text-[10px] text-white/60 font-medium leading-tight block">
                  Need attention now
                </span>
                {dncBlockedCount > 0 && (
                  <span className="inline-block text-[9px] font-semibold text-amber-300/90">
                    {dncBlockedCount} DNC blocked
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bottom 3 Inner Sub-Cards */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {/* Sub-Card 1: Phone Ready */}
            <button
              type="button"
              onClick={() => onNavigate("discovery")}
              className="bg-[#EBECE8] text-[#1C1D1F] hover:bg-white rounded-2xl p-2.5 flex flex-col items-center justify-between text-center min-h-[82px] shadow-xs transition-colors cursor-pointer group"
            >
              <div className="w-4 h-4 rounded-full border border-[#1C1D1F]/40 flex items-center justify-center">
                <span className="w-1 h-1 rounded-full bg-[#1C1D1F]" />
              </div>
              <span className="text-lg font-black tracking-tight">{phoneReadyCount}</span>
              <span className="text-[9px] font-bold text-[#6B7280] group-hover:text-[#1C1D1F]">
                Phone Ready →
              </span>
            </button>

            {/* Sub-Card 2: Demos Built */}
            <button
              type="button"
              onClick={() => onNavigate("factory")}
              className="bg-[#EBECE8] text-[#1C1D1F] hover:bg-white rounded-2xl p-2.5 flex flex-col items-center justify-between text-center min-h-[82px] shadow-xs transition-colors cursor-pointer group"
            >
              <div className="w-4 h-4 rounded-full border border-dashed border-[#1C1D1F]/60 flex items-center justify-center">
                <span className="w-1 h-1 rounded-full bg-[#1C1D1F]" />
              </div>
              <span className="text-lg font-black tracking-tight">{demosBuiltCount}</span>
              <span className="text-[9px] font-bold text-[#6B7280] group-hover:text-[#1C1D1F]">
                Demos Built →
              </span>
            </button>

            {/* Sub-Card 3: Outreach Sent */}
            <button
              type="button"
              onClick={() => onNavigate("outreach")}
              className="bg-[#EBECE8] text-[#1C1D1F] hover:bg-white rounded-2xl p-2.5 flex flex-col items-center justify-between text-center min-h-[82px] shadow-xs transition-colors cursor-pointer group"
            >
              <div className="w-4 h-4 rounded-full border border-[#1C1D1F] flex items-center justify-center">
                <Check className="w-2 h-2 text-[#1C1D1F] stroke-[3]" />
              </div>
              <span className="text-lg font-black tracking-tight">{dispatchedCount}</span>
              <span className="text-[9px] font-bold text-[#6B7280] group-hover:text-[#1C1D1F]">
                Outreach Sent →
              </span>
            </button>
          </div>
        </div>

        {/* -------------------------------------------------------------------
            ROW 1, BOX 2: 7-Day Activity (Soft Grey Card #EBECE8, 4 cols)
           ------------------------------------------------------------------- */}
        <div className="lg:col-span-4 bg-[#EBECE8] text-[#1C1D1F] rounded-[28px] p-4.5 sm:p-5 shadow-sm flex flex-col justify-between space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-tight text-[#1C1D1F]">
              7-Day Activity
            </h2>
            <div className="w-7 h-7 rounded-full bg-white/70 flex items-center justify-center text-[#1C1D1F]">
              <Activity className="w-3 h-3" />
            </div>
          </div>

          {/* Legend Dots */}
          <div className="flex items-center gap-3 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1C1D1F]" />
              <span className="text-[#1C1D1F] text-[11px]">Demos / Runs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#9CA3AF]" />
              <span className="text-[#6B7280] text-[11px]">Outbound Sent</span>
            </div>
          </div>

          {/* Dynamic SVG Curves */}
          <div className="relative w-full h-[105px] select-none my-0.5">
            <svg
              viewBox="0 0 280 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full overflow-visible"
            >
              {/* Baseline */}
              <line
                x1="10"
                y1="82"
                x2="270"
                y2="82"
                stroke="#D1D5DB"
                strokeWidth="1"
                strokeDasharray="2 2"
              />

              {/* Secondary Grey Curve (Outbound Sent) */}
              <path
                d={chartMetrics.sentPath}
                stroke="#9CA3AF"
                strokeWidth="2.2"
                strokeLinecap="round"
              />

              {/* Primary Dark Curve (Demos / Runs) */}
              <path
                d={chartMetrics.demoPath}
                stroke="#1C1D1F"
                strokeWidth="2.6"
                strokeLinecap="round"
              />

              {/* Active Day Vertical Guideline */}
              <line
                x1={activeMarkerX}
                y1="18"
                x2={activeMarkerX}
                y2="85"
                stroke="#1C1D1F"
                strokeWidth="1.2"
                strokeDasharray="2 2"
                strokeOpacity="0.5"
              />

              {/* Active Marker Circles */}
              <circle
                cx={activeMarkerX}
                cy={chartMetrics.demoPoints[activeDayIndex]?.y ?? 50}
                r="3.5"
                fill="#1C1D1F"
              />
              <circle
                cx={activeMarkerX}
                cy={chartMetrics.sentPoints[activeDayIndex]?.y ?? 70}
                r="3"
                fill="#9CA3AF"
              />
            </svg>

            {/* Floating Dark Pill showing active day's counts */}
            <div
              className="absolute top-0 bg-[#1C1D1F] text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md pointer-events-none whitespace-nowrap"
              style={{
                left: `${Math.min(75, Math.max(8, (activeMarkerX / 280) * 100 - 15))}%`,
                transform: "translateY(-6px)",
              }}
            >
              Demos: {activeDayStats.demos} · Sent: {activeDayStats.sent}
            </div>
          </div>

          {/* Weekday Pickers: Ending today */}
          <div className="flex items-center justify-between text-xs font-bold text-[#6B7280] px-1 pt-0.5 gap-1">
            {weeklyData.map((d, idx) => {
              const isActive = idx === activeDayIndex;
              const isToday = d.label === "Today";
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveDayIndex(idx)}
                  className={`h-7 rounded-full flex items-center justify-center transition-all cursor-pointer text-xs ${
                    isToday ? "px-3 min-w-[54px]" : "w-7 min-w-[28px]"
                  } ${
                    isActive
                      ? "bg-[#1C1D1F] text-white font-extrabold shadow-2xs"
                      : "text-[#6B7280] hover:text-[#1C1D1F] hover:bg-black/5"
                  }`}
                  title={d.date.toDateString()}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* -------------------------------------------------------------------
            ROW 1, BOX 3: Pipeline Coverage (Pure White Card #FFFFFF, 3 cols) - LARGER 144px GAUGE
           ------------------------------------------------------------------- */}
        <div className="lg:col-span-3 bg-white dark:bg-zinc-900 text-[#1C1D1F] dark:text-white rounded-[28px] p-4.5 sm:p-5 shadow-sm border border-[#EBECE8] dark:border-zinc-800 flex flex-col justify-between space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-[#1C1D1F] dark:text-white">
                Pipeline Coverage
              </h2>
              <p className="text-[10px] text-[#6B7280] dark:text-zinc-400 font-medium">
                {totalClinics} total clinics indexed
              </p>
            </div>
            <div className="w-7 h-7 rounded-full bg-[#F7F7F5] dark:bg-zinc-800 flex items-center justify-center text-[#1C1D1F] dark:text-zinc-200">
              <Zap className="w-3 h-3" />
            </div>
          </div>

          {/* Middle: Real Percentages Legend + Concentric Multi-Ring Gauge (w-36 h-36) */}
          <div className="flex items-center justify-between gap-2 py-0.5">
            {/* Left Legend with live percentages */}
            <div className="space-y-1.5 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#1C1D1F]" />
                <span className="text-[#1C1D1F] text-[11px]">{phonePct}% Phone</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#6B7280]" />
                <span className="text-[#6B7280] text-[11px]">{demoPct}% Demo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#D1D5DB]" />
                <span className="text-[#9CA3AF] text-[11px]">{outreachPct}% Outreach</span>
              </div>
            </div>

            {/* Concentric 3-Ring SVG Gauge - Enlarged to w-36 h-36 */}
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {/* Outer Ring: Phone Verified */}
                <circle cx="50" cy="50" r="42" stroke="#F3F4F0" strokeWidth="6" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="#1C1D1F"
                  strokeWidth="6"
                  strokeDasharray="264"
                  strokeDashoffset={264 - (phonePct / 100) * 264}
                  strokeLinecap="round"
                  fill="none"
                />

                {/* Middle Ring: Demo Built */}
                <circle cx="50" cy="50" r="32" stroke="#F3F4F0" strokeWidth="5.5" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r="32"
                  stroke="#6B7280"
                  strokeWidth="5.5"
                  strokeDasharray="201"
                  strokeDashoffset={201 - (demoPct / 100) * 201}
                  strokeLinecap="round"
                  fill="none"
                />

                {/* Inner Ring: Outreach Contacted */}
                <circle cx="50" cy="50" r="23" stroke="#F3F4F0" strokeWidth="5" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r="23"
                  stroke="#D1D5DB"
                  strokeWidth="5"
                  strokeDasharray="144"
                  strokeDashoffset={144 - (outreachPct / 100) * 144}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>

              {/* Center Readiness Percentage */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-base font-black text-[#1C1D1F] tracking-tight">
                  {overallReadinessPct}%
                </span>
                <span className="text-[8px] font-bold text-[#8E8F94] uppercase tracking-wider">
                  Readiness
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Action Row: Real Export JSON & Sync */}
          <div className="flex items-center gap-2 pt-1 border-t border-[#F3F4F0]">
            <button
              type="button"
              onClick={handleManualRefresh}
              className="w-8 h-8 rounded-full bg-[#1C1D1F] text-white flex items-center justify-center hover:bg-black transition-colors cursor-pointer shrink-0 shadow-xs"
              title="Sync Telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>

            <button
              type="button"
              onClick={handleExportTelemetry}
              className="flex-1 py-1.5 px-3 rounded-full bg-[#EBECE8] hover:bg-[#E2E3DF] text-[#1C1D1F] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Export JSON</span>
              <Download className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 2: Compact Daily Tasks (4 cols) + Attention & Action Queue (8 cols)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* -------------------------------------------------------------------
            ROW 2, LEFT: Compact Daily Tasks Checklist (Pure White Card #FFFFFF, 4 cols)
           ------------------------------------------------------------------- */}
        <div className="lg:col-span-4 bg-white dark:bg-zinc-900 text-[#1C1D1F] dark:text-white rounded-[28px] p-4 shadow-sm border border-[#EBECE8] dark:border-zinc-800 flex flex-col justify-between space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-[#1C1D1F] dark:text-white">
                Daily Tasks
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#1C1D1F] dark:bg-white text-white dark:text-zinc-900 text-[10px] font-extrabold shadow-2xs">
                {tasksDoneCount}/{tasks.length}
              </span>
            </div>

            <span className="text-[10px] text-[#6B7280] dark:text-zinc-400 font-semibold">
              Today's checklist
            </span>
          </div>

          {/* Compact Task List (tight space-y-1.5) */}
          <div className="space-y-1.5 py-0.5 flex-1">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => handleToggleTask(task.id)}
                className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-[#F7F7F5] dark:hover:bg-zinc-800/60 transition-colors cursor-pointer select-none group"
              >
                <div
                  className={`w-4 h-4 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                    task.done ? "bg-[#1C1D1F] dark:bg-white text-white dark:text-zinc-900" : "border-2 border-[#D1D5DB] dark:border-zinc-700"
                  }`}
                >
                  {task.done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <span
                  className={`text-xs font-medium truncate ${
                    task.done ? "line-through text-[#9CA3AF] dark:text-zinc-500" : "text-[#1C1D1F] dark:text-zinc-100"
                  }`}
                >
                  {task.text}
                </span>
              </div>
            ))}
          </div>

          {/* Compact Inline Form to Add a Task */}
          <form onSubmit={handleAddTask} className="flex items-center gap-1.5 pt-1 border-t border-[#F3F4F0] dark:border-zinc-800">
            <input
              type="text"
              value={newTaskInput}
              onChange={(e) => setNewTaskInput(e.target.value)}
              placeholder="Add daily task..."
              className="flex-1 text-xs px-2.5 py-1 rounded-lg bg-[#F7F7F5] dark:bg-zinc-800 border border-[#EBECE8] dark:border-zinc-700 focus:outline-none focus:border-[#1C1D1F] dark:focus:border-white text-[#1C1D1F] dark:text-white"
            />
            <button
              type="submit"
              className="w-6 h-6 rounded-lg bg-[#1C1D1F] dark:bg-white text-white dark:text-zinc-900 hover:bg-black dark:hover:bg-zinc-200 flex items-center justify-center cursor-pointer shrink-0 transition-colors"
              title="Add task"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* -------------------------------------------------------------------
            ROW 2, RIGHT: Compact Attention & Action Queue ({priorityQueue.length})
           ------------------------------------------------------------------- */}
        <div className="lg:col-span-8 flex flex-col space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold tracking-tight text-[#1C1D1F] dark:text-white">
              Attention & Action Queue ({priorityQueue.length})
            </h2>
            <button
              type="button"
              onClick={() => onNavigate("outreach")}
              className="text-xs font-bold text-[#6B7280] dark:text-zinc-400 hover:text-[#1C1D1F] dark:hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Open Outreach Hub</span>
              <span>&gt;</span>
            </button>
          </div>

          {/* Queue Cards Grid - flex-1 with zero dead gap */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-stretch">
            {priorityQueue.length === 0 ? (
              <div className="sm:col-span-2 bg-white dark:bg-zinc-900 rounded-[28px] p-5 shadow-sm border border-[#EBECE8] dark:border-zinc-800 flex flex-col items-center justify-center text-center space-y-1.5">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-[#1C1D1F] dark:text-white">
                  All queue items caught up!
                </span>
                <p className="text-[10px] text-[#6B7280] dark:text-zinc-400">
                  No unreplied messages or overdue follow-ups pending right now.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate("discovery")}
                  className="px-3 py-1 rounded-full bg-[#1C1D1F] dark:bg-white text-white dark:text-zinc-900 text-xs font-bold hover:bg-black dark:hover:bg-zinc-200 mt-1 cursor-pointer"
                >
                  Discover New Clinics
                </button>
              </div>
            ) : (
              priorityQueue.slice(0, 2).map((item) => (
                <div
                  key={item.leadId}
                  className="bg-white dark:bg-zinc-900 rounded-[28px] p-4 shadow-sm border border-[#EBECE8] dark:border-zinc-800 flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        item.isUnreplied
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {item.created}
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedLeadId(item.leadId)}
                      className="text-[#9CA3AF] hover:text-[#1C1D1F] p-0.5 cursor-pointer"
                      title="Inspect lead in detail"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="py-0.5">
                    <h3 className="text-xs font-extrabold text-[#1C1D1F] dark:text-white leading-snug truncate">
                      {item.name}
                    </h3>
                    <p className="text-[10px] text-[#6B7280] dark:text-zinc-400 truncate mt-0.5">
                      {item.doctor} · {item.locality}
                    </p>
                    <p className="text-[10px] text-[#1C1D1F] dark:text-zinc-200 font-semibold mt-1 truncate bg-[#F7F7F5] dark:bg-zinc-800 px-2 py-0.5 rounded-lg">
                      {item.reason}
                    </p>
                  </div>

                  {/* 3 Real Action Buttons */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-[#F3F4F0] dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => {
                        openInboxForLead(item.leadId);
                        notify(`Opened WhatsApp chat for ${item.name}`, "ok");
                      }}
                      className="flex-1 py-1 px-2 rounded-xl bg-[#1C1D1F] text-white hover:bg-black text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      title="Chat on WhatsApp"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Chat</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        openLogCallModal(item.leadId);
                      }}
                      className="py-1 px-2 rounded-xl bg-[#EBECE8] hover:bg-[#E2E3DF] text-[#1C1D1F] text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Log Call Brief"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>Call</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedLeadId(item.leadId)}
                      className="py-1 px-2 rounded-xl bg-[#F7F7F5] hover:bg-[#EBECE8] text-[#1C1D1F] text-[10px] font-bold flex items-center justify-center transition-colors cursor-pointer"
                      title="Inspect Lead"
                    >
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Queue Card 3: Real Autopilot Control / Batch Launcher */}
            {cockpitState?.is_running ? (
              <div
                onClick={handleStopEngine}
                className="bg-rose-50 border-2 border-rose-300 rounded-[28px] p-4 flex flex-col items-center justify-center text-center hover:bg-rose-100 transition-all cursor-pointer group space-y-1"
              >
                <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center mb-1 shadow-xs">
                  <Square className="w-3.5 h-3.5 fill-white" />
                </div>
                <span className="text-xs font-extrabold text-rose-900">
                  Stop Autopilot Run
                </span>
                <span className="text-[10px] text-rose-700 font-medium truncate max-w-[150px]">
                  {cockpitState.active_task || "Pipeline job active"}
                </span>
              </div>
            ) : (
              <div
                onClick={() => onNavigate("factory")}
                className="border-2 border-dashed border-[#D1D5DB] dark:border-zinc-700 rounded-[28px] p-4 flex flex-col items-center justify-center text-center hover:bg-white dark:hover:bg-zinc-800 hover:border-[#1C1D1F] dark:hover:border-zinc-400 transition-all cursor-pointer group space-y-1"
              >
                <div className="w-7 h-7 rounded-full bg-[#EBECE8] dark:bg-zinc-800 group-hover:bg-[#1C1D1F] dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-zinc-900 text-[#1C1D1F] dark:text-zinc-300 flex items-center justify-center transition-colors mb-1">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-extrabold text-[#1C1D1F] dark:text-white">
                  + Open Demo Factory
                </span>
                <span className="text-[10px] text-[#8E8F94] dark:text-zinc-400 font-medium">
                  {demosBuiltCount < totalClinics
                    ? `${totalClinics - demosBuiltCount} clinics need demos`
                    : "All demos built"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 3: Core Cockpit Engines with Real-Time Progress & Start/Stop Controls
         ========================================================================= */}
      <div className="space-y-2 pt-0.5">
        {/* Header: Title + Live Step indicator */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold tracking-tight text-[#1C1D1F]">
              Core Cockpit Engines
            </h2>
            {latestPipelineStep && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  {latestPipelineStep.step_name}: {latestPipelineStep.status}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* 3 Matte Charcoal Engine Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-stretch">
          {/* Engine Card 1: Discovery Engine */}
          <div
            onClick={() => onNavigate("discovery")}
            className="bg-[#1C1D1F] text-white rounded-[28px] p-4.5 sm:p-5 shadow-sm flex flex-col justify-between space-y-3 hover:scale-[1.01] transition-transform cursor-pointer group relative"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                  Discovery Engine
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isDiscoveryRunning ? "bg-emerald-400 animate-pulse" : "bg-emerald-500"
                    }`}
                  />
                  <span className="text-[11px] text-white/70 font-medium">
                    {isDiscoveryRunning ? "Scouting leads..." : "Ready"}
                  </span>
                </div>
              </div>

              {/* Progress Ring / Action Button */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full border-2 border-emerald-500/80 flex items-center justify-center text-[9px] font-black text-white">
                  {phonePct}%
                </div>

                {isDiscoveryRunning ? (
                  <button
                    type="button"
                    disabled={engineActionLoading === "stop"}
                    onClick={handleStopEngine}
                    className="px-2.5 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={engineActionLoading === "discovery"}
                    onClick={handleStartDiscovery}
                    className="px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Play className="w-2.5 h-2.5 fill-white" />
                    <span>Start</span>
                  </button>
                )}
              </div>
            </div>

            <p className="text-[11px] text-white/70 leading-relaxed font-normal">
              <span className="font-semibold text-white">{phoneReadyCount} of {totalClinics}</span> clinics normalized with phone numbers.
            </p>
          </div>

          {/* Engine Card 2: Demo Factory */}
          <div
            onClick={() => onNavigate("factory")}
            className="bg-[#1C1D1F] text-white rounded-[28px] p-4.5 sm:p-5 shadow-sm flex flex-col justify-between space-y-3 hover:scale-[1.01] transition-transform cursor-pointer group relative"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold tracking-tight text-white group-hover:text-blue-400 transition-colors">
                  Demo Factory
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isFactoryRunning ? "bg-blue-400 animate-pulse" : "bg-[#3B63FB]"
                    }`}
                  />
                  <span className="text-[11px] text-white/70 font-medium">
                    {isFactoryRunning ? "Recording demos..." : `Buffer Health: ${bufferHealthPct}%`}
                  </span>
                </div>
              </div>

              {/* Progress Ring / Action Button */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full border-2 border-[#3B63FB] flex items-center justify-center text-[9px] font-black text-white">
                  {demoPct}%
                </div>

                {isFactoryRunning ? (
                  <button
                    type="button"
                    disabled={engineActionLoading === "stop"}
                    onClick={handleStopEngine}
                    className="px-2.5 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={engineActionLoading === "factory"}
                    onClick={handleStartFactory}
                    className="px-2.5 py-1 rounded-full bg-[#3B63FB] hover:bg-blue-500 text-white text-[10px] font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Play className="w-2.5 h-2.5 fill-white" />
                    <span>Start</span>
                  </button>
                )}
              </div>
            </div>

            <p className="text-[11px] text-white/70 leading-relaxed font-normal">
              <span className="font-semibold text-white">{demosBuiltCount} of {totalClinics}</span> clinic packages generated across /modern, /premium, /warm templates.
            </p>
          </div>

          {/* Engine Card 3: Outreach Automation */}
          <div
            onClick={() => onNavigate("outreach")}
            className="bg-[#1C1D1F] text-white rounded-[28px] p-4.5 sm:p-5 shadow-sm flex flex-col justify-between space-y-3 hover:scale-[1.01] transition-transform cursor-pointer group relative"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold tracking-tight text-white group-hover:text-amber-400 transition-colors text-sm">
                  Outreach Automation
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOutreachRunning
                        ? "bg-amber-400 animate-pulse"
                        : globalAutomationEnabled
                        ? "bg-[#F5C451]"
                        : "bg-slate-400"
                    }`}
                  />
                  <span className="text-[11px] text-white/70 font-medium">
                    {isOutreachRunning
                      ? "Dispatching WhatsApp..."
                      : `Autopilot: ${globalAutomationEnabled ? "ACTIVE" : "PAUSED"}`}
                  </span>
                </div>
              </div>

              {/* Progress Ring / Action Button */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full border-2 border-[#F5C451] flex items-center justify-center text-[9px] font-black text-white">
                  {outreachPct}%
                </div>

                {isOutreachRunning ? (
                  <button
                    type="button"
                    disabled={engineActionLoading === "stop"}
                    onClick={handleStopEngine}
                    className="px-2.5 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={engineActionLoading === "outreach"}
                    onClick={handleStartOutreach}
                    className="px-2.5 py-1 rounded-full bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Play className="w-2.5 h-2.5 fill-white" />
                    <span>Start</span>
                  </button>
                )}
              </div>
            </div>

            <p className="text-[11px] text-white/70 leading-relaxed font-normal">
              <span className="font-semibold text-white">{dispatchedCount}</span> outbound WhatsApp sequences dispatched, <span className="font-semibold text-white">{dncBlockedCount}</span> protected by DNC.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
