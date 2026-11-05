"use client";

import React from "react";
import { Check, MapPin, Star } from "lucide-react";
import { useCRM } from "@/context/CRMContext";

export function LeadsTableView() {
  const { leads, setSelectedLeadId, activeHustle } = useCRM();

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#141721] overflow-hidden shadow-xs transition-colors">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs min-w-[720px]">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.03] text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
              <th className="py-3.5 px-4">Clinic & Doctor</th>
              <th className="py-3.5 px-3">Locality & City</th>
              <th className="py-3.5 px-3">Contacts</th>
              <th className="py-3.5 px-3">Fit & Intent</th>
              <th className="py-3.5 px-3">Mandatory Next Step</th>
              <th className="py-3.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {leads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => setSelectedLeadId(lead.id)}
                className="hover:bg-slate-50/80 dark:hover:bg-white/[0.04] cursor-pointer transition-colors"
              >
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center font-bold text-xs text-indigo-600 dark:text-indigo-400 shrink-0">
                      {lead.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate">{lead.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{lead.doctor_name || "Doctor"}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{lead.locality || lead.city}</span>
                  </div>
                </td>
                <td className="py-3.5 px-3 space-y-0.5 text-[11px]">
                  {lead.primary_phone && (
                    <div className="text-slate-700 dark:text-slate-300 font-mono">{lead.primary_phone}</div>
                  )}
                  {lead.instagram_handle && (
                    <div className="text-pink-600 dark:text-pink-400">@{lead.instagram_handle}</div>
                  )}
                </td>
                <td className="py-3.5 px-3">
                  <div className="flex items-center gap-1.5 flex-nowrap">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-500/20 font-semibold font-mono text-[10px] whitespace-nowrap">
                      Fit {lead.fit_score}%
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-500/20 font-semibold font-mono text-[10px] whitespace-nowrap">
                      Intent {lead.intent_score}
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                  {lead.next_action || "None scheduled"}
                </td>
                <td className="py-3.5 px-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLeadId(lead.id);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Inspect
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

  );
}
