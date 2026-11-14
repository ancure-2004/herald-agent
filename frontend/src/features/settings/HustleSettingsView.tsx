"use client";

import React, { useEffect, useState } from "react";
import { useCRM } from "@/context/CRMContext";
import { settingsApi } from "@/api/settingsApi";

export function HustleSettingsView() {
  const { activeHustle, notify, loadAll } = useCRM();

  const [settingsAutonomy, setSettingsAutonomy] = useState<"copilot" | "autopilot">("copilot");
  const [settingsQuery, setSettingsQuery] = useState<string>("");
  const [settingsMinDays, setSettingsMinDays] = useState<number>(3);
  const [settingsWaLimit, setSettingsWaLimit] = useState<number>(15);
  const [settingsIgLimit, setSettingsIgLimit] = useState<number>(15);
  const [settingsEmailLimit, setSettingsEmailLimit] = useState<number>(30);
  const [settingsIgDiscovery, setSettingsIgDiscovery] = useState<boolean>(false);
  const [settingsBatchSize, setSettingsBatchSize] = useState<number>(25);

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

  if (!activeHustle) return null;

  const handleSaveHustleSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const isDental =
      activeHustle.slug.includes("dental") || activeHustle.name.toLowerCase().includes("dental");
    const baseSteps = [
      "find_maps_4tier",
      "verify_no_website",
      "research_2source",
      "channel_check",
      "build_3_demos",
      "verify_http_200",
      "sync_batch_json",
    ];
    if (!isDental && settingsIgDiscovery) {
      baseSteps.unshift("find_instagram");
    }
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
      notify("Hustle blueprint & limits saved successfully!");
      loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to update hustle settings", "err");
    }
  };

  return (
    <div className="max-w-4xl space-y-5">
      <form
        onSubmit={handleSaveHustleSettings}
        className="p-6 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-5 transition-colors"
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Hustle Blueprint &amp; Autonomy Settings: {activeHustle.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {activeHustle.description}
            </p>
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 active:scale-[0.98] cursor-pointer transition-all"
          >
            Save Hustle Settings
          </button>
        </div>

        {/* 4-Tier Lead Discovery Waterfall Overview Card */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Lead Discovery Waterfall Order (Strict Database Deduplication Enabled)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-semibold">
              Zero DB Re-Use Guarantee
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.06]">
              <div className="text-[10px] font-mono text-indigo-500 font-bold">TIER 1 (PRIMARY)</div>
              <div className="font-semibold text-slate-900 dark:text-white mt-0.5">Google Places API</div>
              <div className="text-[10px] text-slate-400">Official Maps Search + No-Website Filter</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.06]">
              <div className="text-[10px] font-mono text-blue-500 font-bold">TIER 2 (FALLBACK)</div>
              <div className="font-semibold text-slate-900 dark:text-white mt-0.5">Serper Maps API</div>
              <div className="text-[10px] text-slate-400">Used if Places quota is reached</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.06]">
              <div className="text-[10px] font-mono text-amber-500 font-bold">TIER 3 (WEB)</div>
              <div className="font-semibold text-slate-900 dark:text-white mt-0.5">Brave Search API</div>
              <div className="text-[10px] text-slate-400">Directory &amp; Practo/Justdial cross-check</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.06]">
              <div className="text-[10px] font-mono text-emerald-500 font-bold">TIER 4 (BROWSER)</div>
              <div className="font-semibold text-slate-900 dark:text-white mt-0.5">Playwright Maps</div>
              <div className="text-[10px] text-slate-400">Direct Maps scraper &amp; verified pool</div>
            </div>
          </div>
        </div>

        {/* Instagram Discovery Rule Toggle (Explicitly OFF for Dental Clinics, configurable for other CRM hustles) */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
              <span>CRM Instagram Lead Discovery &amp; Research</span>
              {(activeHustle.slug.includes("dental") ||
                activeHustle.name.toLowerCase().includes("dental")) && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
                  Disabled for Dental Clinic Hustle
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Instagram research remains built into the CRM for other hustles, but is strictly turned OFF for finding Dental Clinic leads (which use the 4-tier Maps/Web waterfall above).
            </p>
          </div>
          <input
            type="checkbox"
            checked={settingsIgDiscovery}
            disabled={
              activeHustle.slug.includes("dental") ||
              activeHustle.name.toLowerCase().includes("dental")
            }
            onChange={(e) => setSettingsIgDiscovery(e.target.checked)}
            className="w-4 h-4 accent-indigo-600 cursor-pointer disabled:opacity-50 shrink-0"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Autonomy Mode (Copilot vs. Autopilot)
            </label>
            <select
              value={settingsAutonomy}
              onChange={(e) => setSettingsAutonomy(e.target.value as "copilot" | "autopilot")}
              className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] focus:outline-none focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white transition-all cursor-pointer"
            >
              <option value="copilot" className="bg-white dark:bg-[#141721] text-slate-900 dark:text-white">Copilot (Human Review Tray before Send)</option>
              <option value="autopilot" className="bg-white dark:bg-[#141721] text-slate-900 dark:text-white">Autopilot (Auto-Dispatch within Daily Caps)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Default Discovery Search Query
            </label>
            <input
              type="text"
              value={settingsQuery}
              onChange={(e) => setSettingsQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] focus:outline-none focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white transition-all"
            />
          </div>
        </div>

        {/* Pipeline & Outreach Batch Size */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                Pipeline &amp; Outreach Batch Size (Leads per Batch)
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Default: 25 leads per batch for Discovery, Kanban grouping &amp; Daily Outreach
              </p>
            </div>
            <div className="flex items-center gap-2">
              {[10, 15, 25, 50].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSettingsBatchSize(n)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-colors cursor-pointer ${
                    settingsBatchSize === n
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/[0.1] hover:border-indigo-400"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <input
            type="number"
            min={5}
            max={100}
            value={settingsBatchSize}
            onChange={(e) => setSettingsBatchSize(Number(e.target.value))}
            className="w-32 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] focus:outline-none focus:border-indigo-500 rounded-xl px-3 py-2 font-mono text-xs text-slate-900 dark:text-white transition-all"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="space-y-1">
            <label className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">Minimum Buffer Days</label>
            <input
              type="number"
              min={1}
              max={14}
              value={settingsMinDays}
              onChange={(e) => setSettingsMinDays(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] focus:outline-none focus:border-indigo-500 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">Daily WhatsApp Cap</label>
            <input
              type="number"
              min={1}
              max={100}
              value={settingsWaLimit}
              onChange={(e) => setSettingsWaLimit(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] focus:outline-none focus:border-indigo-500 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">Daily Instagram Cap</label>
            <input
              type="number"
              min={0}
              max={100}
              value={settingsIgLimit}
              onChange={(e) => setSettingsIgLimit(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] focus:outline-none focus:border-indigo-500 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">Daily Email Cap</label>
            <input
              type="number"
              min={1}
              max={200}
              value={settingsEmailLimit}
              onChange={(e) => setSettingsEmailLimit(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] focus:outline-none focus:border-indigo-500 rounded-xl px-3 py-2 font-mono text-slate-900 dark:text-white transition-all"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
