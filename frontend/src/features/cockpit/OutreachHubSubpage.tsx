"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Layers,
  Mail,
  MessageCircle,
  Play,
  RefreshCw,
  RotateCw,
  Send,
  Square,
  Sparkles,
  Search,
  Copy,
  Save,
  Phone,
  Video,
  RotateCcw,
  Link2,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { apiFetch } from "@/lib/api/client";
import { autopilotApi } from "@/api/autopilotApi";
import { LiveLogTerminal } from "@/components/ui/LiveLogTerminal";

interface BatchInfo {
  batch_id: string;
  total: number;
  ready_unsent: number;
  sent: number;
  stage_counts: Record<string, number>;
}

interface BatchMeta {
  batch_size: number;
  batches: BatchInfo[];
  active_batch_id: string;
}

/** Shape of a clinic entry returned by /api/batch */
interface BatchClinic {
  id: number;
  name: string;
  doctor: string;
  locality?: string;
  city?: string;
  primary_phone?: string;
  phone?: string;
  ig_handle?: string;
  email?: string;
  is_sent: boolean;
  batch_id: string;
  target_channel: string;
  slug?: string;
  stage_slug?: string;
  is_lost?: boolean;
  has_custom_edits?: boolean;
  has_video?: boolean;
  video_file_path?: string;
  demo_url?: string;
  template_urls?: { modern: string; premium: string; warm: string };
  wa_msg1?: string;
  wa_msg2?: string;
  ig_dm_invite?: string;
  ig_reply_caption?: string;
  email_subject?: string;
  email_body?: string;
}

type ChannelKey = "whatsapp" | "email" | "instagram" | "other";
type QueueFilter = "all" | "sent" | "unsent";

const QUEUE_FILTERS: { key: QueueFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sent", label: "Sent" },
  { key: "unsent", label: "Unsent" },
];

function getOldestBatchId(batches: BatchInfo[]): string | null {
  if (!batches || batches.length === 0) return null;
  const sorted = [...batches].sort((a, b) =>
    a.batch_id.localeCompare(b.batch_id, undefined, { numeric: true, sensitivity: "base" })
  );
  return sorted[0].batch_id;
}

const postJson = (path: string, payload: Record<string, unknown>) =>
  apiFetch(path, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });

