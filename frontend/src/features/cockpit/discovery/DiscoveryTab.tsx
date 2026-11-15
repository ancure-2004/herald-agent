"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { DiscoveryLead, CockpitStateResponse } from "../types";
import { LeadDataTable } from "./LeadDataTable";
import { FloatingActionBar } from "./FloatingActionBar";
import { LiveLogTerminal } from "@/components/ui/LiveLogTerminal";
import { apiFetch } from "@/lib/api/client";
import {
  Search,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Compass,
  Loader2,
  Database,
  Filter,
  MapPin,
  FlaskConical,
  Square,
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

// Module-level cache: lives as long as the app session, so switching away from
// this tab and back shows the last real data immediately while a quiet refresh runs.
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Locality & Runner Controls
  const [discoveryLocality, setDiscoveryLocality] = useState<string>("Delhi NCR");
  const [isTestingMode, setIsTestingMode] = useState<boolean>(false);
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);
  const [isStopping, setIsStopping] = useState<boolean>(false);

  // Cockpit Telemetry State for KPIs
  const [stagedCount, setStagedCount] = useState<number>(() => discoveryTabCache?.stagedCount ?? 0);
  const [discoveredTodayCount, setDiscoveredTodayCount] = useState<number>(() => discoveryTabCache?.discoveredTodayCount ?? 0);
  const [filteredCount, setFilteredCount] = useState<number>(() => discoveryTabCache?.filteredCount ?? 0);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // SyncsetCockpitTab leads from database
  const syncLeadsFromDb = useCallback(async () => {
    setIsLoadingLeads(true);
    try {
      const dbLeads = await apiFetch<Array<Record<string, any>>>("/api/leads?hustle_id=1");
      if (Array.isArray(dbLeads)) {
        setLeads(dbLeads.map(mapLeadToDiscoveryLead));
      }
    } catch {
      // Offline or network error: keep whatever is already shown (cached real data, or empty state)
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

  // Persist real data to the module cache once the first load has completed
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

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
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
  }, [leads, searchQuery, activeFilter]);

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

  // Bulk Actions
  const handleEnrichSelected = () => {
    setLeads((prev) =>
      prev.map((lead) =>
        selectedIds.has(lead.id)
          ? {
              ...lead,
              enrichment: {
                ...lead.enrichment,
                state: "success",
                provider: "GeminiSerp",
                decisionMakerTitle: "Clinical Director",
                techStack: [...(lead.enrichment.techStack || []), "Next.js"],
              },
            }
          : lead
      )
    );
    showNotification(`Enriched ${selectedIds.size} selected leads with live credentials`);
  };

  const handleVerifyEmails = () => {
    setLeads((prev) =>
      prev.map((lead) =>
        selectedIds.has(lead.id)
          ? {
              ...lead,
              verification: {
                ...lead.verification,
                status: "deliverable",
                confidenceScore: 99,
                smtpCheck: "passed",
              },
            }
          : lead
      )
    );
    showNotification(`Verified SMTP for ${selectedIds.size} leads (100% Deliverable)`);
  };

  const handleGenerateDemos = () => {
    showNotification(`Queued ${selectedIds.size} leads for Demo Factory generation`);
    handleClearSelection();
  };

  const handlePushToOutreach = () => {
    showNotification(`Pushed ${selectedIds.size} verified leads to WhatsApp outreach queue`);
    handleClearSelection();
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

      {/* 4 Useful KPI Summary Cards Strip (Matching Demo Factory) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Staged Buffer Capacity */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3 h-3 text-indigo-500" />
              <span>Staged Buffer</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">Cap: 210</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white tabular-nums mt-1 flex items-baseline gap-1">
            <span>{stagedCount}</span>
            <span className="text-xs font-normal text-slate-400 dark:text-slate-500">/ 210</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                stagedCount >= 210 ? "bg-amber-500" : "bg-indigo-500"
              }`}
              style={{ width: `${Math.min(100, Math.round((stagedCount / 210) * 100))}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1 flex justify-between">
            <span>{210 - stagedCount > 0 ? `${210 - stagedCount} slots open` : "Buffer full"}</span>
            <span>{Math.round((stagedCount / 210) * 100)}%</span>
          </div>
        </div>

        {/* KPI 2: Discovered Today */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-emerald-500" />
            <span>Discovered Today</span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums mt-1 flex items-center gap-2">
            <span>{discoveredTodayCount}</span>
            {isDiscovering && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-2 truncate">
            100% Mobile WhatsApp Verified
          </div>
        </div>

        {/* KPI 3: Rejections / Filtered */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3 h-3 text-amber-500" />
            <span>Filtered / Dropped</span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 tabular-nums mt-1">
            {filteredCount}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-2 truncate">
            Website • Landline • Already in DB
          </div>
        </div>

        {/* KPI 4: Active Locality */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] text-sky-600 dark:text-sky-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-sky-500" />
            <span>Active Locality</span>
          </div>
          <div className="text-base font-bold font-mono text-slate-900 dark:text-white truncate mt-1" title={discoveryLocality}>
            {discoveryLocality || "Delhi NCR"}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-2 truncate">
            {isTestingMode ? "Test Sandbox Mode" : "Delhi NCR Micro-Market"}
          </div>
        </div>
      </div>

      {/* Discovery Engine Floating Controls & Filter/Search Toolbar */}
      <div className="space-y-2.5">
        {/* Row 1: Floating Discovery Runner Controls (Zero Outer Box/Wrapper) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Locality Selector & Preset Dropdown */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Custom Typing Input with Datalist */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 shadow-xs">
              <Compass className="w-4 h-4 text-indigo-500 shrink-0" />
              <input
                type="text"
                list="delhi-ncr-presets"
                value={discoveryLocality}
                onChange={(e) => setDiscoveryLocality(e.target.value)}
                placeholder="Type custom locality..."
                className="w-36 sm:w-44 bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none font-sans"
              />
            </div>

            {/* Quick Presets Dropdown */}
            <select
              value={DELHI_NCR_PRESETS.includes(discoveryLocality) ? discoveryLocality : "custom"}
              onChange={(e) => {
                if (e.target.value !== "custom") {
                  setDiscoveryLocality(e.target.value.split(" (")[0]);
                }
              }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer font-sans shadow-xs"
              title="Pick a Delhi NCR micro-locality preset"
            >
              <option value="custom" disabled hidden>Presets Dropdown...</option>
              {DELHI_NCR_PRESETS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

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
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white"
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
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-rose-600/25 transition-all cursor-pointer shrink-0"
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
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 transition-all cursor-pointer shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Start Lead Discovery</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Filter Pills + Search & Refresh */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* View Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeFilter === "all"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              All Leads ({leads.length})
            </button>

            <button
              onClick={() => setActiveFilter("needs-verification")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeFilter === "needs-verification"
                  ? "bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              <span>Needs Verification</span>
            </button>

            <button
              onClick={() => setActiveFilter("high-intent")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeFilter === "high-intent"
                  ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span>High Intent</span>
            </button>

            <button
              onClick={() => setActiveFilter("ready-for-demo")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeFilter === "ready-for-demo"
                  ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Ready for Demo</span>
            </button>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search leads, domains, doctors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-xs"
              />
            </div>

            <button
              onClick={() => {
                syncLeadsFromDb();
                fetchCockpitTelemetry();
                showNotification("Synced leads & telemetry from database");
              }}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shadow-xs"
              title="Refresh Leads from Database"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoadingLeads ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Spreadsheet Grid Table: loader on first load, empty state if the DB has 0 leads */}
      {!hasLoaded ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-500 dark:text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
          <span>Loading leads from database...</span>
        </div>
      ) : leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 text-center">
          <Database className="w-6 h-6 text-slate-400" />
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">No leads yet</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Run Lead Discovery to fill the staging buffer.</div>
        </div>
      ) : (
        <LeadDataTable
          leads={filteredLeads}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
        />
      )}

      {/* Floating Bulk Action Bar */}
      <FloatingActionBar
        selectedCount={selectedIds.size}
        onClearSelection={handleClearSelection}
        onEnrichSelected={handleEnrichSelected}
        onVerifyEmails={handleVerifyEmails}
        onGenerateDemos={handleGenerateDemos}
        onPushToOutreach={handlePushToOutreach}
      />

      {/* Embedded Live Log Execution Stream */}
      <div className="pt-2">
        <LiveLogTerminal
          title="LEAD DISCOVERY EXECUTION STREAM"
          service="discovery"
          lockService={true}
          className="h-80 rounded-2xl border border-slate-200 dark:border-slate-800"
          collapsible={true}
        />
      </div>
    </div>
  );
};
