"use client";

import React from "react";
import { ArrowRight, CheckCircle2, ChevronRight, Flame, ShieldCheck, Zap } from "lucide-react";
import { useCRM } from "@/context/CRMContext";

export function EveningSprintView() {
  const { sprintPlan, setSelectedLeadId } = useCRM();

  if (!sprintPlan) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        Loading sprint plan...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex items-center justify-between transition-colors">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Time Budget Allocated
            </div>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {sprintPlan.allocated_minutes} / {sprintPlan.budget_minutes} <span className="text-xs font-normal text-slate-400">mins</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Ranked by EV / minute</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex items-center justify-between transition-colors">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Expected Pipeline Value
            </div>
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              ₹{sprintPlan.total_expected_value_inr.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Probability-weighted yield</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex items-center justify-between transition-colors sm:col-span-2 md:col-span-1">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              High-Priority Tasks
            </div>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {sprintPlan.tasks.length} <span className="text-xs font-normal text-slate-400">clinics</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Replies &gt; Hot Viewers &gt; Review Tray</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Flame className="w-5 h-5 text-rose-500" />
          </div>
        </div>
      </div>

      {/* Task Queue List */}
      <div className="space-y-2.5">
        {sprintPlan.tasks.map((t, idx) => (
          <div
            key={t.lead_id}
            onClick={() => setSelectedLeadId(t.lead_id)}
            className="p-4 rounded-2xl bg-white dark:bg-[#141721] hover:bg-slate-50 dark:hover:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all shadow-xs"
          >
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                #{idx + 1}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{t.lead_name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">({t.doctor_name || "Doctor"} • {t.locality})</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 font-semibold font-mono">
                    {t.action_type}
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 truncate">
                  <strong className="text-slate-800 dark:text-slate-200">Next Step: </strong>
                  {t.next_action}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4 text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/[0.06]">
              <div>
                <div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">~₹{t.expected_value_inr.toLocaleString()} EV</div>
                <div className="text-[11px] font-mono text-slate-400">{t.estimated_minutes} mins • Score {t.priority_score}/m</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        ))}
      </div>
    </div>

  );
}
