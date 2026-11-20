"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Sparkles,
  Layers,
  Sliders,
  Cpu,
  Palette,
  User,
  Check,
  CheckCircle2,
  Copy,
  Moon,
  Sun,
  Monitor,
  Shield,
  Save,
  Loader2,
  RefreshCw,
  Zap,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { settingsApi } from "@/api/settingsApi";

export type SettingsCategoryId =
  | "blueprint"
  | "waterfall"
  | "quotas"
  | "mcp"
  | "appearance"
  | "profile";

interface CategoryMeta {
  id: SettingsCategoryId;
  label: string;
  description: string;
  icon: React.ElementType;
}

const SETTINGS_CATEGORIES: CategoryMeta[] = [
  {
    id: "blueprint",
    label: "Hustle & Blueprint",
    description: "Autonomy mode, delivery pipeline steps, and target package values",
    icon: Sparkles,
  },
  {
    id: "waterfall",
    label: "Discovery Waterfall",
    description: "4-tier Maps and search queries with multi-source fallback routing",
    icon: Layers,
  },
  {
    id: "quotas",
    label: "Quotas & Safety Caps",
    description: "Daily channel limits, batch size, and dry-run safety simulation",
    icon: Sliders,
  },
  {
    id: "mcp",
    label: "MCP & AI Provider",
    description: "AI Provider keys (Gemini / Groq) and Antigravity stdio MCP server",
    icon: Cpu,
  },
  {
    id: "appearance",
    label: "Appearance & UI",
    description: "Theme styling, reduced motion, and compact table density",
    icon: Palette,
  },
  {
    id: "profile",
    label: "Operator Profile",
    description: "Operator identity, monogram badge, and message sign-off",
    icon: User,
  },
];

