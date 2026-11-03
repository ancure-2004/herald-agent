"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  LayoutDashboard,
  LayoutGrid,
  Table as TableIcon,
  Zap,
  Activity,
  Settings,
  CheckCircle2,
  Clock,
  Flame,
  MessageSquare,
  RefreshCw,
  Archive,
  Plus,
  Search,
  Send,
  ExternalLink,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Download,
  Terminal,
  Bug,
  Calendar,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Copy,
  Phone,
  AtSign,
  Eye,
  Play,
  Trash2,
  X,
  Star,
  MapPin,
  Tag,
  SlidersHorizontal,
  ArrowUpDown,
  MoreVertical,
  Sun,
  Moon,
  Filter,
  Check,
  User,
  Building,
  Bell,
  ArrowRight,
  TrendingUp,
  BarChart3,
  PanelLeftClose,
  PanelLeft,
  CornerDownLeft,
} from "lucide-react";
import {
  API_BASE,
  apiFetch,
  Hustle,
  Lead,
  StockPlan,
  SprintPlan,
  RunLog,
  CopilotSuggestion,
} from "@/lib/api";

type MainTab = "dashboard" | "board" | "table" | "sprint" | "autopilot" | "settings";

export default function PersonalOSCRM() {
  const [hustles, setHustles] = useState<Hustle[]>([]);
  const [activeHustleId, setActiveHustleId] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<MainTab>("dashboard");
  const [activeSmartView, setActiveSmartView] = useState<string>("all_active");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [stockPlan, setStockPlan] = useState<StockPlan | null>(null);
  const [sprintPlan, setSprintPlan] = useState<SprintPlan | null>(null);
  const [runs, setRuns] = useState<RunLog[]>([]);
  const [copilotSuggestions, setCopilotSuggestions] = useState<CopilotSuggestion[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [liveFeed, setLiveFeed] = useState<string[]>([]);

  // Theme & Aesthetic State (CustomerGo & Homies Lab Light/Dark)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Sorting & Filtering Popovers (CustomerGo Style)
  const [sortPopoverOpen, setSortPopoverOpen] = useState<boolean>(false);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<"fit" | "intent" | "deal" | "name" | "due">("fit");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterMinFit, setFilterMinFit] = useState<number>(0);
  const [filterVerifiedOnly, setFilterVerifiedOnly] = useState<boolean>(false);

  // Dashboard Schedule filter state
  const [dashScheduleFilter, setDashScheduleFilter] = useState<"all" | "today" | "hot">("all");

  // Drag and Drop State for Kanban Cards
  const [draggingLeadId, setDraggingLeadId] = useState<number | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<number | null>(null);

  // Modals & Interactive states
  const [cmdKOpen, setCmdKOpen] = useState<boolean>(false);
  const [cmdSearchQuery, setCmdSearchQuery] = useState<string>("");
  const [newLeadModalOpen, setNewLeadModalOpen] = useState<boolean>(false);
  const [problemModalOpen, setProblemModalOpen] = useState<boolean>(false);

  // Sidebar Collapsible & File Tree Expansion states
  const [pipelineBoardExpanded, setPipelineBoardExpanded] = useState<boolean>(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Modal Task Completion state (Pipedrive Next-Step Rule)
  const [completedNote, setCompletedNote] = useState<string>("");
  const [nextActionInput, setNextActionInput] = useState<string>("");
  const [nextDueDays, setNextDueDays] = useState<number>(2);

  // Modal Message / Reply state
  const [messageInput, setMessageInput] = useState<string>("");
  const [messageDirection, setMessageDirection] = useState<"internal_note" | "inbound" | "outbound">("internal_note");
  const [messageChannel, setMessageChannel] = useState<string>("whatsapp");

  // Telegram Console state
  const [telegramCmd, setTelegramCmd] = useState<string>("/stock");
  const [telegramReply, setTelegramReply] = useState<string>("");

  // New Lead Form state
  const [newLeadName, setNewLeadName] = useState<string>("");
  const [newLeadDoctor, setNewLeadDoctor] = useState<string>("");
  const [newLeadLocality, setNewLeadLocality] = useState<string>("");
  const [newLeadPhone, setNewLeadPhone] = useState<string>("");
  const [newLeadIg, setNewLeadIg] = useState<string>("");
  const [newLeadNextAction, setNewLeadNextAction] = useState<string>("Verify website status & build 3 demo previews");

  // Problem Report Form state
  const [problemText, setProblemText] = useState<string>("");
  const [problemBriefResult, setProblemBriefResult] = useState<string>("");

  // Dynamic Greeting based on current time
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

  // Theme & URL Param Initializer
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("crm_theme");
      if (saved === "light") {
        setIsDarkMode(false);
        document.documentElement.classList.remove("dark");
      } else {
        setIsDarkMode(true);
        document.documentElement.classList.add("dark");
      }

      // Allow URL param to switch tab directly (e.g. ?tab=board)
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as MainTab;
      if (tabParam && ["dashboard", "board", "table", "sprint", "autopilot", "settings"].includes(tabParam)) {
        setActiveTab(tabParam);
      }
      if (params.get("sidebar") === "collapsed") {
        setSidebarCollapsed(true);
      }
      if (params.get("cmdk") === "true") {
        setCmdKOpen(true);
      }
    }
  }, []);

  // Global Keydown Listener for ⌘K / Ctrl+K & Escape (Claude-style Command Palette)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdKOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setCmdKOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("crm_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("crm_theme", "light");
      }
      return next;
    });
  };

  const notify = useCallback((text: string, type: "ok" | "err" = "ok") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  }, []);

  const activeHustle = useMemo(
    () => hustles.find((h) => h.id === activeHustleId) || hustles[0] || null,
    [hustles, activeHustleId]
  );

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) || null,
    [leads, selectedLeadId]
  );

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

  // Load Reply Copilot suggestions when a lead is selected
  useEffect(() => {
    if (!selectedLeadId) {
      setCopilotSuggestions([]);
      return;
    }
    apiFetch<CopilotSuggestion[]>(`/api/leads/${selectedLeadId}/reply-copilot`)
      .then((suggs) => setCopilotSuggestions(suggs))
      .catch(() => setCopilotSuggestions([]));
  }, [selectedLeadId]);

  // Unified Live Execution Terminal state (Refill Batch + Verify Links + Scout + Auditor + Closer)
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "[SYSTEM] Unified Live Execution Terminal ready. Trigger 'Run Refill Batch Now', 'Verify Links', or any Sub-Agent (1. Scout / 2. Auditor / 3. Closer) to stream live logs here...",
  ]);
  const [activeTerminalJob, setActiveTerminalJob] = useState<string | null>(null);
  const [copiedLast20, setCopiedLast20] = useState<boolean>(false);
  const [showPreviousRuns, setShowPreviousRuns] = useState<boolean>(false);
  const terminalContainerRef = useRef<HTMLDivElement | null>(null);
  const lastLogSeqRef = useRef<number>(0);

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

  useEffect(() => {
    syncTerminalLogs();
  }, [syncTerminalLogs]);

  // Poll buffered terminal logs every 350ms while any job/agent is actively running
  useEffect(() => {
    if (!activeTerminalJob) return;
    const timer = setInterval(() => {
      syncTerminalLogs();
    }, 350);
    return () => clearInterval(timer);
  }, [activeTerminalJob, syncTerminalLogs]);

  // Auto-scroll terminal to bottom when new log lines arrive
  useEffect(() => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  const handleCopyLast20Logs = async () => {
    const last20 = terminalLogs.slice(-20).join("\n");
    try {
      await navigator.clipboard.writeText(last20);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = last20;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedLast20(true);
    notify(`Copied last ${Math.min(20, terminalLogs.length)} terminal logs to clipboard`);
    setTimeout(() => setCopiedLast20(false), 2000);
  };

  // Real-time EventSource connection for live demo views, replies, runs & terminal logs
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource(`${API_BASE}/api/events`);
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "terminal_log" && data.line) {
            if (typeof data.seq === "number" && data.seq > lastLogSeqRef.current) {
              lastLogSeqRef.current = data.seq;
            }
            appendTerminalLines([data.line]);
            return;
          }

          const line = `[${new Date().toLocaleTimeString()}] ${data.type}: ${data.title || data.message || "Event"}`;
          setLiveFeed((prev) => [line, ...prev].slice(0, 30));

          if (
            [
              "tracking_view",
              "reply_received",
              "run_complete",
              "outreach_sent",
              "autopilot_run",
              "scout_complete",
              "auditor_complete",
              "closer_complete",
            ].includes(data.type)
          ) {
            loadAll();
          }
        } catch {
          // ignore
        }
      };
      es.onerror = () => {
        // SSE disconnected, will retry automatically
      };
    } catch {
      // ignore
    }
    return () => {
      es?.close();
    };
  }, [loadAll, appendTerminalLines]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdKOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setCmdKOpen(false);
        setNewLeadModalOpen(false);
        setProblemModalOpen(false);
        setSelectedLeadId(null);
        setSortPopoverOpen(false);
        setFilterPopoverOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handlers for Stage changes (drag / dropdown)
  const handleStageChange = async (lead: Lead, newStageId: number) => {
    if (lead.stage_id === newStageId) return;

    // Instant optimistic update
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

  // Handler for Approving & Sending outreach in Review Tray
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

  // Handler for Pipedrive Mandatory Next Step (Complete Task & Lock Next)
  const handleCompleteTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    if (!nextActionInput.trim()) {
      notify("Pipedrive Rule Violation: You must specify a mandatory next step", "err");
      return;
    }

    try {
      const dueDays = nextDueDays || 2;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + dueDays);

      await apiFetch(`/api/leads/${selectedLead.id}/complete-task`, {
        method: "POST",
        body: JSON.stringify({
          completed_note: completedNote || "Completed outreach action",
          next_action: nextActionInput.trim(),
          next_action_due_at: dueDate.toISOString(),
        }),
      });

      notify("Task completed & next action locked");
      setCompletedNote("");
      setNextActionInput("");
      loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to complete task", "err");
    }
  };

  // Handler for Appending Messages / Internal Notes
  const handleAppendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !messageInput.trim()) return;

    try {
      await apiFetch(`/api/leads/${selectedLead.id}/messages`, {
        method: "POST",
        body: JSON.stringify({
          channel: messageChannel,
          direction: messageDirection,
          text: messageInput.trim(),
        }),
      });

      notify("Message logged to activity timeline");
      setMessageInput("");
      loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to log message", "err");
    }
  };

  // Handler for Triggering Autopilot Refill Batch
  const handleTriggerRefill = async () => {
    setActiveTerminalJob("7-Step Refill Batch");
    appendTerminalLines([
      `[${new Date().toLocaleTimeString()}] [UI] >>> Triggered 'Run Refill Batch Now' (7-step pipeline)...`,
    ]);
    try {
      notify("Running 7-step Autopilot Refill Batch (live logs streaming in terminal)...");
      const res = await apiFetch<{ run_id: number; message: string; trace_logs?: string[] }>(
        "/api/autopilot/run-refill",
        {
          method: "POST",
          body: JSON.stringify({ hustle_id: activeHustleId, batch_size: 2 }),
        }
      );
      await syncTerminalLogs();
      notify(`Refill completed: Run #${res.run_id} (${res.message})`);
      loadAll();
    } catch (err) {
      appendTerminalLines([
        `[${new Date().toLocaleTimeString()}] [ERROR] Refill failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      ]);
      notify(err instanceof Error ? err.message : "Failed to trigger refill", "err");
    } finally {
      setActiveTerminalJob(null);
    }
  };

  // Handler for Day Mode (run / away / off)
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

  // Handler for Telegram CLI command submission
  const handleTelegramCmdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramCmd.trim()) return;
    try {
      const res = await apiFetch<{ reply: string }>("/api/telegram/simulate", {
        method: "POST",
        body: JSON.stringify({ command: telegramCmd.trim(), hustle_id: activeHustleId }),
      });
      setTelegramReply(res.reply);
    } catch (err) {
      setTelegramReply(`Error: ${err instanceof Error ? err.message : "Failed to execute"}`);
    }
  };

  // Handler for Creating New Lead
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim()) {
      notify("Clinic / Lead name is required", "err");
      return;
    }

    try {
      const firstStage = activeHustle?.stages[0]?.id || 1;
      const defaultDue = new Date(Date.now() + 2 * 86400000).toISOString();
      await apiFetch("/api/leads", {
        method: "POST",
        body: JSON.stringify({
          hustle_id: activeHustleId,
          stage_id: firstStage,
          name: newLeadName.trim(),
          doctor_name: newLeadDoctor.trim(),
          locality: newLeadLocality.trim(),
          primary_phone: newLeadPhone.trim() || null,
          instagram_handle: newLeadIg.trim() || null,
          next_action: newLeadNextAction.trim(),
          next_action_due_at: defaultDue,
          fit_score: 85,
          fit_reasons: ["Manual intake lead", "Targeted dental clinic"],
          intent_score: 50,
        }),
      });

      notify(`Added "${newLeadName}" to pipeline`);
      setNewLeadModalOpen(false);
      setNewLeadName("");
      setNewLeadDoctor("");
      setNewLeadLocality("");
      setNewLeadPhone("");
      setNewLeadIg("");
      loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to add lead", "err");
    }
  };

  // Handler for Reporting Problem Brief to Antigravity
  const handleReportProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemText.trim()) return;

    try {
      const res = await apiFetch<{ brief: string }>("/api/diagnostics/capture-problem-brief", {
        method: "POST",
        body: JSON.stringify({
          hustle_id: activeHustleId,
          description: problemText.trim(),
        }),
      });
      setProblemBriefResult(res.brief);
      notify("Diagnostic brief captured! Ready for Antigravity IDE.");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to generate brief", "err");
    }
  };

  // Handler for Syncing Batch JSON links
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

  // Phase 3 Specialized Sub-Agent Handlers (Scout / Auditor / Closer)
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

  // Phase 3 & 4 Controls: Closer Dry-Run Toggle, Hustle Settings, Post-Call Drafter & Ask-and-Do AI Assistant
  const [closerDryRun, setCloserDryRun] = useState<boolean>(true);
  const [settingsAutonomy, setSettingsAutonomy] = useState<"copilot" | "autopilot">("copilot");
  const [settingsQuery, setSettingsQuery] = useState<string>("");
  const [settingsMinDays, setSettingsMinDays] = useState<number>(3);
  const [settingsWaLimit, setSettingsWaLimit] = useState<number>(15);
  const [settingsIgLimit, setSettingsIgLimit] = useState<number>(15);
  const [settingsEmailLimit, setSettingsEmailLimit] = useState<number>(30);
  const [settingsIgDiscovery, setSettingsIgDiscovery] = useState<boolean>(false);

  // Sync Hustle Settings state when activeHustle loads
  useEffect(() => {
    if (!activeHustle) return;
    setSettingsAutonomy(activeHustle.autonomy_mode || "copilot");
    setSettingsQuery(activeHustle.search_query || "dental clinic in South Delhi");
    setSettingsMinDays(activeHustle.minimum_stock_days || 3);
    setSettingsWaLimit(activeHustle.channel_limits?.whatsapp ?? 15);
    setSettingsIgLimit(activeHustle.channel_limits?.instagram ?? 15);
    setSettingsEmailLimit(activeHustle.channel_limits?.email ?? 30);
    const isDental =
      activeHustle.slug.includes("dental") || activeHustle.name.toLowerCase().includes("dental");
    setSettingsIgDiscovery(
      isDental ? false : (activeHustle.pipeline_steps || []).includes("find_instagram")
    );
  }, [activeHustle]);

  const handleSaveHustleSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHustle) return;
    const isDental =
      activeHustle.slug.includes("dental") || activeHustle.name.toLowerCase().includes("dental");
    const baseSteps = [
      "find_maps_4tier",
      "verify_no_website",
      "research_2source",
      "channel_check",
      "build_3_demos",
      "verify_http_200",
      "sync_batch_json",
    ];
    if (!isDental && settingsIgDiscovery) {
      baseSteps.unshift("find_instagram");
    }
    try {
      await apiFetch(`/api/hustles/${activeHustle.id}`, {
        method: "PUT",
        body: JSON.stringify({
          autonomy_mode: settingsAutonomy,
          search_query: settingsQuery,
          minimum_stock_days: Number(settingsMinDays),
          channel_limits: {
            whatsapp: Number(settingsWaLimit),
            instagram: Number(settingsIgLimit),
            email: Number(settingsEmailLimit),
          },
          pipeline_steps: baseSteps,
        }),
      });
      notify(
        isDental
          ? "Saved Hustle Settings (4-Tier Maps/Web Waterfall active; Instagram lead discovery disabled for Dental Clinics)"
          : "Saved Hustle Settings"
      );
      loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to save hustle settings", "err");
    }
  };

  // Phase 4: 1-Tap Commitment Confirmation
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

  // Phase 4: Post-Call / Voice-Note Follow-Up Drafter
  const [callNoteInput, setCallNoteInput] = useState<string>("");
  const [callOutcomeInput, setCallOutcomeInput] = useState<string>("interested");
  const [postCallLoading, setPostCallLoading] = useState<boolean>(false);

  const handlePostCallDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !callNoteInput.trim()) return;
    setPostCallLoading(true);
    try {
      const res = await apiFetch<{
        lead_id: number;
        draft_message: string;
        next_action: string;
        next_action_due_at: string;
      }>(`/api/leads/${selectedLead.id}/post-call-draft`, {
        method: "POST",
        body: JSON.stringify({
          call_note: callNoteInput.trim(),
          outcome: callOutcomeInput,
          duration_seconds: 120,
        }),
      });
      setMessageChannel("whatsapp");
      setMessageDirection("outbound");
      setMessageInput(res.draft_message);
      setNextActionInput(res.next_action);
      setNextDueDays(1);
      setCallNoteInput("");
      notify("Post-call summary logged, next action locked, and WhatsApp follow-up drafted!");
      loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to generate post-call draft", "err");
    } finally {
      setPostCallLoading(false);
    }
  };

  // Phase 4: In-App Ask & Do AI Assistant Drawer with 1-Click Undo
  const [assistantOpen, setAssistantOpen] = useState<boolean>(false);
  const [assistantMode, setAssistantMode] = useState<"ask" | "do">("ask");
  const [assistantPrompt, setAssistantPrompt] = useState<string>("");
  const [assistantLoading, setAssistantLoading] = useState<boolean>(false);
  const [assistantHistory, setAssistantHistory] = useState<
    Array<{
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
    }>
  >([]);

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

  // Header quick stats
  const waSentToday = stockPlan?.today_channel_sends?.whatsapp ?? 0;
  const waDailyLimit = stockPlan?.channel_limits?.whatsapp ?? 15;
  const todayMode = stockPlan?.upcoming_schedule?.[0]?.mode ?? "normal";
  const bufferHealthPct = stockPlan?.required_ready_packages
    ? Math.min(100, Math.round(((stockPlan.current_ready_packages ?? 0) / stockPlan.required_ready_packages) * 100))
    : 100;

  // Filtered leads for the Dashboard schedule view
  const dashboardScheduleLeads = useMemo(() => {
    if (dashScheduleFilter === "today") {
      return leads.filter((l) => l.next_action && !l.do_not_contact).slice(0, 5);
    }
    if (dashScheduleFilter === "hot") {
      return leads.filter((l) => l.intent_score > 60 || (l.events && l.events.length > 0)).slice(0, 5);
    }
    return leads.filter((l) => !l.do_not_contact).slice(0, 5);
  }, [leads, dashScheduleFilter]);

  // Claude-Style Quick Actions List
  const quickActions = useMemo(
    () => [
      {
        id: "add_lead",
        title: "Add New Lead",
        subtitle: "Register clinic prospect into pipeline",
        icon: Plus,
        badge: "Action",
        run: () => setNewLeadModalOpen(true),
      },
      {
        id: "run_refill",
        title: "Run Stock Refill Batch",
        subtitle: "Execute 7-step acquisition pipeline",
        icon: Play,
        badge: "Autopilot",
        run: () => handleTriggerRefill(),
      },
      {
        id: "verify_links",
        title: "Verify Links & Sync batch.json",
        subtitle: "Run HTTP 200 checks on demo previews",
        icon: CheckCircle2,
        badge: "Autopilot",
        run: () => handleSyncBatchLinks(),
      },
      {
        id: "view_board",
        title: "Pipeline Kanban Board",
        subtitle: "CustomerGo drag & drop pipeline view",
        icon: LayoutGrid,
        badge: "Navigation",
        run: () => {
          setActiveTab("board");
          setPipelineBoardExpanded(true);
        },
      },
      {
        id: "view_dashboard",
        title: "Executive Dashboard",
        subtitle: "Homies Lab metrics & daily command center",
        icon: LayoutDashboard,
        badge: "Navigation",
        run: () => setActiveTab("dashboard"),
      },
      {
        id: "view_table",
        title: "Full Leads Table",
        subtitle: "Inspect all leads with data attributes",
        icon: TableIcon,
        badge: "Navigation",
        run: () => setActiveTab("table"),
      },
      {
        id: "view_sprint",
        title: "Evening Sprint Mode",
        subtitle: "90-minute focused closing buffer",
        icon: Zap,
        badge: "Navigation",
        run: () => setActiveTab("sprint"),
      },
      {
        id: "view_autopilot",
        title: "Autopilot Traces & CLI Console",
        subtitle: "View logs, metrics, and Telegram CLI",
        icon: Activity,
        badge: "Navigation",
        run: () => setActiveTab("autopilot"),
      },
      {
        id: "toggle_theme",
        title: isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode",
        subtitle: "Toggle between Homies Lab Cream and Obsidian Carbon",
        icon: isDarkMode ? Sun : Moon,
        badge: "Preference",
        run: () => toggleDarkMode(),
      },
      {
        id: "export_csv",
        title: "Export Leads to CSV",
        subtitle: "Download full pipeline data snapshot",
        icon: Download,
        badge: "Data",
        run: () => {
          window.open(`${API_BASE}/api/leads/export/csv?hustle_id=${activeHustleId}`, "_blank");
        },
      },
      {
        id: "report_problem",
        title: "Report Diagnostic Problem",
        subtitle: "Capture trace and report issue",
        icon: Bug,
        badge: "Help",
        run: () => {
          setProblemBriefResult("");
          setProblemModalOpen(true);
        },
      },
    ],
    [isDarkMode, activeHustleId]
  );

  const filteredQuickActions = useMemo(() => {
    if (!cmdSearchQuery.trim()) return quickActions;
    const q = cmdSearchQuery.toLowerCase();
    return quickActions.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.subtitle.toLowerCase().includes(q) ||
        a.badge.toLowerCase().includes(q)
    );
  }, [quickActions, cmdSearchQuery]);

  const filteredSearchLeads = useMemo(() => {
    if (!cmdSearchQuery.trim()) return [];
    const q = cmdSearchQuery.toLowerCase();
    return leads
      .filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.doctor_name && l.doctor_name.toLowerCase().includes(q)) ||
          (l.locality && l.locality.toLowerCase().includes(q)) ||
          (l.city && l.city.toLowerCase().includes(q)) ||
          (l.primary_phone && l.primary_phone.includes(q)) ||
          (l.next_action && l.next_action.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [leads, cmdSearchQuery]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#FAF9F6] dark:bg-[#0B0C10] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 border ${
            toast.type === "ok"
              ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-900/30"
              : "bg-rose-600 text-white border-rose-500 shadow-rose-900/30"
          }`}
        >
          {toast.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* CLEAN MINIMAL TOP HEADER (CustomerGo Style: Logo, Collapsible Trigger, Centered Search, Profile & Add Button) */}
      <header className="h-16 shrink-0 border-b border-slate-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#0F1117]/95 backdrop-blur-md px-6 flex items-center justify-between gap-6 sticky top-0 z-30 transition-colors">
        {/* Left: Brand Identity, Sidebar Collapse Button & Compact Hustle Selector */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="w-5 h-5 text-indigo-500" />
            ) : (
              <PanelLeftClose className="w-5 h-5 text-slate-400" />
            )}
          </button>

          <div className="w-9 h-9 rounded-2xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/25 text-sm">
            OS
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">CustomerGo</span>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">/</span>
            <select
              value={activeHustleId}
              onChange={(e) => setActiveHustleId(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none cursor-pointer"
            >
              {hustles.map((h) => (
                <option key={h.id} value={h.id} className="bg-white dark:bg-[#141721] text-slate-800 dark:text-white">
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: Global Search Bar (Claude & CustomerGo style with ⌘K) */}
        <div className="flex-1 max-w-md hidden md:block">
          <div
            onClick={() => {
              setCmdSearchQuery("");
              setCmdKOpen(true);
            }}
            className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-slate-100/80 hover:bg-slate-200/70 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] border border-slate-200/80 dark:border-white/[0.08] text-xs text-slate-400 cursor-pointer transition-all shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-indigo-500" />
              <span>Search leads, doctors, tasks, commands...</span>
            </div>
            <kbd className="px-2 py-0.5 text-[10px] bg-white dark:bg-[#141721] rounded-lg border border-slate-200 dark:border-white/[0.1] font-mono text-slate-500 dark:text-slate-400 shadow-2xs">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right: Light/Dark Mode Switcher, Notifications, Captain Profile, Add Lead */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Light / Dark Mode Toggle Switch (CustomerGo Exact Style) */}
          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Dark Mode</span>
              </>
            )}
          </button>

          {/* Notifications Bell */}
          <button
            onClick={() => notify("All systems operational. No unhandled alerts.")}
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-[#0F1117]"></span>
          </button>

          {/* User Profile Chip (CustomerGo Style) */}
          <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-white/[0.08]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs shadow-sm">
              C
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">Captain</div>
              <div className="text-[10px] text-slate-400 font-medium">Lead Operator</div>
            </div>
          </div>

          {/* "+ Add Lead" Primary Action Button (CustomerGo Style) */}
          <button
            onClick={() => setNewLeadModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Lead</span>
          </button>
        </div>
      </header>

      {/* Main Layout: Left Sidebar + Center Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0 min-w-0">
        {/* Left Navigation Sidebar: Fully Collapsible from Width AND Height */}
        {sidebarCollapsed ? (
          /* COLLAPSED FLOATING DOCK: Fits height to icons, big centered icons */
          <aside className="w-20 shrink-0 self-start m-3 rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#0F1117]/95 backdrop-blur-md shadow-xl p-2.5 flex flex-col items-center gap-2.5 transition-all duration-200 z-20">
            {/* Expand Toggle */}
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="w-11 h-11 rounded-2xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Expand Sidebar"
            >
              <PanelLeft className="w-5 h-5 text-indigo-500" />
            </button>

            <div className="w-8 h-px bg-slate-200 dark:bg-white/[0.08]" />

            {/* Big Icons Navigation */}
            <nav className="flex flex-col items-center gap-2">
              {[
                { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                { id: "board", label: "Pipeline Board", icon: LayoutGrid },
                { id: "table", label: "Leads Table", icon: TableIcon },
                { id: "sprint", label: "Evening Sprint", icon: Zap },
                { id: "autopilot", label: "Autopilot & Traces", icon: Activity },
                { id: "settings", label: "Hustle Settings", icon: Settings },
              ].map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as MainTab);
                      if (item.id === "board") setPipelineBoardExpanded(true);
                    }}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative group ${
                      active
                        ? "bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-lg shadow-slate-900/25 dark:shadow-indigo-600/35 scale-105"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                    }`}
                    title={item.label}
                  >
                    <Icon className="w-5 h-5" />
                    {active && (
                      <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-5 rounded-full bg-indigo-500" />
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="w-8 h-px bg-slate-200 dark:bg-white/[0.08]" />

            {/* Mini Autopilot Indicator */}
            <button
              onClick={() => setActiveTab("autopilot")}
              className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/50 flex items-center justify-center relative cursor-pointer hover:scale-105 transition-transform"
              title={`Autopilot Engine: ONLINE (${bufferHealthPct}% buffer health)`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </button>
          </aside>
        ) : (
          /* EXPANDED FULL SIDEBAR: Menu with File-Tree Smart Queues under Pipeline Board */
          <aside className="w-64 shrink-0 h-full border-r border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0F1117] backdrop-blur-md p-4 flex flex-col justify-between overflow-y-auto transition-all duration-200 z-20">
            <div className="space-y-6">
              {/* Main Navigation Menu */}
              <div>
                <div className="px-2 pb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <span>Menu</span>
                  <button
                    onClick={() => setSidebarCollapsed(true)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                    title="Collapse Sidebar"
                  >
                    <PanelLeftClose className="w-3.5 h-3.5" />
                  </button>
                </div>
                <nav className="space-y-1">
                  {[
                    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
                    { id: "board", label: "Pipeline Board", icon: LayoutGrid },
                    { id: "table", label: "Leads Table", icon: TableIcon },
                    { id: "sprint", label: "Evening Sprint", icon: Zap },
                    { id: "autopilot", label: "Autopilot & Traces", icon: Activity },
                    { id: "settings", label: "Hustle Settings", icon: Settings },
                  ].map((item) => {
                    const Icon = item.icon;
                    const active = activeTab === item.id;

                    // Specialized Subtree for Pipeline Board (File-Tree Structure with Smart Queues)
                    if (item.id === "board") {
                      return (
                        <div key="board" className="space-y-1">
                          <button
                            onClick={() => {
                              setActiveTab("board");
                              setPipelineBoardExpanded((prev) => (activeTab === "board" ? !prev : true));
                            }}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                              active
                                ? "bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-md shadow-slate-900/20 dark:shadow-indigo-600/30"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className="w-4 h-4" />
                              <span>{item.label}</span>
                            </div>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setPipelineBoardExpanded(!pipelineBoardExpanded);
                              }}
                              className="p-1 rounded-md hover:bg-white/10 transition-colors"
                            >
                              {pipelineBoardExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                              )}
                            </div>
                          </button>

                          {/* Dragdown Subpart: File Structure of Smart Queues */}
                          {pipelineBoardExpanded && (
                            <div className="ml-5 pl-3 border-l-2 border-slate-200 dark:border-white/[0.1] space-y-0.5 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                              {[
                                { slug: "all_active", label: "All Active Pipeline", icon: LayoutGrid, color: "text-indigo-500" },
                                { slug: "review_tray", label: "Review Tray (Ready)", icon: CheckCircle2, color: "text-emerald-500" },
                                { slug: "due_today", label: "Due Today & Overdue", icon: Clock, color: "text-amber-500" },
                                { slug: "hot_intent", label: "Hot Demo Viewers", icon: Flame, color: "text-rose-500" },
                                { slug: "replied_warm", label: "Active Replies", icon: MessageSquare, color: "text-blue-500" },
                                { slug: "archived", label: "Archived & DNC", icon: Archive, color: "text-slate-400" },
                              ].map((v) => {
                                const SubIcon = v.icon;
                                const isSubActive = activeTab === "board" && activeSmartView === v.slug;
                                return (
                                  <button
                                    key={v.slug}
                                    onClick={() => {
                                      setActiveSmartView(v.slug);
                                      setActiveTab("board");
                                    }}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer relative group ${
                                      isSubActive
                                        ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-500/30"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                          isSubActive ? "bg-indigo-500 scale-125" : "bg-slate-300 dark:bg-slate-600"
                                        }`}
                                      />
                                      <SubIcon className={`w-3.5 h-3.5 ${v.color} shrink-0`} />
                                      <span className="truncate">{v.label}</span>
                                    </div>
                                    {isSubActive && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as MainTab)}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                          active
                            ? "bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-md shadow-slate-900/20 dark:shadow-indigo-600/30"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Autopilot Status Card in Sidebar (CustomerGo "Unlock More Feature" card style) */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-[#12141D] border border-indigo-100 dark:border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Autopilot Engine</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">ONLINE</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                7-step verification active. Enforcing no-website and 2-source check.
              </p>
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${bufferHealthPct}%` }}></div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                <span>Stock Buffer</span>
                <span className="font-mono">{bufferHealthPct}% full</span>
              </div>
            </div>
          </aside>
        )}

        {/* Center Workspace Content */}
        <main className="flex-1 h-full overflow-y-auto p-6 space-y-6 min-w-0">
          {loading ? (
            <div className="p-16 text-center text-sm text-slate-500 dark:text-slate-400">Loading Personal OS CRM...</div>
          ) : (
            <>
              {/* ======================================================== */}
              {/* TAB 0: HOMIES LAB DEDICATED DASHBOARD OVERVIEW           */}
              {/* ======================================================== */}
              {activeTab === "dashboard" && (
                <div className="space-y-6">
                  {/* Dashboard Header: Greeting, Date, Day Mode Switcher & Quick Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-slate-400 dark:text-slate-500">Home / Dashboard</div>
                      <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <span>{greeting}</span>
                      </h1>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formattedDate} • Side Hustle Autopilot & Command Center
                      </p>
                    </div>

                    {/* Controls relocated from top bar: Day Mode Switcher & Tools */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/[0.08] rounded-2xl p-1 text-xs shadow-sm">
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
                          >
                            {m}
                          </button>
                        ))}
                      </div>

                      <a
                        href={`${API_BASE}/api/leads/export/csv?hustle_id=${activeHustleId}`}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                        title="Export CRM data to CSV"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-400" />
                        <span>Export CSV</span>
                      </a>

                      <button
                        onClick={() => {
                          setProblemBriefResult("");
                          setProblemModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/50 text-xs font-semibold text-rose-700 dark:text-rose-300 transition-colors shadow-sm cursor-pointer"
                        title="Capture run trace & diagnostic brief"
                      >
                        <Bug className="w-3.5 h-3.5 text-rose-500" />
                        <span>Report Problem</span>
                      </button>
                    </div>
                  </div>

                  {/* Top Stats Overview (Homies Lab Exact Layout: 4 Stat Blocks + Large Circular Gauge) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Stat 1: Active Leads */}
                    <div className="p-5 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-card space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-semibold uppercase tracking-wider">Active Leads</span>
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                          <Building className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-3xl font-black text-slate-900 dark:text-white pt-1">{leads.length}</div>
                      <div className="text-[11px] text-slate-400">Clinics currently in pipeline</div>
                    </div>

                    {/* Stat 2: Pipeline Target Value */}
                    <div className="p-5 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-card space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-semibold uppercase tracking-wider">Pipeline Value</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 pt-1">
                        ₹{(leads.length * 25).toLocaleString()},000
                      </div>
                      <div className="text-[11px] text-slate-400">Estimated close potential</div>
                    </div>

                    {/* Stat 3: WhatsApp Sent Today */}
                    <div className="p-5 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-card space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-semibold uppercase tracking-wider">WA Outreach</span>
                        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                          <Send className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-3xl font-black text-slate-900 dark:text-white pt-1">
                        {waSentToday} <span className="text-base font-normal text-slate-400">/ {waDailyLimit}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">Daily channel safety limit</div>
                    </div>

                    {/* Stat 4: Proof Packages Ready */}
                    <div className="p-5 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-card space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-xs font-semibold uppercase tracking-wider">Ready Demos</span>
                        <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                          <Eye className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-3xl font-black text-slate-900 dark:text-white pt-1">
                        {stockPlan?.current_ready_packages ?? 0}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {stockPlan?.effective_buffer_days ?? 3}-day buffer active
                      </div>
                    </div>

                    {/* Stat 5: Homies Lab Big Circular Meter */}
                    <div className="p-5 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-card flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Buffer Health</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">{bufferHealthPct}%</div>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Stock Protected</div>
                      </div>

                      {/* Homies Lab Circular Meter SVG */}
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
                            className="text-amber-500 dark:text-amber-400"
                            strokeDasharray={`${bufferHealthPct}, 100`}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <div className="absolute text-center">
                          <span className="text-[10px] font-black font-mono text-slate-800 dark:text-white">KPI</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Middle Section: Homies Lab Schedule Card + Autopilot & Outreach Velocity */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Homies Lab Schedule Card with Filter Tabs & Warm Highlight */}
                    <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-card space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Clock className="w-4 h-4 text-indigo-500" />
                            <span>Outreach Schedule & Action Queue</span>
                          </h2>
                          <p className="text-xs text-slate-400">Pipedrive mandatory next steps ordered by urgency</p>
                        </div>

                        {/* Filter Tabs (Homies Lab style: Meetings, Tasks, Events) */}
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

                      {/* Featured Urgent Lead (Homies Lab Warm Highlight Card) */}
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
                              <span className="text-slate-400 font-mono text-[11px]">Fit Score: {dashboardScheduleLeads[0].fit_score}%</span>
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
                        {dashboardScheduleLeads.slice(1).map((lead) => (
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

                    {/* Right: Autopilot Performance & Channel Limits (Homies Lab KPI Card) */}
                    <div className="p-6 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-card flex flex-col justify-between space-y-5">
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Activity className="w-4 h-4 text-indigo-500" />
                            <span>Channel Safety & Autopilot</span>
                          </h3>
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">SAFE</span>
                        </div>

                        {/* Channel Send Bars */}
                        <div className="space-y-3.5 pt-4">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">WhatsApp Dispatch</span>
                              <span className="font-mono text-slate-500 dark:text-slate-400">
                                {waSentToday} / {waDailyLimit}
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-2 rounded-full"
                                style={{ width: `${Math.min(100, (waSentToday / waDailyLimit) * 100)}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">Instagram Outreach</span>
                              <span className="font-mono text-slate-500 dark:text-slate-400">0 / 20</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div className="bg-pink-500 h-2 rounded-full" style={{ width: `0%` }}></div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">Email Warmups</span>
                              <span className="font-mono text-slate-500 dark:text-slate-400">0 / 50</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `0%` }}></div>
                            </div>
                          </div>
                        </div>

                        {/* 7-Step Gate Indicators */}
                        <div className="pt-5 space-y-2">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Enforced Invariants</div>
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
                      </div>

                      {/* Autopilot Quick Triggers */}
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

                  {/* Bottom: Homies Lab "List Employee" Style Table for Active Clinics */}
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
              )}

              {/* ======================================================== */}
              {/* TAB 1: PIPELINE KANBAN BOARD (CustomerGo Exact Aesthetic)*/}
              {/* ======================================================== */}
              {activeTab === "board" && activeHustle && (
                <div className="space-y-4">
                  {/* Top Bar with Filter, Sort and Pipeline Stats */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/90 dark:border-white/[0.08] backdrop-blur-xl shadow-xs relative">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-600/15 border border-indigo-200 dark:border-indigo-500/30 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>Pipeline Overview</span>
                      </div>

                      {/* Interactive Filter Button & Popover */}
                      <div className="relative">
                        <button
                          onClick={() => {
                            setFilterPopoverOpen(!filterPopoverOpen);
                            setSortPopoverOpen(false);
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                            filterPopoverOpen || filterMinFit > 0 || filterVerifiedOnly
                              ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-700 border-slate-200 dark:border-white/[0.06] text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span>Filter</span>
                          {(filterMinFit > 0 || filterVerifiedOnly) && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          )}
                        </button>

                        {filterPopoverOpen && (
                          <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.12] shadow-2xl p-4 z-40 space-y-3.5 animate-in fade-in zoom-in-95">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">Quick Filters</span>
                              <button
                                onClick={() => {
                                  setFilterMinFit(0);
                                  setFilterVerifiedOnly(false);
                                }}
                                className="text-[10px] text-slate-400 hover:text-indigo-500 cursor-pointer"
                              >
                                Reset
                              </button>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                Minimum AI Fit Score: {filterMinFit}%
                              </label>
                              <input
                                type="range"
                                min="0"
                                max="90"
                                step="10"
                                value={filterMinFit}
                                onChange={(e) => setFilterMinFit(Number(e.target.value))}
                                className="w-full accent-indigo-600 cursor-pointer"
                              />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                              <input
                                type="checkbox"
                                checked={filterVerifiedOnly}
                                onChange={(e) => setFilterVerifiedOnly(e.target.checked)}
                                className="rounded accent-indigo-600 cursor-pointer"
                              />
                              <span>Only show 2-source verified leads</span>
                            </label>
                          </div>
                        )}
                      </div>

                      {/* Interactive Sort Button & CustomerGo Floating Sort Popover */}
                      <div className="relative">
                        <button
                          onClick={() => {
                            setSortPopoverOpen(!sortPopoverOpen);
                            setFilterPopoverOpen(false);
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                            sortPopoverOpen
                              ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-700 border-slate-200 dark:border-white/[0.06] text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <ArrowUpDown className="w-3.5 h-3.5" />
                          <span>Sort</span>
                        </button>

                        {sortPopoverOpen && (
                          <div className="absolute left-0 mt-2 w-80 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.12] shadow-2xl p-4 z-40 space-y-3.5 animate-in fade-in zoom-in-95">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
                              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span>Sort Options</span>
                                <span className="text-[10px] font-normal text-slate-400">(CustomerGo style)</span>
                              </div>
                              <button onClick={() => setSortPopoverOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-white/[0.06]">
                                <div className="text-slate-400 text-xs font-mono">::</div>
                                <select
                                  value={sortBy}
                                  onChange={(e) => setSortBy(e.target.value as any)}
                                  className="flex-1 bg-transparent text-xs font-medium text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                                >
                                  <option value="fit" className="bg-white dark:bg-[#141721] text-slate-800 dark:text-white">AI Fit Score</option>
                                  <option value="intent" className="bg-white dark:bg-[#141721] text-slate-800 dark:text-white">Buyer Intent Score</option>
                                  <option value="deal" className="bg-white dark:bg-[#141721] text-slate-800 dark:text-white">Projected Deal Value</option>
                                  <option value="name" className="bg-white dark:bg-[#141721] text-slate-800 dark:text-white">Clinic / Lead Name</option>
                                  <option value="due" className="bg-white dark:bg-[#141721] text-slate-800 dark:text-white">Next Action Due Date</option>
                                </select>
                                <select
                                  value={sortOrder}
                                  onChange={(e) => setSortOrder(e.target.value as any)}
                                  className="bg-transparent text-xs font-semibold text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer"
                                >
                                  <option value="desc" className="bg-white dark:bg-[#141721] text-slate-800 dark:text-white">Descending ↓</option>
                                  <option value="asc" className="bg-white dark:bg-[#141721] text-slate-800 dark:text-white">Ascending ↑</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>Total In View: <strong className="text-slate-900 dark:text-white font-mono">{leads.length}</strong></span>
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                      <span>Target Value: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">₹{leads.length * 25},000</strong></span>
                    </div>
                  </div>

                  {/* Kanban Columns */}
                  <div className="flex gap-4 overflow-x-auto pb-6">
                    {activeHustle.stages.map((stage, sIdx) => {
                      const stageLeads = leads.filter((l) => l.stage_id === stage.id);
                      const filteredLeads = stageLeads
                        .filter((l) => (filterMinFit > 0 ? l.fit_score >= filterMinFit : true))
                        .filter((l) => (filterVerifiedOnly ? l.facts?.some((f) => f.verified_by_two_sources) : true))
                        .sort((a, b) => {
                          if (sortBy === "fit") return sortOrder === "asc" ? a.fit_score - b.fit_score : b.fit_score - a.fit_score;
                          if (sortBy === "intent") return sortOrder === "asc" ? a.intent_score - b.intent_score : b.intent_score - a.intent_score;
                          if (sortBy === "deal") return sortOrder === "asc" ? (a.deal_value_inr || 25000) - (b.deal_value_inr || 25000) : (b.deal_value_inr || 25000) - (a.deal_value_inr || 25000);
                          if (sortBy === "name") return sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
                          if (sortBy === "due") {
                            const dA = a.next_action_due_at ? new Date(a.next_action_due_at).getTime() : 0;
                            const dB = b.next_action_due_at ? new Date(b.next_action_due_at).getTime() : 0;
                            return sortOrder === "asc" ? dA - dB : dB - dA;
                          }
                          return 0;
                        });

                      const stageColors = [
                        "bg-indigo-500 text-indigo-500",
                        "bg-amber-500 text-amber-500",
                        "bg-emerald-500 text-emerald-500",
                        "bg-blue-500 text-blue-500",
                        "bg-purple-500 text-purple-500",
                        "bg-rose-500 text-rose-500",
                      ];
                      const dotColor = stageColors[sIdx % stageColors.length];

                      return (
                        <div
                          key={stage.id}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            if (dragOverStageId !== stage.id) {
                              setDragOverStageId(stage.id);
                            }
                          }}
                          onDragLeave={(e) => {
                            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                            setDragOverStageId(null);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragOverStageId(null);
                            const leadIdStr = e.dataTransfer.getData("text/plain");
                            const leadId = Number(leadIdStr) || draggingLeadId;
                            if (!leadId) return;
                            const targetLead = leads.find((l) => l.id === leadId);
                            if (targetLead && targetLead.stage_id !== stage.id) {
                              handleStageChange(targetLead, stage.id);
                            }
                          }}
                          className={`w-80 shrink-0 rounded-2xl backdrop-blur-xl border flex flex-col max-h-[calc(100vh-210px)] shadow-xs transition-all ${
                            dragOverStageId === stage.id
                              ? "bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/40 shadow-md"
                              : "bg-slate-100/70 dark:bg-[#0E1017] border-slate-200/80 dark:border-white/[0.06]"
                          }`}
                        >
                          {/* Column Header (CustomerGo Style) */}
                          <div className="p-3.5 border-b border-slate-200/80 dark:border-white/[0.06] bg-white/60 dark:bg-[#12141D] flex items-center justify-between rounded-t-2xl">
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${dotColor.split(' ')[0]}`}></span>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-wide">{stage.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08]">
                                {filteredLeads.length}
                              </span>
                              <button
                                onClick={() => setNewLeadModalOpen(true)}
                                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                                title="Add lead to this stage"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Column Cards Container */}
                          <div className="p-3 space-y-3 overflow-y-auto flex-1">
                            {filteredLeads.length === 0 ? (
                              <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-slate-200/60 dark:bg-slate-800/40 flex items-center justify-center border border-slate-300/40 dark:border-white/[0.04]">
                                  <Plus className="w-4 h-4 text-slate-400" />
                                </div>
                                <span>No leads in this stage</span>
                              </div>
                            ) : (
                              filteredLeads.map((lead) => {
                                const isSelected = selectedLeadId === lead.id;
                                const stars = Math.min(5, Math.max(1, Math.round(lead.fit_score / 20)));

                                return (
                                  <div
                                    key={lead.id}
                                    draggable
                                    onDragStart={(e) => {
                                      setDraggingLeadId(lead.id);
                                      e.dataTransfer.setData("text/plain", String(lead.id));
                                      e.dataTransfer.effectAllowed = "move";
                                    }}
                                    onDragEnd={() => {
                                      setDraggingLeadId(null);
                                      setDragOverStageId(null);
                                    }}
                                    onClick={() => {
                                      if (!draggingLeadId) setSelectedLeadId(lead.id);
                                    }}
                                    className={`p-4 rounded-2xl border transition-all duration-200 cursor-grab active:cursor-grabbing space-y-3 group ${
                                      draggingLeadId === lead.id
                                        ? "border-2 border-dashed border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 opacity-60 scale-95 shadow-none"
                                        : isSelected
                                        ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 shadow-md ring-2 ring-indigo-500/40"
                                        : "bg-white dark:bg-[#181B26] hover:bg-slate-50/90 dark:hover:bg-[#1F2332] border-slate-200/90 dark:border-white/[0.08] hover:border-indigo-400 dark:hover:border-indigo-500/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-card hover:-translate-y-0.5"
                                    }`}
                                  >
                                    {/* Lead Header & Estimated Deal Value */}
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-start gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center font-bold text-xs text-indigo-600 dark:text-indigo-400 shrink-0">
                                          {lead.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="space-y-0.5">
                                          <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">
                                            {lead.name}
                                          </div>
                                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                            <span className="truncate max-w-[150px]">{lead.locality || lead.city}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 rounded-lg">
                                          ₹{lead.deal_value_inr || 25000}
                                        </div>
                                      </div>
                                    </div>

                                    {/* CustomerGo Pastel Pill Tags */}
                                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 font-semibold">
                                        Dental Clinic
                                      </span>
                                      {lead.doctor_name && (
                                        <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20 font-medium truncate max-w-[120px]">
                                          {lead.doctor_name}
                                        </span>
                                      )}
                                      {lead.do_not_contact ? (
                                        <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20 font-bold">
                                          DNC
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-medium">
                                          Verified
                                        </span>
                                      )}
                                    </div>

                                    {/* 5-Star Rating & Fit Score */}
                                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/[0.04]">
                                      <div className="flex items-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                          <Star
                                            key={s}
                                            className={`w-3 h-3 ${
                                              s <= stars
                                                ? "text-amber-400 fill-amber-400"
                                                : "text-slate-300 dark:text-slate-700"
                                            }`}
                                          />
                                        ))}
                                      </div>
                                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                        Fit: <strong className="text-slate-800 dark:text-slate-200">{lead.fit_score}%</strong>
                                      </span>
                                    </div>

                                    {/* Next Action Box */}
                                    {lead.next_action && (
                                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#10121A] border border-slate-200/80 dark:border-white/[0.06] text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                                        <div className="leading-relaxed">
                                          <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Next: </span>
                                          {lead.next_action}
                                        </div>
                                      </div>
                                    )}

                                    {/* Card Footer: Metadata Counters (like CustomerGo's [2] [2] [2]) */}
                                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 dark:text-slate-500">
                                      <div className="flex items-center gap-3">
                                        <span className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-300">
                                          <MessageSquare className="w-3 h-3" />
                                          <span>{lead.messages?.length || 0}</span>
                                        </span>
                                        <span className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-300">
                                          <Eye className="w-3 h-3" />
                                          <span>{((lead as any).demo_views_count ?? lead.events?.length ?? 0)}</span>
                                        </span>
                                        <span className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-300">
                                          <ShieldCheck className="w-3 h-3" />
                                          <span>{lead.facts?.length || 0}</span>
                                        </span>
                                      </div>
                                      {lead.next_action_due_at && (
                                        <span className="flex items-center gap-1 font-mono text-[10px]">
                                          <Calendar className="w-3 h-3 text-slate-400" />
                                          <span>{new Date(lead.next_action_due_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                                        </span>
                                      )}
                                    </div>

                                    {/* Quick Review Tray Approve Button if in package_ready */}
                                    {stage.slug === "package_ready" && !lead.do_not_contact && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleApproveAndSend(lead);
                                        }}
                                        className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer"
                                      >
                                        <Send className="w-3.5 h-3.5" />
                                        <span>Approve & Send Pitch</span>
                                      </button>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 2: FAST LEADS TABLE (Homies Lab Employee Table Style) */}
              {/* ======================================================== */}
              {activeTab === "table" && (
                <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0E1017] overflow-hidden shadow-xs transition-colors">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-[#12141D] text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                        <th className="py-3.5 px-4">Clinic & Doctor</th>
                        <th className="py-3.5 px-3">Locality & City</th>
                        <th className="py-3.5 px-3">Contacts</th>
                        <th className="py-3.5 px-3">Fit & Intent</th>
                        <th className="py-3.5 px-3">Mandatory Next Step</th>
                        <th className="py-3.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                      {leads.map((lead) => (
                        <tr
                          key={lead.id}
                          onClick={() => setSelectedLeadId(lead.id)}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                {lead.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white">{lead.name}</div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">{lead.doctor_name || "Doctor"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>{lead.locality || lead.city}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 space-y-0.5 text-[11px]">
                            {lead.primary_phone && (
                              <div className="text-slate-700 dark:text-slate-300 font-mono">{lead.primary_phone}</div>
                            )}
                            {lead.instagram_handle && (
                              <div className="text-pink-600 dark:text-pink-400">@{lead.instagram_handle}</div>
                            )}
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
                          <td className="py-3.5 px-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLeadId(lead.id);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer transition-colors"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 3: EVENING SPRINT PLANNER (Homies Lab KPI Gauges)    */}
              {/* ======================================================== */}
              {activeTab === "sprint" && sprintPlan && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.08] shadow-xs flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Time Budget Allocated</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                          {sprintPlan.allocated_minutes} / {sprintPlan.budget_minutes} mins
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">Ranked by EV / minute</div>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Zap className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="p-5 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.08] shadow-xs flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Expected Pipeline Value</div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                          ₹{sprintPlan.total_expected_value_inr.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">Probability-weighted yield</div>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="p-5 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.08] shadow-xs flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">High-Priority Tasks</div>
                        <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                          {sprintPlan.tasks.length} clinics
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">Replies &gt; Hot Viewers &gt; Review Tray</div>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Flame className="w-6 h-6" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {sprintPlan.tasks.map((t, idx) => (
                      <div
                        key={t.lead_id}
                        onClick={() => setSelectedLeadId(t.lead_id)}
                        className="p-4 rounded-2xl bg-white dark:bg-[#141721] hover:bg-slate-50 dark:hover:bg-slate-800/70 border border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-4 cursor-pointer transition-all shadow-xs"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                            #{idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900 dark:text-white">{t.lead_name}</span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">({t.doctor_name} • {t.locality})</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 font-semibold">
                                {t.action_type}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">Next Step: {t.next_action}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">~₹{t.expected_value_inr.toLocaleString()} EV</div>
                            <div className="text-[11px] text-slate-400">{t.estimated_minutes} mins • Score {t.priority_score}/m</div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 4: AUTOPILOT & RUN TRACES + TELEGRAM CONSOLE         */}
              {/* ======================================================== */}
              {activeTab === "autopilot" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="p-5 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.08] shadow-xs flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                            7-Step Clinic Autopilot &amp; 4-Tier Lead Discovery Waterfall
                          </h2>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-semibold">
                            Strict DB Dedup Active
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold">
                            IG Discovery: OFF (Dental Rule)
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Tier 1: Google Places API &rarr; Tier 2: Serper Maps &rarr; Tier 3: Brave Search &rarr; Tier 4: Playwright Maps &bull; No-Website Filter &bull; 3 Live Demos &bull; Sync batch.json
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={handleSyncBatchLinks}
                          className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/30 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Verify Links &amp; Sync batch.json</span>
                        </button>
                        <button
                          onClick={handleTriggerRefill}
                          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Run Refill Batch Now</span>
                        </button>
                      </div>
                    </div>

                    {/* Phase 3 Specialized Sub-Agents Control Deck (Scout -> Auditor -> Closer) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {/* 1. Scout Agent */}
                      <div className="p-4 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.08] shadow-xs flex flex-col justify-between space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">1. Scout Agent</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                              4-Tier Maps + Dossier
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            Finds new no-website clinics via 4-Tier Waterfall (Places &rarr; Serper &rarr; Brave &rarr; Playwright), skips existing DB leads &amp; enriches Doctor/Email.
                          </p>
                        </div>
                        <button
                          onClick={handleRunScout}
                          className="w-full py-2 px-3 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Run Scout Agent
                        </button>
                      </div>

                      {/* 2. Auditor Agent */}
                      <div className="p-4 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.08] shadow-xs flex flex-col justify-between space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">2. Auditor Agent</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                              QA + Video Recorder
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            Verifies HTTP 200 across all 4 demo routes, syncs batch.json, and links MP4 walkthroughs.
                          </p>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleRunAuditor(false)}
                            className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold cursor-pointer transition-colors"
                          >
                            Audit &amp; Link MP4
                          </button>
                          <button
                            onClick={() => handleRunAuditor(true)}
                            className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                            title="Run Playwright record-batch.mjs on 1 verified clinic"
                          >
                            Record 1
                          </button>
                        </div>
                      </div>

                      {/* 3. Closer Agent */}
                      <div className="p-4 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.08] shadow-xs flex flex-col justify-between space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">3. Closer Agent</span>
                            <button
                              type="button"
                              onClick={() => setCloserDryRun((prev) => !prev)}
                              className={`text-[10px] font-mono px-2 py-0.5 rounded border cursor-pointer transition-colors ${
                                closerDryRun
                                  ? "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30"
                                  : "bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/40 font-bold"
                              }`}
                              title="Toggle between Dry-Run Safe Preview and LIVE Send"
                            >
                              {closerDryRun ? "Mode: DRY-RUN" : "Mode: LIVE SEND"}
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            Feeds CRM Outbox to wa_autopilot.mjs, ig_autopilot.mjs &amp; email_autopilot.py + drafts hot follow-ups.
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            onClick={() => handleRunCloser("whatsapp", closerDryRun)}
                            className="py-2 px-2 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold cursor-pointer"
                            title="Run wa_autopilot.mjs against CRM Outbox"
                          >
                            {closerDryRun ? "WA Dry" : "WA Live"}
                          </button>
                          <button
                            onClick={() => handleRunCloser("instagram", closerDryRun)}
                            className="py-2 px-2 rounded-xl bg-pink-600/15 hover:bg-pink-600/25 border border-pink-500/30 text-pink-700 dark:text-pink-300 text-[11px] font-semibold cursor-pointer"
                            title="Run ig_autopilot.mjs against CRM Outbox"
                          >
                            {closerDryRun ? "IG Dry" : "IG Live"}
                          </button>
                          <button
                            onClick={() => handleRunCloser("email", closerDryRun)}
                            className="py-2 px-2 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-700 dark:text-blue-300 text-[11px] font-semibold cursor-pointer"
                            title="Run email_autopilot.py against CRM Outbox"
                          >
                            {closerDryRun ? "Mail Dry" : "Mail Live"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Unified Live Execution Terminal (Refill Batch + Verify Links + Scout + Auditor + Closer) */}
                    <div className="rounded-3xl bg-[#0B0D14] border border-slate-800/90 shadow-xl overflow-hidden">
                      <div className="px-4 py-3 bg-[#121521] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                          </div>
                          <div className="flex items-center gap-2 pl-1">
                            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-xs font-bold font-mono text-slate-100 tracking-wide">
                              Live Execution Terminal
                            </span>
                          </div>
                          {activeTerminalJob ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              RUNNING: {activeTerminalJob}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono text-slate-400 bg-slate-800/70 border border-slate-700/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              STREAM READY ({terminalLogs.length} lines)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCopyLast20Logs}
                            className="px-2.5 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-[11px] font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Copy the last 20 log lines from this terminal"
                          >
                            {copiedLast20 ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-300">Copied Last 20!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Last 20 Logs</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setTerminalLogs([
                                `[${new Date().toLocaleTimeString()}] [SYSTEM] Terminal cleared. Ready for next Refill Batch or Sub-Agent run...`,
                              ])
                            }
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 text-[11px] font-mono transition-colors cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      <div
                        ref={terminalContainerRef}
                        className="p-4 h-72 overflow-y-auto font-mono text-xs leading-relaxed space-y-1.5 select-text"
                      >
                        {terminalLogs.map((line, idx) => {
                          const isError = line.includes("[ERROR]") || line.includes("[HTTP FAIL]") || line.includes("[DROP]");
                          const isSkip = line.includes("[SKIP]");
                          const isScout = line.includes("[1.SCOUT-AGENT]") || line.includes("[SCOUT]");
                          const isAuditor = line.includes("[2.AUDITOR-AGENT]") || line.includes("[AUDITOR]") || line.includes("[HTTP 200 OK]");
                          const isCloser = line.includes("[3.CLOSER") || line.includes("[CLOSER]");
                          const isRefill = line.includes("[REFILL-BATCH]") || line.includes("[VERIFY-LINKS]");

                          let textColor = "text-slate-300";
                          if (isError) textColor = "text-rose-400";
                          else if (isSkip) textColor = "text-amber-300/90";
                          else if (isAuditor) textColor = "text-emerald-300";
                          else if (isScout) textColor = "text-indigo-300";
                          else if (isCloser) textColor = "text-cyan-300";
                          else if (isRefill) textColor = "text-emerald-400";

                          return (
                            <div key={idx} className={`${textColor} break-words whitespace-pre-wrap`}>
                              <span className="text-slate-600 select-none mr-2">
                                {String(idx + 1).padStart(2, "0")}
                              </span>
                              {line}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Structured Latest Run Result + Option to Expand Previous Runs */}
                    {runs.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                              Latest Run Result (Structured Report)
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              (Showing latest 1 of {runs.length} runs)
                            </span>
                          </div>
                          {runs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setShowPreviousRuns((prev) => !prev)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <span>
                                {showPreviousRuns
                                  ? "Hide Previous Runs"
                                  : `Show Previous Runs (${runs.length - 1})`}
                              </span>
                              {showPreviousRuns ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Latest Run Card (runs[0]) */}
                        {[runs[0]].map((r) => {
                          const struct = r.drop_reasons?._structured;
                          const builtLeads = struct?.built_leads || [];
                          const droppedItems = struct?.dropped_items || [];
                          const tiersUsed = struct?.tiers_used || [];
                          const dropCounts = Object.entries(r.drop_reasons || {}).filter(
                            ([k, v]) => k !== "_structured" && typeof v === "number"
                          ) as Array<[string, number]>;

                          return (
                            <div
                              key={r.id}
                              className="p-4 rounded-2xl bg-white dark:bg-[#141721] border border-indigo-200/80 dark:border-indigo-500/30 shadow-xs space-y-3.5"
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold uppercase tracking-wider">
                                    Latest
                                  </span>
                                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                                    Run #{r.id}: {r.job_type}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-semibold font-mono">
                                    {r.status}
                                  </span>
                                  {tiersUsed.map((t, i) => (
                                    <span
                                      key={i}
                                      className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 font-mono"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                                <div className="flex items-center gap-2">
                                  {r.trace_logs && r.trace_logs.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        appendTerminalLines([
                                          `--- Loaded Trace Logs from Run #${r.id} (${r.job_type}) ---`,
                                          ...(r.trace_logs || []),
                                        ])
                                      }
                                      className="text-[10px] font-mono px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                                    >
                                      Replay in Terminal
                                    </button>
                                  )}
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    {new Date(r.started_at).toLocaleTimeString()}
                                  </span>
                                </div>
                              </div>

                              {/* Summary KPI Grid */}
                              <div className="text-xs text-slate-600 dark:text-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/[0.04]">
                                  <div className="text-[10px] text-slate-400">Candidates Scanned</div>
                                  <div className="font-bold font-mono text-slate-800 dark:text-white">{r.count_found}</div>
                                </div>
                                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/[0.04]">
                                  <div className="text-[10px] text-slate-400">Passed &amp; Built</div>
                                  <div className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{r.count_passed}</div>
                                </div>
                                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/[0.04]">
                                  <div className="text-[10px] text-slate-400">Filtered / Deduped</div>
                                  <div className="font-bold font-mono text-amber-600 dark:text-amber-400">{r.count_dropped}</div>
                                </div>
                                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/[0.04]">
                                  <div className="text-[10px] text-slate-400">Duration</div>
                                  <div className="font-bold font-mono text-slate-800 dark:text-white">
                                    {r.finished_at
                                      ? `${Math.max(1, Math.round((new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000))}s`
                                      : "active"}
                                  </div>
                                </div>
                              </div>

                              {/* Structured Table of Built / Verified / Targeted Clinics */}
                              {builtLeads.length > 0 && (
                                <div className="space-y-1.5">
                                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                    <span>Structured Run Output ({builtLeads.length} Clinics Processed)</span>
                                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                                      100% Deduplicated vs. CRM Database
                                    </span>
                                  </div>
                                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/[0.08]">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-slate-50 dark:bg-[#10121A] text-[10px] uppercase text-slate-400 font-semibold border-b border-slate-200 dark:border-white/[0.06]">
                                        <tr>
                                          <th className="py-2 px-2.5">Clinic &amp; Doctor</th>
                                          <th className="py-2 px-2.5">Locality</th>
                                          <th className="py-2 px-2.5">Phone</th>
                                          <th className="py-2 px-2.5">Fit</th>
                                          <th className="py-2 px-2.5">Source / Status</th>
                                          <th className="py-2 px-2.5 text-right">Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                                        {builtLeads.map((item) => (
                                          <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02]">
                                            <td className="py-2 px-2.5">
                                              <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                                              <div className="text-[10px] text-slate-400">{item.doctor || "Doctor"}</div>
                                            </td>
                                            <td className="py-2 px-2.5 text-[11px] text-slate-600 dark:text-slate-300">
                                              {item.locality}
                                            </td>
                                            <td className="py-2 px-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                                              {item.phone || "-"}
                                            </td>
                                            <td className="py-2 px-2.5">
                                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold">
                                                {item.fit_score}/100
                                              </span>
                                            </td>
                                            <td className="py-2 px-2.5">
                                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                                                {item.source_tier}
                                              </span>
                                            </td>
                                            <td className="py-2 px-2.5 text-right space-x-1.5">
                                              {(item.choice_url || item.demo_url) && (
                                                <a
                                                  href={item.choice_url || item.demo_url}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold hover:bg-emerald-100"
                                                >
                                                  <span>/demo/{item.slug}</span>
                                                  <ExternalLink className="w-2.5 h-2.5" />
                                                </a>
                                              )}
                                              <button
                                                type="button"
                                                onClick={() => setSelectedLeadId(item.id)}
                                                className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[10px] font-semibold cursor-pointer hover:bg-slate-200"
                                              >
                                                Dossier
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* Structured Drop / Deduplication Breakdown */}
                              {(dropCounts.length > 0 || droppedItems.length > 0) && (
                                <div className="space-y-1.5 pt-1">
                                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                    <span>Filter &amp; Database Deduplication Gate Breakdown:</span>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {dropCounts.map(([reason, count]) => (
                                        <span
                                          key={reason}
                                          className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-500/20"
                                        >
                                          {reason}: {count}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  {droppedItems.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-28 overflow-y-auto pr-1">
                                      {droppedItems.map((d, i) => (
                                        <div
                                          key={i}
                                          className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#10121A] border border-slate-200/70 dark:border-white/[0.05] text-[11px] flex items-center justify-between gap-2"
                                        >
                                          <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                                            {d.name}
                                          </span>
                                          <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 shrink-0">
                                            {d.reason}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Collapsible Previous Runs List (runs.slice(1)) */}
                        {showPreviousRuns && runs.length > 1 && (
                          <div className="space-y-2.5 pt-1 max-h-96 overflow-y-auto pr-1">
                            {runs.slice(1).map((r) => {
                              const struct = r.drop_reasons?._structured;
                              const builtLeads = struct?.built_leads || [];
                              return (
                                <div
                                  key={r.id}
                                  className="p-3.5 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-2"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        Run #{r.id}: {r.job_type}
                                      </span>
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-semibold font-mono">
                                        {r.status}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {r.trace_logs && r.trace_logs.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            appendTerminalLines([
                                              `--- Loaded Trace Logs from Run #${r.id} (${r.job_type}) ---`,
                                              ...(r.trace_logs || []),
                                            ])
                                          }
                                          className="text-[10px] font-mono px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                                        >
                                          Replay in Terminal
                                        </button>
                                      )}
                                      <span className="text-[11px] text-slate-400 font-mono">
                                        {new Date(r.started_at).toLocaleTimeString()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-xs text-slate-600 dark:text-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                                    <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/[0.04]">
                                      <div className="text-[10px] text-slate-400">Found</div>
                                      <div className="font-bold font-mono text-slate-800 dark:text-white">{r.count_found}</div>
                                    </div>
                                    <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/[0.04]">
                                      <div className="text-[10px] text-slate-400">Passed</div>
                                      <div className="font-bold font-mono text-slate-800 dark:text-white">{r.count_passed}</div>
                                    </div>
                                    <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/[0.04]">
                                      <div className="text-[10px] text-slate-400">Dropped</div>
                                      <div className="font-bold font-mono text-amber-600 dark:text-amber-400">{r.count_dropped}</div>
                                    </div>
                                    <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/[0.04]">
                                      <div className="text-[10px] text-slate-400">Duration</div>
                                      <div className="font-bold font-mono text-slate-800 dark:text-white">
                                        {r.finished_at
                                          ? `${Math.max(1, Math.round((new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000))}s`
                                          : "active"}
                                      </div>
                                    </div>
                                  </div>
                                  {builtLeads.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                      {builtLeads.map((bl) => (
                                        <button
                                          key={bl.id}
                                          type="button"
                                          onClick={() => setSelectedLeadId(bl.id)}
                                          className="text-[10px] font-mono px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 cursor-pointer"
                                        >
                                          {bl.name} ({bl.locality}) &rarr;
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Telegram Remote CLI Simulator Console (Compact self-start height) */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-3.5 self-start h-fit">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-indigo-500" />
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Telegram Remote CLI Console
                      </h3>
                    </div>
                    <form onSubmit={handleTelegramCmdSubmit} className="space-y-2">
                      <input
                        type="text"
                        value={telegramCmd}
                        onChange={(e) => setTelegramCmd(e.target.value)}
                        placeholder="Try: /stock, /sprint, /today, /refill..."
                        className="w-full bg-slate-50 dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Simulate Telegram Command
                      </button>
                    </form>

                    {telegramReply && (
                      <div className="p-3 rounded-xl bg-slate-950 text-emerald-400 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                        {telegramReply}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 5: HUSTLE SETTINGS (Editable Autonomy & Waterfall)   */}
              {/* ======================================================== */}
              {activeTab === "settings" && activeHustle && (
                <div className="max-w-4xl space-y-5">
                  <form
                    onSubmit={handleSaveHustleSettings}
                    className="p-6 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.08] shadow-xs space-y-5"
                  >
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          Hustle Blueprint &amp; Autonomy Settings: {activeHustle.name}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {activeHustle.description}
                        </p>
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 cursor-pointer transition-all"
                      >
                        Save Hustle Settings
                      </button>
                    </div>

                    {/* 4-Tier Lead Discovery Waterfall Overview Card */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.06] space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Lead Discovery Waterfall Order (Strict Database Deduplication Enabled)
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                          Zero DB Re-Use Guarantee
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.06]">
                          <div className="text-[10px] font-mono text-indigo-500 font-bold">TIER 1 (PRIMARY)</div>
                          <div className="font-semibold text-slate-900 dark:text-white mt-0.5">Google Places API</div>
                          <div className="text-[10px] text-slate-400">Official Maps Search + No-Website Filter</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.06]">
                          <div className="text-[10px] font-mono text-blue-500 font-bold">TIER 2 (FALLBACK)</div>
                          <div className="font-semibold text-slate-900 dark:text-white mt-0.5">Serper Maps API</div>
                          <div className="text-[10px] text-slate-400">Used if Places quota is reached</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.06]">
                          <div className="text-[10px] font-mono text-amber-500 font-bold">TIER 3 (WEB)</div>
                          <div className="font-semibold text-slate-900 dark:text-white mt-0.5">Brave Search API</div>
                          <div className="text-[10px] text-slate-400">Directory &amp; Practo/Justdial cross-check</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.06]">
                          <div className="text-[10px] font-mono text-emerald-500 font-bold">TIER 4 (BROWSER)</div>
                          <div className="font-semibold text-slate-900 dark:text-white mt-0.5">Playwright Maps</div>
                          <div className="text-[10px] text-slate-400">Direct Maps scraper &amp; verified pool</div>
                        </div>
                      </div>
                    </div>

                    {/* Instagram Discovery Rule Toggle (Explicitly OFF for Dental Clinics, configurable for other CRM hustles) */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.06] flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>CRM Instagram Lead Discovery &amp; Research</span>
                          {(activeHustle.slug.includes("dental") ||
                            activeHustle.name.toLowerCase().includes("dental")) && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
                              Disabled for Dental Clinic Hustle
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Instagram research remains built into the CRM for other hustles, but is strictly turned OFF for finding Dental Clinic leads (which use the 4-tier Maps/Web waterfall above).
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settingsIgDiscovery}
                        disabled={
                          activeHustle.slug.includes("dental") ||
                          activeHustle.name.toLowerCase().includes("dental")
                        }
                        onChange={(e) => setSettingsIgDiscovery(e.target.checked)}
                        className="w-4 h-4 accent-indigo-600 cursor-pointer disabled:opacity-50"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1.5">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                          Autonomy Mode (Copilot vs. Autopilot)
                        </label>
                        <select
                          value={settingsAutonomy}
                          onChange={(e) => setSettingsAutonomy(e.target.value as "copilot" | "autopilot")}
                          className="w-full bg-slate-50 dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="copilot">Copilot (Human Review Tray before Send)</option>
                          <option value="autopilot">Autopilot (Auto-Dispatch within Daily Caps)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-semibold text-slate-700 dark:text-slate-300">
                          Default Discovery Search Query
                        </label>
                        <input
                          type="text"
                          value={settingsQuery}
                          onChange={(e) => setSettingsQuery(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-slate-500 dark:text-slate-400">Minimum Buffer Days</label>
                        <input
                          type="number"
                          min={1}
                          max={14}
                          value={settingsMinDays}
                          onChange={(e) => setSettingsMinDays(Number(e.target.value))}
                          className="w-full bg-slate-50 dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-500 dark:text-slate-400">Daily WhatsApp Cap</label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={settingsWaLimit}
                          onChange={(e) => setSettingsWaLimit(Number(e.target.value))}
                          className="w-full bg-slate-50 dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-500 dark:text-slate-400">Daily Instagram Cap</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={settingsIgLimit}
                          onChange={(e) => setSettingsIgLimit(Number(e.target.value))}
                          className="w-full bg-slate-50 dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-500 dark:text-slate-400">Daily Email Cap</label>
                        <input
                          type="number"
                          min={1}
                          max={200}
                          value={settingsEmailLimit}
                          onChange={(e) => setSettingsEmailLimit(Number(e.target.value))}
                          className="w-full bg-slate-50 dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </main>

        {/* ======================================================== */}
        {/* FLOATING LEAD DETAIL MODAL                               */}
        {/* ======================================================== */}
        {selectedLead && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-full max-w-5xl max-h-[92vh] bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.12] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
              
              {/* Modal Top Bar */}
              <div className="p-5 border-b border-slate-100 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#12141D] flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center font-bold text-base text-indigo-600 dark:text-indigo-400">
                      {selectedLead.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{selectedLead.name}</h2>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                          ₹{selectedLead.deal_value_inr || 25000} Potential
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 pt-0.5">
                        <span>{selectedLead.doctor_name || "Doctor"}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {selectedLead.locality}, {selectedLead.city}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Quick Contact Chips */}
                  <div className="flex items-center gap-2 pt-2 text-xs">
                    {selectedLead.primary_phone && (
                      <a
                        href={`https://wa.me/${selectedLead.primary_phone.replace("+", "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 transition-colors font-medium"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{selectedLead.primary_phone}</span>
                      </a>
                    )}
                    {selectedLead.instagram_handle && (
                      <a
                        href={`https://instagram.com/${selectedLead.instagram_handle}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-pink-50 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-500/30 hover:bg-pink-100 dark:hover:bg-pink-500/25 transition-colors font-medium"
                      >
                        <AtSign className="w-3.5 h-3.5" />
                        <span>{selectedLead.instagram_handle}</span>
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Pipeline Stage Dropdown */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/[0.08] shadow-xs">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Stage:</span>
                    <select
                      value={selectedLead.stage_id}
                      onChange={(e) => handleStageChange(selectedLead, Number(e.target.value))}
                      className="bg-transparent text-xs font-semibold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                    >
                      {activeHustle?.stages.map((st) => (
                        <option key={st.id} value={st.id} className="bg-white dark:bg-[#141721] text-slate-800 dark:text-white">
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => setSelectedLeadId(null)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body - 2 Spacious Columns */}
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-transparent">
                {/* Left Column: Intelligence, Facts & History */}
                <div className="space-y-4">
                  {/* AI Fit & Intent Match (Homies Lab Circular Gauge Style) */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-4 shadow-xs">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">AI Acquisition Intelligence</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Strong conversion probability. Verified absence of mobile-responsive website.
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                          Intent: {selectedLead.intent_score}/100
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                          {selectedLead.fit_reasons?.[0] || "Dental Engine Ready"}
                        </span>
                      </div>
                    </div>

                    {/* Circular Percentage Meter */}
                    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-200 dark:text-slate-800"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-indigo-600 dark:text-indigo-500"
                          strokeDasharray={`${selectedLead.fit_score}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <div className="text-xs font-black font-mono text-slate-900 dark:text-white leading-none">
                          {selectedLead.fit_score}%
                        </div>
                        <div className="text-[8px] text-slate-400 font-medium scale-90">FIT</div>
                      </div>
                    </div>
                  </div>

                  {/* Lightfield "What Changed Since Last Time" Summary */}
                  {selectedLead.what_changed_summary && (
                    <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 text-xs space-y-1.5 shadow-xs">
                      <div className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        <span>What Changed Since Last Time</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{selectedLead.what_changed_summary}</p>
                    </div>
                  )}

                  {/* Verified Facts Dossier */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.08] space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>Verified Research Dossier</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">2-Source Strict Rule</span>
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {selectedLead.facts.length === 0 ? (
                        <div className="text-[11px] text-slate-400">No verified facts recorded yet</div>
                      ) : (
                        selectedLead.facts.map((f) => (
                          <div key={f.id} className="p-2 rounded-xl bg-slate-50 dark:bg-[#12141D] border border-slate-100 dark:border-white/[0.04] text-xs flex items-center justify-between gap-2">
                            <div>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{f.field}: </span>
                              <span className="text-slate-600 dark:text-slate-400">{f.value}</span>
                            </div>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 shrink-0">
                              Verified
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Client Proof Package */}
                  {selectedLead.packages.length > 0 && (
                    <div className="p-4 rounded-2xl bg-white dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.08] space-y-3 shadow-xs">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                        <span className="flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Generated Client Proof Package</span>
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                          {selectedLead.packages[0].status} • HTTP 200
                        </span>
                      </div>
                      <a
                        href={selectedLead.packages[0].asset_links?.choice_page || `http://localhost:3001/demo/${selectedLead.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full p-2.5 rounded-xl bg-indigo-50/80 hover:bg-indigo-100/80 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition-colors"
                      >
                        <span>Open 3-Design Switcher (/demo/{selectedLead.slug})</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        {(["modern", "premium", "warm"] as const).map((tmpl) => (
                          <a
                            key={tmpl}
                            href={selectedLead.packages[0].asset_links?.[tmpl] || `http://localhost:3001/${tmpl}/${selectedLead.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#0E1017] dark:hover:bg-slate-800/70 border border-slate-200/80 dark:border-white/[0.06] space-y-1 transition-colors block"
                          >
                            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold capitalize flex items-center justify-center gap-1">
                              <span>{tmpl}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                            </div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Live 200</div>
                          </a>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Total Previews Viewed:</span>
                        <strong className="text-slate-900 dark:text-white font-mono">{((selectedLead as any).demo_views_count ?? selectedLead.events?.length ?? 0)} times</strong>
                      </div>
                    </div>
                  )}

                  {/* Activity History Timeline */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.08] space-y-3 shadow-xs">
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Activity Log & Messages</span>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedLead.messages.length === 0 ? (
                        <div className="text-[11px] text-slate-400 py-3 text-center">No messages logged yet</div>
                      ) : (
                        selectedLead.messages.map((m) => (
                          <div key={m.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#12141D] border border-slate-100 dark:border-white/[0.04] text-xs space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400 uppercase">{m.channel} • {m.direction}</span>
                              <span className="font-mono">{new Date(m.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-slate-800 dark:text-slate-200">{m.text}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Next Action Enforcement & Message Dispatch */}
                <div className="space-y-4">
                  {/* Pipedrive Mandatory Next Step Form */}
                  <form onSubmit={handleCompleteTask} className="p-4 rounded-2xl bg-white dark:bg-[#10121A] border border-indigo-200 dark:border-indigo-500/30 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Complete Task & Lock Next Step</span>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">Mandatory</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">What did you complete?</label>
                      <input
                        type="text"
                        value={completedNote}
                        onChange={(e) => setCompletedNote(e.target.value)}
                        placeholder="e.g. Sent personalized WhatsApp pitch with demo link"
                        className="w-full bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Mandatory Next Action</label>
                      <input
                        type="text"
                        value={nextActionInput}
                        onChange={(e) => setNextActionInput(e.target.value)}
                        placeholder="e.g. Follow up if no reply in 2 days"
                        className="w-full bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>Due in:</span>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={nextDueDays}
                          onChange={(e) => setNextDueDays(Number(e.target.value))}
                          className="w-14 bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white text-center font-mono"
                        />
                        <span>days</span>
                      </div>

                      <button
                        type="submit"
                        className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Complete & Schedule
                      </button>
                    </div>
                  </form>

                  {/* Log Note or Message */}
                  <form onSubmit={handleAppendMessage} className="p-4 rounded-2xl bg-white dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.08] space-y-3 shadow-xs">
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                      <span>Log Message or Internal Note</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <select
                        value={messageChannel}
                        onChange={(e) => setMessageChannel(e.target.value)}
                        className="bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
                      >
                        <option value="whatsapp">WhatsApp</option>
                        <option value="instagram">Instagram</option>
                        <option value="email">Email</option>
                        <option value="call">Phone Call</option>
                        <option value="internal_note">Internal Note</option>
                      </select>

                      <select
                        value={messageDirection}
                        onChange={(e) => setMessageDirection(e.target.value as any)}
                        className="bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
                      >
                        <option value="internal_note">Internal Note</option>
                        <option value="outbound">Outbound (Sent)</option>
                        <option value="inbound">Inbound (Received)</option>
                      </select>
                    </div>

                    <textarea
                      rows={3}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Type note or paste message text..."
                      className="w-full bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl p-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                    />

                    <button
                      type="submit"
                      className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Log Entry
                    </button>
                  </form>

                  {/* AI Reply Copilot Suggestions */}
                  {copilotSuggestions.length > 0 && (
                    <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 space-y-2.5 shadow-xs">
                      <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        <span>AI Reply Copilot Suggestions</span>
                      </div>
                      <div className="space-y-2">
                        {copilotSuggestions.map((sugg, idx) => (
                          <div
                            key={idx}
                            onClick={() => setMessageInput(sugg.text)}
                            className="p-2.5 rounded-xl bg-white dark:bg-[#141721] border border-indigo-100 dark:border-white/[0.06] text-xs space-y-1 cursor-pointer hover:border-indigo-400 transition-colors"
                          >
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400">{sugg.objection_label} ({sugg.wins} wins)</span>
                              <span>Click to apply</span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 italic">&ldquo;{sugg.text}&rdquo;</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Phase 4: 1-Tap Commitment / Snooze Confirmation */}
                  {selectedLead.commitments && selectedLead.commitments.length > 0 && (
                    <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 space-y-2.5 shadow-xs">
                      <div className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center justify-between">
                        <span>Detected Promises &amp; Commitments</span>
                        <span className="text-[10px] font-mono">1-Tap Lock</span>
                      </div>
                      <div className="space-y-2">
                        {selectedLead.commitments.map((c) => (
                          <div
                            key={c.id}
                            className="p-2.5 rounded-xl bg-white dark:bg-[#141721] border border-amber-200/70 dark:border-white/[0.06] text-xs flex items-center justify-between gap-2"
                          >
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">{c.what}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Due: {new Date(c.due_at).toLocaleDateString()} &bull; Status: {c.status}
                              </div>
                            </div>
                            {c.status !== "confirmed" ? (
                              <button
                                type="button"
                                onClick={() => handleConfirmCommitment(c.id)}
                                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-semibold cursor-pointer shrink-0"
                              >
                                Confirm 1-Tap
                              </button>
                            ) : (
                              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                                Confirmed
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Phase 4: Post-Call / Voice-Note Follow-Up Drafter */}
                  <form
                    onSubmit={handlePostCallDraft}
                    className="p-4 rounded-2xl bg-white dark:bg-[#10121A] border border-slate-200 dark:border-white/[0.08] space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Post-Call Follow-Up Drafter</span>
                      </div>
                      <select
                        value={callOutcomeInput}
                        onChange={(e) => setCallOutcomeInput(e.target.value)}
                        className="bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-lg px-2 py-1 text-[10px] text-slate-800 dark:text-slate-200"
                      >
                        <option value="interested">Outcome: Interested</option>
                        <option value="callback">Outcome: Call Later</option>
                        <option value="busy">Outcome: Busy / Reception</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      value={callNoteInput}
                      onChange={(e) => setCallNoteInput(e.target.value)}
                      placeholder="Quick call summary (e.g. Spoke to Dr., liked Design 2, send pricing on WA)..."
                      className="w-full bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={postCallLoading}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      {postCallLoading ? "Drafting..." : "Log Call, Lock Next Step & Draft WhatsApp"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Add New Lead Form */}
        {newLeadModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.12] rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add New Clinic Lead</h3>
                <button onClick={() => setNewLeadModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateLead} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 font-medium">Clinic Name *</label>
                  <input
                    type="text"
                    required
                    value={newLeadName}
                    onChange={(e) => setNewLeadName(e.target.value)}
                    placeholder="e.g. Apex Dental Studio"
                    className="w-full mt-1 bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 font-medium">Doctor Name</label>
                    <input
                      type="text"
                      value={newLeadDoctor}
                      onChange={(e) => setNewLeadDoctor(e.target.value)}
                      placeholder="Dr. Sharma"
                      className="w-full mt-1 bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 font-medium">Locality / City</label>
                    <input
                      type="text"
                      value={newLeadLocality}
                      onChange={(e) => setNewLeadLocality(e.target.value)}
                      placeholder="Indiranagar, BLR"
                      className="w-full mt-1 bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 font-medium">Primary Phone</label>
                    <input
                      type="text"
                      value={newLeadPhone}
                      onChange={(e) => setNewLeadPhone(e.target.value)}
                      placeholder="+91..."
                      className="w-full mt-1 bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 font-medium">Instagram Handle</label>
                    <input
                      type="text"
                      value={newLeadIg}
                      onChange={(e) => setNewLeadIg(e.target.value)}
                      placeholder="apexdental_blr"
                      className="w-full mt-1 bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-400 font-medium">Initial Mandatory Next Step</label>
                  <input
                    type="text"
                    value={newLeadNextAction}
                    onChange={(e) => setNewLeadNextAction(e.target.value)}
                    className="w-full mt-1 bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setNewLeadModalOpen(false)}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30 cursor-pointer"
                  >
                    Add to Pipeline
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Report Problem Brief */}
        {problemModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.12] rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bug className="w-4 h-4 text-rose-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Capture Diagnostic Problem Brief</h3>
                </div>
                <button onClick={() => setProblemModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!problemBriefResult ? (
                <form onSubmit={handleReportProblem} className="space-y-3 text-xs">
                  <p className="text-slate-600 dark:text-slate-400">
                    Describe what went wrong. The CRM will bundle recent run logs, failed gates, and telemetry into a structured Markdown brief ready for Antigravity IDE.
                  </p>
                  <textarea
                    rows={4}
                    required
                    value={problemText}
                    onChange={(e) => setProblemText(e.target.value)}
                    placeholder="e.g. Run #14 failed on step 6: template preview HTTP 500 error on clinic xyz..."
                    className="w-full bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.1] rounded-xl p-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setProblemModalOpen(false)}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-md shadow-rose-600/30 cursor-pointer"
                    >
                      Generate Diagnostic Brief
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] max-h-60 overflow-y-auto whitespace-pre-wrap">
                    {problemBriefResult}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(problemBriefResult);
                      notify("Copied diagnostic brief to clipboard!");
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
                  >
                    Copy Brief to Clipboard
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* CLAUDE-INSPIRED GLOBAL SEARCH & COMMAND PALETTE MODAL     */}
        {/* ======================================================== */}
        {cmdKOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-24 px-4 animate-in fade-in duration-150"
            onClick={() => setCmdKOpen(false)}
          >
            <div
              className="w-full max-w-2xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.12] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[82vh] animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search Input Bar */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/[0.08] flex items-center gap-3 bg-slate-50/50 dark:bg-[#10121A]/80">
                <Search className="w-5 h-5 text-indigo-500 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={cmdSearchQuery}
                  onChange={(e) => setCmdSearchQuery(e.target.value)}
                  placeholder="Type a command or search leads, doctors, localities..."
                  className="flex-1 bg-transparent text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                />
                {cmdSearchQuery ? (
                  <button
                    onClick={() => setCmdSearchQuery("")}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : (
                  <kbd className="px-2 py-0.5 text-[10px] bg-slate-200/60 dark:bg-white/[0.08] text-slate-500 dark:text-slate-400 rounded-lg border border-slate-300/60 dark:border-white/[0.08] font-mono">
                    ESC
                  </kbd>
                )}
              </div>

              {/* Results / Quick Actions Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* If matching leads exist */}
                {filteredSearchLeads.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 flex items-center justify-between">
                      <span>Matching Leads & Clinics</span>
                      <span className="font-mono text-indigo-500 font-semibold">{filteredSearchLeads.length} results</span>
                    </div>
                    <div className="space-y-1">
                      {filteredSearchLeads.map((lead) => (
                        <div
                          key={lead.id}
                          onClick={() => {
                            setSelectedLeadId(lead.id);
                            setCmdKOpen(false);
                            setCmdSearchQuery("");
                          }}
                          className="p-3 rounded-2xl hover:bg-indigo-50/80 dark:hover:bg-white/[0.05] border border-transparent hover:border-indigo-200 dark:hover:border-white/[0.08] flex items-center justify-between gap-3 cursor-pointer transition-all group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center font-bold text-xs text-indigo-600 dark:text-indigo-400 shrink-0">
                              {lead.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                                {lead.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                                <span>{lead.doctor_name || "Doctor"}</span>
                                <span>•</span>
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  {lead.locality || lead.city}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 font-bold">
                              ₹{lead.deal_value_inr || 25000}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-semibold">
                              {lead.fit_score}% Fit
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Actions (Claude style) */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2">
                    <span>{cmdSearchQuery ? "Matching Actions & Commands" : "Quick Actions"}</span>
                  </div>
                  <div className="space-y-1">
                    {filteredQuickActions.length === 0 && filteredSearchLeads.length === 0 ? (
                      <div className="py-10 text-center text-xs text-slate-400">
                        No matching leads or actions found for "{cmdSearchQuery}".
                      </div>
                    ) : (
                      filteredQuickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                          <div
                            key={action.id}
                            onClick={() => {
                              action.run();
                              setCmdKOpen(false);
                              setCmdSearchQuery("");
                            }}
                            className="p-3 rounded-2xl hover:bg-slate-100/80 dark:hover:bg-white/[0.05] border border-transparent hover:border-slate-200 dark:hover:border-white/[0.08] flex items-center justify-between gap-3 cursor-pointer transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-center shrink-0 transition-colors">
                                <Icon className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                  {action.title}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {action.subtitle}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 font-mono">
                                {action.badge}
                              </span>
                              <CornerDownLeft className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Navigation Hints */}
              <div className="p-3.5 border-t border-slate-100 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#10121A]/80 flex items-center justify-between text-[11px] text-slate-400 px-4">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/[0.08] font-mono text-[9px]">ESC</kbd>
                    <span>to close</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/[0.08] font-mono text-[9px]">↵</kbd>
                    <span>to select</span>
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <span>CustomerGo Command Palette</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PHASE 4: FLOATING "ASK & DO" AI ASSISTANT + 1-CLICK UNDO */}
        {/* ======================================================== */}
        <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
          {assistantOpen && (
            <div className="w-[360px] sm:w-[410px] max-h-[520px] rounded-3xl bg-white dark:bg-[#141721] border border-indigo-200 dark:border-indigo-500/30 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-3 bg-slate-50 dark:bg-[#10121A] border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Ask &amp; Do CRM Copilot
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAssistantMode("ask")}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold cursor-pointer ${
                      assistantMode === "ask"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    Ask (Query)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssistantMode("do")}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold cursor-pointer ${
                      assistantMode === "do"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    Do (Action + Undo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssistantOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-3.5 flex-1 overflow-y-auto space-y-3 text-xs max-h-80">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "Hot South Delhi leads", mode: "ask" as const, q: "Show hot leads in South Delhi" },
                    { label: "Snooze stale 2 days", mode: "do" as const, q: "Snooze stale leads for 2 days" },
                    { label: "Confirm all promises", mode: "do" as const, q: "Confirm all pending commitments" },
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setAssistantMode(chip.mode);
                        setAssistantPrompt(chip.q);
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-[10px] text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {assistantHistory.length === 0 ? (
                  <div className="py-6 text-center text-[11px] text-slate-400">
                    Ask anything about your pipeline or switch to <strong>Do</strong> mode to bulk-move, snooze, or confirm tasks with 1-click Undo.
                  </div>
                ) : (
                  assistantHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-[#10121A] border border-slate-200/80 dark:border-white/[0.06] space-y-2"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-mono uppercase text-indigo-500 font-semibold">
                          {entry.mode}: {entry.prompt}
                        </span>
                        {entry.undo_available && !entry.undone && (
                          <button
                            type="button"
                            onClick={() => handleAssistantUndo(entry.undo_id, entry.id)}
                            className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 font-mono font-semibold cursor-pointer"
                          >
                            Undo 1-Click
                          </button>
                        )}
                        {entry.undone && (
                          <span className="text-emerald-500 font-mono">Reverted</span>
                        )}
                      </div>
                      <div className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {entry.reply}
                      </div>
                      {entry.matched_leads.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {entry.matched_leads.slice(0, 5).map((ml) => (
                            <button
                              key={ml.id}
                              type="button"
                              onClick={() => setSelectedLeadId(ml.id)}
                              className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium cursor-pointer"
                            >
                              {ml.name} ({ml.fit_score}%)
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <form
                onSubmit={handleAskDoSubmit}
                className="p-3 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#10121A] flex items-center gap-2"
              >
                <input
                  type="text"
                  value={assistantPrompt}
                  onChange={(e) => setAssistantPrompt(e.target.value)}
                  placeholder={
                    assistantMode === "ask"
                      ? "Ask e.g. Hot leads in South Delhi..."
                      : "Do e.g. Snooze stale leads for 2 days..."
                  }
                  className="flex-1 bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={assistantLoading}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                >
                  {assistantLoading ? "..." : assistantMode === "ask" ? "Ask" : "Run"}
                </button>
              </form>
            </div>
          )}

          <button
            type="button"
            onClick={() => setAssistantOpen((prev) => !prev)}
            className="px-4 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xl shadow-indigo-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Ask &amp; Do AI</span>
          </button>
        </div>
      </div>
    </div>
  );
}
