"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
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

type MainTab = "board" | "table" | "sprint" | "autopilot" | "settings";

export default function PersonalOSCRM() {
  const [hustles, setHustles] = useState<Hustle[]>([]);
  const [activeHustleId, setActiveHustleId] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<MainTab>("board");
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

  // Modals & Interactive states
  const [cmdKOpen, setCmdKOpen] = useState<boolean>(false);
  const [newLeadModalOpen, setNewLeadModalOpen] = useState<boolean>(false);
  const [problemModalOpen, setProblemModalOpen] = useState<boolean>(false);

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

  // Theme Initializer
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
    }
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

  // Real-time EventSource connection for live demo views, replies, runs
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource(`${API_BASE}/api/events`);
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const line = `[${new Date().toLocaleTimeString()}] ${data.type}: ${data.title || data.message || "Event"}`;
          setLiveFeed((prev) => [line, ...prev].slice(0, 30));

          // If tracking view event or reply, refresh leads data
          if (["tracking_view", "reply_received", "run_complete", "outreach_sent"].includes(data.type)) {
            loadAll();
          }
        } catch {
          // ignore parse errors
        }
      };
      es.onerror = () => {
        // SSE disconnected, will retry automatically
      };
    } catch {
      // ignore setup errors
    }
    return () => {
      es?.close();
    };
  }, [loadAll]);

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
    try {
      await apiFetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        body: JSON.stringify({ stage_id: newStageId }),
      });
      notify(`Moved "${lead.name}" to next stage`);
      loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to update stage", "err");
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
    try {
      notify("Triggering 7-step Autopilot run in background...");
      const res = await apiFetch<{ run_id: number; message: string }>("/api/autopilot/run-refill", {
        method: "POST",
        body: JSON.stringify({ hustle_id: activeHustleId }),
      });
      notify(`Refill initiated: Run #${res.run_id}`);
      loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to trigger refill", "err");
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
    try {
      notify("Verifying HTTP 200 on all 3 client templates...");
      const res = await apiFetch<{ verified: number; total: number }>("/api/packages/sync-batch-json", {
        method: "POST",
        body: JSON.stringify({ hustle_id: activeHustleId }),
      });
      notify(`Self-check passed: ${res.verified}/${res.total} templates verified live & synced`);
      loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to verify links", "err");
    }
  };

  // Header quick stats
  const waSentToday = stockPlan?.today_channel_sends?.whatsapp ?? 0;
  const waDailyLimit = stockPlan?.channel_limits?.whatsapp ?? 15;
  const todayMode = stockPlan?.upcoming_schedule?.[0]?.mode ?? "normal";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 border ${
            toast.type === "ok"
              ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-900/30"
              : "bg-rose-600 text-white border-rose-500 shadow-rose-900/30"
          }`}
        >
          {toast.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* TOP HEADER: Breadcrumbs, Light/Dark Switcher, Quick Actions */}
      <header className="h-14 border-b border-slate-200 dark:border-white/[0.08] bg-white/90 dark:bg-[#0E1526]/90 backdrop-blur-md px-4 flex items-center justify-between gap-4 sticky top-0 z-30 transition-colors">
        {/* Left: Brand Identity & Hustle Switcher */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/30 text-xs">
            OS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">Personal OS</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 font-semibold">
                {activeHustle?.autonomy_mode === "autopilot" ? "Autopilot Mode" : "Copilot Mode"}
              </span>
            </div>
          </div>

          {/* Hustle Switcher */}
          <select
            value={activeHustleId}
            onChange={(e) => setActiveHustleId(Number(e.target.value))}
            className="ml-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/[0.08] rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {hustles.map((h) => (
              <option key={h.id} value={h.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                Hustle: {h.name}
              </option>
            ))}
          </select>
        </div>

        {/* Center Status Pills: Stock Level, WhatsApp Daily Limit, Day Mode */}
        <div className="hidden xl:flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-white/[0.08] text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-slate-500 dark:text-slate-400">Stock:</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {stockPlan?.current_ready_packages ?? 0} / {stockPlan?.required_ready_packages ?? 45} ready
            </span>
            <span className="text-[11px] text-slate-400">({stockPlan?.effective_buffer_days ?? 3}d buffer)</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-white/[0.08] text-xs">
            <Send className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 font-medium" />
            <span className="text-slate-500 dark:text-slate-400">WA Today:</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {waSentToday} / {waDailyLimit}
            </span>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/[0.08] rounded-xl p-0.5 text-xs">
            {(["normal", "away", "off"] as const).map((m) => (
              <button
                key={m}
                onClick={() => handleDayModeChange(m)}
                className={`px-2.5 py-1 rounded-lg capitalize font-medium transition-all ${
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
        </div>

        {/* Right Actions: Light/Dark Mode, Search / Cmd+K, New Lead, CSV Export, Report Problem */}
        <div className="flex items-center gap-2">
          {/* Light / Dark Mode Toggle (CustomerGo Style) */}
          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
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

          <button
            onClick={() => setCmdKOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/[0.08] text-xs text-slate-700 dark:text-slate-300 transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Jump / Command...</span>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 text-slate-500 font-mono">⌘K</kbd>
          </button>

          <button
            onClick={() => setNewLeadModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Lead</span>
          </button>

          <a
            href={`${API_BASE}/api/leads/export/csv?hustle_id=${activeHustleId}`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/[0.08] text-xs text-slate-700 dark:text-slate-300 transition-colors"
            title="Download CSV export"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">CSV</span>
          </a>

          <button
            onClick={() => {
              setProblemBriefResult("");
              setProblemModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/50 text-xs text-rose-700 dark:text-rose-300 transition-colors"
            title="Capture run trace & diagnostic brief"
          >
            <Bug className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden sm:inline">Report Problem</span>
          </button>
        </div>
      </header>

      {/* Main Layout: Left Sidebar + Center Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation & Smart Views Sidebar */}
        <aside className="w-64 border-r border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0E1526]/80 backdrop-blur-md p-3 flex flex-col justify-between overflow-y-auto transition-colors">
          <div className="space-y-6">
            {/* Main Workspace Tabs */}
            <div>
              <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Workspace
              </div>
              <nav className="space-y-1">
                {[
                  { id: "board", label: "Pipeline Board", icon: LayoutGrid },
                  { id: "table", label: "Leads Table", icon: TableIcon },
                  { id: "sprint", label: "Evening Sprint (75m)", icon: Zap },
                  { id: "autopilot", label: "Autopilot & Traces", icon: Activity },
                  { id: "settings", label: "Hustle Settings", icon: Settings },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as MainTab)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        active
                          ? "bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 shadow-sm"
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

            {/* Pinned Smart Views (CustomerGo / Close style saved queues) */}
            <div>
              <div className="px-2 pb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <span>Smart Views</span>
                <span className="text-[9px] text-slate-400">Live Filters</span>
              </div>
              <nav className="space-y-1">
                {[
                  { slug: "all_active", label: "All Active Pipeline", icon: LayoutGrid },
                  { slug: "review_tray", label: "Review Tray (Ready)", icon: CheckCircle2 },
                  { slug: "due_today", label: "Due Today & Overdue", icon: Clock },
                  { slug: "hot_intent", label: "Hot Demo Viewers", icon: Flame },
                  { slug: "replied_warm", label: "Active Replies", icon: MessageSquare },
                  { slug: "no_reply_5d", label: "Follow-up Queue", icon: RefreshCw },
                  { slug: "archived", label: "Archived & DNC", icon: Archive },
                ].map((v) => {
                  const Icon = v.icon;
                  const active = activeSmartView === v.slug;
                  return (
                    <button
                      key={v.slug}
                      onClick={() => setActiveSmartView(v.slug)}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        active
                          ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-500/20"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{v.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Real-time Telemetry Live Feed (Homies Lab style activity ticker) */}
          <div className="pt-4 border-t border-slate-200 dark:border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Telemetry</span>
              </span>
              <span className="text-[9px] font-mono text-slate-400">SSE</span>
            </div>
            <div className="h-28 overflow-y-auto space-y-1.5 text-[11px] font-mono rounded-xl p-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.06]">
              {liveFeed.length === 0 ? (
                <div className="text-slate-400 dark:text-slate-500">Listening for demo views, replies & runs...</div>
              ) : (
                liveFeed.map((item, i) => (
                  <div key={i} className="truncate text-slate-600 dark:text-slate-300">
                    {item}
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Center Workspace Content */}
        <main className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Subheader Search & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {activeTab === "board" && "Pipeline Kanban Board"}
                {activeTab === "table" && "Fast Leads Table"}
                {activeTab === "sprint" && "Evening Sprint Planner (75-Min Time Budget)"}
                {activeTab === "autopilot" && "Autopilot Stock Planner, 7-Step Gates & Run Traces"}
                {activeTab === "settings" && "Hustle Configuration & Database Rules"}
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  ({leads.length} {leads.length === 1 ? "lead" : "leads"} in view)
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter clinic, doctor, locality, phone..."
                  className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-64 shadow-sm"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500 dark:text-slate-400">Loading Personal OS CRM...</div>
          ) : (
            <>
              {/* TAB 1: PIPELINE KANBAN BOARD (CustomerGo Inspired) */}
              {activeTab === "board" && activeHustle && (
                <div className="space-y-4">
                  {/* Top Bar with Filter, Sort and Pipeline Stats */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/[0.08] backdrop-blur-xl shadow-sm relative">
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
                              ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
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
                          <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.12] shadow-2xl p-4 z-40 space-y-3.5 animate-in fade-in zoom-in-95">
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
                              ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-700 border-slate-200 dark:border-white/[0.06] text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <ArrowUpDown className="w-3.5 h-3.5" />
                          <span>Sort</span>
                        </button>

                        {sortPopoverOpen && (
                          <div className="absolute left-0 mt-2 w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.12] shadow-2xl p-4 z-40 space-y-3.5 animate-in fade-in zoom-in-95">
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
                                  <option value="fit" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">AI Fit Score</option>
                                  <option value="intent" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Buyer Intent Score</option>
                                  <option value="deal" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Projected Deal Value</option>
                                  <option value="name" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Clinic / Lead Name</option>
                                  <option value="due" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Next Action Due Date</option>
                                </select>
                                <select
                                  value={sortOrder}
                                  onChange={(e) => setSortOrder(e.target.value as any)}
                                  className="bg-transparent text-xs font-semibold text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer"
                                >
                                  <option value="desc" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Descending ↓</option>
                                  <option value="asc" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Ascending ↑</option>
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
                          className="w-80 shrink-0 rounded-2xl bg-slate-100/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] flex flex-col max-h-[calc(100vh-210px)] shadow-sm transition-colors"
                        >
                          {/* Column Header (CustomerGo Style) */}
                          <div className="p-3.5 border-b border-slate-200/80 dark:border-white/[0.06] bg-white/60 dark:bg-slate-900/80 flex items-center justify-between rounded-t-2xl">
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
                                    onClick={() => setSelectedLeadId(lead.id)}
                                    className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer space-y-3 group ${
                                      isSelected
                                        ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 shadow-md ring-2 ring-indigo-500/40"
                                        : "bg-white dark:bg-[#151E32] hover:bg-slate-50/90 dark:hover:bg-[#1C2640] border-slate-200/90 dark:border-white/[0.08] hover:border-indigo-400 dark:hover:border-indigo-500/50 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-card hover:-translate-y-0.5"
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
                                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-white/[0.06] text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
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

              {/* TAB 2: FAST LEADS TABLE (Homies Lab Employee Table Style) */}
              {activeTab === "table" && (
                <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/60 overflow-hidden shadow-sm transition-colors">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-slate-900/90 text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
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

              {/* TAB 3: EVENING SPRINT PLANNER (Homies Lab KPI Gauges) */}
              {activeTab === "sprint" && sprintPlan && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] shadow-sm flex items-center justify-between">
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

                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] shadow-sm flex items-center justify-between">
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

                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] shadow-sm flex items-center justify-between">
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
                        className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/70 border border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-4 cursor-pointer transition-all shadow-sm"
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

              {/* TAB 4: AUTOPILOT & RUN TRACES + TELEGRAM CONSOLE */}
              {activeTab === "autopilot" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] shadow-sm flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">7-Step Clinic Autopilot & Stock Planner</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Find (Maps/IG) → Verify No Website → Research (2-Source Rule) → Channel Check → Build 3 Demos → Verify Live HTTP 200 → Sync batch.json
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={handleSyncBatchLinks}
                          className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/30 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Verify Links & Sync batch.json</span>
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

                    {/* Run Trace Logs */}
                    <div className="space-y-3">
                      {runs.map((r) => (
                        <div key={r.id} className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">Run #{r.id}: {r.job_type}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-semibold font-mono">
                                {r.status}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {new Date(r.started_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/[0.04]">
                              <div className="text-[10px] text-slate-400">Found</div>
                              <div className="font-bold font-mono text-slate-800 dark:text-white">{r.count_found}</div>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/[0.04]">
                              <div className="text-[10px] text-slate-400">Passed</div>
                              <div className="font-bold font-mono text-slate-800 dark:text-white">{r.count_passed}</div>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/[0.04]">
                              <div className="text-[10px] text-slate-400">Dropped</div>
                              <div className="font-bold font-mono text-amber-600 dark:text-amber-400">{r.count_dropped}</div>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/[0.04]">
                              <div className="text-[10px] text-slate-400">Duration</div>
                              <div className="font-bold font-mono text-slate-800 dark:text-white">
                                {r.finished_at ? `${Math.max(1, Math.round((new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000))}s` : "active"}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Telegram Remote CLI Simulator Console */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-4">
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
                        className="w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
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

              {/* TAB 5: HUSTLE SETTINGS */}
              {activeTab === "settings" && activeHustle && (
                <div className="max-w-3xl space-y-5">
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-3">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">Active Hustle Blueprint: {activeHustle.name}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{activeHustle.description}</p>
                    <div className="pt-2 grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/[0.04]">
                        <div className="text-slate-400">Proof Asset Type:</div>
                        <div className="font-semibold text-slate-900 dark:text-white mt-0.5">{activeHustle.proof_asset_type}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/[0.04]">
                        <div className="text-slate-400">Minimum Buffer Days:</div>
                        <div className="font-semibold text-slate-900 dark:text-white mt-0.5">{activeHustle.minimum_stock_days} days</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* FLOATING LEAD DETAIL MODAL (Spacious Dialog inspired by Homies Lab & CustomerGo) */}
        {selectedLead && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-full max-w-5xl max-h-[92vh] bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.12] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
              
              {/* Modal Top Bar */}
              <div className="p-5 border-b border-slate-100 dark:border-white/[0.08] bg-slate-50/80 dark:bg-slate-900/90 flex items-start justify-between gap-4">
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
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/[0.08] shadow-sm">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Stage:</span>
                    <select
                      value={selectedLead.stage_id}
                      onChange={(e) => handleStageChange(selectedLead, Number(e.target.value))}
                      className="bg-transparent text-xs font-semibold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                    >
                      {activeHustle?.stages.map((st) => (
                        <option key={st.id} value={st.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
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

              {/* Modal Body - 2 Spacious Columns (Info & Actions) */}
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-transparent">
                
                {/* Left Column: Context, Intelligence & History */}
                <div className="space-y-4">
                  {/* AI Fit & Intent Match (Homies Lab Circular Gauge Style) */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-4 shadow-sm">
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

                    {/* Circular Percentage Meter (Homies Lab Style) */}
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
                    <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 text-xs space-y-1.5 shadow-sm">
                      <div className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        <span>What Changed Since Last Time</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{selectedLead.what_changed_summary}</p>
                    </div>
                  )}

                  {/* Verified Facts Dossier (2-Source Verification Rule) */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/[0.08] space-y-2.5 shadow-sm">
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
                          <div key={f.id} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-white/[0.04] text-xs flex items-center justify-between gap-2">
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

                  {/* Client Proof Package: 3 Template Demos */}
                  {selectedLead.packages.length > 0 && (
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/[0.08] space-y-3 shadow-sm">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                        <span className="flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Generated Client Proof Package</span>
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                          {selectedLead.packages[0].status}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        {["Template 1", "Template 2", "Template 3"].map((tmpl, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-white/[0.06] space-y-1">
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">{tmpl}</div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Rendered</div>
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">Total Previews Viewed:</span>
                        <strong className="text-slate-900 dark:text-white font-mono">{((selectedLead as any).demo_views_count ?? selectedLead.events?.length ?? 0)} times</strong>
                      </div>
                    </div>
                  )}

                  {/* Activity History Timeline */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/[0.08] space-y-3 shadow-sm">
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Activity Log & Messages</span>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedLead.messages.length === 0 ? (
                        <div className="text-[11px] text-slate-400 py-3 text-center">No messages logged yet</div>
                      ) : (
                        selectedLead.messages.map((m) => (
                          <div key={m.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-100 dark:border-white/[0.04] text-xs space-y-1">
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
                  <form onSubmit={handleCompleteTask} className="p-4 rounded-2xl bg-white dark:bg-slate-950/80 border border-indigo-200 dark:border-indigo-500/30 space-y-3 shadow-sm">
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
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Mandatory Next Action</label>
                      <input
                        type="text"
                        value={nextActionInput}
                        onChange={(e) => setNextActionInput(e.target.value)}
                        placeholder="e.g. Follow up if no reply in 2 days"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
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
                          className="w-14 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1] rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white text-center font-mono"
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
                  <form onSubmit={handleAppendMessage} className="p-4 rounded-2xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/[0.08] space-y-3 shadow-sm">
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                      <span>Log Message or Internal Note</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <select
                        value={messageChannel}
                        onChange={(e) => setMessageChannel(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1] rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
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
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1] rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
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
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1] rounded-xl p-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
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
                    <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 space-y-2.5 shadow-sm">
                      <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        <span>AI Reply Copilot Suggestions</span>
                      </div>
                      <div className="space-y-2">
                        {copilotSuggestions.map((sugg, idx) => (
                          <div
                            key={idx}
                            onClick={() => setMessageInput(sugg.text)}
                            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-white/[0.06] text-xs space-y-1 cursor-pointer hover:border-indigo-400 transition-colors"
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
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Add New Lead Form */}
        {newLeadModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.12] rounded-3xl p-6 shadow-2xl space-y-4">
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
                    className="w-full mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
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
                      className="w-full mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 font-medium">Locality / City</label>
                    <input
                      type="text"
                      value={newLeadLocality}
                      onChange={(e) => setNewLeadLocality(e.target.value)}
                      placeholder="Indiranagar, BLR"
                      className="w-full mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
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
                      className="w-full mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 font-medium">Instagram Handle</label>
                    <input
                      type="text"
                      value={newLeadIg}
                      onChange={(e) => setNewLeadIg(e.target.value)}
                      placeholder="apexdental_blr"
                      className="w-full mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-400 font-medium">Initial Mandatory Next Step</label>
                  <input
                    type="text"
                    value={newLeadNextAction}
                    onChange={(e) => setNewLeadNextAction(e.target.value)}
                    className="w-full mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1] rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
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
            <div className="w-full max-w-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/[0.12] rounded-3xl p-6 shadow-2xl space-y-4">
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
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1] rounded-xl p-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500"
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
      </div>
    </div>
  );
}
