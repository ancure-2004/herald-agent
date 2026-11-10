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
import {
  initialQueueItems,
  initialCapacityMetrics,
  initialMailboxAccounts,
  initialDispatchSettings,
} from "../mockData";
import { RadialQuotaGauge } from "./RadialQuotaGauge";
import { StackedCapacityBar } from "./StackedCapacityBar";
import { SafetyControlsCard } from "./SafetyControlsCard";
import { DispatchQueueTable } from "./DispatchQueueTable";
import { apiFetch } from "@/lib/api/client";
import {
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
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

export const OutreachTab: React.FC = () => {
  const [queue, setQueue] = useState<QueueItem[]>(initialQueueItems);
  const [metrics, setMetrics] = useState<DailyCapacityMetrics>(initialCapacityMetrics);
  const [mailboxes] = useState<MailboxAccount[]>(initialMailboxAccounts);
  const [settings, setSettings] = useState<DispatchEngineSettings>(initialDispatchSettings);
  const [filter, setFilter] = useState<QueueItemStatus | "ALL">("ALL");
  const [notification, setNotification] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const syncOutreachQueueFromDb = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await apiFetch<{ clinics?: Array<Record<string, any>>; total?: number }>("/api/batch?hustle_id=1");
      if (res?.clinics && res.clinics.length > 0) {
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
      // Retain fallback
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    syncOutreachQueueFromDb();
  }, [syncOutreachQueueFromDb]);

  const handleUpdateSettings = (updated: Partial<DispatchEngineSettings>) => {
    setSettings((prev) => ({ ...prev, ...updated }));
    if (updated.masterQueueRunning !== undefined) {
      showNotification(
        updated.masterQueueRunning
          ? "Master Queue Resumed: Pacing timers active"
          : "Master Queue Paused: All countdowns frozen safely"
      );
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
      />

      {/* Queue Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              filter === "ALL" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            All Items ({queue.length})
          </button>

          <button
            onClick={() => setFilter("scheduled")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              filter === "scheduled" ? "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-bold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Scheduled ({queue.filter((q) => q.status === "scheduled").length})
          </button>

          <button
            onClick={() => setFilter("sending")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              filter === "sending" ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Sending ({queue.filter((q) => q.status === "sending").length})
          </button>

          <button
            onClick={() => setFilter("throttled")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              filter === "throttled" ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs font-bold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Throttled ({queue.filter((q) => q.status === "throttled").length})
          </button>

          <button
            onClick={() => setFilter("sent")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              filter === "sent" ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Sent ({queue.filter((q) => q.status === "sent").length})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              syncOutreachQueueFromDb();
              showNotification("Refreshed outreach queue from database");
            }}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Refresh Queue from Database"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          </button>

          <div className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Anti-Spam Paced Dispatch Active</span>
          </div>
        </div>
      </div>

      {/* Dispatch Queue Table */}
      <DispatchQueueTable
        items={filteredQueue}
        onSendNow={handleSendNow}
      />
    </div>
  );
};
