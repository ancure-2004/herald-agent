"use client";

import React, { useState } from "react";
import { DiscoveryLead } from "../types";
import { VerificationBadge } from "./VerificationBadge";
import { ConfidencePill } from "./ConfidencePill";
import {
  Globe,
  Mail,
  ShieldCheck,
  Gauge,
  Tags,
  ExternalLink,
  Copy,
  Check,
  Type,
} from "lucide-react";

interface LeadDataTableProps {
  leads: DiscoveryLead[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, shiftKey: boolean) => void;
  onSelectAll: () => void;
  onRowClick?: (lead: DiscoveryLead) => void;
}

export const LeadDataTable: React.FC<LeadDataTableProps> = ({
  leads,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onRowClick,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const isAllSelected = leads.length > 0 && selectedIds.size === leads.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < leads.length;

  return (
    <div className="w-full overflow-x-auto relative rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#141721] shadow-xs">
      <table className="w-full text-left text-xs border-collapse font-sans">
        <thead>
          <tr className="border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/90 dark:bg-[#191C28]/95 backdrop-blur-xs text-slate-600 dark:text-slate-400 font-semibold text-[11px] tracking-wider uppercase select-none">
            {/* Sticky Checkbox Column */}
            <th className="sticky left-0 z-20 w-12 py-2.5 px-3 bg-slate-50 dark:bg-[#191C28] border-r border-slate-200 dark:border-white/[0.08]">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isPartiallySelected;
                }}
                onChange={onSelectAll}
                className="rounded border-slate-300 dark:border-white/20 bg-white dark:bg-white/5 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
            </th>

            {/* Sticky Clinic & Domain Column */}
            <th className="sticky left-12 z-20 min-w-[240px] py-2.5 px-3 bg-slate-50 dark:bg-[#191C28] border-r border-slate-200 dark:border-white/[0.08] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Type className="w-3.5 h-3.5 text-slate-400" />
                <span>Clinic &amp; Website</span>
              </div>
            </th>

            {/* Doctor & Phone Column */}
            <th className="min-w-[200px] py-2.5 px-3 border-r border-slate-200/80 dark:border-white/[0.06]">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Doctor &amp; Phone</span>
              </div>
            </th>

            {/* Verification / Deliverability Column */}
            <th className="min-w-[160px] py-2.5 px-3 border-r border-slate-200/80 dark:border-white/[0.06]">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Website Verification</span>
              </div>
            </th>

            {/* Fit / Confidence Column */}
            <th className="min-w-[140px] py-2.5 px-3 border-r border-slate-200/80 dark:border-white/[0.06]">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Gauge className="w-3.5 h-3.5 text-sky-500" />
                <span>Fit Score</span>
              </div>
            </th>

            {/* Locality Column */}
            <th className="min-w-[180px] py-2.5 px-3 border-r border-slate-200/80 dark:border-white/[0.06]">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span>Locality</span>
              </div>
            </th>

            {/* Tags / Channel Column */}
            <th className="min-w-[180px] py-2.5 px-3">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Tags className="w-3.5 h-3.5 text-slate-400" />
                <span>Channel &amp; Status</span>
              </div>
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
          {leads.map((lead) => {
            const isSelected = selectedIds.has(lead.id);

            return (
              <tr
                key={lead.id}
                onClick={() => onRowClick?.(lead)}
                className={`transition-colors cursor-pointer group ${
                  isSelected
                    ? "bg-indigo-50/70 dark:bg-indigo-950/25 hover:bg-indigo-100/70 dark:hover:bg-indigo-950/35"
                    : "hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"
                }`}
              >
                {/* Sticky Checkbox */}
                <td
                  className="sticky left-0 z-10 w-12 py-2.5 px-3 bg-white dark:bg-[#141721] group-hover:bg-slate-50/80 dark:group-hover:bg-[#191C28] border-r border-slate-200/80 dark:border-white/[0.06]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      const nativeEvent = e.nativeEvent as MouseEvent;
                      onToggleSelect(lead.id, nativeEvent.shiftKey);
                    }}
                    className="rounded border-slate-300 dark:border-white/20 bg-white dark:bg-white/5 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                </td>

                {/* Sticky Clinic Name & Domain */}
                <td className="sticky left-12 z-10 py-2.5 px-3 min-w-[240px] bg-white dark:bg-[#141721] group-hover:bg-slate-50/80 dark:group-hover:bg-[#191C28] border-r border-slate-200/80 dark:border-white/[0.06] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.04)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.4)]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate">
                      <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate max-w-[200px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {lead.companyName}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                        <span>{lead.companyDomain || "No active website"}</span>
                      </div>
                    </div>

                    {lead.companyWebsite && lead.companyWebsite !== "#" && (
                      <a
                        href={lead.companyWebsite}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all"
                        title="Open website"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </td>

                {/* Doctor & Phone */}
                <td className="py-2.5 px-3 min-w-[200px] border-r border-slate-200/80 dark:border-white/[0.06]">
                  <div className="truncate">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {lead.contactName.startsWith("Dr.") ? lead.contactName : `Dr. ${lead.contactName}`}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="truncate">{lead.phone || lead.contactEmail}</span>
                      {lead.phone && (
                        <button
                          type="button"
                          onClick={(e) => handleCopy(lead.phone!, lead.id, e)}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
                          title="Copy Phone"
                        >
                          {copiedId === lead.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </td>

                {/* Verification Status */}
                <td className="py-2.5 px-3 min-w-[160px] border-r border-slate-200/80 dark:border-white/[0.06]">
                  <VerificationBadge
                    status={lead.verification.status}
                    details={lead.verification}
                  />
                </td>

                {/* Confidence / Fit Score */}
                <td className="py-2.5 px-3 min-w-[140px] border-r border-slate-200/80 dark:border-white/[0.06]">
                  <ConfidencePill score={lead.verification.confidenceScore} />
                </td>

                {/* Locality */}
                <td className="py-2.5 px-3 min-w-[180px] border-r border-slate-200/80 dark:border-white/[0.06] text-xs text-slate-700 dark:text-slate-300">
                  <span className="truncate block max-w-[170px]" title={lead.location}>
                    {lead.location}
                  </span>
                </td>

                {/* Tags / Channel & Status */}
                <td className="py-2.5 px-3 min-w-[180px]">
                  <div className="flex flex-wrap items-center gap-1.5 overflow-hidden">
                    {lead.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-[10px] text-indigo-700 dark:text-indigo-400 font-semibold truncate"
                      >
                        {tag}
                      </span>
                    ))}
                    {lead.demoReady && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold truncate">
                        Demo Ready
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
