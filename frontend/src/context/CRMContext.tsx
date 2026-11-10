"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { useSSE } from "@/hooks/useSSE";
import { useTheme } from "@/hooks/useTheme";
import { PipelineStepEvent } from "@/features/cockpit/types";
import {
  CopilotSuggestion,
  Hustle,
  Lead,
  MainTab,
  RunLog,
  SprintPlan,
  StockPlan,
} from "@/types";

interface ToastState {
  type: "ok" | "err";
  text: string;
}

interface AssistantHistoryItem {
  id: string;
  mode: string;
  prompt: string;
  reply: string;
  matched_leads: Array<{
    id: number;
    name: string;
    doctor: string;
    locality: string;
    stage_id: number;
    fit_score: number;
    intent_score: number;
    phone: string | null;
  }>;
  undo_available: boolean;
  undo_id: string | null;
  undone?: boolean;
}

export type CRMTab =
  | MainTab
  | "inbox"
  | "calls"
  | "discovery"
  | "building"
  | "outreach"
  | "cockpit_overview"
  | "cockpit_followup"
  | "cockpit_unreplied"
  | "cockpit_actions"
  | "cockpit_calls";

interface CRMContextType {
  // Navigation & View
  activeTab: CRMTab;
  setActiveTab: (tab: CRMTab) => void;
  surface: "management" | "cockpit";
  setSurface: (surface: "management" | "cockpit") => void;
  cockpitTab: "attention" | "discovery" | "factory" | "outreach";
  setCockpitTab: (tab: "attention" | "discovery" | "factory" | "outreach") => void;
  globalAutomationEnabled: boolean;
  toggleGlobalAutomation: () => Promise<void>;
  setGlobalAutomationEnabled: (enabled: boolean) => Promise<void>;
  activeSmartView: string;
  setActiveSmartView: (view: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  pipelineBoardExpanded: boolean;
  setPipelineBoardExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Data
  hustles: Hustle[];
  activeHustleId: number;
  setActiveHustleId: (id: number) => void;
  activeHustle: Hustle | null;
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  selectedLeadId: number | null;
  setSelectedLeadId: (id: number | null) => void;
  selectedLead: Lead | null;
  stockPlan: StockPlan | null;
  sprintPlan: SprintPlan | null;
  runs: RunLog[];
  copilotSuggestions: CopilotSuggestion[];
  bufferHealthPct: number;
  loading: boolean;
  toast: ToastState | null;
  notify: (text: string, type?: "ok" | "err") => void;
  closeToast: () => void;

  // Real-time & Terminal
  liveFeed: string[];
  terminalLogs: string[];
  setTerminalLogs: React.Dispatch<React.SetStateAction<string[]>>;
  activeTerminalJob: string | null;
  setActiveTerminalJob: (job: string | null) => void;
  appendTerminalLines: (lines: string[]) => void;
  syncTerminalLogs: () => Promise<void>;
  showPreviousRuns: boolean;
  setShowPreviousRuns: React.Dispatch<React.SetStateAction<boolean>>;
  terminalContainerRef: React.RefObject<HTMLDivElement | null>;
  latestPipelineStep: PipelineStepEvent | null;

  // Sorting & Filtering
  sortBy: "fit" | "intent" | "deal" | "name" | "due";
  setSortBy: (s: "fit" | "intent" | "deal" | "name" | "due") => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (o: "asc" | "desc") => void;
  filterMinFit: number;
  setFilterMinFit: (n: number) => void;
  filterVerifiedOnly: boolean;
  setFilterVerifiedOnly: (b: boolean) => void;
  dashScheduleFilter: "all" | "today" | "hot";
  setDashScheduleFilter: (f: "all" | "today" | "hot") => void;
  sortPopoverOpen: boolean;
  setSortPopoverOpen: React.Dispatch<React.SetStateAction<boolean>>;
  filterPopoverOpen: boolean;
  setFilterPopoverOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Drag and Drop
  draggingLeadId: number | null;
  setDraggingLeadId: (id: number | null) => void;
  dragOverStageId: number | null;
  setDragOverStageId: (id: number | null) => void;

  // Modals
  cmdKOpen: boolean;
  setCmdKOpen: React.Dispatch<React.SetStateAction<boolean>>;
  cmdSearchQuery: string;
  setCmdSearchQuery: (q: string) => void;
  newLeadModalOpen: boolean;
  setNewLeadModalOpen: (b: boolean) => void;
  problemModalOpen: boolean;
  setProblemModalOpen: (b: boolean) => void;
  logCallModalOpen: boolean;
  setLogCallModalOpen: (b: boolean) => void;
  logCallLeadId: number | null;
  setLogCallLeadId: (id: number | null) => void;
  openLogCallModal: (leadId: number) => void;
  logReplyModalOpen: boolean;
  setLogReplyModalOpen: (b: boolean) => void;
  logReplyLeadId: number | null;
  setLogReplyLeadId: (id: number | null) => void;
  openLogReplyModal: (leadId: number) => void;
  activeInboxLeadId: number | null;
  setActiveInboxLeadId: (id: number | null) => void;
  openInboxForLead: (leadId: number) => void;

  // Assistant Drawer
  assistantOpen: boolean;
  setAssistantOpen: (b: boolean) => void;
  assistantMode: "ask" | "do";
  setAssistantMode: (m: "ask" | "do") => void;
  assistantPrompt: string;
  setAssistantPrompt: (p: string) => void;
  assistantLoading: boolean;
  assistantHistory: AssistantHistoryItem[];
  handleAskDoSubmit: (e: React.FormEvent) => Promise<void>;
  handleAssistantUndo: (undoId: string | null, entryId: string) => Promise<void>;

  // Handlers
  loadAll: () => Promise<void>;
  handleStageChange: (lead: Lead, newStageId: number) => Promise<void>;
  handleApproveAndSend: (lead: Lead) => Promise<void>;
  handleTriggerRefill: (batchSize?: number, testingMode?: boolean, locality?: string) => Promise<void>;
  handleDayModeChange: (mode: "normal" | "away" | "off") => Promise<void>;
  handleSyncBatchLinks: () => Promise<void>;
  handleRunScout: () => Promise<void>;
  handleRunAuditor: (recordVideo?: boolean) => Promise<void>;
  handleRunCloser: (channel: "whatsapp" | "instagram" | "email", dryRun?: boolean) => Promise<void>;
  handleConfirmCommitment: (commitmentId: number) => Promise<void>;
}

const CRMContext = createContext<CRMContextType | null>(null);

export function CRMProvider({ children }: { children: React.ReactNode }) {
  const { isDarkMode, toggleDarkMode } = useTheme();

  // Data state
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  // Navigation & View state
  const [activeTab, setActiveTabRaw] = useState<CRMTab>("dashboard");
  const [surface, setSurface] = useState<"management" | "cockpit">("management");
  const [cockpitTab, setCockpitTab] = useState<"attention" | "discovery" | "factory" | "outreach">("attention");
  const [activeInboxLeadId, setActiveInboxLeadId] = useState<number | null>(null);

  const setActiveTab = useCallback((tab: CRMTab) => {
    setActiveTabRaw(tab);
    setSelectedLeadId(null);
  }, []);
  const [globalAutomationEnabled, setGlobalAutomationEnabledState] = useState<boolean>(true);
  const [activeSmartView, setActiveSmartView] = useState<string>("all_active");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [pipelineBoardExpanded, setPipelineBoardExpanded] = useState<boolean>(true);

  // Auto-collapse sidebar on phone viewports on mount
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarCollapsed(true);
    }
  }, []);

  // Data state
  const [hustles, setHustles] = useState<Hustle[]>([]);
  const [activeHustleId, setActiveHustleId] = useState<number>(1);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stockPlan, setStockPlan] = useState<StockPlan | null>(null);
  const [sprintPlan, setSprintPlan] = useState<SprintPlan | null>(null);
  const [runs, setRuns] = useState<RunLog[]>([]);
  const [copilotSuggestions, setCopilotSuggestions] = useState<CopilotSuggestion[]>([]);

  // UI status
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [liveFeed, setLiveFeed] = useState<string[]>([]);

  // Sorting & Filtering
  const [sortPopoverOpen, setSortPopoverOpen] = useState<boolean>(false);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<"fit" | "intent" | "deal" | "name" | "due">("fit");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterMinFit, setFilterMinFit] = useState<number>(0);
  const [filterVerifiedOnly, setFilterVerifiedOnly] = useState<boolean>(false);
  const [dashScheduleFilter, setDashScheduleFilter] = useState<"all" | "today" | "hot">("all");

  // Drag and Drop
  const [draggingLeadId, setDraggingLeadId] = useState<number | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<number | null>(null);

  // Modals
  const [cmdKOpen, setCmdKOpen] = useState<boolean>(false);
  const [cmdSearchQuery, setCmdSearchQuery] = useState<string>("");
  const [newLeadModalOpen, setNewLeadModalOpen] = useState<boolean>(false);
  const [problemModalOpen, setProblemModalOpen] = useState<boolean>(false);
  const [logCallModalOpen, setLogCallModalOpen] = useState<boolean>(false);
  const [logCallLeadId, setLogCallLeadId] = useState<number | null>(null);
  const [logReplyModalOpen, setLogReplyModalOpen] = useState<boolean>(false);
  const [logReplyLeadId, setLogReplyLeadId] = useState<number | null>(null);

  const openLogCallModal = useCallback((leadId: number) => {
    setLogCallLeadId(leadId);
    setLogCallModalOpen(true);
  }, []);

  const openLogReplyModal = useCallback((leadId: number) => {
    setLogReplyLeadId(leadId);
    setLogReplyModalOpen(true);
  }, []);

  const openInboxForLead = useCallback((leadId: number) => {
    setActiveInboxLeadId(leadId);
    setSelectedLeadId(null);
    setSurface("management");
    setActiveTab("inbox");
  }, [setActiveTab]);

  // Terminal state
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "[SYSTEM] Unified Live Execution Terminal ready. Trigger 'Run Refill Batch Now', 'Verify Links', or any Sub-Agent (1. Scout / 2. Auditor / 3. Closer) to stream live logs here...",
  ]);
  const [activeTerminalJob, setActiveTerminalJob] = useState<string | null>(null);
  const [showPreviousRuns, setShowPreviousRuns] = useState<boolean>(false);
  const [latestPipelineStep, setLatestPipelineStep] = useState<PipelineStepEvent | null>(null);
  const terminalContainerRef = useRef<HTMLDivElement | null>(null);
  const lastLogSeqRef = useRef<number>(0);

  // Assistant state
  const [assistantOpen, setAssistantOpen] = useState<boolean>(false);
  const [assistantMode, setAssistantMode] = useState<"ask" | "do">("ask");
  const [assistantPrompt, setAssistantPrompt] = useState<string>("");
  const [assistantLoading, setAssistantLoading] = useState<boolean>(false);
  const [assistantHistory, setAssistantHistory] = useState<AssistantHistoryItem[]>([]);

  const notify = useCallback((text: string, type: "ok" | "err" = "ok") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  }, []);

  const closeToast = useCallback(() => {
    setToast(null);
  }, []);

  // Sync global automation state from backend settings on mount
  useEffect(() => {
    apiFetch<{ automation_enabled?: boolean }>("/api/settings/automation")
      .then((data) => {
        if (typeof data.automation_enabled === "boolean") {
          setGlobalAutomationEnabledState(data.automation_enabled);
        }
      })
      .catch(() => {});
  }, []);

  const toggleGlobalAutomation = useCallback(async () => {
    const nextVal = !globalAutomationEnabled;
    setGlobalAutomationEnabledState(nextVal);
    try {
      await apiFetch("/api/settings/automation", {
        method: "PATCH",
        body: JSON.stringify({ automation_enabled: nextVal }),
      });
      notify(
        nextVal
          ? "Global Automation ON: Outbound messages queue for Playwright sender"
          : "Global Automation OFF: Outbound messages open direct wa.me links",
        "ok"
      );
    } catch {
      setGlobalAutomationEnabledState(!nextVal);
      notify("Failed to update global automation settings", "err");
    }
  }, [globalAutomationEnabled, notify]);

  const setGlobalAutomationEnabled = useCallback(
    async (enabled: boolean) => {
      setGlobalAutomationEnabledState(enabled);
      try {
        await apiFetch("/api/settings/automation", {
          method: "PATCH",
          body: JSON.stringify({ automation_enabled: enabled }),
        });
      } catch {
        setGlobalAutomationEnabledState(!enabled);
        notify("Failed to update global automation settings", "err");
      }
    },
    [notify]
  );

  const activeHustle = useMemo(
    () => hustles.find((h) => h.id === activeHustleId) || hustles[0] || null,
    [hustles, activeHustleId]
  );

  const bufferHealthPct = useMemo(() => {
    return stockPlan?.required_ready_packages
      ? Math.min(100, Math.round(((stockPlan.current_ready_packages ?? 0) / stockPlan.required_ready_packages) * 100))
      : 100;
  }, [stockPlan]);

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) || null,
    [leads, selectedLeadId]
  );

  const appendTerminalLines = useCallback((lines: string[]) => {
    if (!lines.length) return;
    setTerminalLogs((prev) => {
      const next = [...prev];
      for (const l of lines) {
        if (l && next[next.length - 1] !== l) {
          next.push(l);
        }
      }
      return next.slice(-300);
    });
  }, []);

  const syncTerminalLogs = useCallback(async () => {
    try {
      const res = await apiFetch<{
        logs: Array<{ seq: number; line: string }>;
        latest_seq: number;
      }>(`/api/terminal/logs?since_seq=${lastLogSeqRef.current}`);
      if (res.logs && res.logs.length > 0) {
        const newLines: string[] = [];
        for (const item of res.logs) {
          if (item.seq > lastLogSeqRef.current) {
            lastLogSeqRef.current = item.seq;
            newLines.push(item.line);
          }
        }
        appendTerminalLines(newLines);
      }
    } catch {
      // ignore
    }
  }, [appendTerminalLines]);

  const loadAll = useCallback(async () => {
    try {
      const [hList, lList, sPlan, spPlan, rList] = await Promise.all([
        apiFetch<Hustle[]>("/api/hustles"),
        apiFetch<Lead[]>(
          `/api/leads?hustle_id=${activeHustleId}&smart_view=${encodeURIComponent(activeSmartView)}&search=${encodeURIComponent(searchQuery)}`
        ),
        apiFetch<StockPlan>(`/api/stock-plan?hustle_id=${activeHustleId}`),
        apiFetch<SprintPlan>(`/api/sprint?hustle_id=${activeHustleId}`),
        apiFetch<RunLog[]>(`/api/runs?hustle_id=${activeHustleId}`),
      ]);
      setHustles(hList);
      setLeads(lList);
      setStockPlan(sPlan);
      setSprintPlan(spPlan);
      setRuns(rList);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to load CRM data", "err");
    } finally {
      setLoading(false);
    }
  }, [activeHustleId, activeSmartView, searchQuery, notify]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Reply Copilot loader
  useEffect(() => {
    if (!selectedLeadId) {
      setCopilotSuggestions([]);
      return;
    }
    apiFetch<CopilotSuggestion[]>(`/api/leads/${selectedLeadId}/reply-copilot`)
      .then((suggs) => setCopilotSuggestions(suggs))
      .catch(() => setCopilotSuggestions([]));
  }, [selectedLeadId]);

  // Terminal poller during active jobs
  useEffect(() => {
    if (!activeTerminalJob) return;
    const timer = setInterval(() => {
      syncTerminalLogs();
    }, 350);
    return () => clearInterval(timer);
  }, [activeTerminalJob, syncTerminalLogs]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  // Wire up SSE
  const handleTerminalLog = useCallback(
    (line: string) => appendTerminalLines([line]),
    [appendTerminalLines]
  );
  const handleLiveEvent = useCallback(
    (line: string) => setLiveFeed((prev) => [line, ...prev].slice(0, 30)),
    []
  );
  const handleRefreshTrigger = useCallback(() => {
    loadAll();
  }, [loadAll]);

  useSSE({
    onTerminalLog: handleTerminalLog,
    onLiveEvent: handleLiveEvent,
    onRefreshTrigger: handleRefreshTrigger,
    onPipelineStep: (step) => setLatestPipelineStep(step),
  });

  // Action Handlers
  const handleStageChange = async (lead: Lead, newStageId: number) => {
    if (lead.stage_id === newStageId) return;
    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, stage_id: newStageId } : l))
    );
    try {
      await apiFetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        body: JSON.stringify({ stage_id: newStageId }),
      });
      notify(`Moved "${lead.name}" to next stage`);
      loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to update stage", "err");
      loadAll();
    }
  };

  const handleApproveAndSend = async (lead: Lead) => {
    try {
      await apiFetch(`/api/leads/${lead.id}/approve-send`, {
        method: "POST",
        body: JSON.stringify({
          channel: lead.preferred_channel || "whatsapp",
          sender_note: "Approved via CRM Review Tray",
        }),
      });
      notify(`Sent demo pitch to ${lead.name} via ${lead.preferred_channel || "WhatsApp"}`);
      loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to approve and send", "err");
    }
  };

  const handleTriggerRefill = async (
    batchSize: number = 3,
    testingMode: boolean = false,
    locality?: string
  ) => {
    setActiveTerminalJob("7-Step Refill Batch");
    const modeTag = testingMode ? " [TESTING MODE: LIVE-ONLY / NO CACHE]" : "";
    appendTerminalLines([
      `[${new Date().toLocaleTimeString()}] [UI] >>> Triggered 'Run Refill Batch Now' (target=${batchSize}${locality ? `, locality=${locality}` : ""})${modeTag}...`,
    ]);
    try {
      notify(`Running 7-step Autopilot Refill Batch (target=${batchSize})${modeTag}...`);
      const res = await apiFetch<{ run_id: number; message: string; trace_logs?: string[] }>(
        "/api/autopilot/run-refill",
        {
          method: "POST",
          body: JSON.stringify({
            hustle_id: activeHustleId,
            batch_size: batchSize,
            testing_mode: testingMode,
            locality: locality,
          }),
          timeoutMs: 300000,
        }
      );
      await syncTerminalLogs();
      notify(`Refill completed: Run #${res.run_id} (${res.message || "Success"})`);
      await loadAll();
    } catch (err) {
      appendTerminalLines([
        `[${new Date().toLocaleTimeString()}] [ERROR] Refill failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      ]);
      notify(err instanceof Error ? err.message : "Failed to trigger refill", "err");
      await loadAll();
    } finally {
      setActiveTerminalJob(null);
    }
  };

  const handleDayModeChange = async (mode: "normal" | "away" | "off") => {
    try {
      await apiFetch("/api/schedule/day-mode", {
        method: "POST",
        body: JSON.stringify({ hustle_id: activeHustleId, mode }),
      });
      notify(`Day mode set to ${mode.toUpperCase()}`);
      loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to change day mode", "err");
    }
  };

  const handleSyncBatchLinks = async () => {
    setActiveTerminalJob("Verify Links & Sync batch.json");
    appendTerminalLines([
      `[${new Date().toLocaleTimeString()}] [UI] >>> Triggered 'Verify Links & Sync batch.json'...`,
    ]);
    try {
      notify("Verifying HTTP 200 on all 4 client routes...");
      const res = await apiFetch<{ verified: number; total: number }>("/api/packages/sync-batch-json", {
        method: "POST",
        body: JSON.stringify({ hustle_id: activeHustleId }),
        timeoutMs: 300000,
      });
      await syncTerminalLogs();
      notify(`Self-check passed: ${res.verified}/${res.total} templates verified live & synced`);
      loadAll();
    } catch (err) {
      appendTerminalLines([
        `[${new Date().toLocaleTimeString()}] [ERROR] Link verification failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      ]);
      notify(err instanceof Error ? err.message : "Failed to verify links", "err");
    } finally {
      setActiveTerminalJob(null);
    }
  };

  const handleRunScout = async () => {
    setActiveTerminalJob("1. Scout Agent");
    appendTerminalLines([
      `[${new Date().toLocaleTimeString()}] [UI] >>> Triggered '1. Scout Agent' (Discovery + IG/Email Enrichment)...`,
    ]);
    try {
      notify("Scout Agent running: Discovering no-website clinics & enriching IG/Email dossiers...");
      const res = await apiFetch<{ discovered_new: number; enriched_leads: number; trace_logs: string[] }>(
        "/api/agents/scout/run",
        {
          method: "POST",
          body: JSON.stringify({ hustle_id: activeHustleId, batch_size: 2 }),
        }
      );
      await syncTerminalLogs();
      notify(`Scout complete: ${res.discovered_new} new clinics built, ${res.enriched_leads} dossiers enriched!`);
      loadAll();
    } catch (err) {
      appendTerminalLines([
        `[${new Date().toLocaleTimeString()}] [ERROR] Scout Agent failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      ]);
      notify(err instanceof Error ? err.message : "Scout Agent failed", "err");
    } finally {
      setActiveTerminalJob(null);
    }
  };

  const handleRunAuditor = async (recordVideo: boolean = false) => {
    setActiveTerminalJob(recordVideo ? "2. Auditor Agent (QA + Record MP4)" : "2. Auditor Agent (HTTP 200 + Link MP4)");
    appendTerminalLines([
      `[${new Date().toLocaleTimeString()}] [UI] >>> Triggered '2. Auditor Agent' (${recordVideo ? "HTTP 200 Check + Playwright MP4 Recording" : "HTTP 200 Audit + Link MP4s"})...`,
    ]);
    try {
      notify(
        recordVideo
          ? "Auditor Agent running: Verifying HTTP 200 + recording MP4 walkthrough..."
          : "Auditor Agent running: Auditing all 4 routes & attaching MP4 videos..."
      );
      const res = await apiFetch<{
        verified_links_count: number;
        attached_videos_count: number;
        video_files: string[];
        recorder_log: string;
      }>("/api/agents/auditor/run", {
        method: "POST",
        body: JSON.stringify({ hustle_id: activeHustleId, record_video: recordVideo }),
      });
      await syncTerminalLogs();
      notify(`Auditor complete: ${res.verified_links_count} verified & ${res.attached_videos_count} MP4s linked!`);
      loadAll();
    } catch (err) {
      appendTerminalLines([
        `[${new Date().toLocaleTimeString()}] [ERROR] Auditor Agent failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      ]);
      notify(err instanceof Error ? err.message : "Auditor Agent failed", "err");
    } finally {
      setActiveTerminalJob(null);
    }
  };

  const handleRunCloser = async (channel: "whatsapp" | "instagram" | "email", dryRun: boolean = true) => {
    setActiveTerminalJob(`3. Closer Agent (${channel.toUpperCase()} • ${dryRun ? "Dry-Run" : "LIVE"})`);
    appendTerminalLines([
      `[${new Date().toLocaleTimeString()}] [UI] >>> Triggered '3. Closer Agent' (${channel.toUpperCase()} • ${dryRun ? "Dry-Run Safe Test" : "LIVE"})...`,
    ]);
    try {
      notify(`Closer Agent dispatching (${channel.toUpperCase()} • ${dryRun ? "Dry-Run Safe Test" : "LIVE"})...`);
      const res = await apiFetch<{
        channel: string;
        dry_run: boolean;
        drafted_hot_followups: number;
        dispatch_log: string;
      }>("/api/agents/closer/run", {
        method: "POST",
        body: JSON.stringify({ hustle_id: activeHustleId, channel, dry_run: dryRun }),
      });
      await syncTerminalLogs();
      notify(
        `Closer (${channel.toUpperCase()}) finished & drafted ${res.drafted_hot_followups} hot-viewer follow-ups!`
      );
      loadAll();
    } catch (err) {
      appendTerminalLines([
        `[${new Date().toLocaleTimeString()}] [ERROR] Closer Agent failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      ]);
      notify(err instanceof Error ? err.message : "Closer Agent failed", "err");
    } finally {
      setActiveTerminalJob(null);
    }
  };

  const handleConfirmCommitment = async (commitmentId: number) => {
    try {
      await apiFetch(`/api/commitments/${commitmentId}/confirm`, {
        method: "POST",
      });
      notify("1-Tap Commitment confirmed & scheduled on calendar!");
      loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to confirm commitment", "err");
    }
  };

  const handleAskDoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistantPrompt.trim()) return;
    setAssistantLoading(true);
    const currentPrompt = assistantPrompt.trim();
    try {
      const res = await apiFetch<{
        mode: string;
        action_taken: string;
        reply: string;
        matched_leads: Array<{
          id: number;
          name: string;
          doctor: string;
          locality: string;
          stage_id: number;
          fit_score: number;
          intent_score: number;
          phone: string | null;
        }>;
        undo_available: boolean;
        undo_id: string | null;
      }>("/api/assistant/ask-do", {
        method: "POST",
        body: JSON.stringify({
          prompt: currentPrompt,
          hustle_id: activeHustleId,
          mode: assistantMode,
        }),
      });
      setAssistantHistory((prev) => [
        {
          id: `${Date.now()}`,
          mode: res.mode,
          prompt: currentPrompt,
          reply: res.reply,
          matched_leads: res.matched_leads || [],
          undo_available: res.undo_available,
          undo_id: res.undo_id,
        },
        ...prev,
      ]);
      setAssistantPrompt("");
      if (res.mode === "do") {
        loadAll();
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : "Assistant request failed", "err");
    } finally {
      setAssistantLoading(false);
    }
  };

  const handleAssistantUndo = async (undoId: string | null, entryId: string) => {
    try {
      const res = await apiFetch<{ ok: boolean; message: string }>("/api/assistant/undo", {
        method: "POST",
        body: JSON.stringify({ undo_id: undoId }),
      });
      notify(res.message || "Action undone!");
      setAssistantHistory((prev) =>
        prev.map((item) => (item.id === entryId ? { ...item, undone: true, undo_available: false } : item))
      );
      loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to undo action", "err");
    }
  };

  const value = {
    activeTab,
    setActiveTab,
    surface,
    setSurface,
    cockpitTab,
    setCockpitTab,
    globalAutomationEnabled,
    toggleGlobalAutomation,
    setGlobalAutomationEnabled,
    activeSmartView,
    setActiveSmartView,
    searchQuery,
    setSearchQuery,
    sidebarCollapsed,
    setSidebarCollapsed,
    pipelineBoardExpanded,
    setPipelineBoardExpanded,
    isDarkMode,
    toggleDarkMode,
    hustles,
    activeHustleId,
    setActiveHustleId,
    activeHustle,
    leads,
    setLeads,
    selectedLeadId,
    setSelectedLeadId,
    selectedLead,
    stockPlan,
    sprintPlan,
    runs,
    copilotSuggestions,
    bufferHealthPct,
    loading,
    toast,
    notify,
    closeToast,
    liveFeed,
    terminalLogs,
    setTerminalLogs,
    activeTerminalJob,
    setActiveTerminalJob,
    appendTerminalLines,
    syncTerminalLogs,
    showPreviousRuns,
    setShowPreviousRuns,
    terminalContainerRef,
    latestPipelineStep,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    filterMinFit,
    setFilterMinFit,
    filterVerifiedOnly,
    setFilterVerifiedOnly,
    dashScheduleFilter,
    setDashScheduleFilter,
    sortPopoverOpen,
    setSortPopoverOpen,
    filterPopoverOpen,
    setFilterPopoverOpen,
    draggingLeadId,
    setDraggingLeadId,
    dragOverStageId,
    setDragOverStageId,
    cmdKOpen,
    setCmdKOpen,
    cmdSearchQuery,
    setCmdSearchQuery,
    newLeadModalOpen,
    setNewLeadModalOpen,
    problemModalOpen,
    setProblemModalOpen,
    logCallModalOpen,
    setLogCallModalOpen,
    logCallLeadId,
    setLogCallLeadId,
    openLogCallModal,
    logReplyModalOpen,
    setLogReplyModalOpen,
    logReplyLeadId,
    setLogReplyLeadId,
    openLogReplyModal,
    activeInboxLeadId,
    setActiveInboxLeadId,
    openInboxForLead,
    assistantOpen,
    setAssistantOpen,
    assistantMode,
    setAssistantMode,
    assistantPrompt,
    setAssistantPrompt,
    assistantLoading,
    assistantHistory,
    handleAskDoSubmit,
    handleAssistantUndo,
    loadAll,
    handleStageChange,
    handleApproveAndSend,
    handleTriggerRefill,
    handleDayModeChange,
    handleSyncBatchLinks,
    handleRunScout,
    handleRunAuditor,
    handleRunCloser,
    handleConfirmCommitment,
  };

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
}

export function useCRM() {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error("useCRM must be used within a CRMProvider");
  }
  return context;
}