export function SettingsModal() {
  const {
    settingsModalOpen,
    setSettingsModalOpen,
    settingsTab,
    setSettingsTab,
    activeHustle,
    notify,
    loadAll,
    isDarkMode,
    toggleDarkMode,
    themeMode,
    setThemeMode,
    operatorProfile,
    updateOperatorProfile,
  } = useCRM();

  const [mounted, setMounted] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<SettingsCategoryId>(
    (settingsTab as SettingsCategoryId) || "blueprint"
  );

  // Sync activeCategory when settingsTab changes from external open
  useEffect(() => {
    if (settingsTab && SETTINGS_CATEGORIES.some((c) => c.id === settingsTab)) {
      setActiveCategory(settingsTab as SettingsCategoryId);
    }
  }, [settingsTab]);

  // Hustle & Blueprint State
  const [settingsAutonomy, setSettingsAutonomy] = useState<"copilot" | "autopilot">("copilot");
  const [settingsQuery, setSettingsQuery] = useState<string>("");
  const [settingsMinDays, setSettingsMinDays] = useState<number>(3);
  const [settingsWaLimit, setSettingsWaLimit] = useState<number>(15);
  const [settingsIgLimit, setSettingsIgLimit] = useState<number>(15);
  const [settingsEmailLimit, setSettingsEmailLimit] = useState<number>(30);
  const [settingsIgDiscovery, setSettingsIgDiscovery] = useState<boolean>(false);
  const [settingsBatchSize, setSettingsBatchSize] = useState<number>(25);
  const [settingsDryRun, setSettingsDryRun] = useState<boolean>(true);

  // Appearance & UI Preferences State (persisted in localStorage)
  const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("crm_animations_enabled") !== "false";
    }
    return true;
  });

  const [compactDensity, setCompactDensity] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("crm_compact_density") === "true";
    }
    return false;
  });

  const [autoExpandConsoles, setAutoExpandConsoles] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("crm_auto_expand_consoles") !== "false";
    }
    return true;
  });

  // MCP Snippet Copied State
  const [mcpCopied, setMcpCopied] = useState<boolean>(false);

  // AI Provider & Key Settings State
  const [aiProvider, setAiProvider] = useState<"auto" | "local_cli" | "gemini" | "groq">("auto");
  const [geminiKeyInput, setGeminiKeyInput] = useState<string>("");
  const [groqKeyInput, setGroqKeyInput] = useState<string>("");
  const [aiSettingsLoaded, setAiSettingsLoaded] = useState<boolean>(false);
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(false);
  const [hasGroqKey, setHasGroqKey] = useState<boolean>(false);
  const [hasLocalCli, setHasLocalCli] = useState<boolean>(false);
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; model?: string } | null>(null);

  // Operator Profile Local Draft State
  const [profileName, setProfileName] = useState<string>(operatorProfile?.name || "Ankur Tyagi");
  const [profileRole, setProfileRole] = useState<string>(operatorProfile?.role || "CRM Architect");
  const [profileInitials, setProfileInitials] = useState<string>(operatorProfile?.initials || "AT");
  const [profileSignoff, setProfileSignoff] = useState<string>(operatorProfile?.signoff || "Ankur");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Global Cmd+, / Ctrl+, shortcut and Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setSettingsModalOpen((prev) => !prev);
      } else if (e.key === "Escape" && settingsModalOpen) {
        e.preventDefault();
        setSettingsModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [settingsModalOpen, setSettingsModalOpen]);

  // Load AI Settings on mount
  useEffect(() => {
    if (!settingsModalOpen) return;
    settingsApi
      .getAISettings()
      .then((res) => {
        setAiProvider(res.provider || "auto");
        setGeminiKeyInput(res.gemini_api_key || "");
        setGroqKeyInput(res.groq_api_key || "");
        setHasGeminiKey(res.has_gemini_key);
        setHasGroqKey(res.has_groq_key);
        setHasLocalCli(res.has_local_cli);
        setAiSettingsLoaded(true);
      })
      .catch((err) => {
        console.warn("Failed to load AI settings:", err);
      });
  }, [settingsModalOpen]);

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
    setSettingsBatchSize(activeHustle.channel_limits?.batch_size ?? 25);
    setSettingsDryRun(activeHustle.channel_limits?.dry_run !== false);
  }, [activeHustle]);

  useEffect(() => {
    if (operatorProfile) {
      setProfileName(operatorProfile.name || "Ankur Tyagi");
      setProfileRole(operatorProfile.role || "CRM Architect");
      setProfileInitials(operatorProfile.initials || "AT");
      setProfileSignoff(operatorProfile.signoff || "Ankur");
    }
  }, [operatorProfile]);

  const isDentalHustle =
    activeHustle?.slug.includes("dental") || activeHustle?.name.toLowerCase().includes("dental");

  const handleSaveAll = async () => {
    if (!activeHustle) return;
    setIsSaving(true);

    const baseSteps = [
      "find_maps_4tier",
      "verify_no_website",
      "research_2source",
      "channel_check",
      "build_3_demos",
      "verify_http_200",
      "sync_batch_json",
    ];
    if (!isDentalHustle && settingsIgDiscovery) {
      baseSteps.unshift("find_instagram");
    }

    // Persist operator profile
    updateOperatorProfile({
      name: profileName.trim() || "Ankur Tyagi",
      role: profileRole.trim() || "CRM Architect",
      initials: (profileInitials.trim() || "AT").toUpperCase(),
      signoff: profileSignoff.trim() || "Ankur",
    });

    try {
      await settingsApi.updateHustle(activeHustle.id, {
        autonomy_mode: settingsAutonomy,
        search_query: settingsQuery,
        minimum_stock_days: Number(settingsMinDays),
        channel_limits: {
          whatsapp: Number(settingsWaLimit),
          instagram: Number(settingsIgLimit),
          email: Number(settingsEmailLimit),
          batch_size: Number(settingsBatchSize) || 25,
          dry_run: Boolean(settingsDryRun),
        },
        pipeline_steps: baseSteps,
      } as any);

      // Save AI provider settings if modified
      const aiPayload: { provider: string; gemini_api_key?: string; groq_api_key?: string } = {
        provider: aiProvider,
      };
      if (geminiKeyInput && !geminiKeyInput.includes("••••")) {
        aiPayload.gemini_api_key = geminiKeyInput.trim();
      }
      if (groqKeyInput && !groqKeyInput.includes("••••")) {
        aiPayload.groq_api_key = groqKeyInput.trim();
      }
      await settingsApi.updateAISettings(aiPayload);

      notify("All settings and preferences saved successfully!", "ok");
      await loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to update settings", "err");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestAIConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      let keyToTest: string | undefined = undefined;
      if (aiProvider === "gemini" && geminiKeyInput && !geminiKeyInput.includes("••••")) {
        keyToTest = geminiKeyInput.trim();
      } else if (aiProvider === "groq" && groqKeyInput && !groqKeyInput.includes("••••")) {
        keyToTest = groqKeyInput.trim();
      }
      const res = await settingsApi.testAIConnection({
        provider: aiProvider,
        api_key: keyToTest,
      });
      setTestResult({
        ok: res.ok,
        message: res.message,
        model: res.model,
      });
      notify(res.message, res.ok ? "ok" : "err");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection test failed";
      setTestResult({
        ok: false,
        message: msg,
      });
      notify(msg, "err");
    } finally {
      setTestingConnection(false);
    }
  };

  const mcpConfigSnippet = JSON.stringify(
    {
      mcpServers: {
        herald_crm: {
          command: "python3",
          args: ["/mnt/database/Developing/firstmate/projects/PersonalOS and CRM/backend/mcp_server.py"],
        },
      },
    },
    null,
    2
  );

  const handleCopyMcp = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(mcpConfigSnippet);
      setMcpCopied(true);
      notify("MCP config snippet copied to clipboard!", "ok");
      setTimeout(() => setMcpCopied(false), 2000);
    }
  };

  if (!settingsModalOpen || !mounted || typeof document === "undefined") return null;

  const currentCategoryMeta =
    SETTINGS_CATEGORIES.find((c) => c.id === activeCategory) || SETTINGS_CATEGORIES[0];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={() => setSettingsModalOpen(false)}
      className="fixed inset-0 top-0 left-0 w-screen h-screen z-[99999] bg-black/60 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150 overflow-hidden"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl h-[82vh] bg-white dark:bg-[#141721] rounded-2xl border border-slate-200/90 dark:border-white/[0.1] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
      >
        {/* Top Minimal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/[0.08] flex items-center justify-between shrink-0 bg-white dark:bg-[#161925]">
          <div className="flex items-center gap-2.5">
            <h2 id="settings-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
              Settings
            </h2>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {currentCategoryMeta.label}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-slate-100 dark:bg-white/[0.08] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08]">
              <span>⌘</span>
              <span>,</span>
            </kbd>
            <button
              type="button"
              onClick={() => setSettingsModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Close (Esc)"
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Content: Left Sidebar + Right Settings Rows */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Category Sidebar */}
          <div className="w-56 sm:w-64 border-r border-slate-100 dark:border-white/[0.08] p-3 space-y-1 bg-slate-50/50 dark:bg-white/[0.01] overflow-y-auto shrink-0">
            {SETTINGS_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setSettingsTab(cat.id);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                    isActive
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Pane: Clean Horizontal Setting Rows */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 1. HUSTLE & BLUEPRINT */}
            {activeCategory === "blueprint" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Hustle Blueprint &amp; Autonomy
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Configure target market parameters and execution autonomy
                  </p>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-white/[0.06] border-y border-slate-100 dark:border-white/[0.06] text-xs">
                  {/* Row: Active Hustle */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Active Hustle Engine</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        {activeHustle?.name || "Dental Clinic Growth"}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                      Primary Engine
                    </span>
                  </div>

                  {/* Row: Target Package Value */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Target Package Value</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        Average deal value assigned to qualified prospects
                      </div>
                    </div>
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white bg-slate-100 dark:bg-white/[0.06] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/[0.08]">
                      ₹{(activeHustle?.deal_value_inr || 25000).toLocaleString()} INR
                    </span>
                  </div>

                  {/* Row: Autonomy Mode */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Autonomy Mode</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        Copilot requires human confirmation; Autopilot auto-dispatches within safety limits
                      </div>
                    </div>
                    <select
                      value={settingsAutonomy}
                      onChange={(e) => setSettingsAutonomy(e.target.value as "copilot" | "autopilot")}
                      className="bg-slate-50 dark:bg-[#1C2030] border border-slate-200 dark:border-white/[0.12] rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                    >
                      <option value="copilot">Copilot (Review Tray)</option>
                      <option value="autopilot">Autopilot (Auto-Dispatch)</option>
                    </select>
                  </div>

                  {/* Row: Minimum Stock Buffer Days */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Minimum Stock Days</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        Days of verified inventory buffer before Autopilot triggers replenishment
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={14}
                        value={settingsMinDays}
                        onChange={(e) => setSettingsMinDays(Number(e.target.value))}
                        className="w-20 bg-slate-50 dark:bg-[#1C2030] border border-slate-200 dark:border-white/[0.12] rounded-xl px-3 py-1.5 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none text-right"
                      />
                      <span className="text-slate-400 font-mono">days</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. DISCOVERY WATERFALL */}
            {activeCategory === "waterfall" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Discovery Waterfall &amp; Sources
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Locality search seeds and multi-source web discovery routing
                  </p>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-white/[0.06] border-y border-slate-100 dark:border-white/[0.06] text-xs">
                  {/* Row: Search Query Seed */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Discovery Query Seed</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        Base search query dispatched to Google Places &amp; Serper
                      </div>
                    </div>
                    <input
                      type="text"
                      value={settingsQuery}
                      onChange={(e) => setSettingsQuery(e.target.value)}
                      placeholder="e.g. dental clinic in South Delhi"
                      className="w-64 bg-slate-50 dark:bg-[#1C2030] border border-slate-200 dark:border-white/[0.12] rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  {/* Row: 4-Tier Discovery Routing */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Waterfall Routing</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        Places API → Serper Maps → Brave Search → Playwright Scraping
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Active (4 Tiers)
                    </span>
                  </div>

                  {/* Row: Instagram Channel Discovery */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Instagram Profile Discovery</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        Scrape Instagram business profiles as secondary contact channel
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settingsIgDiscovery}
                        onChange={(e) => setSettingsIgDiscovery(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 dark:bg-white/[0.12] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-white dark:peer-checked:after:bg-zinc-900"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 3. QUOTAS & SAFETY CAPS */}
            {activeCategory === "quotas" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Quotas, Caps &amp; Safety Invariants
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Daily outbound rate limits, batch size, and dry-run safety simulation
                  </p>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-white/[0.06] border-y border-slate-100 dark:border-white/[0.06] text-xs">
                  {/* Row: Dry-Run Mode */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Safety Mode</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        {settingsDryRun
                          ? "DRY-RUN: Simulates message transmission safely without sending real messages"
                          : "LIVE SEND: Dispatches real outbound messages to WhatsApp/IG"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettingsDryRun((prev) => !prev)}
                      className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer text-xs ${
                        settingsDryRun
                          ? "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60"
                          : "bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700/60"
                      }`}
                    >
                      {settingsDryRun ? "Dry-Run Simulation" : "Live Send Active"}
                    </button>
                  </div>

                  {/* Row: Batch Size */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Batch Size Limit</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        Maximum prospects processed per automated refill batch
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={5}
                        max={100}
                        step={5}
                        value={settingsBatchSize}
                        onChange={(e) => setSettingsBatchSize(Number(e.target.value))}
                        className="w-20 bg-slate-50 dark:bg-[#1C2030] border border-slate-200 dark:border-white/[0.12] rounded-xl px-3 py-1.5 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none text-right"
                      />
                      <span className="text-slate-400 font-mono">leads</span>
                    </div>
                  </div>

                  {/* Row: WhatsApp Daily Cap */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">WhatsApp Daily Cap</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        Maximum outbound WhatsApp messages per day
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={settingsWaLimit}
                        onChange={(e) => setSettingsWaLimit(Number(e.target.value))}
                        className="w-20 bg-slate-50 dark:bg-[#1C2030] border border-slate-200 dark:border-white/[0.12] rounded-xl px-3 py-1.5 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none text-right"
                      />
                      <span className="text-slate-400 font-mono">msgs/day</span>
                    </div>
                  </div>

                  {/* Row: Instagram Daily Cap */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Instagram Daily Cap</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        Maximum outbound direct messages on Instagram per day
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={settingsIgLimit}
                        onChange={(e) => setSettingsIgLimit(Number(e.target.value))}
                        className="w-20 bg-slate-50 dark:bg-[#1C2030] border border-slate-200 dark:border-white/[0.12] rounded-xl px-3 py-1.5 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none text-right"
                      />
                      <span className="text-slate-400 font-mono">msgs/day</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. MCP & AI PROVIDER */}
            {activeCategory === "mcp" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    MCP Server &amp; AI Provider
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Configure AI keys and connect Antigravity / Claude Code to Herald CRM
                  </p>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-white/[0.06] border-y border-slate-100 dark:border-white/[0.06] text-xs">
                  {/* Row: Active AI Provider */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">AI Inference Provider</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        Model routing for research dossiers and personalized outreach pitches
                      </div>
                    </div>
                    <select
                      value={aiProvider}
                      onChange={(e) => setAiProvider(e.target.value as any)}
                      className="bg-slate-50 dark:bg-[#1C2030] border border-slate-200 dark:border-white/[0.12] rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                    >
                      <option value="auto">Auto (Local CLI / Fallback)</option>
                      <option value="gemini">Google Gemini 3.8 Flash</option>
                      <option value="groq">Groq (Llama 3.3 70B)</option>
                      <option value="local_cli">Local CLI</option>
                    </select>
                  </div>

                  {/* Row: Gemini API Key */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Gemini API Key</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        {hasGeminiKey ? "Key configured in environment" : "Enter GEMINI_API_KEY"}
                      </div>
                    </div>
                    <input
                      type="password"
                      value={geminiKeyInput}
                      onChange={(e) => setGeminiKeyInput(e.target.value)}
                      placeholder={hasGeminiKey ? "••••••••••••••••" : "AIzaSy..."}
                      className="w-56 bg-slate-50 dark:bg-[#1C2030] border border-slate-200 dark:border-white/[0.12] rounded-xl px-3 py-1.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  {/* Row: Groq API Key */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Groq API Key</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        {hasGroqKey ? "Key configured in environment" : "Enter GROQ_API_KEY"}
                      </div>
                    </div>
                    <input
                      type="password"
                      value={groqKeyInput}
                      onChange={(e) => setGroqKeyInput(e.target.value)}
                      placeholder={hasGroqKey ? "••••••••••••••••" : "gsk_..."}
                      className="w-56 bg-slate-50 dark:bg-[#1C2030] border border-slate-200 dark:border-white/[0.12] rounded-xl px-3 py-1.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  {/* Row: Test Connection */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Test Model Connection</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        {testResult ? testResult.message : "Verify API key authentication and latency"}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={testingConnection}
                      onClick={handleTestAIConnection}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.12] bg-slate-50 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {testingConnection ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Testing...</span>
                        </>
                      ) : (
                        <span>Test Connection</span>
                      )}
                    </button>
                  </div>

                  {/* Row: MCP Stdio Config Snippet */}
                  <div className="py-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-900 dark:text-white">MCP Config Snippet</div>
                      <button
                        type="button"
                        onClick={handleCopyMcp}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        {mcpCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy JSON</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-3 rounded-xl bg-slate-900 dark:bg-black/60 text-emerald-400 font-mono text-[11px] overflow-x-auto border border-slate-800 dark:border-white/[0.08]">
                      {mcpConfigSnippet}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* 5. APPEARANCE & UI */}
            {activeCategory === "appearance" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Appearance &amp; UI Preferences
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Theme mode, motion preferences, and table density
                  </p>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-white/[0.06] border-y border-slate-100 dark:border-white/[0.06] text-xs">
                  {/* Row: Theme Mode */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Interface Theme</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        Select light, dark, or system matching theme
                      </div>
                    </div>
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => setThemeMode("light")}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          themeMode === "light"
                            ? "bg-white text-zinc-900 shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5" />
                        <span>Light</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setThemeMode("dark")}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          themeMode === "dark"
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5" />
                        <span>Dark</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setThemeMode("system")}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          themeMode === "system"
                            ? "bg-white text-zinc-900 dark:bg-white dark:text-zinc-900 shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <Monitor className="w-3.5 h-3.5" />
                        <span>Auto</span>
                      </button>
                    </div>
                  </div>

                  {/* Row: UI Motion */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Smooth Animations</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        Enable smooth modal entrances, tab transitions, and pulsing status rings
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={animationsEnabled}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setAnimationsEnabled(next);
                          localStorage.setItem("crm_animations_enabled", String(next));
                          if (next) {
                            document.documentElement.classList.remove("reduce-motion");
                          } else {
                            document.documentElement.classList.add("reduce-motion");
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 dark:bg-white/[0.12] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-white dark:peer-checked:after:bg-zinc-900"></div>
                    </label>
                  </div>

                  {/* Row: Compact Table Density */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Compact Table Density</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        Reduce vertical padding on lead rows to fit more data on screen
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={compactDensity}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setCompactDensity(next);
                          localStorage.setItem("crm_compact_density", String(next));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 dark:bg-white/[0.12] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-white dark:peer-checked:after:bg-zinc-900"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 6. OPERATOR PROFILE */}
            {activeCategory === "profile" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Operator Profile &amp; Identity
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Operator credentials, monogram badge, and message sign-off signature
                  </p>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-white/[0.06] border-y border-slate-100 dark:border-white/[0.06] text-xs">
                  {/* Row: Operator Name */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Operator Name</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        Display name shown in user menu and logged action trails
                      </div>
                    </div>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-56 bg-slate-50 dark:bg-[#1C2030] border border-slate-200 dark:border-white/[0.12] rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  {/* Row: Operator Role */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Role Designation</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        Operational title (e.g. CRM Architect, Growth Lead)
                      </div>
                    </div>
                    <input
                      type="text"
                      value={profileRole}
                      onChange={(e) => setProfileRole(e.target.value)}
                      className="w-56 bg-slate-50 dark:bg-[#1C2030] border border-slate-200 dark:border-white/[0.12] rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  {/* Row: Badge Initials */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Badge Initials</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        2-character monogram badge shown in the sidebar avatar
                      </div>
                    </div>
                    <input
                      type="text"
                      maxLength={3}
                      value={profileInitials}
                      onChange={(e) => setProfileInitials(e.target.value.toUpperCase())}
                      className="w-20 bg-slate-50 dark:bg-[#1C2030] border border-slate-200 dark:border-white/[0.12] rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-center text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  {/* Row: Outreach Sign-off */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Outreach Sign-Off</div>
                      <div className="text-slate-500 dark:text-slate-400">
                        Closing signature appended to outbound cold WhatsApp &amp; Email pitches
                      </div>
                    </div>
                    <input
                      type="text"
                      value={profileSignoff}
                      onChange={(e) => setProfileSignoff(e.target.value)}
                      className="w-56 bg-slate-50 dark:bg-[#1C2030] border border-slate-200 dark:border-white/[0.12] rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Clean Footer with Save Settings Button */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#161925] flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400 font-medium">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] font-mono text-[10px]">ESC</kbd> to dismiss
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSettingsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAll}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-sm flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
