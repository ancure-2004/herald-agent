"use client";

import React from "react";
import { ChevronRight, Flame, ShieldCheck, Zap } from "lucide-react";
import { useCRM } from "@/context/CRMContext";

export function EveningSprintView() {
  const { sprintPlan, setSelectedLeadId } = useCRM();

  if (!sprintPlan) {
    return (
      <div className="p-12 text-center text-sm text-slate-400 dark:text-slate-500">
        No active sprint plan found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.08] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Time Budget Allocated</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {sprintPlan.allocated_minutes} / {sprintPlan.budget_minutes} mins
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Ranked by EV / minute</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Zap className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.08] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Expected Pipeline Value</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              ₹{sprintPlan.total_expected_value_inr.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Probability-weighted yield</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#141721] border border-slate-200 dark:border-white/[0.08] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">High-Priority Tasks</div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {sprintPlan.tasks.length} clinics
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Replies &gt; Hot Viewers &gt; Review Tray</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Flame className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {sprintPlan.tasks.map((t, idx) => (
          <div
            key={t.lead_id}
            onClick={() => setSelectedLeadId(t.lead_id)}
            className="p-4 rounded-2xl bg-white dark:bg-[#141721] hover:bg-slate-50 dark:hover:bg-slate-800/70 border border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-4 cursor-pointer transition-all shadow-xs"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                #{idx + 1}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">{t.lead_name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">({t.doctor_name} • {t.locality})</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 font-semibold">
                    {t.action_type}
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">Next Step: {t.next_action}</div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">~₹{t.expected_value_inr.toLocaleString()} EV</div>
                <div className="text-[11px] text-slate-400">{t.estimated_minutes} mins • Score {t.priority_score}/m</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
