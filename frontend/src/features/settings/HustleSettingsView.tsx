"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  Layers,
  Monitor,
  Moon,
  Palette,
  Save,
  Shield,
  ShieldCheck,
  Sliders,
  Sparkles,
  Sun,
  Terminal,
  User,
  Zap,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { settingsApi } from "@/api/settingsApi";

export function HustleSettingsView() {
  const {
    activeHustle,
    notify,
    loadAll,
    settingsTab,
    themeMode,
    setThemeMode,
    operatorProfile,
    updateOperatorProfile,
  } = useCRM();

  // Hustle & Blueprint State
  const [settingsAutonomy, setSettingsAutonomy] = useState<"copilot" | "autopilot">("copilot");
  const [settingsQuery, setSettingsQuery] = useState<string>("");
  const [settingsMinDays, setSettingsMinDays] = useState<number>(3);
  const [settingsWaLimit, setSettingsWaLimit] = useState<number>(15);
  const [settingsIgLimit, setSettingsIgLimit] = useState<number>(15);
  const [settingsEmailLimit, setSettingsEmailLimit] = useState<number>(30);
  const [settingsIgDiscovery, setSettingsIgDiscovery] = useState<boolean>(false);
  const [settingsBatchSize, setSettingsBatchSize] = useState<number>(25);

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

  // Fetch AI Settings on mount
  useEffect(() => {
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
  }, []);

  const handleSaveAISettings = async () => {
    try {
      const payload: { provider: string; gemini_api_key?: string; groq_api_key?: string } = {
        provider: aiProvider,
      };
      if (geminiKeyInput && !geminiKeyInput.includes("••••")) {
        payload.gemini_api_key = geminiKeyInput.trim();
      }
      if (groqKeyInput && !groqKeyInput.includes("••••")) {
        payload.groq_api_key = groqKeyInput.trim();
      }
      const res = await settingsApi.updateAISettings(payload);
      setAiProvider(res.provider);
      setGeminiKeyInput(res.gemini_api_key || "");
      setGroqKeyInput(res.groq_api_key || "");
      setHasGeminiKey(res.has_gemini_key);
      setHasGroqKey(res.has_groq_key);
      setHasLocalCli(res.has_local_cli);
      notify("AI provider settings saved!", "ok");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to save AI settings", "err");
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

  // Operator Profile Local Draft State
  const [profileName, setProfileName] = useState<string>(operatorProfile?.name || "Ankur Tyagi");
  const [profileRole, setProfileRole] = useState<string>(operatorProfile?.role || "CRM Architect");
  const [profileInitials, setProfileInitials] = useState<string>(operatorProfile?.initials || "AT");
  const [profileSignoff, setProfileSignoff] = useState<string>(operatorProfile?.signoff || "Ankur");

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
  }, [activeHustle]);

  useEffect(() => {
    if (operatorProfile) {
      setProfileName(operatorProfile.name || "Ankur Tyagi");
      setProfileRole(operatorProfile.role || "CRM Architect");
      setProfileInitials(operatorProfile.initials || "AT");
      setProfileSignoff(operatorProfile.signoff || "Ankur");
    }
  }, [operatorProfile]);

  if (!activeHustle) return null;

  const isDentalHustle =
    activeHustle.slug.includes("dental") || activeHustle.name.toLowerCase().includes("dental");

  // Save Settings Handler
  const handleSaveHustleSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
        },
        pipeline_steps: baseSteps,
      } as any);
      notify("Settings and preferences saved successfully!");
      loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to update hustle settings", "err");
    }
  };

  // Toggle Animation Preference
  const handleToggleAnimations = () => {
    const next = !animationsEnabled;
    setAnimationsEnabled(next);
    localStorage.setItem("crm_animations_enabled", String(next));
    if (next) {
      document.documentElement.classList.remove("reduce-motion");
    } else {
      document.documentElement.classList.add("reduce-motion");
    }
    notify(next ? "UI animations enabled" : "UI animations reduced");
  };

  // Toggle Compact Density
  const handleToggleDensity = () => {
    const next = !compactDensity;
    setCompactDensity(next);
    localStorage.setItem("crm_compact_density", String(next));
    notify(next ? "Compact table density enabled" : "Standard table density enabled");
  };

  // Toggle Auto-expand Consoles
  const handleToggleAutoExpand = () => {
    const next = !autoExpandConsoles;
    setAutoExpandConsoles(next);
    localStorage.setItem("crm_auto_expand_consoles", String(next));
    notify(next ? "Auto-expand execution consoles enabled" : "Execution consoles collapsed by default");
  };

  // Copy MCP Snippet
  const mcpConfigSnippet = JSON.stringify(
    {
      mcpServers: {
        "firstmate-crm": {
          command:
            "/mnt/database/Developing/firstmate/projects/PersonalOS and CRM/backend/.venv/bin/python3",
          args: [
            "/mnt/database/Developing/firstmate/projects/PersonalOS and CRM/backend/mcp_server.py",
          ],
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
      notify("MCP config snippet copied to clipboard!");
      setTimeout(() => setMcpCopied(false), 2200);
    }
  };

  // Tab Header Metadata mapping
  const tabMetadata: Record<string, { title: string; subtitle: string }> = {
    blueprint: {
      title: "Hustle Blueprint & Autonomy",
      subtitle: "Configure target market parameters and autopilot execution mode",
    },
    waterfall: {
      title: "Discovery Waterfall & Sources",
      subtitle: "4-tier multi-source Maps and Web discovery routing with strict zero DB re-use",
    },
    quotas: {
      title: "Quotas, Caps & Safety Invariants",
      subtitle: "Daily outbound batch limits, channel caps, and safety guardrails",
    },
    mcp: {
      title: "MCP Server & Tool Registry",
      subtitle: "JSON-RPC 2.0 stdio MCP server for Antigravity, Claude Code, and Cursor",
    },
    appearance: {
      title: "Appearance & UI Preferences",
      subtitle: "Themes, motion preferences, and density configuration for Personal OS",
    },
    profile: {
      title: "Operator Profile & Identity",
      subtitle: "Local operator credentials, monogram badge, and outreach sign-off signature",
    },
  };

  const currentTab = tabMetadata[settingsTab] || tabMetadata.blueprint;

  // Real MCP Tools list matching backend/mcp_server.py (v2.0.0)
  const realMcpTools = [
    {
      name: "add_lead",
      description: "Ingest a single new lead directly into CRM with duplicate contact checks (phone/IG) and auto-slugging.",
      schema: "name, doctor_name?, locality?, city?, address?, primary_phone?, email?, instagram_handle?, preferred_channel?, next_action?, deal_value_inr?, hustle_id?",
    },
    {
      name: "bulk_add_leads",
      description: "Bulk ingest multiple leads with deduplication, atomic database commit, and per-lead success/skip reporting.",
      schema: "leads, hustle_id?",
    },
    {
      name: "send_message",
      description: "Draft or send an external outreach message with explicit safety check (requires confirmed=True to transmit).",
      schema: "lead_id, text, channel?, confirmed?",
    },
    {
      name: "log_call",
      description: "Log a completed call note for a lead, automatically generating structured summaries and next steps.",
      schema: "lead_id, raw_text, duration_seconds?, outcome?",
    },
    {
      name: "run_discovery",
      description: "Run lead discovery waterfall (Google Places -> Serper -> Brave -> Playwright) with locality/query targeting and stop_after stages.",
      schema: "locality?, limit?, stop_after?, hustle_id?",
    },
    {
      name: "run_demo_factory",
      description: "Trigger the Autopilot Demo Factory to scaffold websites, validate gates, and record Playwright demo videos for staged leads.",
      schema: "batch_id?, batch_size?, testing_mode?, hustle_id?",
    },
    {
      name: "run_batch_outreach",
      description: "Execute batch outreach across WhatsApp, Instagram, or Email with dry_run safety verification.",
      schema: "channel?, batch_id?, dry_run?, clinic_id?, hustle_id?",
    },
    {
      name: "list_leads",
      description: "List CRM leads with stage_id, locality, or text search filters ordered by intent and fit scores.",
      schema: "stage_id?, locality?, search?, limit?, hustle_id?",
    },
    {
      name: "get_lead_dossier",
      description: "Retrieve comprehensive lead details including verified facts, packages, commitments, and demo URLs.",
      schema: "lead_id",
    },
    {
      name: "move_lead_stage",
      description: "Move a lead to a new Kanban stage with strict SSOT stage/status syncing and optional next action update.",
      schema: "lead_id, stage_id, next_action?",
    },
    {
      name: "get_lead_activity",
      description: "Retrieve full activity timeline and audit log for a lead: past call logs, message history, tracking events, and terminal logs.",
      schema: "lead_id, limit?",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">
      {/* 1. Dynamic Settings Canvas Header & Dark Charcoal Save Button */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 px-6 py-4 shadow-xs flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
            {currentTab.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {currentTab.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleSaveHustleSettings()}
          className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-white rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Settings</span>
        </button>
      </div>

      {/* 2. TAB 1: HUSTLE & BLUEPRINT */}
      {settingsTab === "blueprint" && (
        <div className="space-y-4">
          {/* Active Hustle Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-4">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {activeHustle.name}
                  </h3>
                  <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800 rounded-full px-2.5 py-0.5 text-[10px] font-semibold">
                    Primary Engine
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Target Region: <span className="font-semibold text-slate-800 dark:text-slate-200">Delhi NCR</span> (South Delhi, Gurugram, Noida, West Delhi)
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">
                  Target Package Value
                </span>
                <div className="text-sm font-bold font-mono text-zinc-900 dark:text-white">
                  ₹{(activeHustle.deal_value_inr || 25000).toLocaleString()} INR
                </div>
              </div>
            </div>

            {/* 7-Step Pipeline Summary */}
            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 space-y-2">
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
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 text-[11px] font-medium"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>{step}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Configuration Grid */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Autonomy &amp; Discovery Parameters
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Autonomy Mode (Copilot vs. Autopilot)
                </label>
                <select
                  value={settingsAutonomy}
                  onChange={(e) => setSettingsAutonomy(e.target.value as "copilot" | "autopilot")}
                  className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white transition-all cursor-pointer"
                >
                  <option value="copilot" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                    Copilot (Human Review Tray before Send)
                  </option>
                  <option value="autopilot" className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                    Autopilot (Auto-Dispatch within Daily Caps)
                  </option>
                </select>
                <p className="text-[11px] text-slate-400">
                  {settingsAutonomy === "copilot"
                    ? "Outbound messages wait in Kanban Review Tray for one-click approval before sending."
                    : "Autonomous dispatch runs daily within strict safety caps."}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Default Discovery Search Query
                </label>
                <input
                  type="text"
                  value={settingsQuery}
                  onChange={(e) => setSettingsQuery(e.target.value)}
                  placeholder="e.g. dental clinic in Delhi NCR"
                  className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white transition-all"
                />
                <p className="text-[11px] text-slate-400">
                  Primary seed query passed to Google Places &amp; Serper Maps during refill triggers.
                </p>
              </div>
            </div>
          </div>

          {/* Standard Deal Packages Preview Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Standard Package Pricing (INR)
            </h4>
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

      {/* 3. TAB 2: DISCOVERY WATERFALL */}
      {settingsTab === "waterfall" && (
        <div className="space-y-4">
          {/* 4-Tier Lead Discovery Waterfall Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Lead Discovery Waterfall Routing
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Multi-source cascade ensuring continuous verified prospect discovery without duplicate records.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-semibold">
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
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
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
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
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
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
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
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Direct headless Maps scraper for deep local verification pools.
                  </div>
                </div>
                <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  Active · Headless Pool
                </div>
              </div>
            </div>
          </div>

          {/* Instagram Discovery Rule Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs flex items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span>CRM Instagram Lead Discovery &amp; Research</span>
                {isDentalHustle && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 font-semibold">
                    Disabled for Dental Clinic Hustle
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Instagram discovery is maintained in Personal OS for other agency hustles, but is strictly turned OFF for Dental Clinics (which find higher conversion from verified Google Maps &amp; Practo records).
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settingsIgDiscovery}
                disabled={isDentalHustle}
                onChange={(e) => setSettingsIgDiscovery(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-zinc-100 dark:peer-checked:after:bg-zinc-900 peer-disabled:opacity-40"></div>
            </label>
          </div>
        </div>
      )}

      {/* 4. TAB 3: QUOTAS & SAFETY CAPS */}
      {settingsTab === "quotas" && (
        <div className="space-y-4">
          {/* Pipeline Batch Size Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Pipeline &amp; Outreach Batch Size
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Number of leads processed together in discovery runs, factory batches, and daily outreach.
                </p>
              </div>

              {/* Quick Select Presets */}
              <div className="flex items-center gap-1.5">
                {[10, 15, 25, 50].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setSettingsBatchSize(preset)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
                      settingsBatchSize === preset
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
                        : "bg-slate-50 dark:bg-zinc-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-zinc-700 hover:border-slate-400"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <input
                type="number"
                min={5}
                max={100}
                value={settingsBatchSize}
                onChange={(e) => setSettingsBatchSize(Number(e.target.value))}
                className="w-32 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400 rounded-xl px-3 py-2 font-mono text-xs text-slate-900 dark:text-white transition-all"
              />
              <span className="text-xs text-slate-400">leads per batch run</span>
            </div>
          </div>

          {/* Daily Channel Caps & Buffer Grid */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Daily Channel Limits &amp; Buffer Safety
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-700/60 space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Min Buffer Days
                </label>
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={settingsMinDays}
                  onChange={(e) => setSettingsMinDays(Number(e.target.value))}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-white"
                />
                <span className="text-[10px] text-slate-400">Days of leads in reserve</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-700/60 space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Daily WhatsApp Cap
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={settingsWaLimit}
                  onChange={(e) => setSettingsWaLimit(Number(e.target.value))}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-white"
                />
                <span className="text-[10px] text-slate-400">Max sends / 24 hours</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-700/60 space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Daily Instagram Cap
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={settingsIgLimit}
                  onChange={(e) => setSettingsIgLimit(Number(e.target.value))}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-white"
                />
                <span className="text-[10px] text-slate-400">Max DMs / 24 hours</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-700/60 space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Daily Email Cap
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={settingsEmailLimit}
                  onChange={(e) => setSettingsEmailLimit(Number(e.target.value))}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 font-mono text-xs text-slate-900 dark:text-white"
                />
                <span className="text-[10px] text-slate-400">Max cold pitches / day</span>
              </div>
            </div>
          </div>

          {/* Outbound Safety Guardrails Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Active Outbound Safety Guardrails</span>
            </h3>

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
        </div>
      )}

      {/* 5. TAB 4: MCP & INTEGRATIONS */}
      {settingsTab === "mcp" && (
        <div className="space-y-4">
          {/* AI Provider Configuration Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-4">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    AI Provider &amp; Model Engine
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Choose how AI features (Ask &amp; Do, AI Reply Suggestions, AI Call Briefs) are powered.
                  Zero silent fallbacks: real AI is used across all suggestions.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTestAIConnection()}
                  disabled={testingConnection}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Zap className={`w-3.5 h-3.5 ${testingConnection ? "animate-spin text-amber-500" : "text-emerald-500"}`} />
                  <span>{testingConnection ? "Testing..." : "Test Connection"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveAISettings}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save AI Config</span>
                </button>
              </div>
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

            {/* Provider Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
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
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
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
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        {p.desc}
                      </p>
                    </div>
                    <div className="pt-2 flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      <span>{isSelected ? "Active Provider" : "Click to select"}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* BYOK Keys Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Gemini API Key (BYOK)</span>
                  <span className="text-[10px] font-mono text-slate-400">gemini-2.5-flash</span>
                </label>
                <input
                  type="password"
                  value={geminiKeyInput}
                  onChange={(e) => setGeminiKeyInput(e.target.value)}
                  placeholder={hasGeminiKey ? "•••••••••••••••• (configured)" : "Paste AIzaSy... key"}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950 font-mono text-xs text-slate-800 dark:text-zinc-200 focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400"
                />
                <p className="text-[10px] text-slate-400">
                  Free tier keys at aistudio.google.com. Stored securely and masked.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Groq API Key (BYOK)</span>
                  <span className="text-[10px] font-mono text-slate-400">llama-3.3-70b-versatile</span>
                </label>
                <input
                  type="password"
                  value={groqKeyInput}
                  onChange={(e) => setGroqKeyInput(e.target.value)}
                  placeholder={hasGroqKey ? "•••••••••••••••• (configured)" : "Paste gsk_... key"}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950 font-mono text-xs text-slate-800 dark:text-zinc-200 focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-400"
                />
                <p className="text-[10px] text-slate-400">
                  Free tier keys at console.groq.com. Stored securely and masked.
                </p>
              </div>
            </div>
          </div>

          {/* MCP Server Overview Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-zinc-900 dark:text-white" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    FirstMate Personal OS MCP Server
                  </h3>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
                    v2.0.0
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  JSON-RPC 2.0 stdio server exposing production CRM intelligence, lead ingestion, communications, and batch autopilot execution to Antigravity, Claude Code, and Cursor.
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Ready / Stdio (v2.0.0)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-xs">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Transport</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200">JSON-RPC 2.0 over stdio</div>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Protocol &amp; Version</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                  v2.0.0 (2024-11-05)
                </div>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Entry Point</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 font-mono text-[11px] truncate">
                  backend/mcp_server.py
                </div>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Supported Harnesses</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200">Antigravity · Claude Code · Cursor</div>
              </div>
            </div>
          </div>

          {/* Exposed MCP Tools List */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Registered MCP Tools ({realMcpTools.length})
              </h4>
              <span className="text-[10px] font-mono text-slate-400">SSOT: backend/mcp_server.py</span>
            </div>

            <div className="space-y-2">
              {realMcpTools.map((tool) => (
                <div
                  key={tool.name}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-700/60 flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {tool.name}
                    </span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-200/70 dark:bg-zinc-700/60 text-slate-700 dark:text-slate-300 break-all max-w-full">
                      {tool.schema}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {tool.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Harness Config Snippet with Working Copy Button */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Quick Harness Configuration Snippet
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Paste into your Antigravity, Claude Code, or Cursor settings file to connect.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyMcp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-zinc-900 hover:text-white dark:bg-zinc-800 dark:hover:bg-zinc-100 dark:hover:text-zinc-900 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                {mcpCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Config</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-3.5 rounded-xl bg-zinc-950 text-zinc-200 font-mono text-[11px] overflow-x-auto leading-relaxed border border-zinc-800">
              {mcpConfigSnippet}
            </pre>
          </div>
        </div>
      )}

      {/* 6. TAB 5: APPEARANCE & UI */}
      {settingsTab === "appearance" && (
        <div className="space-y-4">
          {/* Theme Mode Selector (3 Cards) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Theme &amp; Color Scheme
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Select your preferred visual theme for the CRM dashboard and cockpit consoles.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Light Mode Card */}
              <button
                type="button"
                onClick={() => setThemeMode("light")}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer space-y-2.5 ${
                  themeMode === "light"
                    ? "ring-2 ring-zinc-900 dark:ring-zinc-100 border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800/80"
                    : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Sun className="w-4 h-4" />
                  </div>
                  {themeMode === "light" && (
                    <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Light Mode</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Clean high-contrast daytime palette</div>
                </div>
              </button>

              {/* Dark Mode Card */}
              <button
                type="button"
                onClick={() => setThemeMode("dark")}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer space-y-2.5 ${
                  themeMode === "dark"
                    ? "ring-2 ring-zinc-900 dark:ring-zinc-100 border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800/80"
                    : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
                    <Moon className="w-4 h-4" />
                  </div>
                  {themeMode === "dark" && (
                    <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Dark Mode</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Deep charcoal &amp; zinc cockpit mode</div>
                </div>
              </button>

              {/* System Sync Card */}
              <button
                type="button"
                onClick={() => setThemeMode("system")}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer space-y-2.5 ${
                  themeMode === "system"
                    ? "ring-2 ring-zinc-900 dark:ring-zinc-100 border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800/80"
                    : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                    <Monitor className="w-4 h-4" />
                  </div>
                  {themeMode === "system" && (
                    <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">System Sync</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Matches OS color scheme preference</div>
                </div>
              </button>
            </div>
          </div>

          {/* Motion & Interface Preferences */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Motion &amp; Interface Preferences
            </h3>

            <div className="space-y-3 pt-1">
              {/* Smooth Animations */}
              <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 dark:border-zinc-800/80">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Enable Smooth UI Animations &amp; Transitions
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Controls micro-interactions, modal slide-ins, and bezier graph port rendering.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={animationsEnabled}
                    onChange={handleToggleAnimations}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-zinc-100 dark:peer-checked:after:bg-zinc-900"></div>
                </label>
              </div>

              {/* Compact Density */}
              <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 dark:border-zinc-800/80">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Compact Table &amp; Card Density
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Tightens padding in Kanban cards and Leads table to display more rows above the fold.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={compactDensity}
                    onChange={handleToggleDensity}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-zinc-100 dark:peer-checked:after:bg-zinc-900"></div>
                </label>
              </div>

              {/* Auto-expand Execution Consoles */}
              <div className="flex items-center justify-between gap-4 py-2">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Auto-Expand Execution Consoles on Run
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Automatically expand the live stream terminal whenever Scout, Auditor, or Closer runs start.
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={autoExpandConsoles}
                    onChange={handleToggleAutoExpand}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-zinc-100 dark:peer-checked:after:bg-zinc-900"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB 6: OPERATOR PROFILE */}
      {settingsTab === "profile" && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-4">
            {/* Live Profile Monogram Preview */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-700/60">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                {profileInitials || "AT"}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {profileName || "Ankur Tyagi"}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {profileRole || "CRM Architect"}
                </div>
                <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                  Sign-off: &quot;{profileSignoff || "Ankur"}&quot;
                </div>
              </div>
            </div>

            {/* Input Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Operator Full Name
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => {
                    setProfileName(e.target.value);
                    updateOperatorProfile({ name: e.target.value });
                  }}
                  placeholder="e.g. Ankur Tyagi"
                  className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white transition-all"
                />
                <span className="text-[10px] text-slate-400">
                  Appears in the sidebar user card and system reports.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Operator Role / Title
                </label>
                <input
                  type="text"
                  value={profileRole}
                  onChange={(e) => {
                    setProfileRole(e.target.value);
                    updateOperatorProfile({ role: e.target.value });
                  }}
                  placeholder="e.g. CRM Architect"
                  className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white transition-all"
                />
                <span className="text-[10px] text-slate-400">
                  Displayed beneath your name in the workspace navigation.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Avatar Monogram Initials (2 Letters)
                </label>
                <input
                  type="text"
                  maxLength={3}
                  value={profileInitials}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setProfileInitials(val);
                    updateOperatorProfile({ initials: val });
                  }}
                  placeholder="e.g. AT"
                  className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white transition-all"
                />
                <span className="text-[10px] text-slate-400">
                  Rendered in circular and rounded avatar badges across the app.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Default WhatsApp / Pitch Sign-Off Name
                </label>
                <input
                  type="text"
                  value={profileSignoff}
                  onChange={(e) => {
                    setProfileSignoff(e.target.value);
                    updateOperatorProfile({ signoff: e.target.value });
                  }}
                  placeholder="e.g. Ankur"
                  className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white transition-all"
                />
                <span className="text-[10px] text-slate-400">
                  Used in Overview greeting and outbound WhatsApp pitch templates.
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/30 border border-slate-200/60 dark:border-zinc-700/60 text-[11px] text-slate-400 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                Personal OS is client-authenticated. Operator identity is stored in local storage and persists across page reloads.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