export function OutreachHubSubpage() {
  const {
    stockPlan,
    notify,
    handleRunCloser,
    activeHustleId,
    setSelectedLeadId,
    isOutreachRunning,
    activeOutreachChannel,
    handleStopAutomation,
  } = useCRM();

  const [dryRunMode, setDryRunMode] = useState<boolean>(true);

  // Batch state
  const [batchMeta, setBatchMeta] = useState<BatchMeta | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState<boolean>(false);
  const [rebalancing, setRebalancing] = useState<boolean>(false);

  // Clinics for the currently selected batch
  const [batchClinics, setBatchClinics] = useState<BatchClinic[]>([]);

  // Unified Terminal & Outreach Channel Tab
  const [channelTab, setChannelTab] = useState<"whatsapp" | "email" | "instagram">("whatsapp");

  // Dispatch workspace state
  const [selectedClinicId, setSelectedClinicId] = useState<number | null>(null);
  const [queueSearch, setQueueSearch] = useState<string>("");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");

  const [editPhone, setEditPhone] = useState<string>("");
  const [editWaMsg1, setEditWaMsg1] = useState<string>("");
  const [editWaMsg2, setEditWaMsg2] = useState<string>("");
  const [savingDeck, setSavingDeck] = useState<boolean>(false);
  const [togglingSent, setTogglingSent] = useState<boolean>(false);

  const fetchBatchMeta = useCallback(async () => {
    setBatchLoading(true);
    try {
      const res = await apiFetch<BatchMeta & { clinics: BatchClinic[] }>(
        `/api/batch?hustle_id=${activeHustleId}`
      );
      const meta: BatchMeta = {
        batch_size: res.batch_size,
        batches: res.batches,
        active_batch_id: res.active_batch_id,
      };
      setBatchMeta(meta);

      const oldestId = getOldestBatchId(meta.batches);

      // Requirement 3: If explicit batch selected and still valid, keep it.
      // Otherwise, auto-select the oldest available batch in the arsenal as default fallback.
      setSelectedBatchId((prev) => {
        if (prev && meta.batches.some((b) => b.batch_id === prev)) return prev;
        return meta.active_batch_id || oldestId;
      });

      setBatchClinics(Array.isArray(res.clinics) ? res.clinics : []);
    } catch {
      // Non-fatal
    } finally {
      setBatchLoading(false);
    }
  }, [activeHustleId]);

  const fetchBatchClinics = useCallback(async (batchId: string) => {
    try {
      const res = await apiFetch<BatchMeta & { clinics: BatchClinic[] }>(
        `/api/batch?hustle_id=${activeHustleId}&batch_id=${batchId}`
      );
      setBatchClinics(Array.isArray(res.clinics) ? res.clinics : []);
    } catch {
      // Non-fatal - keep previous clinics
    }
  }, [activeHustleId]);

  useEffect(() => {
    fetchBatchMeta();
  }, [fetchBatchMeta]);

  // Whenever selected batch changes, load its clinics
  useEffect(() => {
    if (selectedBatchId) {
      fetchBatchClinics(selectedBatchId);
    }
  }, [selectedBatchId, fetchBatchClinics]);

  // Refresh batch meta after outreach finishes
  useEffect(() => {
    if (!isOutreachRunning) {
      fetchBatchMeta();
    }
  }, [isOutreachRunning, fetchBatchMeta]);

  const handleRebalance = async () => {
    setRebalancing(true);
    try {
      await autopilotApi.rebalanceBatches(activeHustleId, true);
      notify("Leads re-batched successfully!");
      await fetchBatchMeta();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Re-batch failed", "err");
    } finally {
      setRebalancing(false);
    }
  };

  const activeBatchInfo = batchMeta?.batches.find((b) => b.batch_id === selectedBatchId) ?? null;
  const effectiveBatchId = selectedBatchId ?? batchMeta?.active_batch_id ?? undefined;

  const isWaRunning = activeOutreachChannel === "whatsapp";
  const isEmailRunning = activeOutreachChannel === "email";
  const isIgRunning = activeOutreachChannel === "instagram";

  // Dynamic next clinic targets
  const nextWaClinic = useMemo<BatchClinic | null>(() => {
    const unsent = batchClinics.filter((c) => !c.is_sent);
    return unsent.find((c) => c.primary_phone || c.phone) ?? unsent[0] ?? null;
  }, [batchClinics]);

  const nextEmailClinic = useMemo<BatchClinic | null>(() => {
    const unsent = batchClinics.filter((c) => !c.is_sent);
    return unsent.find((c) => c.email) ?? unsent[0] ?? null;
  }, [batchClinics]);

  const nextIgClinic = useMemo<BatchClinic | null>(() => {
    const unsent = batchClinics.filter((c) => !c.is_sent);
    return unsent.find((c) => c.ig_handle) ?? unsent[0] ?? null;
  }, [batchClinics]);

  const batchPrefix = effectiveBatchId ?? "BATCH-??";

  const queueTitle = useMemo(() => {
    if (!effectiveBatchId) return "Batch Queue";
    const numMatch = effectiveBatchId.match(/(\d+)/);
    if (numMatch) {
      return `Batch ${parseInt(numMatch[1], 10)} Queue`;
    }
    return `${effectiveBatchId} Queue`;
  }, [effectiveBatchId]);

  const waTargetLabel = useMemo(() => {
    if (batchClinics.length === 0) return `${batchPrefix} · No clinics`;
    if (!nextWaClinic) return `${batchPrefix} · All Sent ✓`;
    return `${batchPrefix} · ${nextWaClinic.name}`;
  }, [batchClinics, nextWaClinic, batchPrefix]);

  const emailTargetLabel = useMemo(() => {
    if (batchClinics.length === 0) return `${batchPrefix} · No clinics`;
    if (!nextEmailClinic) return `${batchPrefix} · All Sent ✓`;
    return `${batchPrefix} · ${nextEmailClinic.name}`;
  }, [batchClinics, nextEmailClinic, batchPrefix]);

  const igTargetLabel = useMemo(() => {
    if (batchClinics.length === 0) return `${batchPrefix} · No clinics`;
    if (!nextIgClinic) return `${batchPrefix} · All Sent ✓`;
    if (nextIgClinic.ig_handle) {
      const handle = nextIgClinic.ig_handle.replace(/^@/, "");
      return `${batchPrefix} · @${handle}`;
    }
    return `${batchPrefix} · ${nextIgClinic.name}`;
  }, [batchClinics, nextIgClinic, batchPrefix]);

  // Telemetry counts
  const waSent = stockPlan?.today_channel_sends?.whatsapp ?? 0;
  const waLimit = stockPlan?.channel_limits?.whatsapp ?? 0;
  const waPct = Math.min(100, Math.round((waSent / (waLimit || 1)) * 100));

  const emailSent = stockPlan?.today_channel_sends?.email ?? 0;
  const emailLimit = stockPlan?.channel_limits?.email ?? 0;
  const emailPct = Math.min(100, Math.round((emailSent / (emailLimit || 1)) * 100));

  const igSent = stockPlan?.today_channel_sends?.instagram ?? 0;
  const igLimit = stockPlan?.channel_limits?.instagram ?? 0;
  const igPct = Math.min(100, Math.round((igSent / (igLimit || 1)) * 100));

  const selectedClinic = useMemo<BatchClinic | null>(
    () => batchClinics.find((c) => c.id === selectedClinicId) ?? null,
    [batchClinics, selectedClinicId]
  );

  // Simplified queue filter: ONLY All, Sent, Unsent
  const filteredClinics = useMemo<BatchClinic[]>(() => {
    const q = queueSearch.trim().toLowerCase();
    return batchClinics.filter((c) => {
      if (queueFilter === "sent" && !c.is_sent) return false;
      if (queueFilter === "unsent" && c.is_sent) return false;
      if (!q) return true;
      const haystack = [c.name, c.doctor, c.locality, c.primary_phone, c.phone, c.ig_handle]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [batchClinics, queueSearch, queueFilter]);

  const syncDeckFrom = useCallback((c: BatchClinic) => {
    setEditPhone(c.primary_phone || c.phone || "");
    setEditWaMsg1(c.wa_msg1 || "");
    setEditWaMsg2(c.wa_msg2 || "");
  }, []);

  // Auto-select first clinic when batch loads
  useEffect(() => {
    if (batchClinics.length === 0) {
      setSelectedClinicId(null);
      return;
    }
    setSelectedClinicId((prev) =>
      prev !== null && batchClinics.some((c) => c.id === prev) ? prev : batchClinics[0].id
    );
  }, [batchClinics]);

  useEffect(() => {
    if (selectedClinic) syncDeckFrom(selectedClinic);
  }, [selectedClinicId, selectedClinic, syncDeckFrom]);

  const copyText = useCallback(
    async (text: string, label: string) => {
      try {
        await navigator.clipboard.writeText(text);
        notify(`${label} copied`);
      } catch {
        notify("Copy failed", "err");
      }
    },
    [notify]
  );

  const saveContact = async () => {
    if (!selectedClinic) return;
    setSavingDeck(true);
    try {
      await postJson("/api/update-clinic-contact", {
        id: selectedClinic.id,
        primary_phone: editPhone,
        email: selectedClinic.email || "",
        ig_handle: selectedClinic.ig_handle || "",
        target_channel: selectedClinic.target_channel || "whatsapp",
      });
      notify("Phone updated successfully");
      await fetchBatchClinics(selectedClinic.batch_id);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Save phone failed", "err");
    } finally {
      setSavingDeck(false);
    }
  };

  const saveMessages = async () => {
    if (!selectedClinic) return;
    setSavingDeck(true);
    try {
      await postJson("/api/update-messages", {
        id: selectedClinic.id,
        wa_msg1: editWaMsg1,
        wa_msg2: editWaMsg2,
        email_subject: selectedClinic.email_subject || "",
        email_body: selectedClinic.email_body || "",
        ig_dm_invite: selectedClinic.ig_dm_invite || "",
      });
      notify("WhatsApp messages saved for this clinic");
      await fetchBatchClinics(selectedClinic.batch_id);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Save messages failed", "err");
    } finally {
      setSavingDeck(false);
    }
  };

  const resetMessages = async () => {
    if (!selectedClinic) return;
    setSavingDeck(true);
    try {
      await postJson("/api/reset-messages", { id: selectedClinic.id });
      const res = await apiFetch<BatchMeta & { clinics: BatchClinic[] }>(
        `/api/batch?hustle_id=${activeHustleId}&batch_id=${selectedClinic.batch_id}`
      );
      const clinics = Array.isArray(res.clinics) ? res.clinics : [];
      setBatchClinics(clinics);
      const fresh = clinics.find((c) => c.id === selectedClinic.id);
      if (fresh) syncDeckFrom(fresh);
      notify("Messages reset to default");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Reset failed", "err");
    } finally {
      setSavingDeck(false);
    }
  };

  const toggleSent = async () => {
    if (!selectedClinic) return;
    setTogglingSent(true);
    try {
      if (selectedClinic.is_sent) {
        await postJson("/api/unmark-sent", { id: selectedClinic.id, channel: selectedClinic.target_channel });
        notify("Marked as unsent");
      } else {
        await postJson("/api/mark-sent", { id: selectedClinic.id, channel: selectedClinic.target_channel });
        notify("Marked as sent ✓");
      }
      await fetchBatchClinics(selectedClinic.batch_id);
      fetchBatchMeta();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Update failed", "err");
    } finally {
      setTogglingSent(false);
    }
  };

  // Keyboard action: Open WhatsApp with Message 1
  const handleOpenWhatsApp = useCallback(() => {
    if (!selectedClinic) return;
    const rawPhone = editPhone || selectedClinic.primary_phone || selectedClinic.phone || "";
    const cleanPhone = rawPhone.replace(/\D/g, "");
    if (!cleanPhone) {
      notify("No phone number available for this clinic", "err");
      return;
    }
    const msg = editWaMsg1 || selectedClinic.wa_msg1 || "";
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    notify("Opened WhatsApp with Message 1 pre-filled");
  }, [selectedClinic, editPhone, editWaMsg1, notify]);

  // Keyboard action: Copy Video recording to clipboard
  const handleCopyVideo = useCallback(async () => {
    if (!selectedClinic) return;
    try {
      const res = await apiFetch<{
        ok: boolean;
        path?: string;
        filename?: string;
        file_url?: string;
        copied_system?: boolean;
        message?: string;
      }>(`/api/leads/${selectedClinic.id}/copy-video`, { method: "POST" });

      if (res?.path) {
        try {
          await navigator.clipboard.writeText(res.path);
        } catch {
          // Non-fatal
        }
        notify(`Video file copied (${res.filename || "MP4"}). Ready to paste!`);
      } else {
        notify("No walkthrough video found for this clinic", "err");
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : "Copy video failed", "err");
    }
  }, [selectedClinic, notify]);

  // Keyboard action: Copy Message 2
  const handleCopyMessage2 = useCallback(async () => {
    if (!selectedClinic) return;
    const msg = editWaMsg2 || selectedClinic.wa_msg2 || "";
    if (!msg) {
      notify("Message 2 is empty", "err");
      return;
    }
    await copyText(msg, "Message 2");
  }, [selectedClinic, editWaMsg2, copyText, notify]);

  // Keyboard action: Mark as Sent and advance
  const handleMarkSentAndAdvance = useCallback(async () => {
    if (!selectedClinic) return;
    setTogglingSent(true);
    try {
      const wasSent = selectedClinic.is_sent;
      if (wasSent) {
        await postJson("/api/unmark-sent", { id: selectedClinic.id, channel: selectedClinic.target_channel });
        notify("Marked as unsent");
      } else {
        await postJson("/api/mark-sent", { id: selectedClinic.id, channel: selectedClinic.target_channel });
        notify("Marked as sent ✓");

        // Auto-advance to next clinic in current list
        const currentIndex = filteredClinics.findIndex((c) => c.id === selectedClinic.id);
        if (currentIndex !== -1 && currentIndex + 1 < filteredClinics.length) {
          setSelectedClinicId(filteredClinics[currentIndex + 1].id);
        }
      }
      await fetchBatchClinics(selectedClinic.batch_id);
      fetchBatchMeta();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Update failed", "err");
    } finally {
      setTogglingSent(false);
    }
  }, [selectedClinic, filteredClinics, fetchBatchClinics, fetchBatchMeta, notify]);

  // Keyboard shortcut listener (Requirement 5)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable) {
          return;
        }
      }

      if (!selectedClinic) return;

      if (e.key === "1") {
        e.preventDefault();
        handleOpenWhatsApp();
      } else if (e.key === "2") {
        e.preventDefault();
        handleCopyVideo();
      } else if (e.key === "3") {
        e.preventDefault();
        handleCopyMessage2();
      } else if (e.key === "4" || e.code === "Space") {
        e.preventDefault();
        handleMarkSentAndAdvance();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedClinic, handleOpenWhatsApp, handleCopyVideo, handleCopyMessage2, handleMarkSentAndAdvance]);

  const handleSimulateSend = (channel: "WA" | "EMAIL" | "FALLBACK") => {
    if (channel === "WA") {
      handleRunCloser("whatsapp", dryRunMode, undefined, effectiveBatchId);
      notify(`Dispatched WhatsApp ${dryRunMode ? "dry-run" : "live"} payload (${effectiveBatchId ?? "auto"})!`);
    } else if (channel === "EMAIL") {
      handleRunCloser("email", dryRunMode, undefined, effectiveBatchId);
      notify(`Sent cold email ${dryRunMode ? "preview" : "outbound"} (${effectiveBatchId ?? "auto"})!`);
    } else {
      handleRunCloser("instagram", dryRunMode, undefined, effectiveBatchId);
      notify("Executed Instagram DM fallback rule successfully!");
    }
  };

  const stopButton = (label: string) => (
    <button
      type="button"
      onClick={() => handleStopAutomation()}
      className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
      </span>
      <Square className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="space-y-5">
      {/* 1. Floating Top Controls (Clean floating controls without card wrapper noise) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Left Side: Dry-Run / Safe Mode toggle & live running indicator */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDryRunMode((prev) => !prev)}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold border shadow-sm transition-all cursor-pointer ${
              dryRunMode
                ? "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40"
                : "bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/50 font-black"
            }`}
          >
            {dryRunMode ? "Mode: DRY-RUN (Safe)" : "Mode: LIVE SEND (Active)"}
          </button>

          {isOutreachRunning && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-bold animate-pulse shadow-sm">
                Automation Running
              </span>
              <button
                type="button"
                onClick={() => handleStopAutomation()}
                className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-sm cursor-pointer flex items-center gap-1"
              >
                <Square className="w-3 h-3" />
                <span>Stop</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Batch Selector dropdown, Reload button, Re-batch / Stock button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Batch Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedBatchId ?? ""}
              onChange={(e) => setSelectedBatchId(e.target.value || null)}
              disabled={batchLoading || !batchMeta?.batches.length}
              className="appearance-none pl-3.5 pr-8 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white shadow-sm focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50 transition-all min-w-[200px]"
            >
              {batchMeta?.batches.map((b) => (
                <option key={b.batch_id} value={b.batch_id} className="bg-white dark:bg-slate-900">
                  {b.batch_id} ({b.ready_unsent} unsent / {b.total} total)
                </option>
              ))}
              {!batchMeta?.batches.length && (
                <option value="" className="bg-white dark:bg-slate-900">
                  {batchLoading ? "Loading..." : "No batches available"}
                </option>
              )}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Reload / Refresh Button */}
          <button
            type="button"
            onClick={fetchBatchMeta}
            disabled={batchLoading}
            title="Reload Batch Data"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-slate-600 dark:text-slate-300 hover:text-indigo-500 hover:border-indigo-300 transition-all cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${batchLoading ? "animate-spin" : ""}`} />
          </button>

          {/* Re-Batch Stock Button */}
          <button
            type="button"
            onClick={handleRebalance}
            disabled={rebalancing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border border-slate-200 dark:border-slate-800 shadow-sm text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${rebalancing ? "animate-spin" : ""}`} />
            <span>{rebalancing ? "Re-batching..." : "Re-Batch Stock"}</span>
          </button>
        </div>
      </div>

      {/* 2. Unified Outreach & Terminal Component */}
      <div className="p-3.5 sm:p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        {/* Component Header with Batch Progress Display */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-white/[0.06]">
          <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Dispatch & Automation Hub
          </span>

          {/* Batch Progress Display */}
          <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-[11px] font-mono">
            <span className="text-slate-400">Batch:</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{effectiveBatchId ?? "BATCH-01"}</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="text-slate-400">Sent:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {activeBatchInfo?.sent ?? 0} / {activeBatchInfo?.total ?? batchClinics.length}
            </span>
            <span className="text-[10px] text-slate-400">
              ({activeBatchInfo?.ready_unsent ?? 0} left)
            </span>
          </div>
        </div>

        {/* Split View: Rebalanced ~63% Terminal + ~37% Channel Panels */}
        <div className="flex flex-col lg:flex-row gap-3.5 items-stretch">
          {/* Left Column (63% width): Compact Live Terminal (Height adjusted to h-72) */}
          <div className="w-full lg:w-[63%] flex flex-col">
            <LiveLogTerminal
              title="AUTOMATION TERMINAL"
              service="outreach"
              lockService={false}
              compact={true}
              showWindowDots={false}
              className="h-72 rounded-2xl border border-slate-800 shadow-inner flex flex-col"
              collapsible={false}
            />
          </div>

          {/* Right Column (37% width): Outreach Channel Panel with clean tab bar */}
          <div className="w-full lg:w-[37%] p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] flex flex-col justify-between space-y-3 h-72 overflow-hidden">
            {/* Top Channel Tab Bar */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-slate-200/70 dark:bg-white/[0.05]">
                <button
                  type="button"
                  onClick={() => setChannelTab("whatsapp")}
                  className={`py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    channelTab === "whatsapp"
                      ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <Send className="w-3 h-3" />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChannelTab("email")}
                  className={`py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    channelTab === "email"
                      ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <Mail className="w-3 h-3" />
                  <span>Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChannelTab("instagram")}
                  className={`py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    channelTab === "instagram"
                      ? "bg-white dark:bg-slate-800 text-pink-600 dark:text-pink-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <MessageCircle className="w-3 h-3" />
                  <span>Instagram</span>
                </button>
              </div>

              {/* Tab 1: WhatsApp Panel */}
              {channelTab === "whatsapp" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                      #1 PRIORITY
                    </span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {waSent} / {waLimit} Quota ({waPct}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
                    <div className="bg-emerald-500 h-1 rounded-full transition-all duration-300" style={{ width: `${waPct}%` }} />
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] text-[10px] space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Delay:</span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">4-7m (jittered)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Target:</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 truncate max-w-[150px]" title={waTargetLabel}>
                        {waTargetLabel}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Cold Email Panel */}
              {channelTab === "email" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold">
                      #2 PRIORITY
                    </span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {emailSent} / {emailLimit} Quota ({emailPct}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
                    <div className="bg-blue-500 h-1 rounded-full transition-all duration-300" style={{ width: `${emailPct}%` }} />
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] text-[10px] space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Delay:</span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">2m spacing</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Target:</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 truncate max-w-[150px]" title={emailTargetLabel}>
                        {emailTargetLabel}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Instagram DM Panel */}
              {channelTab === "instagram" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-pink-500/15 text-pink-600 dark:text-pink-400 font-bold">
                      FALLBACK ONLY
                    </span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {igSent} / {igLimit} Quota ({igPct}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
                    <div className="bg-pink-500 h-1 rounded-full transition-all duration-300" style={{ width: `${igPct}%` }} />
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] text-[10px] space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Rule:</span>
                      <span className="font-bold text-pink-600 dark:text-pink-400">Only on WA Fail</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Target:</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 truncate max-w-[150px]" title={igTargetLabel}>
                        {igTargetLabel}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Channel Action Trigger */}
            <div className="pt-1">
              {channelTab === "whatsapp" && (
                isWaRunning ? (
                  stopButton("Stop WhatsApp Automation")
                ) : (
                  <button
                    onClick={() => handleSimulateSend("WA")}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send WA {dryRunMode ? "(Dry-Run)" : "Live"}</span>
                  </button>
                )
              )}

              {channelTab === "email" && (
                isEmailRunning ? (
                  stopButton("Stop Email Automation")
                ) : (
                  <button
                    onClick={() => handleSimulateSend("EMAIL")}
                    className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send Mail {dryRunMode ? "(Dry-Run)" : "Live"}</span>
                  </button>
                )
              )}

              {channelTab === "instagram" && (
                isIgRunning ? (
                  stopButton("Stop IG Automation")
                ) : (
                  <button
                    onClick={() => handleSimulateSend("FALLBACK")}
                    className="w-full py-2 px-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-md shadow-pink-600/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Test Fallback Trigger</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Workspace: Left-Side Clinic Message Card + Right-Side Compact Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Side (9/12 width): Selected Clinic Message & Video Workspace */}
        <div className="lg:col-span-9 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          {!selectedClinic ? (
            <div className="text-xs text-slate-400 text-center py-16">
              {batchLoading ? "Loading batch..." : "Select a clinic from the queue to view its outreach workspace."}
            </div>
          ) : (
            <>
              {/* Card Header: 2 Structured Rows (Title + Operational Controls / Doctor + Demo Links) */}
              <div className="space-y-2.5 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
                {/* Row 1: Title & Batch Badge (Left) + Phone Edit, Lead Card, Sent Status (Right) */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                      {selectedClinic.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 font-bold shrink-0">
                      {selectedClinic.batch_id}
                    </span>
                  </div>

                  {/* Right Header Controls: Phone Edit + Lead Card Link + Sent Button */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Inline WhatsApp Phone Number Edit */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08]">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="WhatsApp phone"
                        className="w-28 sm:w-36 bg-transparent text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={saveContact}
                        disabled={savingDeck}
                        className="px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>

                    {/* Open Lead Card */}
                    <button
                      type="button"
                      onClick={() => setSelectedLeadId(selectedClinic.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border border-slate-200 dark:border-white/[0.1] text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Lead Card</span>
                    </button>

                    {/* Sent / Undo Status Toggle */}
                    <button
                      type="button"
                      onClick={toggleSent}
                      disabled={togglingSent}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer disabled:opacity-50 ${
                        selectedClinic.is_sent
                          ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40"
                          : "bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/[0.1]"
                      }`}
                    >
                      {selectedClinic.is_sent ? "Sent ✓ · Undo" : "Mark as Sent"}
                    </button>
                  </div>
                </div>

                {/* Row 2: Doctor/Locality (Left) + Demo Link Pills (Right) */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="truncate min-w-0">
                    {selectedClinic.doctor}
                    {selectedClinic.locality ? ` · ${selectedClinic.locality}` : ""}
                    {selectedClinic.city ? `, ${selectedClinic.city}` : ""}
                  </div>

                  {/* Demo link pills */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { label: "Switcher", url: selectedClinic.demo_url },
                        { label: "Modern", url: selectedClinic.template_urls?.modern },
                        { label: "Premium", url: selectedClinic.template_urls?.premium },
                        { label: "Warm", url: selectedClinic.template_urls?.warm },
                      ] as { label: string; url?: string }[]
                    )
                      .filter((d) => !!d.url)
                      .map((d) => (
                        <a
                          key={d.label}
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-indigo-600 dark:text-indigo-300 hover:border-indigo-400"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {d.label}
                        </a>
                      ))}
                  </div>
                </div>
              </div>

              {/* Card Body (Split View): Video Player (Left Column) + Messages (Right Column) */}
              <div className="flex flex-col md:flex-row gap-5 items-start pt-1">
                {/* Left Column (Fixed Width Video Player): ~280-300px */}
                <div className="w-full md:w-[280px] lg:w-[300px] shrink-0 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5 text-violet-500" />
                      Walkthrough Video
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        selectedClinic.has_video
                          ? "bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300"
                          : "bg-slate-100 dark:bg-white/[0.06] text-slate-400"
                      }`}
                    >
                      {selectedClinic.has_video ? "MP4 Ready" : "No Video"}
                    </span>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner aspect-[9/16] flex items-center justify-center">
                    {selectedClinic.has_video ? (
                      <video
                        key={selectedClinic.id}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-contain"
                        src={`/api/leads/${selectedClinic.id}/recording`}
                      />
                    ) : (
                      <div className="p-4 text-center space-y-2">
                        <Video className="w-8 h-8 text-slate-600 mx-auto" />
                        <div className="text-xs text-slate-400 font-medium">No Walkthrough Video</div>
                        <div className="text-[10px] text-slate-600 font-mono">
                          Clinic-{selectedClinic.slug}.mp4
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Copy Video Recording Shortcut Button */}
                  <button
                    type="button"
                    onClick={handleCopyVideo}
                    disabled={!selectedClinic.has_video}
                    className="w-full py-2 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    title="Press '2' to copy video to clipboard"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Video File (2)</span>
                  </button>
                </div>

                {/* Right Column (Flexible Width): Both WhatsApp Messages Stacked Cleanly */}
                <div className="w-full flex-1 min-w-0 space-y-3.5">
                  {/* Message 1: Text Hook */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Message 1: Text Hook
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px]">{editWaMsg1.length} chars</span>
                        <button
                          type="button"
                          onClick={() => copyText(editWaMsg1, "Message 1")}
                          className="flex items-center gap-1 text-[11px] font-semibold hover:text-indigo-600 cursor-pointer text-slate-600 dark:text-slate-400"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={editWaMsg1}
                      onChange={(e) => setEditWaMsg1(e.target.value)}
                      rows={6}
                      placeholder="WhatsApp Message 1 (Text hook)..."
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 min-h-[125px] resize-y font-normal leading-relaxed"
                    />
                  </div>

                  {/* Message 2: Video Caption & 3 Design Links */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Message 2: Video Caption &amp; 3 Design Links
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px]">{editWaMsg2.length} chars</span>
                        <button
                          type="button"
                          onClick={handleCopyMessage2}
                          className="flex items-center gap-1 text-[11px] font-semibold hover:text-indigo-600 cursor-pointer text-slate-600 dark:text-slate-400"
                          title="Press '3' to copy Message 2"
                        >
                          <Copy className="w-3 h-3" /> Copy (3)
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={editWaMsg2}
                      onChange={(e) => setEditWaMsg2(e.target.value)}
                      rows={12}
                      placeholder="WhatsApp Message 2 (Video caption & links)..."
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 min-h-[250px] resize-y font-normal leading-relaxed"
                    />
                  </div>

                  {/* Message Actions & Workflow Triggers */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={saveMessages}
                        disabled={savingDeck}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Messages</span>
                      </button>

                      {selectedClinic.has_custom_edits && (
                        <button
                          type="button"
                          onClick={resetMessages}
                          disabled={savingDeck}
                          className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 cursor-pointer disabled:opacity-50"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset to Default</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Open WhatsApp (1) */}
                      <button
                        type="button"
                        onClick={handleOpenWhatsApp}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                        title="Press '1' to open WhatsApp with Message 1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open WhatsApp (1)</span>
                      </button>

                      {/* Mark as Sent and Advance (4 / Space) */}
                      <button
                        type="button"
                        onClick={handleMarkSentAndAdvance}
                        disabled={togglingSent}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                        title="Press '4' or Spacebar to mark as Sent and advance"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Sent & Next (4/Space)</span>
                      </button>
                    </div>

                    {/* Single Clinic Dispatch Action */}
                    <button
                      type="button"
                      onClick={() => handleRunCloser("whatsapp", dryRunMode, selectedClinic.id, effectiveBatchId)}
                      className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-bold shadow-md transition-all cursor-pointer ${
                        dryRunMode
                          ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/25"
                          : "bg-rose-600 hover:bg-rose-500 shadow-rose-600/25"
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send to This Clinic Only ({dryRunMode ? "Dry-Run" : "LIVE"})</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Side (3/12 width): Compact Batch Clinic Queue (Narrow Column) */}
        <div className="lg:col-span-3 p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Layers className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider truncate">
                {queueTitle}
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 font-bold shrink-0">
              {filteredClinics.length} / {batchClinics.length}
            </span>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              value={queueSearch}
              onChange={(e) => setQueueSearch(e.target.value)}
              placeholder="Search clinic, doctor, phone..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Simplified Filter Pills: ONLY All, Sent, Unsent */}
          <div className="flex gap-1.5">
            {QUEUE_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setQueueFilter(f.key)}
                className={`flex-1 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                  queueFilter === f.key
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-slate-50 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.06] hover:border-indigo-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Scrollable Clinic List */}
          <div className="max-h-[600px] overflow-y-auto space-y-2 pr-1">
            {filteredClinics.length === 0 && (
              <div className="text-xs text-slate-400 text-center py-10">No clinics match this filter.</div>
            )}
            {filteredClinics.map((c) => {
              const isActive = c.id === selectedClinicId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedClinicId(c.id)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-400 dark:border-indigo-500/50 shadow-sm"
                      : "bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.06] hover:border-indigo-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <span
                        className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                          c.is_sent ? "bg-emerald-500" : "bg-amber-400"
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {c.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {c.doctor}
                          {c.locality ? ` · ${c.locality}` : ""}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {c.has_video && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30">
                        MP4 ✓
                      </span>
                    )}
                    {c.has_custom_edits && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                        Edited
                      </span>
                    )}
                    <span
                      className={`ml-auto text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        c.is_sent
                          ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          : "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {c.is_sent ? "SENT ✓" : "QUEUED"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
