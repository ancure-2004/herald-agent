"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DemoRun, LogLevel } from "../types";
import {
  X,
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  ExternalLink,
  Check,
  Copy,
  Layers,
  Sparkles,
  Palette,
  Flame,
  RotateCw,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Circle,
  Search,
  AlertTriangle,
  Film,
  ListTree,
  Gauge,
  QrCode,
} from "lucide-react";

interface MultiDevicePreviewDrawerProps {
  run: DemoRun | null;
  isOpen: boolean;
  onClose: () => void;
  onRetry?: (runId: string) => void;
}

type ThemeMode = "choice" | "modern" | "premium" | "warm";
type DeviceCategory = "phone" | "tablet" | "laptop" | "pc";
type InspectorTab = "audit" | "routes" | "mobile";
type LogFilter = "ALL" | "INFO" | "WARN" | "ERROR";

interface DevicePreset {
  id: string;
  label: string;
  category: DeviceCategory;
  w: number;
  h: number;
}

const PRESETS: DevicePreset[] = [
  { id: "iphone-15-pro", label: "iPhone 15 Pro (393×852)", category: "phone", w: 393, h: 852 },
  { id: "galaxy-s22", label: "Samsung Galaxy S22 (360×780)", category: "phone", w: 360, h: 780 },
  { id: "iphone-se", label: "iPhone SE (375×667)", category: "phone", w: 375, h: 667 },
  { id: "ipad-mini", label: 'iPad Mini 8.3" (768×1024)', category: "tablet", w: 768, h: 1024 },
  { id: "ipad-air", label: 'iPad Air 10.9" (820×1180)', category: "tablet", w: 820, h: 1180 },
  { id: "ipad-pro", label: 'iPad Pro 12.9" (1024×1366)', category: "tablet", w: 1024, h: 1366 },
  { id: "macbook-air", label: '13.3" MacBook Air (1280×800)', category: "laptop", w: 1280, h: 800 },
  { id: "laptop-hd", label: '14" Laptop HD+ (1366×768)', category: "laptop", w: 1366, h: 768 },
  { id: "laptop-pro", label: '15.6" Laptop Pro (1440×900)', category: "laptop", w: 1440, h: 900 },
  { id: "desktop-fhd", label: '24" Desktop FHD (1920×1080)', category: "pc", w: 1920, h: 1080 },
];

const CATEGORIES: { key: DeviceCategory; label: string; Icon: React.ElementType }[] = [
  { key: "phone", label: "Phone", Icon: Smartphone },
  { key: "tablet", label: "Tablet", Icon: Tablet },
  { key: "laptop", label: "Laptop", Icon: Laptop },
  { key: "pc", label: "PC", Icon: Monitor },
];

const THEMES: { key: ThemeMode; label: string; Icon: React.ElementType; path: string }[] = [
  { key: "choice", label: "Choice Page", Icon: Layers, path: "demo" },
  { key: "modern", label: "Modern", Icon: Sparkles, path: "modern" },
  { key: "premium", label: "Premium", Icon: Palette, path: "premium" },
  { key: "warm", label: "Warm", Icon: Flame, path: "warm" },
];

const LOG_LEVEL_STYLE: Record<string, string> = {
  INFO: "text-sky-400",
  WARN: "text-amber-400",
  ERROR: "text-rose-400",
  DEBUG: "text-slate-500",
};

const BASE_URL = "http://localhost:3001";

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic QR-style matrix preview (visual placeholder, not scannable). */
const QrPreview: React.FC<{ value: string }> = ({ value }) => {
  const size = 21;
  const cells = useMemo(() => {
    const out: boolean[] = [];
    let seed = hashString(value) || 1;
    const finder = (x: number, y: number) => {
      const inBox = (ox: number, oy: number) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7;
      const check = (ox: number, oy: number) => {
        const dx = x - ox;
        const dy = y - oy;
        const edge = dx === 0 || dx === 6 || dy === 0 || dy === 6;
        const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
        return edge || core;
      };
      if (inBox(0, 0)) return check(0, 0);
      if (inBox(size - 7, 0)) return check(size - 7, 0);
      if (inBox(0, size - 7)) return check(0, size - 7);
      return null;
    };
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const f = finder(x, y);
        if (f !== null) {
          out.push(f);
        } else {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          out.push((seed >>> 16) % 2 === 0);
        }
      }
    }
    return out;
  }, [value]);

  return (
    <div className="bg-white p-2 rounded-lg inline-block">
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: 112, height: 112 }}
      >
        {cells.map((on, i) => (
          <div key={i} className={on ? "bg-black" : "bg-white"} />
        ))}
      </div>
    </div>
  );
};

