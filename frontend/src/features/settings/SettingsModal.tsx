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
  ShieldCheck,
  Save,
  Loader2,
  Zap,
  ArrowRight,
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
  group: "operations" | "system";
}

const SETTINGS_CATEGORIES: CategoryMeta[] = [
  {
    id: "blueprint",
    label: "Hustle & Blueprint",
    description: "Autonomy mode, delivery pipeline steps, and target package values",
    icon: Sparkles,
    group: "operations",
  },
  {
    id: "waterfall",
    label: "Discovery Waterfall",
    description: "4-tier Maps and search queries with multi-source fallback routing",
    icon: Layers,
    group: "operations",
  },
  {
    id: "quotas",
    label: "Quotas & Safety Caps",
    description: "Daily channel limits, batch size, and dry-run safety simulation",
    icon: Sliders,
    group: "operations",
  },
  {
    id: "mcp",
    label: "MCP & AI Provider",
    description: "AI Provider keys (Gemini / Groq) and Antigravity stdio MCP server",
    icon: Cpu,
    group: "system",
  },
  {
    id: "appearance",
    label: "Appearance & UI",
    description: "Theme styling, reduced motion, and compact table density",
    icon: Palette,
    group: "system",
  },
  {
    id: "profile",
    label: "Operator Profile",
    description: "Operator identity, monogram badge, and message sign-off",
    icon: User,
    group: "system",
  },
];

