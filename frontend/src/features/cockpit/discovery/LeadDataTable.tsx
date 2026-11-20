"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Select } from "@/components/ui/Select";
import { DiscoveryLead } from "../types";
import { VerificationBadge } from "./VerificationBadge";
import { ConfidencePill } from "./ConfidencePill";
import {
  Globe,
  Mail,
  ShieldCheck,
  Gauge,
  ExternalLink,
  Copy,
  Check,
  Type,
  Search,
  RotateCcw,
  X,
  Loader2,
  Database,
  Calendar,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export type FilterView = "all" | "needs-verification" | "high-intent" | "ready-for-demo";

interface LeadDataTableProps {
  leads: DiscoveryLead[];
  totalCount?: number;
  selectedIds: Set<string>;
  onToggleSelect: (id: string, shiftKey: boolean) => void;
  onSelectAll: () => void;
  onRowClick?: (lead: DiscoveryLead) => void;
  activeFilter?: FilterView;
  onFilterChange?: (filter: FilterView) => void;
  dateFilter?: string;
  onDateFilterChange?: (date: string) => void;
  availableDates?: { date: string; count: number }[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const LeadDataTable: React.FC<LeadDataTableProps> = ({
  leads,
  totalCount,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onRowClick,
  activeFilter = "all",
  onFilterChange,
  dateFilter = "all",
  onDateFilterChange,
  availableDates = [],
  searchQuery = "",
  onSearchChange,
  onRefresh,
  isLoading = false,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(false);
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const groupedLeads = useMemo(() => {
    const groups = new Map<string, DiscoveryLead[]>();
    leads.forEach((lead) => {
      const dateKey = (lead.createdAt || "").slice(0, 10) || "Unknown Date";
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push(lead);
    });
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [leads]);

  const toggleDateGroup = (dateKey: string) => {
    setCollapsedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  };

  const formatGroupDate = (dateKey: string) => {
    if (dateKey === "Unknown Date") return dateKey;
    const d = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(d.getTime())) return dateKey;
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Global keydown listener for "/" shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setIsSearchExpanded(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else if (e.key === "Escape" && isSearchExpanded && !searchQuery) {
        setIsSearchExpanded(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchExpanded, searchQuery]);

  const handleCopy = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const isAllSelected = leads.length > 0 && selectedIds.size === leads.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < leads.length;

  const countDisplay = totalCount !== undefined ? totalCount : leads.length;

  return (
    <div className="w-full rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#18181B] shadow-xs overflow-hidden">
      {/* 1. Integrated Table Header Bar: Filter Tabs on Left + Expandable Search Pill & Refresh on Right */}
      <div className="px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#18181B]">
        {/* Left Side: Segmented Filter Tabs */}
        {onFilterChange && (
          <div className="bg-slate-100/80 dark:bg-zinc-800/80 p-1 rounded-xl flex flex-wrap items-center gap-1 select-none">
            <button
              type="button"
              onClick={() => onFilterChange("all")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeFilter === "all"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs"
                  : "text-slate-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              All Leads ({countDisplay})
            </button>

            <button
              type="button"
              onClick={() => onFilterChange("needs-verification")}
              className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                activeFilter === "needs-verification"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs font-semibold"
                  : "text-slate-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-medium"
              }`}
            >
              Needs Verification
            </button>

            <button
              type="button"
              onClick={() => onFilterChange("high-intent")}
              className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                activeFilter === "high-intent"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs font-semibold"
                  : "text-slate-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-medium"
              }`}
            >
              High Intent
            </button>

            <button
              type="button"
              onClick={() => onFilterChange("ready-for-demo")}
              className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                activeFilter === "ready-for-demo"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs font-semibold"
                  : "text-slate-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-medium"
              }`}
            >
              Ready for Demo
            </button>
          </div>
        )}

        {/* Right Side: Expandable Search Pill + Refresh Button */}
        <div className="flex items-center gap-2 ml-auto">
          {onSearchChange && (
            <div
              className={`relative flex items-center transition-all duration-200 ease-in-out ${
                isSearchExpanded || searchQuery ? "w-48 sm:w-64" : "w-9"
              }`}
            >
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => setIsSearchExpanded(true)}
                onBlur={() => {
                  if (!searchQuery) setIsSearchExpanded(false);
                }}
                placeholder="Search leads... (/)"
                className={`w-full h-9 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-zinc-500 transition-all ${
                  isSearchExpanded || searchQuery ? "pl-8 pr-7" : "pl-9 cursor-pointer"
                }`}
                title="Search leads, doctors, domains (press '/')"
              />
              <button
                type="button"
                onClick={() => {
                  setIsSearchExpanded(true);
                  searchInputRef.current?.focus();
                }}
                className="absolute left-2.5 text-slate-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                title="Search (press '/')"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange("");
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 text-slate-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors p-0.5"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Date Filter Dropdown */}
          {onDateFilterChange && (
            <Select
              value={dateFilter}
              onChange={(val) => onDateFilterChange(val)}
              icon={Calendar}
              options={[
                { value: "all", label: `All Dates (${countDisplay})` },
                ...availableDates.map(({ date, count }) => ({
                  value: date,
                  label: `${formatGroupDate(date)} (${count})`,
                })),
              ]}
              title="Filter by discovered date"
              triggerClassName="!h-9 !py-1.5 !px-3 font-medium"
            />
          )}

          {/* Circular Refresh Button */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200/80 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
              title="Refresh Leads from Database"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Scrollable Table Body */}
      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <Database className="w-6 h-6 text-slate-300 dark:text-zinc-600" />
          <div className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
            {searchQuery ? "No leads match this search" : "No leads in this view"}
          </div>
          <div className="text-xs text-slate-400 dark:text-zinc-500">
            {searchQuery ? "Try searching for a different clinic name or locality." : "Run Lead Discovery to fill the buffer."}
          </div>
        </div>
      ) : (
        <div className="w-full overflow-x-auto relative">
          <table className="w-full text-left text-xs border-collapse font-sans">
            {/* Table Header: Clean horizontal border, no vertical divider lines, subtle monochrome icons */}
            <thead>
              <tr className="border-b border-slate-200/70 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#191C28]/95 text-slate-400 dark:text-zinc-500 font-semibold text-[11px] tracking-wider uppercase select-none">
                {/* Sticky Checkbox */}
                <th className="sticky left-0 z-20 w-9 py-2.5 px-3 bg-slate-50/70 dark:bg-[#191C28]">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isPartiallySelected;
                    }}
                    onChange={onSelectAll}
                    className="rounded border-slate-300 dark:border-white/20 bg-white dark:bg-white/5 text-zinc-900 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                </th>

                {/* Sticky Clinic & Domain */}
                <th className="sticky left-9 z-20 min-w-[170px] max-w-[200px] py-2.5 px-3 bg-slate-50/70 dark:bg-[#191C28]">
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-zinc-500 font-semibold">
                    <Type className="w-3.5 h-3.5 text-slate-400" />
                    <span>Clinic &amp; Website</span>
                  </div>
                </th>

                {/* Doctor & Phone */}
                <th className="min-w-[145px] max-w-[170px] py-2.5 px-3">
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-zinc-500 font-semibold">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Doctor &amp; Phone</span>
                  </div>
                </th>

                {/* Website Verification */}
                <th className="min-w-[125px] py-2.5 px-3">
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-zinc-500 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Website Verification</span>
                  </div>
                </th>

                {/* Fit Score */}
                <th className="min-w-[110px] py-2.5 px-3">
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-zinc-500 font-semibold">
                    <Gauge className="w-3.5 h-3.5 text-slate-400" />
                    <span>Fit Score</span>
                  </div>
                </th>

                {/* Locality */}
                <th className="min-w-[120px] max-w-[160px] py-2.5 px-3 pr-4">
                  <div className="flex items-center gap-1.5 text-slate-400 dark:text-zinc-500 font-semibold">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>Locality</span>
                  </div>
                </th>
              </tr>
            </thead>

            {/* Table Body: Grouped by Discovered Date */}
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
              {groupedLeads.map(([dateKey, dateLeads]) => {
                const isCollapsed = collapsedDates.has(dateKey);
                return (
                  <React.Fragment key={dateKey}>
                    <tr
                      onClick={() => toggleDateGroup(dateKey)}
                      className="bg-slate-50/90 dark:bg-white/[0.03] hover:bg-slate-100/80 dark:hover:bg-white/[0.06] cursor-pointer select-none transition-colors"
                    >
                      <td colSpan={6} className="py-2 px-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                            {isCollapsed ? (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <Calendar className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                            <span>{formatGroupDate(dateKey)}</span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-white/[0.08] text-[10px] font-mono text-slate-600 dark:text-zinc-300">
                              {dateLeads.length}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                            {isCollapsed ? "Click to expand" : "Click to collapse"}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {!isCollapsed &&
                      dateLeads.map((lead, idx) => {
                        const isSelected = selectedIds.has(lead.id);

                        return (
                          <tr
                            key={lead.id}
                            onClick={() => onRowClick?.(lead)}
                            className={`transition-colors cursor-pointer group ${
                              isSelected
                                ? "bg-slate-100/70 dark:bg-zinc-800/40"
                                : "hover:bg-slate-50/80 dark:hover:bg-white/[0.03]"
                            }`}
                          >
                    {/* Sticky Checkbox */}
                    <td
                      className="sticky left-0 z-10 w-9 py-2.5 px-3 bg-white dark:bg-[#18181B] group-hover:bg-slate-50/80 dark:group-hover:bg-[#191C28]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const nativeEvent = e.nativeEvent as MouseEvent;
                          onToggleSelect(lead.id, nativeEvent.shiftKey);
                        }}
                        className="rounded border-slate-300 dark:border-white/20 bg-white dark:bg-white/5 text-zinc-900 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                    </td>

                    {/* Sticky Clinic Name & Domain */}
                    <td className="sticky left-9 z-10 py-2.5 px-3 min-w-[170px] max-w-[200px] bg-white dark:bg-[#18181B] group-hover:bg-slate-50/80 dark:group-hover:bg-[#191C28]">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="truncate">
                          <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-black dark:group-hover:text-white transition-colors truncate max-w-[160px]">
                            {lead.companyName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 dark:text-zinc-500 truncate max-w-[160px] mt-0.5">
                            {lead.companyDomain || "No active website"}
                          </div>
                        </div>

                        {lead.companyWebsite && lead.companyWebsite !== "#" && (
                          <a
                            href={lead.companyWebsite}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-zinc-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all"
                            title="Open website"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Doctor & Phone */}
                    <td className="py-2.5 px-3 min-w-[145px] max-w-[170px]">
                      <div className="truncate">
                        <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate max-w-[140px]">
                          {lead.contactName.startsWith("Dr.") ? lead.contactName : `Dr. ${lead.contactName}`}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-zinc-400 mt-0.5">
                          <span className="truncate max-w-[120px]">{lead.phone || lead.contactEmail}</span>
                          {lead.phone && (
                            <button
                              type="button"
                              onClick={(e) => handleCopy(lead.phone!, lead.id, e)}
                              className="text-slate-300 hover:text-zinc-900 dark:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                              title="Copy Phone"
                            >
                              {copiedId === lead.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Website Verification */}
                    <td className="py-2.5 px-3 min-w-[125px]">
                      <VerificationBadge
                        status={lead.verification.status}
                        details={lead.verification}
                        lead={lead}
                        placement={idx < 2 ? "bottom" : "top"}
                      />
                    </td>

                    {/* Fit Score */}
                    <td className="py-2.5 px-3 min-w-[110px]">
                      <ConfidencePill score={lead.verification.confidenceScore} />
                    </td>

                    {/* Locality */}
                    <td className="py-2.5 px-3 pr-4 min-w-[120px] max-w-[160px] text-xs text-slate-600 dark:text-zinc-400 font-medium">
                      <span className="truncate block max-w-[145px]" title={lead.location}>
                        {lead.location}
                      </span>
                    </td>
                  </tr>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
