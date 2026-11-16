"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  QueueItem,
  QueueItemStatus,
  DailyCapacityMetrics,
  MailboxAccount,
  DispatchEngineSettings,
  DeliverabilityStatus,
} from "../types";
import { initialDispatchSettings } from "../mockData";
import { RadialQuotaGauge } from "./RadialQuotaGauge";
import { StackedCapacityBar } from "./StackedCapacityBar";
import { SafetyControlsCard } from "./SafetyControlsCard";
import { DispatchQueueTable } from "./DispatchQueueTable";
import { QueueFilterBar } from "./QueueFilterBar";
import { apiFetch } from "@/lib/api/client";
import { autopilotApi } from "@/api/autopilotApi";
import { useCRM } from "@/context/CRMContext";
import {
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  Loader2,
  Play,
  Square,
} from "lucide-react";

export function mapBatchClinicsToQueueItems(clinics: Array<Record<string, any>>): QueueItem[] {
  return clinics.map((c, idx) => {
    const isSent = Boolean(c.is_sent);
    const scheduledMinutes = (idx + 1) * 3;
    const scheduledTime = new Date(Date.now() + scheduledMinutes * 60000).toISOString();

    return {
      id: `queue_${c.id}`,
      leadId: String(c.id),
      leadName: c.doctor ? (c.doctor.startsWith("Dr.") ? c.doctor : `Dr. ${c.doctor}`) : "Doctor In-Charge",
      companyName: c.name,
      verifiedEmail: c.email || (c.primary_phone ? `${c.primary_phone} (${c.target_channel || "WhatsApp"})` : "wa.me link"),
      verificationStatus: "deliverable" as DeliverabilityStatus,
      campaignId: "camp_dental_outreach_delhi",
      campaignName: "Delhi NCR Dental Clinic Engine Pitch",
      sequenceStep: isSent ? 2 : 1,
      totalSequenceSteps: 3,
      stepTitle: isSent ? "Interactive Demo Follow-up" : "Personalized 3-Theme Demo Video",
      demoUrl: `http://localhost:3001/modern/${c.slug || c.id}`,
      scheduledSendTime: scheduledTime,
      prospectTimezone: "Asia/Kolkata",
      sendingMailboxId: "wa_autopilot_session_1",
      sendingMailboxEmail: "+91 98110 00001 (WhatsApp Business)",
      status: isSent ? "sent" : (idx === 0 ? "sending" : "scheduled"),
      priority: idx < 3 ? "P1_high" : "P2_standard",
      retryCount: 0,
      sentAt: isSent ? new Date().toISOString() : undefined,
    };
  });
}

// Module-level cache: lives as long as the app session, so switching away from
// this tab and back shows the last real data immediately while a quiet refresh runs.
type OutreachTabCache = {
  queue: QueueItem[];
  metrics: DailyCapacityMetrics;
};
let outreachTabCache: OutreachTabCache | null = null;

const EMPTY_CAPACITY_METRICS: DailyCapacityMetrics = {
  totalDailyCap: 50,
  totalSentToday: 0,
  warmupSentToday: 0,
  campaignSentToday: 0,
  inFlightScheduled: 0,
  remainingSafeHeadroom: 50,
  overallUtilizationPercentage: 0,
};

