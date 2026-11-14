"use client";

import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Flame,
  Info,
  Layers,
  Mail,
  MessageCircle,
  MessageSquare,
  Play,
  RefreshCw,
  RotateCw,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Zap,
  Search,
  Copy,
  Save,
  Phone,
  AtSign,
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
type QueueFilter = "all" | "pending" | "sent" | "wa" | "ig" | "email";

function normalizeChannel(ch: string | undefined): ChannelKey {
  const v = (ch || "").toLowerCase();
  if (v === "wa" || v.includes("whats")) return "whatsapp";
  if (v === "ig" || v.includes("insta")) return "instagram";
  if (v.includes("mail")) return "email";
  return "other";
}

const CHANNEL_BADGE: Record<ChannelKey, string> = {
  whatsapp: "WA",
  instagram: "IG",
  email: "EMAIL",
  other: "—",
};

const QUEUE_FILTERS: { key: QueueFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "sent", label: "Sent" },
  { key: "wa", label: "WA" },
  { key: "ig", label: "IG" },
  { key: "email", label: "Email" },
];

const postJson = (path: string, payload: Record<string, unknown>) =>
  apiFetch(path, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });

export function OutreachHubSubpage() {
  const { stockPlan, notify, handleRunCloser, activeHustleId, setSelectedLeadId, isOutreachRunning, activeOutreachChannel, handleStopAutomation } = useCRM();
  const [dryRunMode, setDryRunMode] = useState<boolean>(true);

  // Batch state
  const [batchMeta, setBatchMeta] = useState<BatchMeta | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState<boolean>(false);
  const [rebalancing, setRebalancing] = useState<boolean>(false);

  // Clinics for the currently selected batch (from /api/batch response)
  const [batchClinics, setBatchClinics] = useState<BatchClinic[]>([]);

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
      // Only auto-set selectedBatchId on first load or if current selection no longer exists
      setSelectedBatchId((prev) => {
        if (prev && meta.batches.some((b) => b.batch_id === prev)) return prev;
        return meta.active_batch_id;
      });
      // Store clinics for the active/default batch
      setBatchClinics(Array.isArray(res.clinics) ? res.clinics : []);
    } catch {
      // Non-fatal
    } finally {
      setBatchLoading(false);
    }
  }, [activeHustleId]);

  // When selected batch changes (after initial load), re-fetch clinics for that specific batch
  const fetchBatchClinics = useCallback(async (batchId: string) => {
    try {
      const res = await apiFetch<BatchMeta & { clinics: BatchClinic[] }>(
        `/api/batch?hustle_id=${activeHustleId}&batch_id=${batchId}`
      );
      setBatchClinics(Array.isArray(res.clinics) ? res.clinics : []);
    } catch {
      // Non-fatal — keep previous clinics
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

  // -------------------------------------------------------------------------
  // Dynamic "Current Target" / "Fallback Lead" computations per channel
  // -------------------------------------------------------------------------

  /** First unsent clinic (preferably with a phone), falls back to any unsent */
  const nextWaClinic = useMemo<BatchClinic | null>(() => {
    const unsent = batchClinics.filter((c) => !c.is_sent);
    return unsent.find((c) => c.primary_phone || c.phone) ?? unsent[0] ?? null;
  }, [batchClinics]);

  /** First unsent clinic with an email */
  const nextEmailClinic = useMemo<BatchClinic | null>(() => {
    const unsent = batchClinics.filter((c) => !c.is_sent);
    return unsent.find((c) => c.email) ?? unsent[0] ?? null;
  }, [batchClinics]);

  /** First unsent clinic with an IG handle */
  const nextIgClinic = useMemo<BatchClinic | null>(() => {
    const unsent = batchClinics.filter((c) => !c.is_sent);
    return unsent.find((c) => c.ig_handle) ?? unsent[0] ?? null;
  }, [batchClinics]);

  const batchPrefix = effectiveBatchId ?? "BATCH-??";

  const waTargetLabel = useMemo(() => {
    if (batchClinics.length === 0) return `${batchPrefix} • No clinics`;
    if (!nextWaClinic) return `${batchPrefix} • All Sent ✓`;
    return `${batchPrefix} • ${nextWaClinic.name}`;
  }, [batchClinics, nextWaClinic, batchPrefix]);

  const emailTargetLabel = useMemo(() => {
    if (batchClinics.length === 0) return `${batchPrefix} • No clinics`;
    if (!nextEmailClinic) return `${batchPrefix} • All Sent ✓`;
    return `${batchPrefix} • ${nextEmailClinic.name}`;
  }, [batchClinics, nextEmailClinic, batchPrefix]);

  const igTargetLabel = useMemo(() => {
    if (batchClinics.length === 0) return `${batchPrefix} • No clinics`;
    if (!nextIgClinic) return `${batchPrefix} • All Sent ✓`;
    if (nextIgClinic.ig_handle) {
      const handle = nextIgClinic.ig_handle.replace(/^@/, "");
      return `${batchPrefix} • @${handle}`;
    }
    return `${batchPrefix} • ${nextIgClinic.name}`;
  }, [batchClinics, nextIgClinic, batchPrefix]);

  // -------------------------------------------------------------------------
  // Dispatch cockpit: queue selection, filters and editable outreach deck
  // -------------------------------------------------------------------------
  const [selectedClinicId, setSelectedClinicId] = useState<number | null>(null);
  const [queueSearch, setQueueSearch] = useState<string>("");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [activeMsgTab, setActiveMsgTab] = useState<"whatsapp" | "email" | "instagram">("whatsapp");

  const [editPhone, setEditPhone] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editIgHandle, setEditIgHandle] = useState<string>("");
  const [editTargetChannel, setEditTargetChannel] = useState<string>("whatsapp");
  const [editWaMsg1, setEditWaMsg1] = useState<string>("");
  const [editWaMsg2, setEditWaMsg2] = useState<string>("");
  const [editEmailSubject, setEditEmailSubject] = useState<string>("");
  const [editEmailBody, setEditEmailBody] = useState<string>("");
  const [editIgDmInvite, setEditIgDmInvite] = useState<string>("");
  const [savingDeck, setSavingDeck] = useState<boolean>(false);
  const [togglingSent, setTogglingSent] = useState<boolean>(false);

  const selectedClinic = useMemo<BatchClinic | null>(
    () => batchClinics.find((c) => c.id === selectedClinicId) ?? null,
    [batchClinics, selectedClinicId]
  );

  const filteredClinics = useMemo<BatchClinic[]>(() => {
    const q = queueSearch.trim().toLowerCase();
    return batchClinics.filter((c) => {
      const ch = normalizeChannel(c.target_channel);
      if (queueFilter === "pending" && c.is_sent) return false;
      if (queueFilter === "sent" && !c.is_sent) return false;
      if (queueFilter === "wa" && ch !== "whatsapp") return false;
      if (queueFilter === "ig" && ch !== "instagram") return false;
      if (queueFilter === "email" && ch !== "email") return false;
      if (!q) return true;
      const haystack = [c.name, c.doctor, c.locality, c.primary_phone, c.phone, c.ig_handle]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [batchClinics, queueSearch, queueFilter]);

  /** Copies a clinic's stored contact + pitch fields into the editable form */
  const syncDeckFrom = (c: BatchClinic) => {
    setEditPhone(c.primary_phone || c.phone || "");
    setEditEmail(c.email || "");
    setEditIgHandle(c.ig_handle || "");
    setEditTargetChannel(c.target_channel || "whatsapp");
    setEditWaMsg1(c.wa_msg1 || "");
    setEditWaMsg2(c.wa_msg2 || "");
    setEditEmailSubject(c.email_subject || "");
    setEditEmailBody(c.email_body || "");
    setEditIgDmInvite(c.ig_dm_invite || "");
  };

  // Auto-select the first clinic whenever the batch loads or changes
  useEffect(() => {
    if (batchClinics.length === 0) {
      setSelectedClinicId(null);
      return;
    }
    setSelectedClinicId((prev) =>
      prev !== null && batchClinics.some((c) => c.id === prev) ? prev : batchClinics[0].id
    );
  }, [batchClinics]);

  // Sync the form when the user selects a different clinic (not on background refreshes,
  // so unsaved edits survive a list refresh)
  useEffect(() => {
    if (selectedClinic) syncDeckFrom(selectedClinic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClinicId]);

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify(`${label} copied`);
    } catch {
      notify("Copy failed", "err");
    }
  };

  const saveContact = async () => {
    if (!selectedClinic) return;
    setSavingDeck(true);
    try {
      await postJson("/api/update-clinic-contact", {
        id: selectedClinic.id,
        primary_phone: editPhone,
        email: editEmail,
        ig_handle: editIgHandle,
        target_channel: editTargetChannel,
      });
      notify("Contact saved");
      await fetchBatchClinics(selectedClinic.batch_id);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Save contact failed", "err");
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
        email_subject: editEmailSubject,
        email_body: editEmailBody,
        ig_dm_invite: editIgDmInvite,
      });
      notify("Messages saved for this clinic");
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
        notify("Marked as sent");
      }
      await fetchBatchClinics(selectedClinic.batch_id);
      fetchBatchMeta();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Update failed", "err");
    } finally {
      setTogglingSent(false);
    }
  };

  // Red pulsing Stop control shared by the banner and the channel cards.
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

  return (
    <div className="space-y-6">
      {/* Active Outreach Batch Control Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-indigo-500/30 dark:border-indigo-500/20 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 dark:text-white">Active Outreach Batch</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Hustle Batch Size: <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{batchMeta?.batch_size ?? 25}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Batch dropdown */}
            <div className="relative">
              <select
                value={selectedBatchId ?? ""}
                onChange={(e) => setSelectedBatchId(e.target.value || null)}
                disabled={batchLoading || !batchMeta?.batches.length}
                className="appearance-none pl-3 pr-7 py-1.5 rounded-xl bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1] text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50 transition-all min-w-[180px]"
              >
                {batchMeta?.batches.map((b) => (
                  <option key={b.batch_id} value={b.batch_id} className="bg-white dark:bg-slate-900">
                    {b.batch_id} ({b.ready_unsent} unsent / {b.total} total)
                  </option>
                ))}
                {!batchMeta?.batches.length && (
                  <option value="" className="bg-white dark:bg-slate-900">
                    {batchLoading ? "Loading..." : "No batches yet"}
                  </option>
                )}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Batch progress */}
            {activeBatchInfo && (
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-[11px] font-mono text-slate-700 dark:text-slate-300">
                Sent <span className="font-bold text-emerald-600 dark:text-emerald-400">{activeBatchInfo.sent}</span>
                {" / "}
                <span className="font-bold">{activeBatchInfo.total}</span> in Batch
              </div>
            )}

            {/* Re-Batch Stock button */}
            <button
              type="button"
              onClick={handleRebalance}
              disabled={rebalancing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border border-slate-200 dark:border-white/[0.1] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${rebalancing ? "animate-spin" : ""}`} />
              <span>{rebalancing ? "Re-batching..." : "Re-Batch Stock"}</span>
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={fetchBatchMeta}
              disabled={batchLoading}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:text-indigo-500 hover:border-indigo-300 transition-all cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${batchLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Batch pills overview */}
        {batchMeta && batchMeta.batches.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {batchMeta.batches.map((b) => (
              <button
                key={b.batch_id}
                type="button"
                onClick={() => setSelectedBatchId(b.batch_id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                  selectedBatchId === b.batch_id
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : b.ready_unsent > 0
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30 hover:border-emerald-400"
                    : "bg-slate-50 dark:bg-white/[0.03] text-slate-500 dark:text-slate-500 border-slate-200 dark:border-white/[0.06]"
                }`}
              >
                {b.batch_id} · {b.ready_unsent} unsent
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Top Protocol Invariant Banner */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Dental Clinic Multi-Channel Outreach Protocol
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-semibold">
              Strict Priority Rules Active
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Priority 1: WhatsApp (4-7m delay) &bull; Priority 2: Cold Email &bull; Fallback: Instagram DM (only on WA failure)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isOutreachRunning && (
            <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-bold animate-pulse">
              Outreach Automation Running...
            </span>
          )}
          {isOutreachRunning && (
            <button
              type="button"
              onClick={() => handleStopAutomation()}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white border border-rose-500 cursor-pointer flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Stop Automation</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setDryRunMode((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-colors cursor-pointer ${
              dryRunMode
                ? "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40"
                : "bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/50 font-black"
            }`}
          >
            {dryRunMode ? "Mode: DRY-RUN (Safe)" : "Mode: LIVE SEND (Active)"}
          </button>
        </div>
      </div>

      {/* 3 Multi-Channel Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: WHATSAPP (Priority #1) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-emerald-500/30 dark:border-emerald-500/20 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>WHATSAPP</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                      #1 PRIORITY
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    {isWaRunning ? "Status: RUNNING DISPATCH..." : "Status: ACTIVE (Window Open)"}
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                {waSent} / {waLimit}
              </span>
            </div>

            {/* Quota Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Daily Quota</span>
                <span className="font-mono">{waPct}% consumed</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${waPct}%` }}
                />
              </div>
            </div>

            {/* Pacing & Target Details */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.05] text-xs space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Pacing Delay:</span>
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">4-7 mins (jittered)</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Current Target:</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 truncate max-w-[140px]" title={waTargetLabel}>
                  {waTargetLabel}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Action:</span>
                <span className="text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
                  Pitch with video demo
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
            {isWaRunning ? (
              stopButton("Stop WA Automation")
            ) : (
              <button
                onClick={() => handleSimulateSend("WA")}
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send WA {dryRunMode ? "(Dry-Run)" : "Live"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Card 2: COLD EMAIL (Priority #2) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-blue-500/30 dark:border-blue-500/20 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>COLD EMAIL</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold">
                      #2 PRIORITY
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-semibold">
                    {isEmailRunning ? "Status: RUNNING DISPATCH..." : "Status: ACTIVE (Domain Warmed)"}
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                {emailSent} / {emailLimit}
              </span>
            </div>

            {/* Quota Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Daily Quota</span>
                <span className="font-mono">{emailPct}% consumed</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${emailPct}%` }}
                />
              </div>
            </div>

            {/* Pacing & Target Details */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.05] text-xs space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Pacing Delay:</span>
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">2 mins spacing</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Current Target:</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 truncate max-w-[140px]" title={emailTargetLabel}>
                  {emailTargetLabel}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Action:</span>
                <span className="text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
                  3-design choice page link
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
            {isEmailRunning ? (
              stopButton("Stop Email Automation")
            ) : (
              <button
                onClick={() => handleSimulateSend("EMAIL")}
                className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Send Mail {dryRunMode ? "(Dry-Run)" : "Live"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Card 3: INSTAGRAM DM (Fallback Only) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-pink-500/30 dark:border-pink-500/20 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-400 flex items-center justify-center font-bold">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>INSTAGRAM DM</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 font-bold">
                      FALLBACK ONLY
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-pink-600 dark:text-pink-400 font-semibold">
                    {isIgRunning ? "Status: RUNNING DISPATCH..." : "Status: STANDBY (Safety Rule)"}
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                {igSent} / {igLimit}
              </span>
            </div>

            {/* Quota Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Daily Quota</span>
                <span className="font-mono">{igPct}% consumed</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-pink-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${igPct}%` }}
                />
              </div>
            </div>

            {/* Invariant Rule Banner */}
            <div className="p-3 rounded-2xl bg-pink-50/50 dark:bg-pink-950/20 border border-pink-200/80 dark:border-pink-800/40 text-xs space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400 font-medium">Enforced Rule:</span>
                <span className="font-bold text-pink-600 dark:text-pink-300">Triggered ONLY on WA Fail</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Last Trigger:</span>
                <span className="text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                  WA number was landline
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Fallback Lead:</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 truncate max-w-[140px]" title={igTargetLabel}>
                  {igTargetLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
            {isIgRunning ? (
              stopButton("Stop IG Automation")
            ) : (
              <button
                onClick={() => handleSimulateSend("FALLBACK")}
                className="w-full py-2 px-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-md shadow-pink-600/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Test Fallback Trigger</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dispatch Cockpit: Clinic Queue & Editable Outreach Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Batch Clinic Queue */}
        <div className="lg:col-span-5 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Batch Clinic Queue</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 font-bold">
              {filteredClinics.length} / {batchClinics.length}
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              value={queueSearch}
              onChange={(e) => setQueueSearch(e.target.value)}
              placeholder="Search name, doctor, locality, phone, IG…"
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {QUEUE_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setQueueFilter(f.key)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                  queueFilter === f.key
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-slate-50 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.06] hover:border-indigo-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="max-h-[560px] overflow-y-auto space-y-2 pr-1">
            {filteredClinics.length === 0 && (
              <div className="text-xs text-slate-400 text-center py-10">No clinics match this view.</div>
            )}
            {filteredClinics.map((c) => {
              const ch = normalizeChannel(c.target_channel);
              const isActive = c.id === selectedClinicId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedClinicId(c.id)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-400 dark:border-indigo-500/50"
                      : "bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.06] hover:border-indigo-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <span
                        className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${c.is_sent ? "bg-emerald-500" : "bg-amber-400"}`}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{c.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {c.doctor}
                          {c.locality ? ` · ${c.locality}` : ""}
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 shrink-0">
                      {CHANNEL_BADGE[ch]}
                    </span>
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
                    {c.is_lost && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
                        Lost
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

        {/* Right: Selected Clinic Outreach Deck */}
        <div className="lg:col-span-7 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          {!selectedClinic ? (
            <div className="text-xs text-slate-400 text-center py-16">
              {batchLoading ? "Loading batch…" : "Select a clinic from the queue to edit its outreach deck."}
            </div>
          ) : (
            <>
              {/* Clinic header */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-slate-900 dark:text-white truncate">{selectedClinic.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 font-bold">
                      {selectedClinic.batch_id}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {selectedClinic.doctor}
                    {selectedClinic.locality ? ` · ${selectedClinic.locality}` : ""}
                    {selectedClinic.city ? `, ${selectedClinic.city}` : ""}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
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
                          className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-indigo-600 dark:text-indigo-300 hover:border-indigo-400"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {d.label}
                        </a>
                      ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedLeadId(selectedClinic.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border border-slate-200 dark:border-white/[0.1] text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Open Lead Card</span>
                  </button>
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

              {/* Contact & channel bar */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { key: "whatsapp", label: "WhatsApp" },
                      { key: "email", label: "Email" },
                      { key: "instagram", label: "Instagram" },
                    ] as { key: ChannelKey; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setEditTargetChannel(opt.key)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        normalizeChannel(editTargetChannel) === opt.key
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.08]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08]">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="Phone"
                      className="w-full bg-transparent text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08]">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="Email"
                      className="w-full bg-transparent text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08]">
                    <AtSign className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      value={editIgHandle}
                      onChange={(e) => setEditIgHandle(e.target.value)}
                      placeholder="IG handle"
                      className="w-full bg-transparent text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                    />
                  </label>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={saveContact}
                    disabled={savingDeck}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    Save Contact
                  </button>
                </div>
              </div>

              {/* Message tabs */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-1.5">
                    {(
                      [
                        { key: "whatsapp", label: "WhatsApp Pitch" },
                        { key: "email", label: "Cold Email" },
                        { key: "instagram", label: "Instagram DM" },
                      ] as { key: "whatsapp" | "email" | "instagram"; label: string }[]
                    ).map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setActiveMsgTab(t.key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          activeMsgTab === t.key
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-slate-50 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.08]"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {selectedClinic.has_custom_edits && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                        Custom Override Active
                      </span>
                      <button
                        type="button"
                        onClick={resetMessages}
                        disabled={savingDeck}
                        className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 cursor-pointer disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset to Default
                      </button>
                    </div>
                  )}
                </div>

                {activeMsgTab === "whatsapp" && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-semibold">Message 1 (Text Hook)</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{editWaMsg1.length} chars</span>
                          <button type="button" onClick={() => copyText(editWaMsg1, "Message 1")} className="flex items-center gap-1 font-semibold hover:text-indigo-600 cursor-pointer">
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={editWaMsg1}
                        onChange={(e) => setEditWaMsg1(e.target.value)}
                        rows={4}
                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-semibold">Message 2 (Video Caption &amp; 3 Design Links)</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{editWaMsg2.length} chars</span>
                          <button type="button" onClick={() => copyText(editWaMsg2, "Message 2")} className="flex items-center gap-1 font-semibold hover:text-indigo-600 cursor-pointer">
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={editWaMsg2}
                        onChange={(e) => setEditWaMsg2(e.target.value)}
                        rows={5}
                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-mono">
                      <Video className="w-3.5 h-3.5 text-violet-500" />
                      <span className={selectedClinic.has_video ? "text-violet-600 dark:text-violet-300 font-bold" : "text-slate-500"}>
                        {selectedClinic.has_video ? "MP4 Walkthrough Ready" : "Text-Only Fallback"}
                      </span>
                    </div>
                  </div>
                )}

                {activeMsgTab === "email" && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-semibold">Subject</span>
                        <button type="button" onClick={() => copyText(editEmailSubject, "Subject")} className="flex items-center gap-1 font-semibold hover:text-indigo-600 cursor-pointer">
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                      <input
                        value={editEmailSubject}
                        onChange={(e) => setEditEmailSubject(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-semibold">Email Body</span>
                        <button type="button" onClick={() => copyText(editEmailBody, "Email body")} className="flex items-center gap-1 font-semibold hover:text-indigo-600 cursor-pointer">
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                      <textarea
                        value={editEmailBody}
                        onChange={(e) => setEditEmailBody(e.target.value)}
                        rows={9}
                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {activeMsgTab === "instagram" && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold">Instagram DM Invite</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{editIgDmInvite.length} chars</span>
                        <button type="button" onClick={() => copyText(editIgDmInvite, "Instagram DM")} className="flex items-center gap-1 font-semibold hover:text-indigo-600 cursor-pointer">
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={editIgDmInvite}
                      onChange={(e) => setEditIgDmInvite(e.target.value)}
                      rows={6}
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Deck action footer */}
              <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={saveMessages}
                  disabled={savingDeck}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Messages</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRunCloser(activeMsgTab, dryRunMode, selectedClinic.id, effectiveBatchId)}
                  className={`flex-1 min-w-[220px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-bold shadow-md transition-all cursor-pointer ${
                    dryRunMode ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/25" : "bg-rose-600 hover:bg-rose-500 shadow-rose-600/25"
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send to This Clinic Only ({dryRunMode ? "Dry-Run" : "LIVE"})</span>
                </button>
                <a
                  href={`https://wa.me/${(editPhone || "").replace(/\D/g, "")}?text=${encodeURIComponent(editWaMsg1)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open wa.me</span>
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Real Live Outreach Terminal Embedded */}
      <LiveLogTerminal
        title="OUTREACH DISPATCH & AUTOMATION TERMINAL"
        service="outreach"
        lockService={false}
        className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl h-80"
        collapsible={true}
      />
    </div>
  );
}
