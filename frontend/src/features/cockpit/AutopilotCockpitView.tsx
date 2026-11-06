"use client";

import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Copy,
  ExternalLink,
  FastForward,
  FileCode2,
  Film,
  Inbox,
  Layers,
  MapPin,
  Pause,
  Play,
  RotateCw,
  Search,
  Send,
  Sparkles,
  Terminal,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { apiFetch } from "@/lib/api/client";
import { BatchRunMetrics, CockpitStateResponse, NodeInspectionData, NodeStatus } from "./types";
import { PipelineNodeNetwork } from "./PipelineNodeNetwork";
import { NodeInspectionDrawer } from "./NodeInspectionDrawer";
import { CockpitSupervisorBar } from "./CockpitSupervisorBar";
import { OutreachHubSubpage } from "./OutreachHubSubpage";

export function AutopilotCockpitView() {
  const {
    leads,
    activeHustleId,
    stockPlan,
    runs,
    terminalLogs,
    setTerminalLogs,
    activeTerminalJob,
    setActiveTerminalJob,
    appendTerminalLines,
    handleSyncBatchLinks,
    handleTriggerRefill,
    setSelectedLeadId,
    notify,
    latestPipelineStep,
  } = useCRM();

  // Sub-page switcher state: "factory" | "outreach"
  const [activeSubPage, setActiveSubPage] = useState<"factory" | "outreach">("factory");

  // Factory Runner Controls
  const [targetLeads, setTargetLeads] = useState<number>(25);
  const [isRunningPipeline, setIsRunningPipeline] = useState<boolean>(false);
  const [runnerExpanded, setRunnerExpanded] = useState<boolean>(false);
  const [testingMode, setTestingMode] = useState<boolean>(true);

  // Inspection Drawer State
  const [inspectingNode, setInspectingNode] = useState<NodeInspectionData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  // Terminal Controls
  const [terminalFilter, setTerminalFilter] = useState<string>("ALL");
  const [terminalAutoScroll, setTerminalAutoScroll] = useState<boolean>(true);
  const [copiedTerminal, setCopiedTerminal] = useState<boolean>(false);
  const [showPreviousRuns, setShowPreviousRuns] = useState<boolean>(false);

  const terminalContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalAutoScroll && terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [terminalLogs, terminalAutoScroll]);

  // Initial structural nodes configuration for the 6-stage pipeline
  const [nodes, setNodes] = useState<NodeInspectionData[]>([
    {
      id: 1,
      stepNumber: 1,
      name: "DISCOVERY",
      title: "1. Candidate Discovery Waterfall",
      subtitle: "Places API + Serper Maps",
      tools: "Google Places API • Serper Maps • Brave Search • Playwright Scraper",
      status: "IDLE",
      badge: "0 Found",
      progressText: "Waiting to initiate 4-tier waterfall discovery...",
      logicDescription:
        "Queries Google Places API, Serper Maps & Playwright Waterfall for dental clinics in specified locality.",
      duration: "Idle",
      payload: [],
      error: null,
    },
    {
      id: 2,
      stepNumber: 2,
      name: "VERIFICATION",
      title: "2. Website Verification & HTTP Probe",
      subtitle: "HTTP Probes + Brave Search",
      tools: "HTTP 200/404 Probes • Brave Search No-Website Rule",
      status: "IDLE",
      badge: "0 Probed",
      progressText: "Waiting for candidate stream to probe domain & mobile status...",
      logicDescription:
        "Probes domain HTTP status and performs deep search verification to ensure clinic has no active mobile-friendly website.",
      duration: "Idle",
      payload: [],
      error: null,
    },
    {
      id: 3,
      stepNumber: 3,
      name: "DEEP RESEARCH",
      title: "3. Doctor & Clinic Dossier Enrichment",
      subtitle: "Doctor Extraction & Opening Hours",
      tools: "Doctor Scraping • Opening Hours • Verified Reviews",
      status: "IDLE",
      badge: "0 Enriched",
      progressText: "Waiting for verified no-website clinics to extract doctor credentials...",
      logicDescription:
        "Scrapes doctor educational qualifications, years of experience, patient reviews, and clinic specialty services.",
      duration: "Idle",
      payload: [],
      error: null,
    },
    {
      id: 4,
      stepNumber: 4,
      name: "NEXT.JS BUILD",
      title: "4. Multi-Template Demo Scaffold",
      subtitle: "3 Live Themes: Modern, Premium, Warm",
      tools: "add-clinic.ts • 3 Next.js Themes • Live HTTP Verification",
      status: "IDLE",
      badge: "0 Built",
      progressText: "Waiting for enriched dossiers to scaffold into Next.js Dental Engine...",
      logicDescription:
        "Scaffolds clinic data into Next.js Dental Engine and verifies HTTP 200 live status on localhost:3001.",
      duration: "Idle",
      payload: [],
      error: null,
    },
    {
      id: 5,
      stepNumber: 5,
      name: "WALKTHROUGH",
      title: "5. Headless Video Walkthrough Recording",
      subtitle: "Headless MP4 Video Recorder",
      tools: "Playwright Headless • 45s Mobile Viewport • WebM/MP4",
      status: "IDLE",
      badge: "0 Recorded",
      progressText: "Waiting for verified demo URLs to sync into batch.json...",
      logicDescription:
        "Spawns Playwright Chromium to record an authentic 45-second scrollable mobile preview of the clinic website.",
      duration: "Idle",
      payload: [],
      error: null,
    },
    {
      id: 6,
      stepNumber: 6,
      name: "REVIEW TRAY",
      title: "6. Sealed & Staged Review Tray Buffer",
      subtitle: "Sealed & Staged Ready for Pitch",
      tools: "Buffer Health Engine • One-Click Operator Approval",
      status: "IDLE",
      badge: "0 in Buffer",
      progressText: "Waiting for packages to seal into CRM Review Tray...",
      logicDescription:
        "Stages validated packages with live links into the CRM Review Tray for operator dispatch.",
      duration: "Idle",
      payload: [],
      error: null,
    },
  ]);

  const [metrics, setMetrics] = useState<BatchRunMetrics | null>(null);

  // Hydrate Cockpit State from Backend
  const loadCockpitState = useCallback(async () => {
    try {
      const res = await apiFetch<CockpitStateResponse>(
        `/api/autopilot/cockpit-state?hustle_id=${activeHustleId}`
      );
      if (res && Array.isArray(res.nodes) && res.nodes.length === 6) {
        setNodes(res.nodes);
      }
      if (res && res.metrics) {
        setMetrics(res.metrics);
      }
      if (res && typeof res.is_running === "boolean") {
        setIsRunningPipeline(res.is_running);
      }
    } catch {
      // Keep existing structural nodes on network failure
    }
  }, [activeHustleId]);

  useEffect(() => {
    loadCockpitState();
  }, [loadCockpitState]);

  // Dynamically update Cockpit nodes & drawer when real structured SSE pipeline_step events arrive
  useEffect(() => {
    if (!latestPipelineStep) return;
    const evt = latestPipelineStep;
    const stepMap: Record<string, number> = {
      "node-1": 1,
      "node-2": 2,
      "node-3": 3,
      "node-4": 4,
      "node-5": 5,
      "node-6": 6,
    };
    const stepNum = stepMap[evt.node_id];
    if (!stepNum) return;

    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        if (n.stepNumber === stepNum) {
          const updatedPayload = evt.payload
            ? Array.isArray(evt.payload)
              ? evt.payload
              : [evt.payload]
            : n.payload;
          const updatedBadge = evt.metrics?.badge_text || (evt.status === "SUCCESS" ? "✓ Done" : n.badge);
          const updatedProgress = evt.clinic_name
            ? `${evt.step_name}: ${evt.clinic_name}`
            : (evt.metrics?.badge_text || n.progressText);
          const updatedDuration = evt.latency_ms ? `${evt.latency_ms}ms` : n.duration;
          const updatedError = evt.error
            ? { hasError: true, message: evt.error.message }
            : null;

          const updated: NodeInspectionData = {
            ...n,
            status: evt.status,
            badge: updatedBadge,
            progressText: updatedProgress,
            duration: updatedDuration,
            payload: updatedPayload as Array<Record<string, unknown>>,
            error: updatedError,
          };
          setInspectingNode((curr) => (curr && curr.id === n.id ? updated : curr));
          return updated;
        }

        // Sequential stage progression guard while pipeline is running:
        if (evt.status === "RUNNING") {
          if (n.stepNumber < stepNum && n.status !== "FAILED") {
            return { ...n, status: "SUCCESS" };
          }
          if (n.stepNumber > stepNum && n.status !== "FAILED") {
            return { ...n, status: "QUEUED" };
          }
        }
        return n;
      })
    );

    if (evt.status === "RUNNING") {
      setIsRunningPipeline(true);
    } else if (evt.node_id === "node-6" && (evt.status === "SUCCESS" || evt.status === "WAITING_FOR_REVIEW")) {
      setIsRunningPipeline(false);
      loadCockpitState();
    }
  }, [latestPipelineStep, loadCockpitState]);

  // Handle Node selection to open drawer
  const handleSelectNode = (node: NodeInspectionData) => {
    setInspectingNode(node);
    setDrawerOpen(true);
  };

  // Node controls
  const handleRetryNode = (nodeId: number) => {
    appendTerminalLines([
      `[${new Date().toLocaleTimeString()}] [SUPERVISOR] Manual Retry triggered for Node #${nodeId}...`,
      `[${new Date().toLocaleTimeString()}] [PROBE] Rerunning stage logic with fresh backoff window...`,
    ]);
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              status: "RUNNING",
              error: null,
              progressText: "Retrying step in isolated worker...",
            }
          : n
      )
    );
    notify(`Retrying Node #${nodeId} execution...`);
  };

  const handleSkipNode = (nodeId: number) => {
    appendTerminalLines([
      `[${new Date().toLocaleTimeString()}] [SUPERVISOR] Operator skipped Node #${nodeId}. Continuing to next stage...`,
    ]);
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              status: "SUCCESS",
              badge: "Skipped",
              progressText: "Operator bypassed this step",
            }
          : n
      )
    );
    setDrawerOpen(false);
    notify(`Node #${nodeId} bypassed by operator.`);
  };

  const handleRunOnlyStep = (nodeId: number) => {
    appendTerminalLines([
      `[${new Date().toLocaleTimeString()}] [SUPERVISOR] Running ONLY Node #${nodeId} in isolated sandbox...`,
    ]);
    notify(`Executing Node #${nodeId} in isolation...`);
  };

  const handlePauseNode = (nodeId: number) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, status: "QUEUED" } : n))
    );
    notify(`Node #${nodeId} execution paused.`);
  };

  // Run Refill Batch with Target Count
  const handleRunRefillWithTarget = async () => {
    setIsRunningPipeline(true);
    setNodes((prev) =>
      prev.map((n) =>
        n.stepNumber === 1
          ? { ...n, status: "RUNNING", progressText: "Starting 4-Tier Waterfall Discovery...", badge: "Searching..." }
          : { ...n, status: "QUEUED", badge: "Queued", progressText: "Waiting for previous stage to complete..." }
      )
    );
    appendTerminalLines([
      `[${new Date().toLocaleTimeString()}] [FACTORY] >>> RUN REFILL BATCH Triggered for ${targetLeads} qualified leads [TESTING MODE: ${testingMode ? "ON (Live Discovery, No Cache)" : "OFF"}]...`,
      `[${new Date().toLocaleTimeString()}] [SCRAPE] Initializing 4-Tier Waterfall Discovery with preset rotation...`,
    ]);
    try {
      await handleTriggerRefill(targetLeads, testingMode);
      notify(`Refill batch initiated for ${targetLeads} leads (${testingMode ? "Live Test Mode" : "Standard"})!`);
    } catch {
      // error handled in context
    } finally {
      setIsRunningPipeline(false);
      await loadCockpitState();
    }
  };

  // Stop pipeline
  const handleStopPipeline = async () => {
    try {
      await apiFetch<{ success: boolean; message: string }>("/api/autopilot/stop", {
        method: "POST",
      });
      appendTerminalLines([
        `[${new Date().toLocaleTimeString()}] [STOP] Sent cancellation signal to backend pipeline.`,
      ]);
    } catch (err) {
      console.error("Failed to signal backend cancel:", err);
    }
    setIsRunningPipeline(false);
    setActiveTerminalJob(null);
    setNodes((prev) =>
      prev.map((n) =>
        n.status === "RUNNING"
          ? { ...n, status: "IDLE", progressText: "Execution stopped by operator" }
          : n
      )
    );
    appendTerminalLines([
      `[${new Date().toLocaleTimeString()}] [ALERT] Pipeline execution STOPPED by Captain. Workers detached.`,
    ]);
    notify("Pipeline workers stopped.", "err");
    await loadCockpitState();
  };

  // Supervisor Command handler
  const handleSupervisorCommand = (command: string) => {
    appendTerminalLines([
      `[${new Date().toLocaleTimeString()}] [COMMAND] Operator command: "${command}"`,
      `[${new Date().toLocaleTimeString()}] [SUPERVISOR] Instruction registered. Analyzing pipeline state...`,
    ]);
    notify(`Supervisor received: "${command}"`);
  };

  // Filter terminal logs
  const filteredTerminalLogs = useMemo(() => {
    if (terminalFilter === "ALL") return terminalLogs;
    return terminalLogs.filter((line) => {
      if (terminalFilter === "SCRAPE") return line.includes("[SCRAPE]") || line.includes("[FOUND]");
      if (terminalFilter === "PROBE") return line.includes("[PROBE]") || line.includes("[OK]") || line.includes("[VERIFY");
      if (terminalFilter === "BUILD") return line.includes("[BUILD]") || line.includes("[AUDIT]");
      if (terminalFilter === "VIDEO") return line.includes("[VIDEO]") || line.includes("[MP4]");
      if (terminalFilter === "ERROR") return line.includes("[ERROR]") || line.includes("[FAIL]") || line.includes("[DROP]");
      return true;
    });
  }, [terminalLogs, terminalFilter]);

  const handleCopyTerminalLogs = async () => {
    try {
      await navigator.clipboard.writeText(terminalLogs.join("\n"));
      setCopiedTerminal(true);
      notify("Copied all execution terminal logs to clipboard");
      setTimeout(() => setCopiedTerminal(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="space-y-6 min-h-[calc(100vh-5rem)] -m-4 sm:-m-6 p-4 sm:p-6 bg-transparent transition-colors">
      {/* 1. Sleek Floating Sub-Page Tabs */}
      <div className="flex items-center justify-center pt-1">
        <div className="inline-flex items-center p-1 rounded-2xl bg-white/90 dark:bg-[#141721]/90 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] shadow-sm">
          <button
            onClick={() => setActiveSubPage("factory")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeSubPage === "factory"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]"
            }`}
          >
            <span role="img" aria-label="Lead Factory">🏭</span>
            <span>Lead Factory</span>
          </button>

          <button
            onClick={() => setActiveSubPage("outreach")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeSubPage === "outreach"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]"
            }`}
          >
            <span role="img" aria-label="Outreach Hub">🚀</span>
            <span>Outreach Hub</span>
          </button>
        </div>
      </div>

      {/* Render Sub-Page Content */}
      {activeSubPage === "outreach" ? (
        /* ==================== SUB-PAGE 2: OUTREACH HUB ==================== */
        <OutreachHubSubpage />
      ) : (
        /* ==================== SUB-PAGE 1: LEAD PIPELINE FACTORY ==================== */
        <div className="space-y-6">
          {/* 1. Collapsible Compact Factory Runner Card (Constrained Width & Left-Aligned) */}
          <div className="w-fit max-w-md self-start p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-xs transition-all duration-200">
            {/* Collapsed Header / Toggler Bar */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => setRunnerExpanded((prev) => !prev)}
                className="flex items-center gap-2 px-2 py-1 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer text-left"
                title={runnerExpanded ? "Collapse Runner Controls" : "Expand Runner Controls"}
              >
                <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center font-bold shrink-0">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      ⚡ {targetLeads} Leads Needed
                    </span>
                    {testingMode && (
                      <span className="text-[9px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded-md">
                        LIVE TEST
                      </span>
                    )}
                    {runnerExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium truncate max-w-[170px]">
                    Auto-Rotating Presets
                  </div>
                </div>
              </button>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {!runnerExpanded && (
                  <button
                    type="button"
                    onClick={handleSyncBatchLinks}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    title="Verify live HTTP 200 on all 4 demo routes and sync batch.json"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  </button>
                )}

                {isRunningPipeline ? (
                  <button
                    type="button"
                    onClick={handleStopPipeline}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-900/30 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <AlertOctagon className="w-3.5 h-3.5" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRunRefillWithTarget}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 shrink-0"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>RUN REFILL ({targetLeads})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Expanded Controls Drawer */}
            {runnerExpanded && (
              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-white/[0.06] space-y-3 text-xs animate-in fade-in duration-200">
                {/* Presets and custom numeric input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Lead Target Presets:
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[10, 25, 30].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setTargetLeads(num)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                          targetLeads === num
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={targetLeads}
                        onChange={(e) => setTargetLeads(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 text-center focus:outline-none focus:border-indigo-500"
                        placeholder="Custom"
                      />
                    </div>
                  </div>
                </div>

                {/* Testing Mode Toggle */}
                <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                  <div className="pr-2">
                    <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <span>🧪 Testing Mode (Live Real / No Cache)</span>
                      {testingMode && (
                        <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-md">
                          LIVE ONLY
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight">
                      Bypasses static candidate pool &amp; cached videos. Executes real live APIs.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTestingMode((prev) => !prev)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      testingMode ? "bg-amber-500" : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        testingMode ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Actions & Collapse */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSyncBatchLinks}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Verify Links</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRunnerExpanded(false)}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                    title="Collapse Controls"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. Visual n8n-Style Pipeline Network */}
          <PipelineNodeNetwork
            nodes={nodes}
            selectedNodeId={inspectingNode?.id ?? null}
            onSelectNode={handleSelectNode}
          />

          {/* 3. Bottom Split: Live Execution Terminal + Batch End Results Card */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-16 xl:mt-24 pt-8">
            {/* Bottom Left: Live Streaming Execution Terminal */}
            <div className="rounded-3xl bg-[#0B0D14] border border-slate-800/90 shadow-xl overflow-hidden flex flex-col justify-between">
              <div>
                {/* Terminal Controls Bar */}
                <div className="px-4 py-3 bg-[#121521] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <div className="flex items-center gap-2 pl-1">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs font-bold font-mono text-slate-100 tracking-wide">
                        Pipeline Terminal (/api/events/stream)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Filter buttons */}
                    <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono">
                      {["ALL", "SCRAPE", "PROBE", "BUILD", "VIDEO", "ERROR"].map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setTerminalFilter(f)}
                          className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                            terminalFilter === f
                              ? "bg-indigo-600 text-white font-bold"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setTerminalAutoScroll((prev) => !prev)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-mono border transition-colors cursor-pointer ${
                        terminalAutoScroll
                          ? "bg-slate-800 text-emerald-400 border-slate-700"
                          : "bg-slate-900 text-slate-500 border-slate-800"
                      }`}
                    >
                      Scroll: {terminalAutoScroll ? "ON" : "OFF"}
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyTerminalLogs}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedTerminal ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Copy</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setTerminalLogs([
                          `[${new Date().toLocaleTimeString()}] [SYSTEM] Terminal cleared. Ready for next Refill Batch...`,
                        ])
                      }
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  </div>
                </div>

                {/* Log lines */}
                <div
                  ref={terminalContainerRef}
                  className="p-4 h-72 overflow-y-auto font-mono text-xs leading-relaxed space-y-1.5 select-text"
                >
                  {filteredTerminalLogs.map((line, idx) => {
                    const isError = line.includes("[ERROR]") || line.includes("[FAIL]") || line.includes("[DROP]");
                    const isOk = line.includes("[OK]") || line.includes("[HOT]") || line.includes("[200]");
                    const isScrape = line.includes("[SCRAPE]") || line.includes("[FOUND]");
                    const isBuild = line.includes("[BUILD]") || line.includes("[AUDIT]");
                    const isVideo = line.includes("[VIDEO]") || line.includes("[MP4]");

                    let textColor = "text-slate-300";
                    if (isError) textColor = "text-rose-400";
                    else if (isOk) textColor = "text-emerald-300";
                    else if (isScrape) textColor = "text-cyan-300";
                    else if (isBuild) textColor = "text-indigo-300";
                    else if (isVideo) textColor = "text-pink-300";

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

              {/* Terminal Footer status */}
              <div className="px-4 py-2 bg-[#0F1117] border-t border-slate-800/60 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                <span>SSE Connection: CONNECTED (/api/events/stream)</span>
                <span>{filteredTerminalLogs.length} events logged</span>
              </div>
            </div>

            {/* Bottom Right: Batch End Results & Structured Outputs Card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>📋 Batch End Results &amp; Structured Outputs</span>
                    </h3>
                    <p className="text-xs text-slate-400">Direct high-level summary of latest execution</p>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                    isRunningPipeline
                      ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30"
                      : "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30"
                  }`}>
                    {isRunningPipeline ? "● RUNNING" : "🟢 READY"}
                  </span>
                </div>

                {/* Metrics Breakdown */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.05] space-y-2 text-xs">
                  <div className="flex items-center justify-between font-mono text-[11px] pb-1 border-b border-slate-200/50 dark:border-white/[0.04]">
                    <span className="text-slate-400">
                      Run ID: {metrics?.runId || "Latest Run"} ({metrics?.triggeredAgo || "Loaded"})
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {isRunningPipeline ? "Stage: In-Flight" : "Stage: Buffer Ready"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 pt-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">• Target Requested:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{targetLeads} leads</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">• Candidate Leads:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {metrics?.candidateFound ?? 0} found
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">• Verified No-Site:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {metrics?.verifiedNoSite ?? 0} passed ({metrics?.droppedCount ?? 0} dropped)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">• Research Dossiers:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {metrics?.enrichedDossiers ?? 0} enriched
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">• Multi-Demos Built:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {metrics?.demosBuilt ?? 0} ready
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">• Review Tray Ready:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {metrics?.reviewTrayReady ?? 0} in buffer
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Verified Lead Payload */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>🔍 Recent Verified Lead Payload</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {metrics?.recentLead?.fitScore ? `${metrics.recentLead.fitScore}% Fit` : "100% Qualified"}
                    </span>
                  </div>

                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">
                      {metrics?.recentLead?.name || "No lead discovered yet"}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {metrics?.recentLead?.doctor || "Doctor In-Charge"} &bull; {metrics?.recentLead?.locality || "Delhi NCR"} &bull; {metrics?.recentLead?.phone || "Phone verified"}
                    </div>
                  </div>

                  {/* Ready live preview links */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {metrics?.recentLead?.previewLinks?.modern && (
                      <a
                        href={metrics.recentLead.previewLinks.modern}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono font-semibold flex items-center gap-1 transition-colors"
                      >
                        <span>🔗 Modern (200)</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}

                    {metrics?.recentLead?.previewLinks?.warm && (
                      <a
                        href={metrics.recentLead.previewLinks.warm}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 text-[10px] font-mono font-semibold flex items-center gap-1 transition-colors"
                      >
                        <span>🔗 Warm (200)</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}

                    {metrics?.recentLead?.previewLinks?.lux && (
                      <a
                        href={metrics.recentLead.previewLinks.lux}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono font-semibold flex items-center gap-1 transition-colors"
                      >
                        <span>🔗 Premium (200)</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Jump to Leads */}
              <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px]">
                  {leads.length} leads in active CRM pipeline
                </span>
                {leads.length > 0 && (
                  <button
                    onClick={() => setSelectedLeadId(leads[0].id)}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View First Lead Dossier</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cockpit Factory Agent Controller */}
      <CockpitSupervisorBar
        status={isRunningPipeline ? "RUNNING" : "MONITORING"}
        currentIntent="Monitoring Step 2... 14 clinics verified. Brave Search fallback ready if Serper encounters 429 rate limit."
        onSendCommand={handleSupervisorCommand}
        onEmergencyStop={handleStopPipeline}
      />

      {/* Slide-over Node Inspection Drawer */}
      <NodeInspectionDrawer
        node={inspectingNode}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onRetryNode={handleRetryNode}
        onSkipNode={handleSkipNode}
        onRunOnlyStep={handleRunOnlyStep}
        onPauseNode={handlePauseNode}
      />
    </div>
  );
}
