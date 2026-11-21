"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api/client";
import { getPollingInterval } from "@/lib/utils/polling";
import { autopilotApi, leadsApi, settingsApi } from "@/api";
import { useSSE } from "@/hooks/useSSE";
import { useTheme } from "@/hooks/useTheme";
import { PipelineStepEvent } from "@/features/cockpit/types";
import { useSSEEvents } from "@/hooks/useSSEEvents";
import { useLeadMutations } from "@/hooks/useLeadMutations";
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
  citations?: Array<{ id: string; doc_type: string; lead_id?: number; snippet: string; rrf_score?: number }>;
  executed_actions?: Array<{ tool: string; badge?: string; result?: any; error?: string }>;
  pending_confirmation?: Array<{
    requires_confirmation: boolean;
    status: string;
    lead_id: number;
    lead_name: string;
    doctor_name?: string;
    channel: string;
    recipient?: string;
    draft_text: string;
    message: string;
  }>;
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
  toggleDarkMode: (event?: React.MouseEvent | MouseEvent) => void;
  themeMode: "light" | "dark" | "system";
  setThemeMode: (mode: "light" | "dark" | "system", event?: React.MouseEvent | MouseEvent) => void;

  // Settings Center & Profile
  settingsTab: string;
  setSettingsTab: (tab: string) => void;
  previousTab: CRMTab;
  handleBackToWorkspace: () => void;
  operatorProfile: {
    name: string;
    role: string;
    initials: string;
    signoff: string;
  };
  updateOperatorProfile: (profile: Partial<{ name: string; role: string; initials: string; signoff: string }>) => void;

  // Data
  hustles: Hustle[];
  activeHustleId: number;
  setActiveHustleId: (id: number) => void;
  activeHustle: Hustle | null;
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  archivedLeads: Lead[];
  setArchivedLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  archivedLoaded: boolean;
  archivedLoading: boolean;
  refreshArchivedLeads: () => Promise<void>;
  selectedLeadId: number | null;
  setSelectedLeadId: (id: number | null) => void;
  selectedLead: Lead | null;
  stockPlan: StockPlan | null;
  sprintPlan: SprintPlan | null;
  runs: RunLog[];
  copilotSuggestions: CopilotSuggestion[];
  bufferHealthPct: number;
  loading: boolean;
  isBackendOffline: boolean;
  checkBackendHealth: () => Promise<boolean>;
  toast: ToastState | null;
  notify: (textOrError: string | Error | unknown, type?: "ok" | "err") => void;
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
  settingsModalOpen: boolean;
  setSettingsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
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
  setAssistantHistory: React.Dispatch<React.SetStateAction<AssistantHistoryItem[]>>;
  handleAskDoSubmit: (e: React.FormEvent) => Promise<void>;
  handleAssistantUndo: (undoId: string | null, entryId: string) => Promise<void>;

  // Handlers
  loadAll: () => Promise<void>;
  handleStageChange: (lead: Lead, newStageId: number) => Promise<void>;
  handleUpdateLead: (leadId: number, updates: Partial<Lead>) => Promise<void>;
  handleBatchStageChange: (leadIds: number[], newStageId: number) => Promise<void>;
  handleBatchArchive: (leadIds: number[], archive?: boolean) => Promise<void>;
  handleApproveAndSend: (lead: Lead) => Promise<void>;
  handleTriggerRefill: (batchSize?: number, testingMode?: boolean, locality?: string) => Promise<void>;
  handleDayModeChange: (mode: "normal" | "away" | "off") => Promise<void>;
  handleSyncBatchLinks: () => Promise<void>;
  handleRunScout: () => Promise<void>;
  handleRunAuditor: (recordVideo?: boolean) => Promise<void>;
  handleRunCloser: (channel: "whatsapp" | "instagram" | "email", dryRun?: boolean, clinicId?: number, batchId?: string) => Promise<void>;
  handleStopAutomation: () => Promise<void>;
  isOutreachRunning: boolean;
  activeOutreachChannel: "whatsapp" | "email" | "instagram" | null;
  handleConfirmCommitment: (commitmentId: number) => Promise<void>;
}

const CRMContext = createContext<CRMContextType | null>(null);