// SSOT Registered MCP tools from backend/mcp_server.py (v2.0.0)
const REAL_MCP_TOOLS = [
  {
    name: "add_lead",
    description:
      "Ingest a single new lead directly into CRM with duplicate contact checks (phone/IG) and auto-slugging.",
    schema:
      "name, doctor_name?, locality?, city?, address?, primary_phone?, email?, instagram_handle?, preferred_channel?, next_action?, deal_value_inr?, hustle_id?",
  },
  {
    name: "bulk_add_leads",
    description:
      "Bulk ingest multiple leads with deduplication, atomic database commit, and per-lead success/skip reporting.",
    schema: "leads, hustle_id?",
  },
  {
    name: "send_message",
    description:
      "Draft or send an external outreach message with explicit safety check (requires confirmed=True to transmit).",
    schema: "lead_id, text, channel?, confirmed?",
  },
  {
    name: "log_call",
    description:
      "Log a completed call note for a lead, automatically generating structured summaries and next steps.",
    schema: "lead_id, raw_text, duration_seconds?, outcome?",
  },
  {
    name: "run_discovery",
    description:
      "Run lead discovery waterfall (Google Places -> Serper -> Brave -> Playwright) with locality/query targeting and stop_after stages.",
    schema: "locality?, limit?, stop_after?, hustle_id?",
  },
  {
    name: "run_demo_factory",
    description:
      "Trigger the Autopilot Demo Factory to scaffold websites, validate gates, and record Playwright demo videos for staged leads.",
    schema: "batch_id?, batch_size?, testing_mode?, hustle_id?",
  },
  {
    name: "run_batch_outreach",
    description:
      "Execute batch outreach across WhatsApp, Instagram, or Email with dry_run safety verification.",
    schema: "channel?, batch_id?, dry_run?, clinic_id?, hustle_id?",
  },
  {
    name: "list_leads",
    description:
      "List CRM leads with stage_id, locality, or text search filters ordered by intent and fit scores.",
    schema: "stage_id?, locality?, search?, limit?, hustle_id?",
  },
  {
    name: "get_lead_dossier",
    description:
      "Retrieve comprehensive lead details including verified facts, packages, commitments, and demo URLs.",
    schema: "lead_id",
  },
  {
    name: "move_lead_stage",
    description:
      "Move a lead to a new Kanban stage with strict SSOT stage/status syncing and optional next action update.",
    schema: "lead_id, stage_id, next_action?",
  },
  {
    name: "get_lead_activity",
    description:
      "Retrieve full activity timeline and audit log for a lead: past call logs, message history, tracking events, and terminal logs.",
    schema: "lead_id, limit?",
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

  // MCP Snippet Copied State
  const [mcpCopied, setMcpCopied] = useState<boolean>(false);

  // AI Provider & Key Settings State
  const [aiProvider, setAiProvider] = useState<"auto" | "local_cli" | "gemini" | "groq">("auto");
  const [geminiKeyInput, setGeminiKeyInput] = useState<string>("");
  const [groqKeyInput, setGroqKeyInput] = useState<string>("");
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

  // Load AI Settings on mount / open
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
      name: profileName.trim(),
      role: profileRole.trim(),
      initials: profileInitials.trim().toUpperCase() || "AT",
      signoff: profileSignoff.trim() || profileName.split(" ")[0] || "Ankur",
    });

    try {
      // 1. Save Hustle Settings
      await settingsApi.updateHustle(activeHustle.id, {
        autonomy_mode: settingsAutonomy,
        search_query: settingsQuery,
        minimum_stock_days: settingsMinDays,
        pipeline_steps: baseSteps,
        channel_limits: {
          whatsapp: settingsWaLimit,
          instagram: settingsIgLimit,
          email: settingsEmailLimit,
          batch_size: settingsBatchSize,
          dry_run: settingsDryRun,
        },
      });

      // 2. Save AI Configuration
      await settingsApi.updateAISettings({
        provider: aiProvider,
        gemini_api_key: geminiKeyInput.trim() || undefined,
        groq_api_key: groqKeyInput.trim() || undefined,
      });

      notify("All settings & configurations saved successfully", "ok");
      await loadAll();
      setSettingsModalOpen(false);
    } catch (err: any) {
      console.error("Save all settings error:", err);
      notify(err.message || "Failed to save settings", "err");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestAIConnection = async (targetProvider?: string) => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const prov = targetProvider || aiProvider;
      let keyToTest: string | undefined = undefined;
      if (prov === "gemini" && geminiKeyInput && !geminiKeyInput.includes("••••")) {
        keyToTest = geminiKeyInput.trim();
      } else if (prov === "groq" && groqKeyInput && !groqKeyInput.includes("••••")) {
        keyToTest = groqKeyInput.trim();
      }
      const res = await settingsApi.testAIConnection({
        provider: prov,
        api_key: keyToTest,
      });
      setTestResult(res);
      notify(res.message, res.ok ? "ok" : "err");
    } catch (err: any) {
      const msg = err.message || "Failed to reach AI service";
      setTestResult({ ok: false, message: msg });
      notify(msg, "err");
    } finally {
      setTestingConnection(false);
    }
  };

  const mcpConfigSnippet = useMemo(() => {
    return JSON.stringify(
      {
        mcpServers: {
          herald: {
            command: "python3",
            args: ["backend/mcp_server.py"],
            env: {
              CRM_ENV: "production",
              PYTHONPATH: ".",
            },
          },
        },
      },
      null,
      2
    );
  }, []);

  const handleCopyMcp = async () => {
    try {
      await navigator.clipboard.writeText(mcpConfigSnippet);
      setMcpCopied(true);
      notify("MCP config copied to clipboard", "ok");
      setTimeout(() => setMcpCopied(false), 2500);
    } catch (err) {
      notify("Failed to copy MCP config", "err");
    }
  };

  if (!mounted || !settingsModalOpen) return null;

  const currentCategoryMeta =
    SETTINGS_CATEGORIES.find((c) => c.id === activeCategory) || SETTINGS_CATEGORIES[0];

  const operationsCategories = SETTINGS_CATEGORIES.filter((c) => c.group === "operations");
  const systemCategories = SETTINGS_CATEGORIES.filter((c) => c.group === "system");

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
        className="w-full max-w-6xl w-[92vw] h-[88vh] bg-white dark:bg-[#18181B] rounded-2xl border border-slate-200/90 dark:border-white/[0.1] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
      >
        {/* Top Minimal Header */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-white/[0.08] flex items-center justify-between shrink-0 bg-white dark:bg-[#1C1C1F]">
          <h2 id="settings-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
            Settings
          </h2>

          <div className="flex items-center gap-3">
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

        {/* Modal Main Content: Left Grouped Sidebar + Right Settings Rows */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Category Sidebar: Logical Groups with Subtle Dividers */}
          <div className="w-60 sm:w-68 border-r border-slate-100 dark:border-white/[0.08] p-3 space-y-4 bg-slate-50/50 dark:bg-white/[0.01] overflow-y-auto shrink-0">
            {/* Group 1: Operations */}
            <div className="space-y-1">
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Operations
              </div>
              {operationsCategories.map((cat) => {
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
                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Subtle Divider */}
            <div className="border-t border-slate-200/60 dark:border-white/[0.06] mx-2" />

            {/* Group 2: Platform & System */}
            <div className="space-y-1">
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Platform &amp; System
              </div>
              {systemCategories.map((cat) => {
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
                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Pane: Clean Setting Rows without Redundant Title Block */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 1. HUSTLE & BLUEPRINT */}
            {activeCategory === "blueprint" && (
              <div className="space-y-6">
                {/* 7-Step Delivery Pipeline Badges */}
                <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Active 7-Step Delivery Pipeline
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "01 · Maps 4-Tier Discovery",
                      "02 · No-Website Verification",
                      "03 · Practo Research & Facts",
                      "04 · Outbound Channel Check",
                      "05 · 3x Theme Demos Build",
                      "06 · HTTP 200 Health Audit",
                      "07 · batch.json Sync",
                    ].map((step, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-[11px] font-medium border border-slate-200/60 dark:border-zinc-700/60"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>{step}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Settings Rows */}
                <div className="divide-y divide-slate-100 dark:divide-white/[0.06] border-y border-slate-100 dark:border-white/[0.06] text-xs">
                  {/* Row: Active Hustle */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Active Hustle Engine</div>
                      <div className="text-slate-500 dark:text-zinc-400">
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
                      <div className="text-slate-500 dark:text-zinc-400">
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
                      <div className="text-slate-500 dark:text-zinc-400">
                        Copilot requires human confirmation; Autopilot auto-dispatches within safety limits
                      </div>
                    </div>
                    <select
                      value={settingsAutonomy}
                      onChange={(e) => setSettingsAutonomy(e.target.value as "copilot" | "autopilot")}
                      className="bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-white/[0.12] rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                    >
                      <option value="copilot">Copilot (Review Tray)</option>
                      <option value="autopilot">Autopilot (Auto-Dispatch)</option>
                    </select>
                  </div>

                  {/* Row: Minimum Stock Buffer Days */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Minimum Stock Days</div>
                      <div className="text-slate-500 dark:text-zinc-400">
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
                        className="w-20 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-white/[0.12] rounded-xl px-3 py-1.5 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none text-right"
                      />
                      <span className="text-slate-400 font-mono">days</span>
                    </div>
                  </div>
                </div>

                {/* Standard Deal Packages Preview Cards */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Standard Deal Package Pricing (INR)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-700/60 space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Package 01</span>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Basic Modern SSR</div>
                      <div className="text-sm font-mono font-bold text-zinc-900 dark:text-white">₹15,000</div>
                      <div className="text-[10px] text-slate-400">Single-page fast Next.js SSR website</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-700/60 space-y-1 ring-1 ring-zinc-900/10 dark:ring-white/10">
                      <span className="text-[10px] font-mono uppercase text-indigo-500 font-bold">Package 02 · Recommended</span>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Premium High-Converting</div>
                      <div className="text-sm font-mono font-bold text-zinc-900 dark:text-white">₹25,000</div>
                      <div className="text-[10px] text-slate-400">Full multi-page with appointment booking</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-700/60 space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Package 03</span>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Multi-Clinic Network</div>
                      <div className="text-sm font-mono font-bold text-zinc-900 dark:text-white">₹35,000</div>
                      <div className="text-[10px] text-slate-400">Multi-branch locations &amp; doctor rosters</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. DISCOVERY WATERFALL */}
            {activeCategory === "waterfall" && (
              <div className="space-y-6">
                {/* 4-Tier Discovery Cards */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Waterfall Cascade Routing
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-semibold">
                      Zero DB Re-Use Guarantee
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    {/* Tier 1 */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-700/60 space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="bg-slate-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-md px-2 py-0.5 text-[10px] font-mono font-semibold">
                            Tier 01 · Primary
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white mt-2">
                          Google Places API
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                          Official Maps Search + No-Website Filter across Delhi NCR.
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        Active · Latency ~240ms
                      </div>
                    </div>

                    {/* Tier 2 */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-700/60 space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="bg-slate-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-md px-2 py-0.5 text-[10px] font-mono font-semibold">
                            Tier 02 · Fallback
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white mt-2">
                          Serper Maps API
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                          High-volume Google Maps search fallback if Places quota exhausts.
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        Standby · Hot
                      </div>
                    </div>

                    {/* Tier 3 */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-700/60 space-y-2 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="bg-slate-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-md px-2 py-0.5 text-[10px] font-mono font-semibold">
                            Tier 03 · Web
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden lg:block" />
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white mt-2">
                          Brave Search API
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                          Directory, Practo, and Justdial cross-check for contact details.
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        Active · Enrichment
                      </div>
                    </div>

                    {/* Tier 4 */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-700/60 space-y-2 flex flex-col justify-between">
                      <div>
                        <span className="bg-slate-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-md px-2 py-0.5 text-[10px] font-mono font-semibold">
                          Tier 04 · Browser
                        </span>
                        <div className="font-bold text-slate-900 dark:text-white mt-2">
                          Playwright Maps
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                          Direct headless Maps scraper for deep local verification pools.
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        Active · Headless Pool
                      </div>
                    </div>
                  </div>
                </div>

                {/* Settings Rows */}
                <div className="divide-y divide-slate-100 dark:divide-white/[0.06] border-y border-slate-100 dark:border-white/[0.06] text-xs">
                  {/* Row: Search Query Seed */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Discovery Query Seed</div>
                      <div className="text-slate-500 dark:text-zinc-400">
                        Base search query dispatched to Google Places &amp; Serper
                      </div>
                    </div>
                    <input
                      type="text"
                      value={settingsQuery}
                      onChange={(e) => setSettingsQuery(e.target.value)}
                      placeholder="e.g. dental clinic in South Delhi"
                      className="w-64 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-white/[0.12] rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  {/* Row: Instagram Channel Discovery */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Instagram Channel Discovery</span>
                        {isDentalHustle && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 font-semibold">
                            Disabled for Dental
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 dark:text-zinc-400">
                        {isDentalHustle
                          ? "Disabled for Dental Clinics (Maps & Practo deliver higher conversion)."
                          : "Scrape Instagram business profiles as secondary contact channel"}
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settingsIgDiscovery}
                        disabled={isDentalHustle}
                        onChange={(e) => setSettingsIgDiscovery(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 dark:bg-white/[0.12] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-white dark:peer-checked:after:bg-zinc-900 peer-disabled:opacity-40"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 3. QUOTAS & SAFETY CAPS */}
            {activeCategory === "quotas" && (
              <div className="space-y-6">
                {/* Outbound Safety Guardrails */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Active Outbound Safety Guardrails</span>
                  </span>
                  <div className="space-y-2 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-700/60 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          60-Second Outbound Idempotency Window
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Locks message sending per lead ID to prevent duplicate WhatsApp or email deliveries.
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 shrink-0">
                        Active
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-700/60 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          Hinglish &amp; Negative-Context DNC Guard
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Scans inbound replies for phrases like &quot;mat bhejo&quot;, &quot;band karo&quot;, &quot;not interested&quot; and halts outbound sequences automatically.
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 shrink-0">
                        Active
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-700/60 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          Recorder View Debounce (?recorder=1 Exclusion)
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Internal Playwright automated preview video generation runs are omitted from client telemetry intent scoring.
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 shrink-0">
                        Active
                      </span>
                    </div>
                  </div>
                </div>

                {/* Settings Rows */}
                <div className="divide-y divide-slate-100 dark:divide-white/[0.06] border-y border-slate-100 dark:border-white/[0.06] text-xs">
                  {/* Row: Dry-Run Mode */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Safety Mode</div>
                      <div className="text-slate-500 dark:text-zinc-400">
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

                  {/* Row: Batch Size with Presets */}
                  <div className="py-3.5 flex items-center justify-between gap-4 flex-wrap">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Batch Size Limit</div>
                      <div className="text-slate-500 dark:text-zinc-400">
                        Maximum prospects processed per automated refill batch
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[10, 15, 25, 50].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setSettingsBatchSize(preset)}
                            className={`px-2 py-1 rounded-md text-[11px] font-mono font-bold border transition-colors cursor-pointer ${
                              settingsBatchSize === preset
                                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
                                : "bg-slate-50 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:border-slate-400"
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        min={5}
                        max={100}
                        step={5}
                        value={settingsBatchSize}
                        onChange={(e) => setSettingsBatchSize(Number(e.target.value))}
                        className="w-16 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-white/[0.12] rounded-xl px-2.5 py-1 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none text-right"
                      />
                      <span className="text-slate-400 font-mono">leads</span>
                    </div>
                  </div>

                  {/* Row: WhatsApp Daily Cap */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">WhatsApp Daily Cap</div>
                      <div className="text-slate-500 dark:text-zinc-400">
                        Maximum outbound WhatsApp messages per day
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={settingsWaLimit}
                        onChange={(e) => setSettingsWaLimit(Number(e.target.value))}
                        className="w-20 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-white/[0.12] rounded-xl px-3 py-1.5 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none text-right"
                      />
                      <span className="text-slate-400 font-mono">msgs/day</span>
                    </div>
                  </div>

                  {/* Row: Instagram Daily Cap */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Instagram Daily Cap</div>
                      <div className="text-slate-500 dark:text-zinc-400">
                        Maximum outbound direct messages on Instagram per day
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={settingsIgLimit}
                        onChange={(e) => setSettingsIgLimit(Number(e.target.value))}
                        className="w-20 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-white/[0.12] rounded-xl px-3 py-1.5 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none text-right"
                      />
                      <span className="text-slate-400 font-mono">dms/day</span>
                    </div>
                  </div>

                  {/* Row: Email Daily Cap */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Email Daily Cap</div>
                      <div className="text-slate-500 dark:text-zinc-400">
                        Maximum outbound cold email pitches per day
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={settingsEmailLimit}
                        onChange={(e) => setSettingsEmailLimit(Number(e.target.value))}
                        className="w-20 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-white/[0.12] rounded-xl px-3 py-1.5 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none text-right"
                      />
                      <span className="text-slate-400 font-mono">emails/day</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. MCP & AI PROVIDER */}
            {activeCategory === "mcp" && (
              <div className="space-y-6">
                {/* AI Provider Selector Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      AI Provider &amp; Model Engine
                    </span>
                    <button
                      type="button"
                      disabled={testingConnection}
                      onClick={() => handleTestAIConnection()}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/[0.12] bg-slate-50 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] font-semibold text-[11px] text-slate-800 dark:text-zinc-200 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {testingConnection ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                          <span>Testing...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3 text-emerald-500" />
                          <span>Test Connection</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Test Result Banner */}
                  {testResult && (
                    <div
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                        testResult.ok
                          ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                          : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {testResult.ok ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <Shield className="w-4 h-4 text-rose-500 shrink-0" />
                        )}
                        <span>{testResult.message}</span>
                      </div>
                      {testResult.model && (
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/60 dark:bg-zinc-900/60 shrink-0">
                          {testResult.model}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Provider Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      {
                        id: "auto",
                        label: "Auto (Recommended)",
                        desc: "Prioritizes Gemini BYOK, then Groq, then local agy CLI bridge.",
                        badge: "Adaptive",
                      },
                      {
                        id: "local_cli",
                        label: "Local CLI Bridge",
                        desc: "Zero API cost via local agy CLI (gemini-3.8-flash-low).",
                        badge: hasLocalCli ? "Installed" : "Not Found",
                        badgeColor: hasLocalCli ? "text-emerald-500" : "text-amber-500",
                      },
                      {
                        id: "gemini",
                        label: "Gemini BYOK",
                        desc: "Direct REST API call to gemini-2.5-flash with your own key.",
                        badge: hasGeminiKey ? "Key Saved" : "No Key",
                        badgeColor: hasGeminiKey ? "text-emerald-500" : "text-slate-400",
                      },
                      {
                        id: "groq",
                        label: "Groq BYOK",
                        desc: "High-speed Llama-3.3-70b-versatile via Groq REST API.",
                        badge: hasGroqKey ? "Key Saved" : "No Key",
                        badgeColor: hasGroqKey ? "text-emerald-500" : "text-slate-400",
                      },
                    ].map((p) => {
                      const isSelected = aiProvider === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setAiProvider(p.id as any)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? "border-zinc-900 dark:border-white bg-slate-50 dark:bg-zinc-800/80 shadow-xs"
                              : "border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-slate-300 dark:hover:border-zinc-700"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {p.label}
                              </span>
                              <span className={`text-[10px] font-mono font-bold ${p.badgeColor || "text-slate-500"}`}>
                                {p.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">
                              {p.desc}
                            </p>
                          </div>
                          <div className="pt-2 flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-zinc-300">
                            <span>{isSelected ? "Active Provider" : "Click to select"}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* BYOK Keys Inputs */}
                <div className="divide-y divide-slate-100 dark:divide-white/[0.06] border-y border-slate-100 dark:border-white/[0.06] text-xs">
                  {/* Row: Gemini API Key */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Gemini API Key (BYOK)</div>
                      <div className="text-slate-500 dark:text-zinc-400">
                        {hasGeminiKey ? "Key configured in environment" : "Free key at aistudio.google.com"}
                      </div>
                    </div>
                    <input
                      type="password"
                      value={geminiKeyInput}
                      onChange={(e) => setGeminiKeyInput(e.target.value)}
                      placeholder={hasGeminiKey ? "••••••••••••••••" : "Paste AIzaSy... key"}
                      className="w-64 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-white/[0.12] rounded-xl px-3 py-1.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  {/* Row: Groq API Key */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Groq API Key (BYOK)</div>
                      <div className="text-slate-500 dark:text-zinc-400">
                        {hasGroqKey ? "Key configured in environment" : "Free key at console.groq.com"}
                      </div>
                    </div>
                    <input
                      type="password"
                      value={groqKeyInput}
                      onChange={(e) => setGroqKeyInput(e.target.value)}
                      placeholder={hasGroqKey ? "••••••••••••••••" : "Paste gsk_... key"}
                      className="w-64 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-white/[0.12] rounded-xl px-3 py-1.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* MCP Server Overview Details */}
                <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-zinc-900 dark:text-white" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Herald Operations MCP Server
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
                        v2.0.0
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Ready / Stdio (JSON-RPC 2.0)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 border-t border-slate-200/60 dark:border-white/[0.06]">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Transport</span>
                      <div className="font-semibold text-slate-800 dark:text-zinc-200 text-[11px]">JSON-RPC stdio</div>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Protocol</span>
                      <div className="font-semibold text-slate-800 dark:text-zinc-200 font-mono text-[11px]">
                        v2.0.0 (2024-11-05)
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Entry Point</span>
                      <div className="font-semibold text-slate-800 dark:text-zinc-200 font-mono text-[11px] truncate">
                        backend/mcp_server.py
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Harnesses</span>
                      <div className="font-semibold text-slate-800 dark:text-zinc-200 text-[11px] truncate">
                        Antigravity · Claude · Cursor
                      </div>
                    </div>
                  </div>
                </div>

                {/* Registered MCP Tools List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Registered MCP Tools ({REAL_MCP_TOOLS.length})
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">SSOT: backend/mcp_server.py</span>
                  </div>

                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {REAL_MCP_TOOLS.map((tool) => (
                      <div
                        key={tool.name}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-700/60 flex flex-col gap-1 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            {tool.name}
                          </span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-zinc-700/60 text-slate-700 dark:text-zinc-300 break-all max-w-full">
                            {tool.schema}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                          {tool.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Harness Config Snippet with Copy Button */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Harness JSON Configuration
                    </span>
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
            )}

            {/* 5. APPEARANCE & UI */}
            {activeCategory === "appearance" && (
              <div className="space-y-6">
                <div className="divide-y divide-slate-100 dark:divide-white/[0.06] border-y border-slate-100 dark:border-white/[0.06] text-xs">
                  {/* Row: Theme Mode */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Interface Theme</div>
                      <div className="text-slate-500 dark:text-zinc-400">
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
                            : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
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
                            : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
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
                            : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
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
                      <div className="text-slate-500 dark:text-zinc-400">
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
                      <div className="text-slate-500 dark:text-zinc-400">
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
                <div className="divide-y divide-slate-100 dark:divide-white/[0.06] border-y border-slate-100 dark:border-white/[0.06] text-xs">
                  {/* Row: Operator Name */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Operator Name</div>
                      <div className="text-slate-500 dark:text-zinc-400">
                        Display name shown in user menu and logged action trails
                      </div>
                    </div>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-56 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-white/[0.12] rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  {/* Row: Operator Role */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Role Designation</div>
                      <div className="text-slate-500 dark:text-zinc-400">
                        Operational title (e.g. CRM Architect, Growth Lead)
                      </div>
                    </div>
                    <input
                      type="text"
                      value={profileRole}
                      onChange={(e) => setProfileRole(e.target.value)}
                      className="w-56 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-white/[0.12] rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  {/* Row: Badge Initials */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Badge Initials</div>
                      <div className="text-slate-500 dark:text-zinc-400">
                        2-character monogram badge shown in the sidebar avatar
                      </div>
                    </div>
                    <input
                      type="text"
                      maxLength={3}
                      value={profileInitials}
                      onChange={(e) => setProfileInitials(e.target.value.toUpperCase())}
                      className="w-20 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-white/[0.12] rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-center text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  {/* Row: Outreach Sign-off */}
                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 max-w-sm">
                      <div className="font-semibold text-slate-900 dark:text-white">Outreach Sign-Off</div>
                      <div className="text-slate-500 dark:text-zinc-400">
                        Closing signature appended to outbound cold WhatsApp &amp; Email pitches
                      </div>
                    </div>
                    <input
                      type="text"
                      value={profileSignoff}
                      onChange={(e) => setProfileSignoff(e.target.value)}
                      className="w-56 bg-slate-50 dark:bg-[#18181B] border border-slate-200 dark:border-white/[0.12] rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Clean Footer with Save Settings Button */}
        <div className="px-6 py-2.5 border-t border-slate-100 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#1C1C1F] flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400 font-medium">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] font-mono text-[10px]">ESC</kbd> to dismiss
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSettingsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
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