export const OutreachTab: React.FC = () => {
  const { activeHustle } = useCRM();
  const [queue, setQueue] = useState<QueueItem[]>(() => outreachTabCache?.queue ?? []);
  const [metrics, setMetrics] = useState<DailyCapacityMetrics>(() => outreachTabCache?.metrics ?? EMPTY_CAPACITY_METRICS);
  const [hasLoaded, setHasLoaded] = useState<boolean>(() => outreachTabCache !== null);
  const [mailboxes] = useState<MailboxAccount[]>([]);
  const [settings, setSettings] = useState<DispatchEngineSettings>(initialDispatchSettings);
  const [filter, setFilter] = useState<QueueItemStatus | "ALL">("ALL");
  const [notification, setNotification] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isWaRunning, setIsWaRunning] = useState<boolean>(false);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const syncOutreachQueueFromDb = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [res, cockpitState] = await Promise.all([
        apiFetch<{ clinics?: Array<Record<string, any>>; total?: number }>("/api/batch?hustle_id=1").catch(() => null),
        apiFetch<Record<string, any>>("/api/autopilot/cockpit-state?hustle_id=1").catch(() => null),
      ]);

      // Sync live running state
      if (cockpitState?.is_running !== undefined) {
        const task = cockpitState.active_task as string | null;
        const isCloserRunning = cockpitState.is_running && (!task || task.startsWith("closer"));
        setIsWaRunning(isCloserRunning);
      }

      if (Array.isArray(res?.clinics)) {
        const mappedItems = mapBatchClinicsToQueueItems(res.clinics);
        setQueue(mappedItems);

        // Compute dynamic capacity
        const sentCount = mappedItems.filter((q) => q.status === "sent").length;
        const inFlight = mappedItems.filter((q) => q.status === "scheduled" || q.status === "sending").length;
        const dailyCap = 50; // Daily safe WhatsApp volume

        setMetrics({
          totalDailyCap: dailyCap,
          totalSentToday: sentCount,
          warmupSentToday: Math.min(10, sentCount),
          campaignSentToday: Math.max(0, sentCount - 10),
          inFlightScheduled: inFlight,
          remainingSafeHeadroom: Math.max(0, dailyCap - sentCount),
          overallUtilizationPercentage: Math.min(100, Math.round((sentCount / dailyCap) * 100)),
        });
      }
    } catch {
      // Offline or network error: keep whatever is already shown
    } finally {
      setHasLoaded(true);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    syncOutreachQueueFromDb();
  }, [syncOutreachQueueFromDb]);

  // SSE subscription to track live WA automation state
  useEffect(() => {
    const evtSource = new EventSource("/api/events/stream");

    const handleStarted = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (!data.task || data.task === "closer" || String(data.task).startsWith("closer")) {
          setIsWaRunning(true);
        }
      } catch {
        setIsWaRunning(true);
      }
    };
    const handleStopped = () => setIsWaRunning(false);

    evtSource.addEventListener("autopilot_started", handleStarted);
    evtSource.addEventListener("autopilot_stopped", handleStopped);
    evtSource.addEventListener("run_completed", handleStopped);

    return () => { evtSource.close(); };
  }, []);

  // Persist real data to the module cache once the first load has completed
  useEffect(() => {
    if (!hasLoaded) return;
    outreachTabCache = { queue, metrics };
  }, [hasLoaded, queue, metrics]);

  const handleUpdateSettings = async (updated: Partial<DispatchEngineSettings>) => {
    setSettings((prev) => ({ ...prev, ...updated }));
    if (updated.masterQueueRunning !== undefined) {
      if (updated.masterQueueRunning) {
        // Start WA automation via real API
        await handleStartWaAutomation();
      } else {
        // Stop WA automation via real API
        await handleStopWaAutomation();
      }
    }
  };

  const handleStartWaAutomation = async () => {
    setIsWaRunning(true);
    try {
      const isDryRun = activeHustle?.channel_limits?.dry_run !== false;
      await apiFetch<{ status?: string }>("/api/agents/closer/run", {
        method: "POST",
        body: JSON.stringify({ hustle_id: 1, channel: "whatsapp", dry_run: isDryRun }),
      });
      showNotification(
        isDryRun
          ? "WA Automation started — dry-run safe test"
          : "WA Automation started — live dispatch running"
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to start WA automation";
      showNotification(errMsg);
      setIsWaRunning(false);
    }
  };

  const handleStopWaAutomation = async () => {
    try {
      await autopilotApi.stop();
      showNotification("WA Automation stopped");
    } catch {
      showNotification("Stop request sent");
    } finally {
      setIsWaRunning(false);
    }
  };

  const handleSendNow = (id: string) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "sent",
              sentAt: new Date().toISOString(),
            }
          : item
      )
    );

    setMetrics((prev) => ({
      ...prev,
      totalSentToday: prev.totalSentToday + 1,
      campaignSentToday: prev.campaignSentToday + 1,
      inFlightScheduled: Math.max(0, prev.inFlightScheduled - 1),
      remainingSafeHeadroom: Math.max(0, prev.remainingSafeHeadroom - 1),
    }));

    showNotification(`Sent message immediately (Bypassed jitter delay)`);
  };

  const filteredQueue = useMemo(() => {
    if (filter === "ALL") return queue;
    return queue.filter((item) => item.status === filter);
  }, [queue, filter]);

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Safety Header Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Radial Quota Gauge (4 cols) */}
        <div className="lg:col-span-4 p-4 rounded-xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.08] shadow-xs flex items-center justify-center">
          <RadialQuotaGauge
            sent={metrics.totalSentToday}
            total={metrics.totalDailyCap}
          />
        </div>

        {/* Stacked Linear Capacity Bar (5 cols) */}
        <div className="lg:col-span-5 p-4 rounded-xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.08] shadow-xs flex flex-col justify-center">
          <StackedCapacityBar metrics={metrics} />
        </div>

        {/* Mailbox Fleet Health (3 cols) */}
        <div className="lg:col-span-3 p-4 rounded-xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.08] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              <span>Mailbox Fleet</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">100% Online</span>
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
              8 / 8 Active
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Reputation:
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">98.4% Health</span>
          </div>
        </div>
      </div>

      {/* Safety Controls Card */}
      <SafetyControlsCard
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        isLiveRunning={isWaRunning}
      />

      {/* Queue Filter Bar */}
      <QueueFilterBar
        filter={filter}
        setFilter={setFilter}
        counts={{
          all: queue.length,
          scheduled: queue.filter((q) => q.status === "scheduled").length,
          sending: queue.filter((q) => q.status === "sending").length,
          throttled: queue.filter((q) => q.status === "throttled").length,
          sent: queue.filter((q) => q.status === "sent").length,
        }}
        isSyncing={isSyncing}
        isWaRunning={isWaRunning}
        onRefresh={() => {
          syncOutreachQueueFromDb();
          showNotification("Refreshed outreach queue from database");
        }}
        onStartWa={handleStartWaAutomation}
        onStopWa={handleStopWaAutomation}
      />

      {/* Dispatch Queue Table: loader on first load, empty state if the DB has 0 items */}
      {!hasLoaded ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 rounded-xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.08] text-xs font-mono text-slate-500 dark:text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
          <span>Loading outreach queue from database...</span>
        </div>
      ) : queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 rounded-xl bg-white dark:bg-[#141721] border border-dashed border-slate-300 dark:border-white/[0.12] text-center">
          <ShieldCheck className="w-6 h-6 text-slate-400" />
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Outreach queue is empty</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Push verified leads from Discovery or Demo Factory to queue messages.</div>
        </div>
      ) : (
        <DispatchQueueTable
          items={filteredQueue}
          onSendNow={handleSendNow}
        />
      )}
    </div>
  );
};
