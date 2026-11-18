"use client";

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import {
  Trash2,
  Copy,
  Check,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Loader2,
} from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { env } from "@/config/env";

export interface BuildLogEntry {
  id?: number;
  seq: number;
  source?: string;
  service: string;
  level: string;
  lead_id?: number | null;
  message: string;
  line?: string;
  created_at?: string;
  timestamp?: string;
}

export interface DemoFactoryConsoleProps {
  isBuildRunning: boolean;
  runsCount: number;
  readyRunsCount: number;
  buildingRunsCount: number;
  recordedVideosCount?: number;
  failedRunsCount?: number;
  activeStageHint?: 1 | 2 | 3 | 4 | 5 | null;
}

export const DemoFactoryConsole: React.FC<DemoFactoryConsoleProps> = ({
  isBuildRunning,
  runsCount,
  readyRunsCount,
  buildingRunsCount,
  recordedVideosCount,
  activeStageHint,
}) => {
  const [logs, setLogs] = useState<BuildLogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [newLogsCount, setNewLogsCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isCleared, setIsCleared] = useState(false);

  // Strict 3-state pipeline machine: "idle" | "running" | "completed"
  const { pipelineMode, activeNode } = useMemo<{
    pipelineMode: "idle" | "running" | "completed";
    activeNode: 1 | 2 | 3 | 4 | 5 | null;
  }>(() => {
    const isRunning = isBuildRunning || buildingRunsCount > 0;

    // Newest-to-oldest scan: first log line matching a real backend stage tag wins
    let matchedStage: 1 | 2 | 3 | 4 | 5 | null = null;
    for (let i = logs.length - 1; i >= 0; i--) {
      const text = String(logs[i]?.message || logs[i]?.line || "");
      if (/\[demo-ready\]|demo_ready|outbox|attach.*crm/i.test(text)) matchedStage = 5;
      else if (/\[video\]|\[mp4\]|playwright|walkthrough|\.mp4|recording/i.test(text)) matchedStage = 4;
      else if (/\[audit\]|200 ok|http 200|route verif|verified/i.test(text)) matchedStage = 3;
      else if (/\[build\]|theme|compil|modern|premium|warm/i.test(text)) matchedStage = 2;
      else if (/\[research\]|scaffold|payload|schema|synthesiz/i.test(text)) matchedStage = 1;
      if (matchedStage !== null) break;
    }

    if (isRunning) {
      return { pipelineMode: "running", activeNode: matchedStage ?? activeStageHint ?? 1 };
    }
    if (logs.length > 0 && !isCleared) {
      return { pipelineMode: "completed", activeNode: null };
    }
    return { pipelineMode: "idle", activeNode: null };
  }, [isBuildRunning, buildingRunsCount, activeStageHint, logs, isCleared]);

  // Any new build activity or incoming log re-arms the pipeline after a terminal clear
  useEffect(() => {
    if (isBuildRunning || buildingRunsCount > 0) setIsCleared(false);
  }, [isBuildRunning, buildingRunsCount, logs.length]);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const seenSeqsRef = useRef<Set<number>>(new Set());

  // Node & Container measurement refs for flush port-to-port bezier curves
  const graphRef = useRef<HTMLDivElement | null>(null);
  const node1Ref = useRef<HTMLDivElement | null>(null);
  const node2Ref = useRef<HTMLDivElement | null>(null);
  const node3Ref = useRef<HTMLDivElement | null>(null);
  const node4Ref = useRef<HTMLDivElement | null>(null);
  const node5Ref = useRef<HTMLDivElement | null>(null);

  const [coords, setCoords] = useState<{
    p1Out: { x: number; y: number };
    p2In: { x: number; y: number };
    p2Out: { x: number; y: number };
    p3In: { x: number; y: number };
    p3Out: { x: number; y: number };
    p4In: { x: number; y: number };
    p4Out: { x: number; y: number };
    p5In: { x: number; y: number };
  }>({
    p1Out: { x: 170, y: 72 },
    p2In: { x: 260, y: 72 },
    p2Out: { x: 425, y: 72 },
    p3In: { x: 515, y: 168 },
    p3Out: { x: 595, y: 204 },
    p4In: { x: 495, y: 272 },
    p4Out: { x: 330, y: 272 },
    p5In: { x: 245, y: 272 },
  });

  const updateCoordinates = useCallback(() => {
    const g = graphRef.current;
    const r1 = node1Ref.current;
    const r2 = node2Ref.current;
    const r3 = node3Ref.current;
    const r4 = node4Ref.current;
    const r5 = node5Ref.current;

    if (!g || !r1 || !r2 || !r3 || !r4 || !r5) {
      return;
    }

    setCoords({
      p1Out: { x: r1.offsetLeft + r1.offsetWidth, y: r1.offsetTop + r1.offsetHeight / 2 },
      p2In: { x: r2.offsetLeft, y: r2.offsetTop + r2.offsetHeight / 2 },
      p2Out: { x: r2.offsetLeft + r2.offsetWidth, y: r2.offsetTop + r2.offsetHeight / 2 },
      p3In: { x: r3.offsetLeft, y: r3.offsetTop + r3.offsetHeight / 2 },
      p3Out: { x: r3.offsetLeft + r3.offsetWidth / 2, y: r3.offsetTop + r3.offsetHeight },
      p4In: { x: r4.offsetLeft + r4.offsetWidth, y: r4.offsetTop + r4.offsetHeight / 2 },
      p4Out: { x: r4.offsetLeft, y: r4.offsetTop + r4.offsetHeight / 2 },
      p5In: { x: r5.offsetLeft + r5.offsetWidth, y: r5.offsetTop + r5.offsetHeight / 2 },
    });
  }, []);

  useLayoutEffect(() => {
    updateCoordinates();
    const rafId = requestAnimationFrame(() => {
      updateCoordinates();
    });
    return () => cancelAnimationFrame(rafId);
  }, [updateCoordinates]);

  useEffect(() => {
    updateCoordinates();
    window.addEventListener("resize", updateCoordinates);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && graphRef.current) {
      ro = new ResizeObserver(() => {
        updateCoordinates();
      });
      ro.observe(graphRef.current);
      if (node1Ref.current) ro.observe(node1Ref.current);
      if (node2Ref.current) ro.observe(node2Ref.current);
      if (node3Ref.current) ro.observe(node3Ref.current);
      if (node4Ref.current) ro.observe(node4Ref.current);
      if (node5Ref.current) ro.observe(node5Ref.current);
    }

    return () => {
      window.removeEventListener("resize", updateCoordinates);
      if (ro) ro.disconnect();
    };
  }, [updateCoordinates]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await apiFetch<BuildLogEntry[] | { logs: BuildLogEntry[]; latest_seq: number }>(
        "/api/terminal/logs?service=building&limit=200"
      );
      const items: BuildLogEntry[] = Array.isArray(res) ? res : res?.logs || [];
      const seen = new Set<number>();
      items.forEach((item) => {
        if (typeof item.seq === "number") seen.add(item.seq);
      });
      seenSeqsRef.current = seen;
      setLogs(items);
    } catch {
      // Backend initializing
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    let es: EventSource | null = null;
    let isCancelled = false;

    try {
      es = new EventSource(`${env.NEXT_PUBLIC_API_BASE_URL}/api/events`);

      es.addEventListener("terminal_log", (e: MessageEvent) => {
        if (isCancelled) return;
        try {
          const entry: BuildLogEntry = JSON.parse(e.data);
          const svc = (entry.service || "").toLowerCase();
          const src = (entry.source || "").toLowerCase();
          const isBuildService =
            svc === "building" ||
            svc.includes("record") ||
            svc.includes("video") ||
            svc.includes("walkthrough") ||
            svc.includes("verify") ||
            src.includes("record") ||
            src.includes("video") ||
            src.includes("walkthrough") ||
            src.includes("build") ||
            src.includes("factory") ||
            src.includes("verify");
          if (entry.service && !isBuildService) {
            return;
          }
          if (typeof entry.seq === "number" && seenSeqsRef.current.has(entry.seq)) {
            return;
          }
          if (typeof entry.seq === "number") {
            seenSeqsRef.current.add(entry.seq);
          }
          setLogs((prev) => [...prev.slice(-300), entry]);
          if (!autoScroll) {
            setNewLogsCount((c) => c + 1);
          }
        } catch {
          // ignore parsing error
        }
      });
    } catch {
      // offline fallback
    }

    return () => {
      isCancelled = true;
      if (es) es.close();
    };
  }, [autoScroll]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    if (distanceFromBottom > 35 && autoScroll) {
      setAutoScroll(false);
    } else if (distanceFromBottom <= 10 && !autoScroll) {
      setAutoScroll(true);
      setNewLogsCount(0);
    }
  };

  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const resumeAutoScroll = () => {
    setAutoScroll(true);
    setNewLogsCount(0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp || l.created_at || ""}] [${l.level}] ${l.message || l.line || ""}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearLogs = () => {
    setLogs([]);
    setIsCleared(true);
    seenSeqsRef.current.clear();
    apiFetch("/api/terminal/clear?service=building", { method: "POST" }).catch(() => {});
  };

  type NodeVisual = "active" | "completed" | "idle";
  const getNodeVisual = (nodeIndex: 1 | 2 | 3 | 4 | 5): NodeVisual => {
    if (pipelineMode === "idle") return "idle";
    if (pipelineMode === "completed") return "completed";
    if (activeNode === nodeIndex) return "active";
    if (activeNode !== null && nodeIndex < activeNode) return "completed";
    return "idle";
  };

  const renderNodeIndicator = (nodeIndex: 1 | 2 | 3 | 4 | 5) => {
    const visual = getNodeVisual(nodeIndex);
    if (visual === "active") {
      return <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin shrink-0" />;
    }
    if (visual === "completed") {
      if (nodeIndex === 5) {
        return <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0 shadow-[0_0_6px_rgba(14,165,233,0.7)]" />;
      }
      return <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_6px_rgba(16,185,129,0.7)]" />;
    }
    return <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-600 shrink-0" />;
  };

  const nodeCardClass = (nodeIndex: 1 | 2 | 3 | 4 | 5) => {
    if (getNodeVisual(nodeIndex) === "active") {
      return "border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/25 shadow-indigo-500/10";
    }
    if (nodeIndex === 5 && pipelineMode === "completed") {
      return "border-zinc-900 dark:border-sky-500/50 ring-2 ring-zinc-900/10 dark:ring-sky-500/40";
    }
    return "border-slate-200/90 dark:border-zinc-800";
  };

  const isCurveActive = (k: number) =>
    pipelineMode === "running" && (activeNode === k || activeNode === k + 1);

  const curveClass = (k: number) => {
    if (pipelineMode === "completed") return "stroke-emerald-500/60 dark:stroke-emerald-400/50";
    if (pipelineMode === "idle") return "stroke-slate-400 dark:stroke-zinc-600";
    return isCurveActive(k)
      ? "stroke-indigo-500 dark:stroke-indigo-400 transition-all duration-300"
      : "stroke-slate-400 dark:stroke-zinc-600";
  };

  const pillClass = (k: number) =>
    `absolute -translate-x-1/2 -translate-y-1/2 z-20 border shadow-2xs text-[9px] font-medium px-2 py-0.5 rounded-full font-mono pointer-events-none whitespace-nowrap ${
      isCurveActive(k)
        ? "border-indigo-500/50 text-indigo-600 dark:text-indigo-300 bg-indigo-50/90 dark:bg-indigo-950/90"
        : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300"
    }`;

  // Edge 1 (1 -> 2) & Edge 2 (2 -> 3): Left to Right
  const getBezierLeftToRight = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    const dx = Math.max(25, (end.x - start.x) * 0.5);
    return `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`;
  };

  // Edge 3 (3 -> 4): Bottom port to Right port (curves down and left)
  const getBezierDownToLeft = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    const dy = Math.max(30, (end.y - start.y) * 0.6);
    const dx = Math.max(35, (start.x - end.x) * 0.5);
    return `M ${start.x} ${start.y} C ${start.x} ${start.y + dy}, ${end.x + dx} ${end.y}, ${end.x} ${end.y}`;
  };

  // Edge 4 (4 -> 5): Right to Left
  const getBezierRightToLeft = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    const dx = Math.max(25, (start.x - end.x) * 0.5);
    return `M ${start.x} ${start.y} C ${start.x - dx} ${start.y}, ${end.x + dx} ${end.y}, ${end.x} ${end.y}`;
  };

  const mid1_2 = {
    x: (coords.p1Out.x + coords.p2In.x) / 2,
    y: (coords.p1Out.y + coords.p2In.y) / 2,
  };

  const mid2_3 = {
    x: (coords.p2Out.x + coords.p3In.x) / 2,
    y: (coords.p2Out.y + coords.p3In.y) / 2,
  };

  // Evaluated at t = 0.5 for cubic bezier: B(0.5) = 0.125*P0 + 0.375*P1 + 0.375*P2 + 0.125*P3
  const getDownToLeftMidpoint = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    const dy = Math.max(30, (end.y - start.y) * 0.6);
    const dx = Math.max(35, (start.x - end.x) * 0.5);
    const p0 = start;
    const p1 = { x: start.x, y: start.y + dy };
    const p2 = { x: end.x + dx, y: end.y };
    const p3 = end;
    return {
      x: 0.125 * p0.x + 0.375 * p1.x + 0.375 * p2.x + 0.125 * p3.x,
      y: 0.125 * p0.y + 0.375 * p1.y + 0.375 * p2.y + 0.125 * p3.y,
    };
  };
  const mid3_4 = getDownToLeftMidpoint(coords.p3Out, coords.p4In);

  const mid4_5 = {
    x: (coords.p4Out.x + coords.p5In.x) / 2,
    y: (coords.p4Out.y + coords.p5In.y) / 2,
  };

  return (
    <div className="grid grid-cols-12 gap-4 items-stretch">
      {/* Left Column: Background-Free Floating 5-Node Directed Graph (col-span-12 lg:col-span-7 h-[400px]) */}
      <div
        className="col-span-12 lg:col-span-7 relative h-[400px] w-full bg-transparent border-none shadow-none pr-4 select-none overflow-x-auto lg:overflow-visible"
      >
        <div ref={graphRef} className="min-w-[650px] lg:min-w-0 w-full h-full relative">
          {/* Flush Port-to-Port SVG Cubic-Bezier Curved Connector Paths */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
            <defs>
              <marker
                id="dag-arrow-flush"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <polygon
                  points="0 1, 7 4, 0 7"
                  className="fill-slate-400 dark:fill-zinc-500"
                />
              </marker>
            </defs>

            {/* Curve 1: Node 1 (Clinic Research) -> Node 2 (3x Theme Compiler) */}
            <path
              d={getBezierLeftToRight(coords.p1Out, coords.p2In)}
              fill="none"
              strokeWidth="1.75"
              className={curveClass(1)}
              strokeDasharray={isCurveActive(1) ? "5 4" : undefined}
              markerEnd="url(#dag-arrow-flush)"
            >
              {isCurveActive(1) && (
                <animate attributeName="stroke-dashoffset" from="18" to="0" dur="0.7s" repeatCount="indefinite" />
              )}
            </path>

            {/* Curve 2: Node 2 (Theme Compiler) -> Node 3 (HTTP 200 Audit) */}
            <path
              d={getBezierLeftToRight(coords.p2Out, coords.p3In)}
              fill="none"
              strokeWidth="1.75"
              className={curveClass(2)}
              strokeDasharray={isCurveActive(2) ? "5 4" : undefined}
              markerEnd="url(#dag-arrow-flush)"
            >
              {isCurveActive(2) && (
                <animate attributeName="stroke-dashoffset" from="18" to="0" dur="0.7s" repeatCount="indefinite" />
              )}
            </path>

            {/* Curve 3: Node 3 (HTTP 200 Audit) -> Node 4 (Playwright 9:16) */}
            <path
              d={getBezierDownToLeft(coords.p3Out, coords.p4In)}
              fill="none"
              strokeWidth="1.75"
              className={curveClass(3)}
              strokeDasharray={isCurveActive(3) ? "5 4" : undefined}
              markerEnd="url(#dag-arrow-flush)"
            >
              {isCurveActive(3) && (
                <animate attributeName="stroke-dashoffset" from="18" to="0" dur="0.7s" repeatCount="indefinite" />
              )}
            </path>

            {/* Curve 4: Node 4 (Playwright 9:16) -> Node 5 (Outbox Sync) */}
            <path
              d={getBezierRightToLeft(coords.p4Out, coords.p5In)}
              fill="none"
              strokeWidth="1.75"
              className={curveClass(4)}
              strokeDasharray={isCurveActive(4) ? "5 4" : undefined}
              markerEnd="url(#dag-arrow-flush)"
            >
              {isCurveActive(4) && (
                <animate attributeName="stroke-dashoffset" from="18" to="0" dur="0.7s" repeatCount="indefinite" />
              )}
            </path>
          </svg>

          {/* Floating Pill Labels Sitting Along Curves */}
          <span
            style={{ left: `${mid1_2.x}px`, top: `${mid1_2.y}px` }}
            className={pillClass(1)}
          >
            synthesized
          </span>

          <span
            style={{ left: `${mid2_3.x}px`, top: `${mid2_3.y}px` }}
            className={pillClass(2)}
          >
            compiled
          </span>

          <span
            style={{ left: `${mid3_4.x}px`, top: `${mid3_4.y}px` }}
            className={pillClass(3)}
          >
            verified
          </span>

          <span
            style={{ left: `${mid4_5.x}px`, top: `${mid4_5.y}px` }}
            className={pillClass(4)}
          >
            mp4 ready
          </span>

          {/* Node 1: Top-Left (Start) - 1. Clinic Research */}
          <div
            ref={node1Ref}
            className={`absolute left-[0%] top-[36px] z-10 bg-white dark:bg-zinc-900 rounded-2xl border px-3.5 py-2.5 shadow-md shadow-slate-900/5 hover:shadow-lg transition-all w-[155px] xl:w-[165px] ${nodeCardClass(1)}`}
          >
            <div className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center justify-between">
              <span className="truncate">1. Clinic Research</span>
              {renderNodeIndicator(1)}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
              Payload &amp; Schema
            </div>
            <span className="bg-slate-100 dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md mt-1.5 inline-block">
              {runsCount} synthesized
            </span>
            {/* Output Port (Right) */}
            <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white dark:bg-zinc-900 border-2 border-slate-400 dark:border-zinc-500 z-20" />
          </div>

          {/* Node 2: Top-Center - 2. 3x Theme Compiler */}
          <div
            ref={node2Ref}
            className={`absolute left-[41%] top-[36px] z-10 bg-white dark:bg-zinc-900 rounded-2xl border px-3.5 py-2.5 shadow-md shadow-slate-900/5 hover:shadow-lg transition-all w-[155px] xl:w-[165px] ${nodeCardClass(2)}`}
          >
            <div className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center justify-between">
              <span className="truncate">2. 3x Theme Compiler</span>
              {renderNodeIndicator(2)}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
              Modern · Premium · Warm
            </div>
            <span className="bg-slate-100 dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md mt-1.5 inline-block">
              {readyRunsCount * 3} routes
            </span>
            {/* Input Port (Left) & Output Port (Right) */}
            <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white dark:bg-zinc-900 border-2 border-slate-400 dark:border-zinc-500 z-20" />
            <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white dark:bg-zinc-900 border-2 border-slate-400 dark:border-zinc-500 z-20" />
          </div>

          {/* Node 3: Middle-Right - 3. HTTP 200 Audit */}
          <div
            ref={node3Ref}
            className={`absolute left-[74%] top-[132px] z-10 bg-white dark:bg-zinc-900 rounded-2xl border px-3.5 py-2.5 shadow-md shadow-slate-900/5 hover:shadow-lg transition-all w-[155px] xl:w-[165px] ${nodeCardClass(3)}`}
          >
            <div className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center justify-between">
              <span className="truncate">3. HTTP 200 Audit</span>
              {renderNodeIndicator(3)}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
              Route Verification
            </div>
            <span className="bg-slate-100 dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md mt-1.5 inline-block">
              {readyRunsCount} 200 OK
            </span>
            {/* Input Port (Left) & Output Port (Bottom) */}
            <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white dark:bg-zinc-900 border-2 border-slate-400 dark:border-zinc-500 z-20" />
            <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white dark:bg-zinc-900 border-2 border-slate-400 dark:border-zinc-500 z-20" />
          </div>

          {/* Node 4: Bottom-Center - 4. Playwright 9:16 */}
          <div
            ref={node4Ref}
            className={`absolute left-[46%] top-[236px] z-10 bg-white dark:bg-zinc-900 rounded-2xl border px-3.5 py-2.5 shadow-md shadow-slate-900/5 hover:shadow-lg transition-all w-[155px] xl:w-[165px] ${nodeCardClass(4)}`}
          >
            <div className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center justify-between">
              <span className="truncate">4. Playwright 9:16</span>
              {renderNodeIndicator(4)}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
              Mobile Walkthrough
            </div>
            <span className="bg-slate-100 dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md mt-1.5 inline-block">
              {recordedVideosCount ?? readyRunsCount} mp4s
            </span>
            {/* Input Port (Right) & Output Port (Left) */}
            <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white dark:bg-zinc-900 border-2 border-slate-400 dark:border-zinc-500 z-20" />
            <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white dark:bg-zinc-900 border-2 border-slate-400 dark:border-zinc-500 z-20" />
          </div>

          {/* Node 5: Bottom-Left (Terminal Node) - 5. Outbox Sync */}
          <div
            ref={node5Ref}
            className={`absolute left-[3%] top-[236px] z-10 bg-white dark:bg-zinc-900 rounded-2xl border px-3.5 py-2.5 shadow-md shadow-slate-900/5 hover:shadow-lg transition-all w-[155px] xl:w-[165px] ${nodeCardClass(5)}`}
          >
            <div className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center justify-between">
              <span className="truncate">5. Outbox Sync</span>
              {renderNodeIndicator(5)}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
              Attached to CRM
            </div>
            <span className="bg-slate-100 dark:bg-zinc-800 text-sky-700 dark:text-sky-400 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md mt-1.5 inline-block">
              {readyRunsCount} ready to send
            </span>
            {/* Terminal Input Port (Right) */}
            <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-sky-400 z-20" />
          </div>
        </div>
      </div>

      {/* Right Column: Taller h-[400px] Minimal Log Box (col-span-12 lg:col-span-5) */}
      <div className="col-span-12 lg:col-span-5 relative h-[400px] rounded-2xl bg-zinc-950 border border-zinc-800/90 shadow-lg overflow-hidden">
        {/* Floating Action Buttons: Copy & Clear positioned away from scrollbar at right-6 */}
        <div className="absolute top-3.5 right-6 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyLogs}
            className="bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-lg p-1.5 backdrop-blur-xs transition-colors cursor-pointer"
            title="Copy logs to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleClearLogs}
            className="bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-lg p-1.5 backdrop-blur-xs transition-colors cursor-pointer"
            title="Clear visible logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable Log Stream with dark scrollbar and pr-20 to avoid button text overlap */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto p-5 pr-20 space-y-2 select-text font-mono text-[11px] leading-relaxed text-zinc-300 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full"
        >
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 italic text-center">
              <Database className="w-4 h-4 mb-1 text-zinc-600" />
              <span>Waiting for live build telemetry...</span>
            </div>
          ) : (
            logs.map((log, idx) => {
              const key = log.id ? `log-${log.id}` : `seq-${log.seq || idx}`;
              const ts = log.timestamp
                ? new Date(log.timestamp).toLocaleTimeString()
                : log.created_at
                ? new Date(log.created_at).toLocaleTimeString()
                : "";
              const lvl = (log.level || "INFO").toUpperCase();
              const rawMsg = log.message || log.line || "";

              let icon = <span className="text-zinc-600">▸</span>;
              if (lvl === "ERROR") {
                icon = <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 inline" />;
              } else if (lvl === "WARN") {
                icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 inline" />;
              } else if (
                rawMsg.toLowerCase().includes("verified") ||
                rawMsg.toLowerCase().includes("success") ||
                rawMsg.toLowerCase().includes("ready") ||
                rawMsg.toLowerCase().includes("passed") ||
                rawMsg.toLowerCase().includes("complete")
              ) {
                icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 inline" />;
              }

              return (
                <div key={key} className="flex items-start gap-2 leading-relaxed break-all">
                  {ts && <span className="text-zinc-600 select-none shrink-0">[{ts}]</span>}
                  <span className="shrink-0">{icon}</span>
                  <span className="flex-1 text-zinc-300">{rawMsg}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Paused Auto-Scroll banner */}
        {!autoScroll && newLogsCount > 0 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
            <button
              type="button"
              onClick={resumeAutoScroll}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-[11px] font-semibold shadow-lg border border-zinc-700 transition-all cursor-pointer animate-bounce"
            >
              <ArrowDown className="w-3 h-3 text-emerald-400" />
              <span>Auto-scroll paused ({newLogsCount} new) - Resume</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
