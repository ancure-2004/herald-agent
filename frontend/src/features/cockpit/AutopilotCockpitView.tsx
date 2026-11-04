"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
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
import { NodeInspectionData, NodeStatus } from "./types";
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
  } = useCRM();

  // Sub-page switcher state: "factory" | "outreach"
  const [activeSubPage, setActiveSubPage] = useState<"factory" | "outreach">("factory");

  // Factory Runner Controls
  const [targetLeads, setTargetLeads] = useState<number>(25);
  const [selectedLocality, setSelectedLocality] = useState<string>("Delhi NCR / Noida");
  const [isRunningPipeline, setIsRunningPipeline] = useState<boolean>(false);
  const [runnerExpanded, setRunnerExpanded] = useState<boolean>(false);

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

  // Initial nodes configuration for the 6-stage pipeline
  const [nodes, setNodes] = useState<NodeInspectionData[]>([
    {
      id: 1,
      stepNumber: 1,
      name: "DISCOVERY",
      title: "1. Candidate Discovery Waterfall",
      subtitle: "Places API + Serper Maps",
      tools: "Google Places API • Serper Maps • Playwright Scraper",
      status: "SUCCESS",
      badge: "✓ 25 Found",
      progressText: "25 candidate dental clinics discovered",
      logicDescription:
        "Queries Google Places API, Serper Maps & Playwright Waterfall for dental clinics in specified locality.",
      duration: "14s",
      payload: [
        {
          id: 1,
          name: "Dentique Dental & Implant Centre",
          locality: "Sector 76, Noida",
          phone: "+91 98112 43210",
          source: "Google Places API",
          query: "dentist in sector 76 noida",
          status: "DISCOVERED",
        },
        {
          id: 2,
          name: "Dr. Jha Dental Studio",
          locality: "Sector 74, Noida",
          phone: "+91 99100 87654",
          source: "Serper Maps",
          query: "dental clinic near me",
          status: "DISCOVERED",
        },
        {
          id: 3,
          name: "Prime Dental & Aesthetic Clinic",
          locality: "Sector 62, Noida",
          phone: "+91 98111 22334",
          source: "Brave Search",
          query: "dental implants noida",
          status: "DISCOVERED",
        },
      ],
      error: null,
    },
    {
      id: 2,
      stepNumber: 2,
      name: "VERIFICATION",
      title: "2. Website Verification & HTTP Probe",
      subtitle: "HTTP Probes + Brave Search",
      tools: "HTTP 200/404 Probes • Brave Search No-Website Rule",
      status: "RUNNING",
      badge: "● Probing (14/25)",
      progressText: "Item 14 of 25 • 14 verified no-website (3 dropped)",
      logicDescription:
        "Probes domain HTTP status and performs deep search verification to ensure clinic has no active mobile-friendly website.",
      duration: "32s elapsed",
      payload: [
        {
          clinic: "Dr Jha Dental Studio",
          domain: "http://drjhadental.in",
          http_status: 404,
          has_mobile_site: false,
          verdict: "PASSED_NO_WEBSITE",
        },
        {
          clinic: "Dentique Dental & Implant Centre",
          domain: null,
          http_status: null,
          has_mobile_site: false,
          verdict: "PASSED_NO_WEBSITE",
        },
        {
          clinic: "Apollo White Dental",
          domain: "https://apollowhite.com",
          http_status: 200,
          verdict: "DROPPED_ACTIVE_CHAIN",
        },
      ],
      error: {
        hasError: false,
      },
    },
    {
      id: 3,
      stepNumber: 3,
      name: "DEEP RESEARCH",
      title: "3. Practo & Justdial Dossier Enrichment",
      subtitle: "Practo + J-Dial Doctor & IG",
      tools: "Practo Doctor Scraping • Justdial • Instagram Dossier",
      status: "QUEUED",
      badge: "11 Enriched",
      progressText: "11 doctor credentials & treatment packages staged",
      logicDescription:
        "Scrapes doctor educational qualifications, years of experience, patient reviews, and clinic specialty services.",
      duration: "Queued",
      payload: [
        {
          clinic: "Dentique Dental & Implant Centre",
          lead_doctor: "Dr. Rajeev Verma",
          degrees: "BDS, MDS (Prosthodontics)",
          experience_years: 14,
          practo_rating: 4.9,
          reviews_count: 142,
          treatments: ["Root Canal", "Dental Implants", "Invisalign", "Teeth Whitening"],
        },
      ],
      error: null,
    },
    {
      id: 4,
      stepNumber: 4,
      name: "NEXT.JS BUILD",
      title: "4. Multi-Template Next.js Demo Scaffold",
      subtitle: "3 Live Templates: Modern, Warm, Lux",
      tools: "add-clinic.ts • 3 Next.js Themes • Live HTTP Verification",
      status: "QUEUED",
      badge: "8 Packages Built",
      progressText: "8 clinics compiled across 3 luxury themes",
      logicDescription:
        "Scaffolds clinic data into Next.js Dental Engine and verifies HTTP 200 live status on localhost:3001.",
      duration: "Queued",
      payload: [
        {
          clinic_slug: "dentique-dental",
          themes_generated: ["modern", "warm", "lux"],
          routes: {
            modern: "http://localhost:3001/modern/dentique-dental",
            warm: "http://localhost:3001/warm/dentique-dental",
            lux: "http://localhost:3001/lux/dentique-dental",
          },
          status: "VERIFIED_HTTP_200",
        },
      ],
      error: null,
    },
    {
      id: 5,
      stepNumber: 5,
      name: "WALKTHROUGH",
      title: "5. Headless Video Walkthrough Recording",
      subtitle: "Headless MP4 Video Recorder",
      tools: "Playwright Headless • 45s Mobile Viewport • WebM/MP4",
      status: "QUEUED",
      badge: "8 MP4s Recorded",
      progressText: "8 mobile video walkthroughs rendered",
      logicDescription:
        "Spawns Playwright Chromium to record an authentic 45-second scrollable mobile preview of the clinic website.",
      duration: "Queued",
      payload: [
        {
          clinic: "Dentique Dental & Implant Centre",
          video_file: "public/videos/dentique-dental-walkthrough.mp4",
          resolution: "1080x1920 (Mobile)",
          duration_seconds: 45,
          status: "ENCODED_READY",
        },
      ],
      error: null,
    },
    {
      id: 6,
      stepNumber: 6,
      name: "REVIEW TRAY",
      title: "6. Sealed & Staged Review Tray Buffer",
      subtitle: "Sealed & Staged Ready for Pitch",
      tools: "Buffer Health Engine • One-Click Operator Approval",
      status: "QUEUED",
      badge: "8 in Buffer",
      progressText: "8 qualified dental clinics sealed & ready to send",
      logicDescription:
        "Stages validated packages with live links and walkthrough videos into the CRM Review Tray for operator dispatch.",
      duration: "Queued",
      payload: [
        {
          lead_id: 14,
          clinic_name: "Dentique Dental",
          preferred_channel: "whatsapp",
          package_sealed: true,
          est_value_inr: 25000,
        },
      ],
      error: null,
    },
  ]);

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
    appendTerminalLines([
      `[${new Date().toLocaleTimeString()}] [FACTORY] >>> RUN REFILL BATCH Triggered for ${targetLeads} qualified leads (${selectedLocality})...`,
      `[${new Date().toLocaleTimeString()}] [SCRAPE] Initializing 4-Tier Waterfall Discovery...`,
    ]);
    try {
      await handleTriggerRefill();
      notify(`Refill batch initiated for ${targetLeads} leads!`);
    } catch {
      // error handled in context
    } finally {
      setIsRunningPipeline(false);
    }
  };

  // Stop pipeline
  const handleStopPipeline = () => {
    setIsRunningPipeline(false);
    setActiveTerminalJob(null);
    appendTerminalLines([
      `[${new Date().toLocaleTimeString()}] [ALERT] Pipeline execution STOPPED by Captain. Workers detached.`,
    ]);
    notify("Pipeline workers stopped.", "err");
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
    <div className="space-y-6">
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
          {/* 1. Collapsible Compact Factory Runner Card */}
          <div className="p-3.5 sm:p-4 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-card transition-all duration-200">
            {/* Collapsed Header / Toggler Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setRunnerExpanded((prev) => !prev)}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors cursor-pointer text-left"
                title={runnerExpanded ? "Collapse Runner Controls" : "Expand Runner Controls"}
              >
                <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center font-bold">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      ⚡ {targetLeads} Leads Needed
                    </span>
                    {runnerExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {selectedLocality} &bull; Strict No-Website Rule
                  </div>
                </div>
              </button>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {!runnerExpanded && (
                  <button
                    type="button"
                    onClick={handleSyncBatchLinks}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    title="Verify live HTTP 200 on all 4 demo routes and sync batch.json"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  </button>
                )}

                {isRunningPipeline ? (
                  <button
                    type="button"
                    onClick={handleStopPipeline}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-900/30 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <AlertOctagon className="w-3.5 h-3.5" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRunRefillWithTarget}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>RUN REFILL ({targetLeads})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Expanded Controls Drawer */}
            {runnerExpanded && (
              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-white/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs animate-in fade-in duration-200">
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
                        className="w-full bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.08] rounded-xl px-2 py-1 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 text-center focus:outline-none focus:border-indigo-500"
                        placeholder="Custom"
                      />
                    </div>
                  </div>
                </div>

                {/* Locality Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Target Locality:
                  </label>
                  <select
                    value={selectedLocality}
                    onChange={(e) => setSelectedLocality(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#0E1017] border border-slate-200 dark:border-white/[0.08] rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Delhi NCR / Noida">Delhi NCR / Noida (Sector 76-78)</option>
                    <option value="South Delhi / Saket">South Delhi / Saket &amp; Malviya Nagar</option>
                    <option value="Gurugram / Cyber Hub">Gurugram / Cyber Hub &amp; DLF Phase 1-5</option>
                    <option value="West Delhi / Rajouri Garden">West Delhi / Rajouri Garden</option>
                    <option value="Bengaluru / Indiranagar">Bengaluru / Indiranagar &amp; Koramangala</option>
                  </select>
                </div>

                {/* Actions & Collapse */}
                <div className="space-y-1.5 flex flex-col justify-end">
                  <div className="flex items-center gap-2">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
            <div className="p-5 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-card flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.06]">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>📋 Batch End Results &amp; Structured Outputs</span>
                    </h3>
                    <p className="text-xs text-slate-400">Direct high-level summary of latest execution</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-bold">
                    🟢 IN PROGRESS
                  </span>
                </div>

                {/* Metrics Breakdown */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0E1017] border border-slate-200/70 dark:border-white/[0.05] space-y-2 text-xs">
                  <div className="flex items-center justify-between font-mono text-[11px] pb-1 border-b border-slate-200/50 dark:border-white/[0.04]">
                    <span className="text-slate-400">Run ID: #run-89 (Triggered 2m ago)</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Stage 2: Verification</span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 pt-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">• Target Requested:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{targetLeads} leads</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">• Candidate Leads:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">25 found</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">• Verified No-Site:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">14 passed (3 dropped)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">• Research Dossiers:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">11 enriched</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">• Multi-Demos Built:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">8 ready</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">• Review Tray Ready:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">8 in buffer</span>
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
                      100% Qualified
                    </span>
                  </div>

                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">
                      Dentique Dental &amp; Implant Centre
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Dr. Rajeev Verma &bull; Sec 76 Noida &bull; +91 98112 43210
                    </div>
                  </div>

                  {/* Ready live preview links */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <a
                      href="http://localhost:3000/demo/modern"
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span>🔗 Modern (200)</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>

                    <a
                      href="http://localhost:3000/demo/warm"
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 text-[10px] font-mono font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span>🔗 Warm (200)</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>

                    <a
                      href="http://localhost:3000/demo/lux"
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span>🔗 Lux (200)</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
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

          {/* 4. Dedicated Cockpit Factory Supervisor Agent UI Space (Docked at bottom) */}
          <CockpitSupervisorBar
            status={isRunningPipeline ? "RUNNING" : "MONITORING"}
            currentIntent="Monitoring Step 2... 14 clinics verified. Brave Search fallback ready if Serper encounters 429 rate limit."
            onSendCommand={handleSupervisorCommand}
            onEmergencyStop={handleStopPipeline}
          />
        </div>
      )}

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