const stageState = (status: unknown): "done" | "running" | "failed" | "pending" => {
  const s = String(status || "").toUpperCase();
  if (["SUCCESS", "SUCCEEDED", "DONE", "COMPLETED", "COMPLETE", "PASSED", "READY"].includes(s)) return "done";
  if (["RUNNING", "IN_PROGRESS", "ACTIVE", "BUILDING", "SCAFFOLDING", "RECORDING", "DEPLOYING"].includes(s)) return "running";
  if (["FAILED", "ERROR", "CANCELED"].includes(s)) return "failed";
  return "pending";
};

const statusBadgeClass = (status: string): string => {
  switch (status) {
    case "READY":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "FAILED":
      return "bg-rose-500/15 text-rose-300 border-rose-500/30";
    case "CANCELED":
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
    case "QUEUED":
      return "bg-slate-500/15 text-slate-300 border-slate-500/30";
    default:
      return "bg-indigo-500/15 text-indigo-300 border-indigo-500/30";
  }
};

export const MultiDevicePreviewDrawer: React.FC<MultiDevicePreviewDrawerProps> = ({
  run,
  isOpen,
  onClose,
  onRetry,
}) => {
  const [theme, setTheme] = useState<ThemeMode>("modern");
  const [copied, setCopied] = useState<boolean>(false);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [category, setCategory] = useState<DeviceCategory>("phone");
  const [presetId, setPresetId] = useState<string>(PRESETS[0].id);
  const [viewportW, setViewportW] = useState<number>(PRESETS[0].w);
  const [viewportH, setViewportH] = useState<number>(PRESETS[0].h);
  const [autoFit, setAutoFit] = useState<boolean>(true);
  const [stageSize, setStageSize] = useState<{ w: number; h: number }>({ w: 800, h: 680 });
  const [logFilter, setLogFilter] = useState<LogFilter>("ALL");
  const [logSearch, setLogSearch] = useState<string>("");
  const [tab, setTab] = useState<InspectorTab>("audit");
  const [copiedRoute, setCopiedRoute] = useState<ThemeMode | null>(null);
  const [clinicDetails, setClinicDetails] = useState<{ doctorName?: string; credentials?: string; tagline?: string; address?: string; servicesCount?: number } | null>(null);

  const [upperTab, setUpperTab] = useState<"stages" | "logs">("logs");
  const stageRef = useRef<HTMLDivElement | null>(null);
  const visible = isOpen && !!run;

  // Escape closes the drawer
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, onClose]);

  // Measure the stage canvas
  useEffect(() => {
    if (!visible) return;
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setStageSize({ w: Math.round(r.width), h: Math.round(r.height) });
      }
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setStageSize({ w: Math.round(width), h: Math.round(height) });
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [visible]);

  const clinicSlug = run
    ? run.clinic.website || run.clinic.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    : "";

  useEffect(() => {
    if (!isOpen || !clinicSlug) return;
    let cancelled = false;
    fetch(`http://localhost:8000/api/v1/public/clinic/${clinicSlug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const c = data.clinic || data;
        const doc = c.doctor || data.doctor || {};
        setClinicDetails({
          doctorName: doc.name || c.doctorName || data.doctor_name || undefined,
          credentials: doc.credentials || doc.qualification || c.credentials || undefined,
          tagline: c.tagline || data.tagline || undefined,
          address: c.address?.full || c.address || data.address || undefined,
          servicesCount: Array.isArray(data.services) ? data.services.length : undefined,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen, clinicSlug]);

  if (!isOpen || !run) return null;

  const slug =
    run.clinic.website ||
    run.clinic.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const getThemeUrl = (t: ThemeMode): string => {
    const p = run.preview;
    switch (t) {
      case "choice":
        return p?.choiceUrl || `${BASE_URL}/demo/${slug}`;
      case "premium":
        return p?.premiumUrl || `${BASE_URL}/premium/${slug}`;
      case "warm":
        return p?.warmUrl || `${BASE_URL}/warm/${slug}`;
      case "modern":
      default:
        return p?.modernUrl || `${BASE_URL}/modern/${slug}`;
    }
  };

  const currentUrl = getThemeUrl(theme);

  const bezelH = 0;
  const availW = Math.max(260, stageSize.w - 36);
  const availH = Math.max(260, stageSize.h - 40);
  const scale = autoFit ? Math.min(1, availW / viewportW, availH / viewportH) : 1;
  const frameW = Math.round(viewportW * scale);
  const frameH = Math.round(viewportH * scale);

  const clampDim = (n: number) => Math.min(2560, Math.max(320, Math.round(n) || 320));

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyRoute = (t: ThemeMode) => {
    navigator.clipboard.writeText(getThemeUrl(t));
    setCopiedRoute(t);
    setTimeout(() => setCopiedRoute(null), 1500);
  };

  const handleRefresh = () => setIframeKey((k) => k + 1);

  const applyPreset = (p: DevicePreset) => {
    setPresetId(p.id);
    setCategory(p.category);
    setViewportW(p.w);
    setViewportH(p.h);
  };

  const handleCategory = (c: DeviceCategory) => {
    const first = PRESETS.find((p) => p.category === c);
    if (first) applyPreset(first);
  };

  const handlePresetSelect = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (p) applyPreset(p);
  };

  // Logs
  const filteredLogs = (run.logs || []).filter((l) => {
    const level = l.level as LogLevel;
    if (logFilter !== "ALL" && level !== logFilter) return false;
    if (logSearch.trim()) {
      return String(l.message).toLowerCase().includes(logSearch.trim().toLowerCase());
    }
    return true;
  });

  const stages = (run.stages || []).slice(0, 5);

  const videoName = run.preview?.videoFilePath || `Clinic-${slug}.mp4`;
  const hasVideo = !!run.preview?.videoFilePath;
  const dotColor =
    run.status === "READY"
      ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
      : run.status === "FAILED"
      ? "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
      : run.status === "CANCELED" || run.status === "QUEUED"
      ? "bg-slate-400"
      : "bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)] animate-pulse";

  const tabs: { key: InspectorTab; label: string; Icon: React.ElementType }[] = [
    { key: "audit", label: "Clinic Profile", Icon: Gauge },
    { key: "routes", label: "Routes & Themes (4)", Icon: ListTree },
    { key: "mobile", label: "Mobile QR & Video", Icon: QrCode },
  ];

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 top-0 left-0 w-screen h-screen z-[99999] overflow-hidden bg-black/75 backdrop-blur-xs flex justify-end animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[min(96vw,1480px)] h-screen bg-[#0B0D13] border-l border-white/[0.1] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-14 px-4 bg-[#12151E] border-b border-white/[0.08] flex items-center justify-between gap-3 shrink-0 overflow-hidden">
          <div className="min-w-0 flex-1 max-w-[300px] flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-bold text-xs text-white">{run.clinic.name}</span>
                <span className="shrink-0 font-mono text-[10px] text-slate-400 bg-white/[0.05] px-1.5 py-0.5 rounded border border-white/[0.08]">
                  {run.templateId}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                <span className="truncate">{currentUrl}</span>
                <button
                  onClick={handleCopy}
                  className="shrink-0 text-slate-500 hover:text-white cursor-pointer"
                  title="Copy URL"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center p-1 rounded-xl bg-[#1A1D27] border border-white/[0.08] text-xs">
            {THEMES.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setTheme(key)}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                  theme === key
                    ? "bg-indigo-600 text-white font-semibold shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="shrink-0 flex items-center gap-1.5">
            <button
              onClick={handleRefresh}
              className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Refresh Iframe"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-colors"
              title="Open in New Tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors ml-1 cursor-pointer"
              title="Close Drawer (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Split body */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: viewport engine */}
          <div className="flex-1 min-w-0 flex flex-col bg-[#08090D]">
            <div className="px-3 py-2 bg-[#10131C] border-b border-white/[0.06] flex items-center justify-between gap-2 flex-wrap text-[11px] font-mono shrink-0">
              <div className="flex items-center p-0.5 rounded-lg bg-[#1A1D27] border border-white/[0.08]">
                {CATEGORIES.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    onClick={() => handleCategory(key)}
                    className={`px-2 py-1 rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
                      category === key
                        ? "bg-[#292C35] text-white font-semibold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <select
                value={presetId}
                onChange={(e) => handlePresetSelect(e.target.value)}
                className="px-1.5 py-1 bg-[#1A1D27] border border-white/10 rounded text-white text-[11px] cursor-pointer max-w-[210px]"
              >
                {CATEGORIES.map(({ key, label }) => (
                  <optgroup key={key} label={label}>
                    {PRESETS.filter((p) => p.category === key).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

              <div className="flex items-center gap-1 text-slate-400">
                <input
                  type="number"
                  min={320}
                  max={2560}
                  value={viewportW}
                  onChange={(e) => setViewportW(clampDim(Number(e.target.value)))}
                  className="w-16 px-1.5 py-0.5 bg-[#1A1D27] border border-white/10 rounded text-white text-center"
                />
                <span>×</span>
                <input
                  type="number"
                  min={320}
                  max={2560}
                  value={viewportH}
                  onChange={(e) => setViewportH(clampDim(Number(e.target.value)))}
                  className="w-16 px-1.5 py-0.5 bg-[#1A1D27] border border-white/10 rounded text-white text-center"
                />
              </div>

              <input
                type="range"
                min={320}
                max={1920}
                value={Math.min(1920, Math.max(320, viewportW))}
                onChange={(e) => setViewportW(Number(e.target.value))}
                className="w-24 accent-indigo-500 cursor-pointer"
              />

              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-slate-300">
                  {`Scale: ${Math.round(scale * 100)}%`}
                </span>
                <button
                  onClick={() => setAutoFit((v) => !v)}
                  className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    autoFit
                      ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                      : "bg-white/[0.05] border-white/[0.08] text-slate-300"
                  }`}
                >
                  {autoFit ? "Auto-Fit" : "100%"}
                </button>
              </div>
            </div>

            {/* Stage canvas */}
            <div
              ref={stageRef}
              className={`flex-1 min-h-0 relative bg-[radial-gradient(#ffffff12_1px,transparent_1px)] [background-size:20px_20px] ${
                autoFit ? "overflow-hidden" : "overflow-auto"
              }`}
            >
              <div
                className="flex items-center justify-center"
                style={{ minWidth: "100%", minHeight: "100%", width: "max-content", padding: 18 }}
              >
                <div
                  className={`bg-white shadow-2xl overflow-hidden shrink-0 transition-all ${
                    category === "phone" || category === "tablet"
                      ? "rounded-[24px] border-[6px] border-[#1E2230] ring-1 ring-white/10"
                      : "rounded-xl border-2 border-[#252A3A] ring-1 ring-white/10"
                  }`}
                  style={{ width: frameW, height: frameH }}
                >
                  <div
                    style={{
                      width: frameW,
                      height: frameH,
                      overflow: "hidden",
                      background: "white",
                    }}
                  >
                    <iframe
                      key={iframeKey}
                      src={currentUrl}
                      title={`${run.clinic.name} Live Demo Preview`}
                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                      style={{
                        width: `${viewportW}px`,
                        height: `${viewportH}px`,
                        transform: `scale(${scale})`,
                        transformOrigin: "top left",
                        border: 0,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT pane */}
          <div className="w-[560px] xl:w-[620px] shrink-0 border-l border-white/[0.08] flex flex-col bg-[#0E1017]">
            {/* Upper: build telemetry */}
            <div className="h-[52%] border-b border-white/[0.08] flex flex-col overflow-hidden">
              <div className="px-3 py-2 bg-[#12151E] border-b border-white/[0.06] flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0 text-[10px] font-mono">
                  <span className="font-bold text-slate-200 tracking-wider truncate">BUILD TELEMETRY &amp; LOGS</span>
                  <span className="text-slate-400 shrink-0">{`#${run.versionTag}`}</span>
                  <span className="text-slate-500 shrink-0">{`${((run.totalDurationMs || 0) / 1000).toFixed(1)}s`}</span>
                </div>
              </div>

              <div className="px-3 py-1.5 bg-[#12151E] border-b border-white/[0.06] flex items-center justify-between gap-2 shrink-0 font-mono text-[11px]">
                <div className="flex items-center p-0.5 rounded-lg bg-[#1A1D27] border border-white/[0.08]">
                  <button
                    onClick={() => setUpperTab("stages")}
                    className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                      upperTab === "stages" ? "bg-[#292C35] text-white font-semibold" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Pipeline Stages (5)
                  </button>
                  <button
                    onClick={() => setUpperTab("logs")}
                    className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                      upperTab === "logs" ? "bg-[#292C35] text-white font-semibold" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {`Live Logs (${filteredLogs.length})`}
                  </button>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`px-1.5 py-0.5 rounded border text-[10px] font-mono font-semibold ${statusBadgeClass(
                      run.status
                    )}`}
                  >
                    {run.status}
                  </span>
                  {run.status === "FAILED" && onRetry && (
                    <button
                      onClick={() => onRetry(run.id)}
                      className="px-2 py-0.5 rounded border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Retry
                    </button>
                  )}
                </div>
              </div>

              {upperTab === "stages" && (
                <div className="flex-1 min-h-0 bg-[#0B0D13] p-3 overflow-y-auto space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const st = stages[i];
                    const state = st ? stageState(st.status) : "pending";
                    return (
                      <div
                        key={st?.id ?? i}
                        className={`rounded-lg border p-3 font-mono ${
                          state === "failed"
                            ? "border-rose-500/30 bg-rose-500/[0.07]"
                            : state === "done"
                            ? "border-emerald-500/20 bg-emerald-500/[0.05]"
                            : state === "running"
                            ? "border-indigo-500/30 bg-indigo-500/[0.07]"
                            : "border-white/[0.06] bg-white/[0.02]"
                        }`}
                        title={st?.errorMessage || st?.name}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {state === "done" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                            {state === "running" && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />}
                            {state === "failed" && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                            {state === "pending" && <Circle className="w-4 h-4 text-slate-600 shrink-0" />}
                            <span className="text-[11px] text-slate-500">{`Step ${String(i + 1).padStart(2, "0")}`}</span>
                          </div>
                          <span className="shrink-0 text-[11px] text-slate-400">
                            {st && st.durationMs != null ? `${(st.durationMs / 1000).toFixed(2)}s` : String(st?.status ?? "—")}
                          </span>
                        </div>
                        <div className="mt-1.5 text-[13px] font-semibold text-slate-100 break-words">{st?.name ?? "—"}</div>
                        {st?.errorMessage && (
                          <div className="mt-1 text-[11px] text-rose-300 break-words">{st.errorMessage}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {upperTab === "logs" && (
              <>
              <div className="px-3 py-1.5 border-b border-white/[0.06] flex items-center gap-2 shrink-0 bg-[#0E1017]">
                <div className="flex items-center gap-1">
                  {(["ALL", "INFO", "WARN", "ERROR"] as LogFilter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setLogFilter(f)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono border transition-colors cursor-pointer ${
                        logFilter === f
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-white"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="relative flex-1 min-w-0">
                  <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="Search logs"
                    className="w-full pl-6 pr-2 py-0.5 bg-[#1A1D27] border border-white/10 rounded text-[11px] text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>

              <div className="flex-1 bg-[#07080C] p-3 font-mono text-[11px] overflow-y-auto space-y-1">
                {run.error && (
                  <div className="mb-2 rounded-md border border-rose-500/30 bg-rose-500/[0.08] p-2 text-rose-300">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{`Build failed at ${run.error.stage}`}</span>
                    </div>
                    <div className="mt-1 break-words">{run.error.message}</div>
                    {run.error.codeFrame && (
                      <pre className="mt-1.5 p-1.5 rounded bg-black/40 text-rose-200/80 overflow-x-auto whitespace-pre text-[10px]">
                        {run.error.codeFrame}
                      </pre>
                    )}
                  </div>
                )}
                {filteredLogs.length === 0 ? (
                  <div className="text-slate-600">No log entries match.</div>
                ) : (
                  filteredLogs.map((l) => (
                    <div key={l.id} className="flex gap-2 leading-relaxed">
                      <span className="text-slate-600 shrink-0">{String(l.timestamp)}</span>
                      <span className={`shrink-0 w-10 ${LOG_LEVEL_STYLE[l.level] || "text-slate-400"}`}>{l.level}</span>
                      <span className="text-slate-300 break-words min-w-0">
                        {l.message}
                        {l.deltaMs != null && <span className="text-slate-600">{` +${l.deltaMs}ms`}</span>}
                      </span>
                    </div>
                  ))
                )}
              </div>
              </>
              )}
            </div>

            {/* Lower: devtools */}
            <div className="h-[48%] flex flex-col overflow-hidden bg-[#0B0D13]">
              <div className="px-3 pt-2 bg-[#141721] border-b border-white/[0.08] flex items-center gap-1 text-[11px] font-mono shrink-0">
                {tabs.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`px-2.5 py-1.5 rounded-t-md flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                      tab === key
                        ? "text-white border-indigo-500 bg-white/[0.04]"
                        : "text-slate-400 border-transparent hover:text-white"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                {tab === "audit" && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-white/[0.08] bg-[#121622] p-3 space-y-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{run.clinic.name}</div>
                        <div className="text-[11px] text-slate-300 truncate">
                          {clinicDetails?.doctorName
                            ? `${clinicDetails.doctorName}${clinicDetails.credentials ? ` • ${clinicDetails.credentials}` : ""}`
                            : `${run.clinic.city}, ${run.clinic.state}`}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {clinicDetails?.address || `${run.clinic.city}, ${run.clinic.state}`}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="px-2 py-0.5 rounded border border-indigo-500/30 bg-indigo-500/15 text-indigo-300 text-[10px] font-mono">
                          {`Lead Score: ${run.clinic.leadScore ?? "—"}/100`}
                        </span>
                        <span className="px-2 py-0.5 rounded border border-slate-500/30 bg-slate-500/15 text-slate-300 text-[10px] font-mono">
                          {`Theme: ${run.templateId}`}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded border text-[10px] font-mono ${
                            hasVideo
                              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                              : "border-amber-500/30 bg-amber-500/15 text-amber-300"
                          }`}
                        >
                          {`Video: ${hasVideo ? "MP4 Ready" : "Pending"}`}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        ["Phone", run.clinic.phone || "—"],
                        ["Location", `${run.clinic.city}, ${run.clinic.state}`],
                        ["Clinic Slug", slug],
                        ["Active Screen", `${viewportW}×${viewportH} (${Math.round(scale * 100)}%)`],
                        ["Doctor", clinicDetails?.doctorName || "Synthesized in Payload"],
                        [
                          "Services",
                          clinicDetails?.servicesCount ? `${clinicDetails.servicesCount} Treatments` : "Standard Dental Suite",
                        ],
                      ] as [string, string][]).map(([k, v]) => (
                        <div key={k} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 font-mono">
                          <div className="text-[9px] text-slate-500 uppercase">{k}</div>
                          <div className="text-[11px] text-slate-200 truncate mt-0.5">{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tab === "routes" && (
                  <div className="space-y-2">
                    {THEMES.map(({ key, label, Icon }) => {
                      const url = getThemeUrl(key);
                      const active = theme === key;
                      return (
                        <div
                          key={key}
                          className={`rounded-lg border px-3 py-2 flex items-center gap-2 ${
                            active ? "border-indigo-500/40 bg-indigo-500/[0.07]" : "border-white/[0.06] bg-white/[0.02]"
                          }`}
                        >
                          <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-semibold text-white">{label}</div>
                            <div className="text-[10px] font-mono text-slate-500 truncate">{url}</div>
                          </div>
                          <button
                            onClick={() => setTheme(key)}
                            className={`px-2 py-1 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                              active
                                ? "bg-indigo-600 text-white"
                                : "bg-white/[0.05] text-slate-300 hover:text-white"
                            }`}
                          >
                            {active ? "Previewing" : "Preview"}
                          </button>
                          <button
                            onClick={() => handleCopyRoute(key)}
                            className="p-1 rounded bg-white/[0.05] text-slate-400 hover:text-white cursor-pointer"
                            title="Copy URL"
                          >
                            {copiedRoute === key ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded bg-white/[0.05] text-slate-400 hover:text-white"
                            title="Open in New Tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}

                {tab === "mobile" && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 flex items-center gap-2">
                      <Film className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] text-slate-500 font-mono">Canonical walkthrough file</div>
                        <div className="text-[11px] text-slate-200 font-mono truncate">{videoName}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <QrPreview value={currentUrl} />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="text-[10px] text-slate-500 font-mono">Scan on phone to test</div>
                        <div className="text-[11px] text-slate-300 font-mono break-all">{currentUrl}</div>
                        <button
                          onClick={handleCopy}
                          className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copied ? "Copied" : "Copy URL"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
