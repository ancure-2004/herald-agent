"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { DiscoveryLead, CockpitStateResponse } from "../types";
import { LeadDataTable } from "./LeadDataTable";
import { FloatingActionBar } from "./FloatingActionBar";
import { DiscoveryConsole } from "./DiscoveryConsole";
import { apiFetch } from "@/lib/api/client";
import {
  Sparkles,
  CheckCircle2,
  Compass,
  Loader2,
  Database,
  MapPin,
  FlaskConical,
  Square,
  ChevronDown,
} from "lucide-react";

type FilterView = "all" | "needs-verification" | "high-intent" | "ready-for-demo";

const DELHI_NCR_PRESETS = [
  "Delhi NCR (All Zones)",
  "Hauz Khas (South Delhi)",
  "Greater Kailash (South Delhi)",
  "South Extension (South Delhi)",
  "Saket (South Delhi)",
  "Lajpat Nagar (South Delhi)",
  "Defence Colony (South Delhi)",
  "Green Park (South Delhi)",
  "Vasant Kunj (South Delhi)",
  "Connaught Place (Central Delhi)",
  "Karol Bagh (Central Delhi)",
  "Dwarka (West Delhi)",
  "Rajouri Garden (West Delhi)",
  "Punjabi Bagh (West Delhi)",
  "Janakpuri (West Delhi)",
  "Rohini (North Delhi)",
  "Pitampura (North West Delhi)",
  "Preet Vihar (East Delhi)",
  "Mayur Vihar (East Delhi)",
  "Noida Sector 18 (Noida)",
  "Noida Sector 62 (Noida)",
  "Noida Sector 104 (Noida)",
  "Gurgaon Sector 29 (Gurugram)",
  "DLF Cyber City (Gurugram)",
  "Golf Course Road (Gurugram)",
  "Indirapuram (Ghaziabad)",
  "Vaishali (Ghaziabad)",
];

export function mapLeadToDiscoveryLead(lead: Record<string, any>): DiscoveryLead {
  const facts = lead.facts || [];
  const websiteFact = facts.find((f: any) => f.field === "website_check" || f.field === "website");
  const isNoSite = websiteFact ? websiteFact.value === "no_website" : true;
  const hasPackages = lead.packages && lead.packages.length > 0;
  const fitScore = typeof lead.fit_score === "number" ? lead.fit_score : 90;

  return {
    id: String(lead.id),
    companyName: lead.name || "Unnamed Dental Clinic",
    companyWebsite: lead.custom_fields?.website || "#",
    companyDomain: lead.slug || "no-website.clinic",
    contactName: lead.doctor_name || "Doctor In-Charge",
    contactTitle: "Clinical Director",
    contactEmail: lead.email || (lead.primary_phone ? `${lead.primary_phone}@wa.me` : "contact@clinic.in"),
    phone: lead.primary_phone || undefined,
    verification: {
      status: isNoSite ? "deliverable" : "risky",
      confidenceScore: fitScore,
      smtpCheck: "passed",
      mxRecordValid: true,
      mxHost: "smtp.clinic.in",
      isCatchAll: false,
      isDisposable: false,
      isRoleAccount: false,
      isFreeProvider: false,
      verifiedAt: lead.updated_at || lead.created_at || new Date().toISOString(),
      provider: "CustomSMTP",
    },
    enrichment: {
      state: "success",
      provider: "GooglePlaces",
      lastUpdated: lead.updated_at || new Date().toISOString(),
      techStack: hasPackages ? ["Next.js Multi-Theme", "Playwright Video"] : ["No Website Detected"],
      decisionMakerTitle: "Head Dentist",
    },
    industry: "Dental Healthcare",
    location: `${lead.locality || "Delhi NCR"}, ${lead.city || "Delhi"}`,
    tags: [
      (lead.preferred_channel || "whatsapp").toUpperCase(),
      fitScore >= 80 ? "High Fit" : "Standard Fit",
      lead.status || "STAGED",
    ],
    demoReady: hasPackages || lead.status === "STAGED",
    createdAt: lead.created_at || new Date().toISOString(),
  };
}