export function CRMProvider({ children }: { children: React.ReactNode }) {
  const { isDarkMode, toggleDarkMode, themeMode, setThemeMode } = useTheme();

  // Data state
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  // Navigation & View state
  const [activeTab, setActiveTabRaw] = useState<CRMTab>("dashboard");
  const [previousTab, setPreviousTab] = useState<CRMTab>("dashboard");
  const [settingsTab, setSettingsTab] = useState<string>("blueprint");
  const [surface, setSurface] = useState<"management" | "cockpit">("management");
  const [cockpitTab, setCockpitTab] = useState<"attention" | "discovery" | "factory" | "outreach">("attention");
  const [activeInboxLeadId, setActiveInboxLeadId] = useState<number | null>(null);

  const [operatorProfile, setOperatorProfile] = useState<{
    name: string;
    role: string;
    initials: string;
    signoff: string;
  }>({
    name: "Ankur Tyagi",
    role: "CRM Architect",
    initials: "AT",
    signoff: "Ankur",
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("personal_os_operator_profile");
      if (saved) {
        setOperatorProfile(JSON.parse(saved));
      }
    } catch {
      // fallback
    }
  }, []);

  const updateOperatorProfile = useCallback(
    (updates: Partial<{ name: string; role: string; initials: string; signoff: string }>) => {
      setOperatorProfile((prev) => {
        const next = { ...prev, ...updates };
        try {
          localStorage.setItem("personal_os_operator_profile", JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    []
  );

  const setActiveTab = useCallback((tab: CRMTab) => {
    setActiveTabRaw((current) => {
      if (tab === "settings" && current !== "settings") {
        setPreviousTab(current);
      }
      return tab;
    });
    setSelectedLeadId(null);
  }, []);

  const handleBackToWorkspace = useCallback(() => {
    setActiveTabRaw(previousTab || (surface === "cockpit" ? "autopilot" : "dashboard"));
  }, [previousTab, surface]);
  const [globalAutomationEnabled, setGlobalAutomationEnabledState] = useState<boolean>(true);
  const [activeSmartView, setActiveSmartView] = useState<string>("all_active");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(false);
  const [pipelineBoardExpanded, setPipelineBoardExpanded] = useState<boolean>(true);

  // Defer any responsive / localStorage collapse check until after mount to guarantee deterministic SSR
  useEffect(() => {
    try {
      const saved = localStorage.getItem("crm_sidebar_collapsed");
      if (saved !== null) {
        setSidebarCollapsedState(saved === "true");
        return;
      }
    } catch {}
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarCollapsedState(true);
    }
  }, []);

  const setSidebarCollapsed = useCallback<React.Dispatch<React.SetStateAction<boolean>>>((action) => {
    setSidebarCollapsedState((prev) => {
      const next = typeof action === "function" ? action(prev) : action;
      try {
        localStorage.setItem("crm_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  }, []);

  // Data state
  const [hustles, setHustles] = useState<Hustle[]>([]);
  const [activeHustleId, setActiveHustleId] = useState<number>(1);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [archivedLeads, setArchivedLeads] = useState<Lead[]>([]);
  const [archivedLoaded, setArchivedLoaded] = useState<boolean>(false);
  const [archivedLoading, setArchivedLoading] = useState<boolean>(false);
  const [stockPlan, setStockPlan] = useState<StockPlan | null>(null);
  const [sprintPlan, setSprintPlan] = useState<SprintPlan | null>(null);
  const [runs, setRuns] = useState<RunLog[]>([]);
  const [copilotSuggestions, setCopilotSuggestions] = useState<CopilotSuggestion[]>([]);

  // UI status
  const [loading, setLoading] = useState<boolean>(true);
  const [isBackendOffline, setIsBackendOffline] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState | null>(null);

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
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
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
  const [isOutreachRunning, setIsOutreachRunning] = useState<boolean>(false);
  const [activeOutreachChannel, setActiveOutreachChannel] = useState<"whatsapp" | "email" | "instagram" | null>(null);
  const [showPreviousRuns, setShowPreviousRuns] = useState<boolean>(false);
  const terminalContainerRef = useRef<HTMLDivElement | null>(null);
  const lastLogSeqRef = useRef<number>(0);

  // Assistant state
  const [assistantOpen, setAssistantOpen] = useState<boolean>(false);
  const [assistantMode, setAssistantMode] = useState<"ask" | "do">("ask");
  const [assistantPrompt, setAssistantPrompt] = useState<string>("");
  const [assistantLoading, setAssistantLoading] = useState<boolean>(false);
  const [assistantHistory, setAssistantHistory] = useState<AssistantHistoryItem[]>([]);

  const notify = useCallback((textOrError: string | Error | unknown, type: "ok" | "err" = "ok") => {
    let message = "";
    if (typeof textOrError === "string") {
      message = textOrError;
    } else if (textOrError instanceof ApiError) {
      message = textOrError.code ? `[${textOrError.code}] ${textOrError.message}` : textOrError.message;
      if (textOrError.requestId) {
        message += ` (Ref: ${textOrError.requestId.slice(-6)})`;
      }
    } else if (textOrError instanceof Error) {
      message = textOrError.message;
    } else {
      message = String(textOrError || "An unexpected error occurred");
    }
    setToast({ text: message, type });
    setTimeout(() => setToast(null), 4500);
  }, []);

  const closeToast = useCallback(() => {
    setToast(null);
  }, []);

  const checkBackendHealth = useCallback(async (): Promise<boolean> => {
    try {
      await apiFetch<{ status?: string }>("/api/health", {
        timeoutMs: 5000,
        skipDedupe: true,
        disableCache: true,
      });
      setIsBackendOffline(false);
      return true;
    } catch {
      setIsBackendOffline(true);
      return false;
    }
  }, []);

  // Sync global automation state from backend settings on mount
  useEffect(() => {
    settingsApi
      .getAutomation()
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
      await settingsApi.updateAutomation({ automation_enabled: nextVal });
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
        await settingsApi.updateAutomation({ automation_enabled: enabled });
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
        settingsApi.listHustles(),
        leadsApi.list({
          hustle_id: activeHustleId,
          smart_view: "all_active",
          search: searchQuery,
        }),
        apiFetch<StockPlan>(`/api/stock-plan?hustle_id=${activeHustleId}`),
        apiFetch<SprintPlan>(`/api/sprint?hustle_id=${activeHustleId}`),
        autopilotApi.listRuns(activeHustleId),
      ]);
      setHustles(hList);
      setLeads(lList);
      setStockPlan(sPlan);
      setSprintPlan(spPlan);
      setRuns(rList);
      setIsBackendOffline(false);
    } catch (err: unknown) {
      if (
        (err instanceof ApiError && (err.status === 408 || err.code === "NETWORK_ERROR" || err.code === "TIMEOUT_ERROR")) ||
        (typeof navigator !== "undefined" && !navigator.onLine)
      ) {
        setIsBackendOffline(true);
      }
      notify(err instanceof Error ? err : "Failed to load CRM data", "err");
    } finally {
      setLoading(false);
    }
  }, [activeHustleId, searchQuery, notify]);

  // Lazy-load archived leads cache on demand when smart_view=archived is clicked
  useEffect(() => {
    const isArchived = activeSmartView === "archived" || activeSmartView === "archived_dnc";
    if (isArchived && activeHustleId && !archivedLoaded && !archivedLoading) {
      let isMounted = true;
      setArchivedLoading(true);
      leadsApi
        .list({
          hustle_id: activeHustleId,
          smart_view: "archived",
          include_archived: true,
        })
        .then((data) => {
          if (isMounted) {
            setArchivedLeads(data);
            setArchivedLoaded(true);
          }
        })
        .catch((err) => {
          if (isMounted) {
            notify(err instanceof Error ? err : "Failed to load archived leads", "err");
          }
        })
        .finally(() => {
          if (isMounted) {
            setArchivedLoading(false);
          }
        });
      return () => {
        isMounted = false;
      };
    }
  }, [activeSmartView, activeHustleId, archivedLoaded, archivedLoading, notify]);

  // Invalidate archived leads cache when switching hustle
  useEffect(() => {
    setArchivedLoaded(false);
    setArchivedLeads([]);
  }, [activeHustleId]);

  const refreshArchivedLeads = useCallback(async () => {
    if (!activeHustleId) return;
    setArchivedLoading(true);
    try {
      const data = await leadsApi.list({
        hustle_id: activeHustleId,
        smart_view: "archived",
        include_archived: true,
      });
      setArchivedLeads(data);
      setArchivedLoaded(true);
    } catch (err) {
      notify(err instanceof Error ? err : "Failed to load archived leads", "err");
    } finally {
      setArchivedLoading(false);
    }
  }, [activeHustleId, notify]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Listen to browser network connectivity changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOffline = () => setIsBackendOffline(true);
    const handleOnline = () => {
      checkBackendHealth().then((isUp) => {
        if (isUp) {
          loadAll();
          notify("Network reconnected. Syncing live CRM data.", "ok");
        }
      });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [checkBackendHealth, loadAll, notify]);

  // Periodic health check & reconnection polling with network and visibility backoff when offline
  useEffect(() => {
    if (!isBackendOffline) return;
    let timer: NodeJS.Timeout | null = null;
    let isCancelled = false;

    const scheduleRecheck = () => {
      if (isCancelled) return;
      const interval = getPollingInterval(8000, 25000);
      timer = setTimeout(async () => {
        const isUp = await checkBackendHealth();
        if (isUp) {
          loadAll();
          notify("Backend connection restored.", "ok");
        } else {
          scheduleRecheck();
        }
      }, interval);
    };

    scheduleRecheck();

    return () => {
      isCancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isBackendOffline, checkBackendHealth, loadAll, notify]);

  // Reply Copilot loader
  useEffect(() => {
    if (!selectedLeadId) {
      setCopilotSuggestions([]);
      return;
    }
    leadsApi
      .getReplyCopilot(selectedLeadId)
      .then((suggs) => setCopilotSuggestions(suggs))
      .catch(() => setCopilotSuggestions([]));
  }, [selectedLeadId]);

  // Terminal poller during active jobs with network and visibility backoff
  useEffect(() => {
    if (!activeTerminalJob) return;
    let timer: NodeJS.Timeout | null = null;
    let isCancelled = false;

    const scheduleNext = () => {
      if (isCancelled || !activeTerminalJob) return;
      const interval = getPollingInterval(350, 1500);
      timer = setTimeout(async () => {
        try {
          await syncTerminalLogs();
        } finally {
          scheduleNext();
        }
      }, interval);
    };

    scheduleNext();

    return () => {
      isCancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [activeTerminalJob, syncTerminalLogs]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  const onOutreachChange = useCallback((running: boolean, channel: "whatsapp" | "email" | "instagram" | null) => {
    setIsOutreachRunning(running);
    setActiveOutreachChannel(channel);
  }, []);

  const { liveFeed, latestPipelineStep } = useSSEEvents({
    appendTerminalLines,
    loadAll,
    onOutreachChange,
  });

  // Rehydrate running state after a reload (active_task looks like "closer_whatsapp").
  useEffect(() => {
    let cancelled = false;
    autopilotApi
      .getCockpitState(activeHustleId)
      .then((state) => {
        if (cancelled || !state.is_running || typeof state.active_task !== "string" || !state.active_task.startsWith("closer")) return;
        const ch = state.active_task.replace("closer_", "");
        setIsOutreachRunning(true);
        setActiveOutreachChannel(ch === "whatsapp" || ch === "email" || ch === "instagram" ? ch : null);
      })
      .catch(() => {
        // Non-fatal: the badge simply stays hidden until the next run starts.
      });
    return () => {
      cancelled = true;
    };
  }, [activeHustleId]);

  // Action Handlers
  const {
    handleStageChange,
    handleUpdateLead,
    handleBatchStageChange,
    handleBatchArchive,
    handleApproveAndSend,
  } = useLeadMutations({
    setLeads,
    loadAll,
    notify,
  });

  const handleTriggerRefill = useCallback(
    async (
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
        const res = await autopilotApi.triggerRefill({
          hustle_id: activeHustleId,
          batch_size: batchSize,
          testing_mode: testingMode,
          locality: locality,
        });
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
    },
    [activeHustleId, appendTerminalLines, loadAll, notify, syncTerminalLogs]
  );

  const handleDayModeChange = useCallback(
    async (mode: "normal" | "away" | "off") => {
      try {
        await settingsApi.setDayMode(mode, activeHustleId);
        notify(`Day mode set to ${mode.toUpperCase()}`);
        loadAll();
      } catch (err) {
        notify(err instanceof Error ? err.message : "Failed to change day mode", "err");
      }
    },
    [activeHustleId, loadAll, notify]
  );

  const handleSyncBatchLinks = useCallback(async () => {
    setActiveTerminalJob("Verify Links & Sync batch.json");
    appendTerminalLines([
      `[${new Date().toLocaleTimeString()}] [UI] >>> Triggered 'Verify Links & Sync batch.json'...`,
    ]);
    try {
      notify("Verifying HTTP 200 on all 4 client routes...");
      const res = await autopilotApi.syncBatchLinks(activeHustleId);
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
  }, [activeHustleId, appendTerminalLines, loadAll, notify, syncTerminalLogs]);

  const handleRunScout = useCallback(async () => {
    setActiveTerminalJob("1. Scout Agent");
    appendTerminalLines([
      `[${new Date().toLocaleTimeString()}] [UI] >>> Triggered '1. Scout Agent' (Discovery + IG/Email Enrichment)...`,
    ]);
    try {
      notify("Scout Agent running: Discovering no-website clinics & enriching IG/Email dossiers...");
      const res = await autopilotApi.runScoutAgent({
        hustle_id: activeHustleId,
        batch_size: 2,
      });
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
  }, [activeHustleId, appendTerminalLines, loadAll, notify, syncTerminalLogs]);

  const handleRunAuditor = useCallback(
    async (recordVideo: boolean = false) => {
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
        const res = await autopilotApi.runAuditorAgent({
          hustle_id: activeHustleId,
          record_video: recordVideo,
        });
        await syncTerminalLogs();
        notify(
          `Auditor complete: ${res.verified_links_count} links verified, ${res.attached_videos_count} MP4 videos linked/recorded!`
        );
        loadAll();
      } catch (err) {
        appendTerminalLines([
          `[${new Date().toLocaleTimeString()}] [ERROR] Auditor Agent failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        ]);
        notify(err instanceof Error ? err.message : "Auditor Agent failed", "err");
      } finally {
        setActiveTerminalJob(null);
      }
    },
    [activeHustleId, appendTerminalLines, loadAll, notify, syncTerminalLogs]
  );

  const handleRunCloser = useCallback(
    async (
      channel: "whatsapp" | "instagram" | "email" = "whatsapp",
      dryRun: boolean = false,
      clinicId?: number,
      batchId?: string
    ) => {
      setActiveTerminalJob(`3. Closer Agent (${channel.toUpperCase()}${dryRun ? " DRY RUN" : ""})`);
      setIsOutreachRunning(true);
      setActiveOutreachChannel(channel);
      appendTerminalLines([
        `[${new Date().toLocaleTimeString()}] [UI] >>> Triggered '3. Closer Agent' (Channel=${channel}, DryRun=${dryRun}${clinicId ? `, ClinicID=${clinicId}` : ""}${batchId ? `, BatchID=${batchId}` : ""})...`,
      ]);
      try {
        notify(`Closer Agent running (${channel.toUpperCase()})...`);
        const res = await autopilotApi.runCloserAgent({
          hustle_id: activeHustleId,
          channel: channel,
          dry_run: dryRun,
          ...(clinicId != null ? { clinic_id: clinicId } : {}),
          ...(batchId ? { batch_id: batchId } : {}),
        });
        await syncTerminalLogs();
        notify(
          `Closer (${channel.toUpperCase()}) finished & drafted ${res.drafted_hot_followups} hot-viewer follow-ups!`
        );
        loadAll();
      } catch (err) {
        const isTimeoutOrAbort =
          err instanceof Error &&
          (err.message.includes("timed out") || err.message.includes("aborted"));
        appendTerminalLines([
          `[${new Date().toLocaleTimeString()}] [ERROR] Closer Agent failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        ]);
        // If the fetch timed out / was aborted, the backend subprocess may still be running
        // during a WhatsApp pacing delay. Skip the error toast — SSE autopilot_stopped /
        // closer_complete events will reset state once the subprocess actually finishes.
        if (!isTimeoutOrAbort) {
          notify(err instanceof Error ? err.message : "Closer Agent failed", "err");
        }
      } finally {
        setActiveTerminalJob(null);
        // Guard: only reset outreach flags if the backend subprocess is actually done.
        // During a 183s WhatsApp pacing delay the process is still running even though
        // the HTTP request may have timed out or been aborted on the frontend.
        try {
          const state = await autopilotApi.getCockpitState(activeHustleId);
          if (!state.is_running) {
            setIsOutreachRunning(false);
            setActiveOutreachChannel(null);
          }
          // If still running, leave flags set. SSE autopilot_stopped / closer_complete
          // events (wired in useSSE above) will clear them when the process ends.
        } catch {
          // cockpit-state check failed — reset safely so the UI is never permanently stuck.
          setIsOutreachRunning(false);
          setActiveOutreachChannel(null);
        }
      }
    },
    [activeHustleId, appendTerminalLines, loadAll, notify, syncTerminalLogs]
  );

  const handleStopAutomation = useCallback(async () => {
    try {
      await autopilotApi.stop();
      setIsOutreachRunning(false);
      setActiveOutreachChannel(null);
      notify("Outreach automation stopped");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to stop outreach automation", "err");
    }
  }, [notify]);

  const handleConfirmCommitment = useCallback(
    async (commitmentId: number) => {
      try {
        await apiFetch(`/api/commitments/${commitmentId}/confirm`, {
          method: "POST",
        });
        notify("1-Tap Commitment confirmed & scheduled on calendar!");
        loadAll();
      } catch (err) {
        notify(err instanceof Error ? err.message : "Failed to confirm commitment", "err");
      }
    },
    [loadAll, notify]
  );

  const handleAskDoSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!assistantPrompt.trim()) return;
      setAssistantLoading(true);
      const currentPrompt = assistantPrompt.trim();
      try {
        const res = await apiFetch<{
          mode: string;
          reply: string;
          citations?: Array<{ id: string; doc_type: string; lead_id?: number; snippet: string; rrf_score?: number }>;
          executed_actions?: Array<{ tool: string; badge?: string; result?: any; error?: string }>;
          pending_confirmation?: Array<any>;
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
            mode: "do",
          }),
          timeoutMs: 90000,
        });
        setAssistantHistory((prev) => [
          {
            id: `${Date.now()}`,
            mode: res.mode,
            prompt: currentPrompt,
            reply: res.reply,
            citations: res.citations || [],
            executed_actions: res.executed_actions || [],
            pending_confirmation: res.pending_confirmation || [],
            matched_leads: res.matched_leads || [],
            undo_available: res.undo_available,
            undo_id: res.undo_id,
          },
          ...prev,
        ]);
        setAssistantPrompt("");
        if (res.mode === "do" || (res.executed_actions && res.executed_actions.length > 0)) {
          loadAll();
        }
      } catch (err: any) {
        const isNotConfigured = err?.status === 503 || String(err?.message || "").includes("ai_not_configured");
        if (isNotConfigured) {
          notify("AI provider not configured. Please configure an AI provider in Settings.", "err");
        } else {
          notify(err instanceof Error ? err.message : "Assistant request failed", "err");
        }
      } finally {
        setAssistantLoading(false);
      }
    },
    [activeHustleId, assistantMode, assistantPrompt, loadAll, notify]
  );

  const handleAssistantUndo = useCallback(
    async (undoId: string | null, entryId: string) => {
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
    },
    [loadAll, notify]
  );

  const value = useMemo(() => ({
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
    themeMode,
    setThemeMode,
    settingsTab,
    setSettingsTab,
    previousTab,
    handleBackToWorkspace,
    operatorProfile,
    updateOperatorProfile,
    hustles,
    activeHustleId,
    setActiveHustleId,
    activeHustle,
    leads,
    setLeads,
    archivedLeads,
    setArchivedLeads,
    archivedLoaded,
    archivedLoading,
    refreshArchivedLeads,
    selectedLeadId,
    setSelectedLeadId,
    selectedLead,
    stockPlan,
    sprintPlan,
    runs,
    copilotSuggestions,
    bufferHealthPct,
    loading,
    isBackendOffline,
    checkBackendHealth,
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
    settingsModalOpen,
    setSettingsModalOpen,
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
    setAssistantHistory,
    handleAskDoSubmit,
    handleAssistantUndo,
    loadAll,
    handleStageChange,
    handleUpdateLead,
    handleBatchStageChange,
    handleBatchArchive,
    handleApproveAndSend,
    handleTriggerRefill,
    handleDayModeChange,
    handleSyncBatchLinks,
    handleRunScout,
    handleRunAuditor,
    handleRunCloser,
    handleStopAutomation,
    isOutreachRunning,
    activeOutreachChannel,
    handleConfirmCommitment,
  }), [
    activeTab,
    setActiveTab,
    surface,
    cockpitTab,
    globalAutomationEnabled,
    toggleGlobalAutomation,
    setGlobalAutomationEnabled,
    activeSmartView,
    searchQuery,
    sidebarCollapsed,
    pipelineBoardExpanded,
    isDarkMode,
    toggleDarkMode,
    themeMode,
    setThemeMode,
    settingsTab,
    setSettingsTab,
    previousTab,
    handleBackToWorkspace,
    operatorProfile,
    updateOperatorProfile,
    hustles,
    activeHustleId,
    activeHustle,
    leads,
    archivedLeads,
    archivedLoaded,
    archivedLoading,
    refreshArchivedLeads,
    selectedLeadId,
    selectedLead,
    stockPlan,
    sprintPlan,
    runs,
    copilotSuggestions,
    bufferHealthPct,
    loading,
    isBackendOffline,
    checkBackendHealth,
    toast,
    notify,
    closeToast,
    liveFeed,
    terminalLogs,
    activeTerminalJob,
    showPreviousRuns,
    latestPipelineStep,
    sortBy,
    sortOrder,
    filterMinFit,
    filterVerifiedOnly,
    dashScheduleFilter,
    sortPopoverOpen,
    filterPopoverOpen,
    draggingLeadId,
    dragOverStageId,
    cmdKOpen,
    cmdSearchQuery,
    settingsModalOpen,
    setSettingsModalOpen,
    newLeadModalOpen,
    problemModalOpen,
    logCallModalOpen,
    logCallLeadId,
    openLogCallModal,
    logReplyModalOpen,
    logReplyLeadId,
    openLogReplyModal,
    activeInboxLeadId,
    openInboxForLead,
    assistantOpen,
    assistantMode,
    assistantPrompt,
    assistantLoading,
    assistantHistory,
    setAssistantHistory,
    handleAskDoSubmit,
    handleAssistantUndo,
    loadAll,
    handleStageChange,
    handleUpdateLead,
    handleBatchStageChange,
    handleBatchArchive,
    handleApproveAndSend,
    handleTriggerRefill,
    handleDayModeChange,
    handleSyncBatchLinks,
    handleRunScout,
    handleRunAuditor,
    handleRunCloser,
    handleStopAutomation,
    isOutreachRunning,
    activeOutreachChannel,
    handleConfirmCommitment,
  ]);

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
}

export function useCRM() {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error("useCRM must be used within a CRMProvider");
  }
  return context;
}

/**
 * Generic selector hook to select derived state from CRMContext.
 */
export function useCRMSelector<T>(selector: (state: CRMContextType) => T): T {
  const context = useCRM();
  return selector(context);
}

/**
 * Specialized hook for lead data and active hustle to avoid re-renders on unrelated telemetry.
 */
export function useCRMLeads() {
  const { leads, activeHustle, selectedLeadId, selectedLead, loading } = useCRM();
  return useMemo(
    () => ({ leads, activeHustle, selectedLeadId, selectedLead, loading }),
    [leads, activeHustle, selectedLeadId, selectedLead, loading]
  );
}

/**
 * Specialized hook for lead mutation actions with stable references.
 */
export function useCRMMutations() {
  const {
    handleStageChange,
    handleUpdateLead,
    handleBatchStageChange,
    handleBatchArchive,
    handleApproveAndSend,
    loadAll,
    notify,
  } = useCRM();
  return useMemo(
    () => ({
      handleStageChange,
      handleUpdateLead,
      handleBatchStageChange,
      handleBatchArchive,
      handleApproveAndSend,
      loadAll,
      notify,
    }),
    [
      handleStageChange,
      handleUpdateLead,
      handleBatchStageChange,
      handleBatchArchive,
      handleApproveAndSend,
      loadAll,
      notify,
    ]
  );
}

/**
 * Specialized hook for navigation and layout states.
 */
export function useCRMNavigation() {
  const { activeTab, setActiveTab, surface, cockpitTab, sidebarCollapsed } = useCRM();
  return useMemo(
    () => ({ activeTab, setActiveTab, surface, cockpitTab, sidebarCollapsed }),
    [activeTab, setActiveTab, surface, cockpitTab, sidebarCollapsed]
  );
}