// Module-level cache: lives as long as the app session
type DiscoveryTabCache = {
  leads: DiscoveryLead[];
  stagedCount: number;
  discoveredTodayCount: number;
  filteredCount: number;
};
let discoveryTabCache: DiscoveryTabCache | null = null;

export const DiscoveryTab: React.FC = () => {
  const [leads, setLeads] = useState<DiscoveryLead[]>(() => discoveryTabCache?.leads ?? []);
  const [hasLoaded, setHasLoaded] = useState<boolean>(() => discoveryTabCache !== null);
  const [isLoadingLeads, setIsLoadingLeads] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterView>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Locality & Runner Controls
  const [discoveryLocality, setDiscoveryLocality] = useState<string>("Delhi NCR");
  const [isTestingMode, setIsTestingMode] = useState<boolean>(false);
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);
  const [isStopping, setIsStopping] = useState<boolean>(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(true);

  // Cockpit Telemetry State for KPIs
  const [stagedCount, setStagedCount] = useState<number>(() => discoveryTabCache?.stagedCount ?? 0);
  const [discoveredTodayCount, setDiscoveredTodayCount] = useState<number>(() => discoveryTabCache?.discoveredTodayCount ?? 0);
  const [filteredCount, setFilteredCount] = useState<number>(() => discoveryTabCache?.filteredCount ?? 0);
  const [discoveryFunnel, setDiscoveryFunnel] = useState<{
    runId: number | null;
    rawScanned: number;
    uniqueNoWebsite: number;
    mobileVerified: number;
    staged: number;
    dropped: number;
  }>({
    runId: null,
    rawScanned: 0,
    uniqueNoWebsite: 0,
    mobileVerified: 0,
    staged: 0,
    dropped: 0,
  });
  const [funnelAnimStep, setFunnelAnimStep] = useState<number>(4);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Sync leads from database
  const syncLeadsFromDb = useCallback(async () => {
    setIsLoadingLeads(true);
    try {
      const dbLeads = await apiFetch<Array<Record<string, any>>>("/api/leads?hustle_id=1");
      if (Array.isArray(dbLeads)) {
        setLeads(dbLeads.map(mapLeadToDiscoveryLead));
      }
    } catch {
      // Keep cached data if offline
    } finally {
      setHasLoaded(true);
      setIsLoadingLeads(false);
    }
  }, []);

  // Fetch Cockpit Telemetry metrics
  const fetchCockpitTelemetry = useCallback(async () => {
    try {
      const res = await apiFetch<CockpitStateResponse>("/api/autopilot/cockpit-state");
      if (res?.metrics) {
        if (typeof res.metrics.stagedPoolCount === "number") {
          setStagedCount(res.metrics.stagedPoolCount);
        }
        if (typeof res.metrics.candidateFound === "number") {
          setDiscoveredTodayCount(res.metrics.candidateFound);
        }
        if (typeof res.metrics.droppedCount === "number") {
          setFilteredCount(res.metrics.droppedCount);
        }
        const df = (res.metrics as Record<string, any>).discoveryFunnel;
        if (df && typeof df === "object") {
          setDiscoveryFunnel((prev) => {
            if (prev.runId !== df.runId || prev.staged !== df.staged || prev.rawScanned !== df.rawScanned) {
              setFunnelAnimStep(1);
              setTimeout(() => setFunnelAnimStep(2), 120);
              setTimeout(() => setFunnelAnimStep(3), 240);
              setTimeout(() => setFunnelAnimStep(4), 360);
            }
            return {
              runId: df.runId ?? null,
              rawScanned: Number(df.rawScanned ?? 0),
              uniqueNoWebsite: Number(df.uniqueNoWebsite ?? 0),
              mobileVerified: Number(df.mobileVerified ?? 0),
              staged: Number(df.staged ?? 0),
              dropped: Number(df.dropped ?? 0),
            };
          });
        }
      }
      if (res?.is_running !== undefined) {
        setIsDiscovering(res.is_running);
      }
    } catch {
      // Telemetry fallback
    }
  }, []);

  // Initial mount sync
  useEffect(() => {
    syncLeadsFromDb();
    fetchCockpitTelemetry();
  }, [syncLeadsFromDb, fetchCockpitTelemetry]);

  // Persist real data to module cache
  useEffect(() => {
    if (!hasLoaded) return;
    discoveryTabCache = { leads, stagedCount, discoveredTodayCount, filteredCount };
  }, [hasLoaded, leads, stagedCount, discoveredTodayCount, filteredCount]);

  // Periodic poll during active discovery
  useEffect(() => {
    if (!isDiscovering) return;
    const interval = setInterval(() => {
      fetchCockpitTelemetry();
    }, 2500);
    return () => clearInterval(interval);
  }, [isDiscovering, fetchCockpitTelemetry]);

  const handleStartDiscovery = async () => {
    setIsDiscovering(true);
    setIsConsoleOpen(true);
    try {
      const res = await apiFetch<{ status?: string; message?: string }>("/api/autopilot/discover", {
        method: "POST",
        body: JSON.stringify({
          locality: discoveryLocality || "Delhi NCR",
          target_count: isTestingMode ? 2 : 20,
          testing_mode: isTestingMode,
          async_mode: true,
        }),
      });

      if (res?.status === "full") {
        showNotification(res.message || "Staging buffer is full (210/210 leads). Build demos first!");
        setIsDiscovering(false);
      } else {
        showNotification(res?.message || "Lead discovery started in background! Streaming live logs below...");
        setTimeout(() => syncLeadsFromDb(), 3000);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Discovery request failed";
      if (errMsg.includes("409") || errMsg.includes("already in progress")) {
        showNotification("Discovery run already in progress! Check live stream below.");
      } else {
        showNotification(errMsg);
        setIsDiscovering(false);
      }
    }
  };

  const handleStopDiscovery = async () => {
    setIsStopping(true);
    try {
      const res = await apiFetch<{ status?: string; run_id?: number; detail?: string }>("/api/autopilot/stop", {
        method: "POST",
      });
      if (res?.status === "cancelling") {
        showNotification("Discovery stopping... all staged leads are safely saved in the database!");
      } else if (res?.status === "no_run_active") {
        showNotification("No discovery run currently active.");
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to stop discovery";
      showNotification(errMsg);
    } finally {
      setIsStopping(false);
      setIsDiscovering(false);
      fetchCockpitTelemetry();
      syncLeadsFromDb();
    }
  };

  // Funnel & Telemetry Computed Stats (Left Funnel = latest Discovery run only)
  const funnelRawScanned = discoveryFunnel.rawScanned;
  const funnelUniqueNoSite = discoveryFunnel.uniqueNoWebsite;
  const funnelMobileVerified = discoveryFunnel.mobileVerified;
  const funnelStaged = discoveryFunnel.staged;

  const funnelUniquePct = funnelRawScanned > 0 ? Math.min(100, Math.round((funnelUniqueNoSite / funnelRawScanned) * 100)) : 0;
  const funnelMobilePct = funnelRawScanned > 0 ? Math.min(100, Math.round((funnelMobileVerified / funnelRawScanned) * 100)) : 0;
  const funnelStagedPct = funnelRawScanned > 0 ? Math.min(100, Math.round((funnelStaged / funnelRawScanned) * 100)) : 0;

  // Breakdown metrics for right Staged Buffer Capacity card (strictly scoped to currently STAGED leads)
  const stagedMobileVerifiedCount = useMemo(() => {
    return leads.filter((l) => Boolean(l.phone)).length;
  }, [leads]);

  const highIntentCount = useMemo(() => {
    return leads.filter((l) => l.tags.includes("High Intent") || l.verification.confidenceScore >= 85).length;
  }, [leads]);

  const needsWebsiteCount = useMemo(() => {
    return leads.filter((l) => l.verification.status === "pending" || l.verification.status === "risky").length;
  }, [leads]);

  // Available discovered dates (YYYY-MM-DD) sorted descending
  const availableDates = useMemo(() => {
    const counts = new Map<string, number>();
    leads.forEach((lead) => {
      const dateKey = (lead.createdAt || "").slice(0, 10);
      if (dateKey) {
        counts.set(dateKey, (counts.get(dateKey) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, count]) => ({ date, count }));
  }, [leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (dateFilter !== "all" && (lead.createdAt || "").slice(0, 10) !== dateFilter) {
        return false;
      }

      const matchesSearch =
        lead.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.contactEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.location.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeFilter === "needs-verification") {
        return lead.verification.status === "pending" || lead.verification.status === "risky";
      }
      if (activeFilter === "high-intent") {
        return lead.tags.includes("High Intent");
      }
      if (activeFilter === "ready-for-demo") {
        return lead.demoReady;
      }
      return true;
    });
  }, [leads, searchQuery, activeFilter, dateFilter]);

  // Selection Logic with Shift-Click
  const handleToggleSelect = (id: string, shiftKey: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (shiftKey && lastSelectedId) {
        const leadIds = filteredLeads.map((l) => l.id);
        const lastIdx = leadIds.indexOf(lastSelectedId);
        const currentIdx = leadIds.indexOf(id);

        if (lastIdx !== -1 && currentIdx !== -1) {
          const start = Math.min(lastIdx, currentIdx);
          const end = Math.max(lastIdx, currentIdx);
          for (let i = start; i <= end; i++) {
            next.add(leadIds[i]);
          }
          return next;
        }
      }

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

    setLastSelectedId(id);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map((l) => l.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
  };

  // Bulk Actions (only wired actions)
  const handleCopyPhones = () => {
    const phones = leads
      .filter((l) => selectedIds.has(l.id) && l.phone)
      .map((l) => l.phone!)
      .join("\n");
    if (!phones) {
      showNotification("No phone numbers found on selected leads");
      return;
    }
    navigator.clipboard.writeText(phones);
    showNotification(`Copied ${phones.split("\n").length} phone numbers to clipboard`);
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* 1. Top Bento Row: 4-Stage Discovery Funnel + Buffer Telemetry */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Card: Discovery Conversion Funnel (col-span-12 lg:col-span-7) */}
        <div className="col-span-12 lg:col-span-7 bg-zinc-900 text-white rounded-2xl p-5 border border-zinc-800 shadow-sm flex flex-col justify-between">
          <div>
            {/* Header: Overall yield rate & Discovered Today badge */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-2xl font-bold font-mono tracking-tight text-white flex items-baseline gap-2">
                  <span>{funnelStagedPct}%</span>
                  <span className="text-sm font-sans font-medium text-zinc-400">Discovery Yield</span>
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Latest run: <span className="text-zinc-200 font-medium">{funnelStaged}</span> staged from <span className="text-zinc-200 font-medium">{funnelRawScanned}</span> scanned
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
                <span>+{discoveredTodayCount} Discovered Today</span>
              </div>
            </div>

            {/* 4-Column Smooth SVG Wave Funnel */}
            <div className="mt-5 pt-3 border-t border-zinc-800/80">
              <div className="grid grid-cols-4 divide-x divide-zinc-800/80">
                {/* Column 1: Raw Scanned */}
                <div className={`text-center px-2 transition-all duration-300 ${funnelAnimStep >= 1 ? "opacity-100 translate-y-0" : "opacity-30 translate-y-1"}`}>
                  <div className="text-base font-bold font-mono text-zinc-100 tabular-nums">{funnelRawScanned}</div>
                </div>

                {/* Column 2: Unique & No Website */}
                <div className={`text-center px-2 transition-all duration-300 delay-100 ${funnelAnimStep >= 2 ? "opacity-100 translate-y-0" : "opacity-30 translate-y-1"}`}>
                  <div className="text-base font-bold font-mono text-zinc-100 tabular-nums">{funnelUniqueNoSite}</div>
                </div>

                {/* Column 3: Mobile Verified */}
                <div className={`text-center px-2 transition-all duration-300 delay-200 ${funnelAnimStep >= 3 ? "opacity-100 translate-y-0" : "opacity-30 translate-y-1"}`}>
                  <div className="text-base font-bold font-mono text-zinc-100 tabular-nums">{funnelMobileVerified}</div>
                </div>

                {/* Column 4: Staged */}
                <div className={`text-center px-2 transition-all duration-300 delay-300 ${funnelAnimStep >= 4 ? "opacity-100 translate-y-0" : "opacity-30 translate-y-1"}`}>
                  <div className="text-base font-bold font-mono text-emerald-400 tabular-nums">{funnelStaged}</div>
                </div>
              </div>

              {/* Smooth Flowing SVG Ribbon & Percentage Pills */}
              <div className="relative w-full h-16 my-2">
                <svg
                  className="w-full h-full overflow-visible"
                  viewBox="0 0 400 64"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="funnelFlowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(255, 255, 255, 0.22)" />
                      <stop offset="35%" stopColor="rgba(255, 255, 255, 0.14)" />
                      <stop offset="70%" stopColor="rgba(255, 255, 255, 0.08)" />
                      <stop offset="100%" stopColor="rgba(255, 255, 255, 0.04)" />
                    </linearGradient>
                  </defs>

                  {/* Flowing Ribbon Path */}
                  <path
                    d="M 0 4 C 50 4, 50 12, 100 12 C 150 12, 150 18, 200 18 C 250 18, 250 23, 300 23 C 350 23, 350 25, 400 25 L 400 39 C 350 39, 350 41, 300 41 C 250 41, 250 46, 200 46 C 150 46, 150 52, 100 52 C 50 52, 50 60, 0 60 Z"
                    fill="url(#funnelFlowGradient)"
                    stroke="rgba(255, 255, 255, 0.12)"
                    strokeWidth="1"
                  />
                </svg>

                {/* Centered Percentage Pills directly over the ribbon */}
                <div className="absolute inset-0 grid grid-cols-4 pointer-events-none items-center">
                  <div className={`flex justify-center transition-all duration-300 ${funnelAnimStep >= 1 ? "opacity-100 scale-100" : "opacity-40 scale-95"}`}>
                    <span className="bg-white text-zinc-900 font-bold text-[11px] px-2.5 py-0.5 rounded-full shadow-sm font-mono tabular-nums">
                      {funnelRawScanned > 0 ? "100%" : "0%"}
                    </span>
                  </div>
                  <div className={`flex justify-center transition-all duration-300 delay-100 ${funnelAnimStep >= 2 ? "opacity-100 scale-100" : "opacity-40 scale-95"}`}>
                    <span className="bg-white text-zinc-900 font-bold text-[11px] px-2.5 py-0.5 rounded-full shadow-sm font-mono tabular-nums">
                      {funnelUniquePct}%
                    </span>
                  </div>
                  <div className={`flex justify-center transition-all duration-300 delay-200 ${funnelAnimStep >= 3 ? "opacity-100 scale-100" : "opacity-40 scale-95"}`}>
                    <span className="bg-white text-zinc-900 font-bold text-[11px] px-2.5 py-0.5 rounded-full shadow-sm font-mono tabular-nums">
                      {funnelMobilePct}%
                    </span>
                  </div>
                  <div className={`flex justify-center transition-all duration-300 delay-300 ${funnelAnimStep >= 4 ? "opacity-100 scale-100" : "opacity-40 scale-95"}`}>
                    <span className="bg-emerald-400 text-zinc-950 font-bold text-[11px] px-2.5 py-0.5 rounded-full shadow-sm font-mono tabular-nums">
                      {funnelStagedPct}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Stage Labels at Bottom */}
              <div className="grid grid-cols-4 divide-x divide-zinc-800/80">
                <div className="text-center px-1">
                  <div className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">Raw Scanned</div>
                </div>
                <div className="text-center px-1">
                  <div className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">Unique & No Site</div>
                </div>
                <div className="text-center px-1">
                  <div className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">Mobile Verified</div>
                </div>
                <div className="text-center px-1">
                  <div className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">Staged</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Buffer Capacity & Drop Reasons Breakdown (col-span-12 lg:col-span-5) */}
        <div className="col-span-12 lg:col-span-5 bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div>
            {/* Top Row: Staged Buffer Capacity & Locality Pill */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400 font-semibold flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  <span>Staged Buffer Capacity</span>
                </div>
                <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-white tabular-nums mt-0.5 flex items-baseline gap-1.5">
                  <span>{stagedCount}</span>
                  <span className="text-xs font-normal text-slate-400 dark:text-zinc-500">/ 210</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-zinc-400">
                  {210 - stagedCount > 0 ? `${210 - stagedCount} slots open` : "Buffer full (210/210)"}
                </div>
              </div>

              <div className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60 flex items-center gap-1.5 shrink-0">
                <MapPin className="w-3 h-3 text-sky-500" />
                <span className="font-semibold truncate max-w-[130px]">{discoveryLocality || "Delhi NCR"}</span>
              </div>
            </div>

            {/* Capacity Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden my-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  stagedCount >= 210 ? "bg-amber-500" : "bg-zinc-900 dark:bg-white"
                }`}
                style={{ width: `${Math.min(100, Math.round((stagedCount / 210) * 100))}%` }}
              />
            </div>

            {/* Dotted Leader Breakdown Metric List */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between py-0.5">
                <span className="text-slate-600 dark:text-zinc-400 shrink-0 font-medium">Mobile Verified</span>
                <div className="flex-1 border-b border-dotted border-slate-300 dark:border-zinc-700 mx-2.5 mb-1" />
                <span className="font-mono font-medium text-slate-900 dark:text-zinc-100 shrink-0">
                  {stagedMobileVerifiedCount} <span className="text-slate-400 dark:text-zinc-500">({Math.round((stagedMobileVerifiedCount / Math.max(leads.length, 1)) * 100)}%)</span>
                </span>
              </div>

              <div className="flex items-center justify-between py-0.5">
                <span className="text-slate-600 dark:text-zinc-400 shrink-0 font-medium">High Intent / 85%+ Fit</span>
                <div className="flex-1 border-b border-dotted border-slate-300 dark:border-zinc-700 mx-2.5 mb-1" />
                <span className="font-mono font-medium text-slate-900 dark:text-zinc-100 shrink-0">
                  {highIntentCount} <span className="text-slate-400 dark:text-zinc-500">({Math.round((highIntentCount / Math.max(leads.length, 1)) * 100)}%)</span>
                </span>
              </div>

              <div className="flex items-center justify-between py-0.5">
                <span className="text-slate-600 dark:text-zinc-400 shrink-0 font-medium">Needs Website Check</span>
                <div className="flex-1 border-b border-dotted border-slate-300 dark:border-zinc-700 mx-2.5 mb-1" />
                <span className="font-mono font-medium text-slate-900 dark:text-zinc-100 shrink-0">
                  {needsWebsiteCount} <span className="text-slate-400 dark:text-zinc-500">({Math.round((needsWebsiteCount / Math.max(leads.length, 1)) * 100)}%)</span>
                </span>
              </div>

              <div className="flex items-center justify-between py-0.5">
                <span className="text-slate-600 dark:text-zinc-400 shrink-0 font-medium">Last Run Filtered</span>
                <div className="flex-1 border-b border-dotted border-slate-300 dark:border-zinc-700 mx-2.5 mb-1" />
                <span className="font-mono font-medium text-amber-600 dark:text-amber-400 shrink-0">
                  {discoveryFunnel.dropped || filteredCount} <span className="text-slate-400 dark:text-zinc-500 text-[11px]">(site/landline/dupe)</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Unified Discovery Launcher Toolbar (Floating Islands on Canvas) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-transparent border-none shadow-none p-0">
        {/* Left: Locality Selector & Preset Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Custom Typing Input with Datalist */}
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 shadow-xs">
            <Compass className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
            <input
              type="text"
              list="delhi-ncr-presets"
              value={discoveryLocality}
              onChange={(e) => setDiscoveryLocality(e.target.value)}
              placeholder="Type custom locality..."
              className="w-36 sm:w-44 bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none font-sans"
            />
          </div>

          {/* Quick Presets Dropdown */}
          <div className="relative">
            <select
              value={DELHI_NCR_PRESETS.includes(discoveryLocality) ? discoveryLocality : "custom"}
              onChange={(e) => {
                if (e.target.value !== "custom") {
                  setDiscoveryLocality(e.target.value.split(" (")[0]);
                }
              }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl pl-3 pr-8 py-1.5 text-xs text-slate-700 dark:text-zinc-300 focus:outline-none focus:border-zinc-500 cursor-pointer font-sans shadow-xs appearance-none"
              title="Pick a Delhi NCR micro-locality preset"
            >
              <option value="custom" disabled hidden>Presets Dropdown...</option>
              {DELHI_NCR_PRESETS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Datalist for native autocomplete typing */}
          <datalist id="delhi-ncr-presets">
            {DELHI_NCR_PRESETS.map((p) => (
              <option key={p} value={p.split(" (")[0]} />
            ))}
          </datalist>
        </div>

        {/* Right Runner Controls: Testing Mode + Start/Stop Toggle Button */}
        <div className="flex items-center gap-2 justify-end">
          {/* Testing Mode Toggle Pill */}
          <button
            type="button"
            onClick={() => setIsTestingMode((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer border shadow-xs ${
              isTestingMode
                ? "bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold"
                : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:text-slate-900 dark:hover:text-white"
            }`}
            title="Toggle Testing Mode (isolates leads as is_test=true)"
          >
            <FlaskConical className={`w-3.5 h-3.5 ${isTestingMode ? "text-amber-500" : "text-slate-400"}`} />
            <span>Test Mode:</span>
            <span className="font-bold">{isTestingMode ? "ON" : "OFF"}</span>
          </button>

          {/* Start / Stop Discovery Toggle Button */}
          {isDiscovering ? (
            <button
              type="button"
              onClick={handleStopDiscovery}
              disabled={isStopping}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
              title="Stop discovery run immediately without losing staged leads"
            >
              {isStopping ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Halting Discovery...</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Discovery</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartDiscovery}
              className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 rounded-xl px-4 py-2 text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
              <span>Start Lead Discovery</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Kestrel-Style 2-Pane Execution Console (Placed DIRECTLY BELOW Launcher) */}
      <DiscoveryConsole
        locality={discoveryLocality}
        isTestingMode={isTestingMode}
        isDiscovering={isDiscovering}
        stagedCount={stagedCount}
        filteredCount={filteredCount}
        discoveredTodayCount={discoveredTodayCount}
        isOpen={isConsoleOpen}
        onToggleOpen={() => setIsConsoleOpen((prev) => !prev)}
      />

      {/* 4. Overhauled Staged Leads Table with Integrated Filter Header Bar */}
      {!hasLoaded ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-mono text-slate-500 dark:text-zinc-400">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
          <span>Loading leads from database...</span>
        </div>
      ) : leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 rounded-2xl bg-white dark:bg-zinc-900 border border-dashed border-slate-300 dark:border-zinc-700 text-center">
          <Database className="w-6 h-6 text-slate-400" />
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">No leads yet</div>
          <div className="text-xs text-slate-500 dark:text-zinc-400">Run Lead Discovery to fill the staging buffer.</div>
        </div>
      ) : (
        <LeadDataTable
          leads={filteredLeads}
          totalCount={leads.length}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          availableDates={availableDates}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={() => {
            syncLeadsFromDb();
            fetchCockpitTelemetry();
            showNotification("Synced leads & telemetry from database");
          }}
          isLoading={isLoadingLeads}
        />
      )}

      {/* Floating Bulk Action Bar */}
      <FloatingActionBar
        selectedCount={selectedIds.size}
        onClearSelection={handleClearSelection}
        onCopyPhones={handleCopyPhones}
      />
    </div>
  );
};
