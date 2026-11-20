"use client";

import React, { useEffect, useState } from "react";
import { DiscoveryLead } from "../types";
import { VerificationBadge } from "./VerificationBadge";
import { ConfidencePill } from "./ConfidencePill";
import {
  X,
  Building2,
  UserCheck,
  Phone,
  Mail,
  Globe,
  MapPin,
  ShieldCheck,
  Sparkles,
  Clock,
  Copy,
  Check,
  ExternalLink,
  Layers,
} from "lucide-react";

interface DiscoveryLeadDrawerProps {
  lead: DiscoveryLead | null;
  onClose: () => void;
}

export const DiscoveryLeadDrawer: React.FC<DiscoveryLeadDrawerProps> = ({
  lead,
  onClose,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!lead) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lead, onClose]);

  if (!lead) return null;

  const handleCopy = (value: string, field: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const formatTimestamp = (iso?: string) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <aside
        className="w-full max-w-lg h-full bg-white dark:bg-[#11131C] border-l border-slate-200 dark:border-white/[0.08] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-white/[0.08] flex items-start justify-between gap-4 bg-slate-50/70 dark:bg-[#161925]">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white truncate">
                {lead.companyName}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono truncate">
              {lead.companyDomain || "no-website.clinic"} · {lead.industry}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-zinc-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Top Metrics Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02]">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                Fit Score
              </div>
              <ConfidencePill score={lead.verification.confidenceScore} />
            </div>
            <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02]">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                Website Verification
              </div>
              <VerificationBadge
                status={lead.verification.status}
                details={lead.verification}
                lead={lead}
                placement="bottom"
              />
            </div>
          </div>

          {/* Doctor & Contact */}
          <section className="space-y-2.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Doctor &amp; Contact</span>
            </h3>
            <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] divide-y divide-slate-100 dark:divide-white/[0.06]">
              <div className="px-3.5 py-2.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Doctor</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {lead.contactName.startsWith("Dr.") ? lead.contactName : `Dr. ${lead.contactName}`}
                </span>
              </div>
              <div className="px-3.5 py-2.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Role</span>
                <span className="text-zinc-800 dark:text-zinc-200">{lead.contactTitle || "Clinical Director"}</span>
              </div>
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone
                </span>
                <div className="flex items-center gap-1.5 font-mono text-zinc-900 dark:text-zinc-100">
                  <span>{lead.phone || "-"}</span>
                  {lead.phone && (
                    <button
                      type="button"
                      onClick={() => handleCopy(lead.phone!, "phone")}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                      title="Copy phone"
                    >
                      {copiedField === "phone" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email
                </span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200 truncate max-w-[260px]">
                  {lead.contactEmail}
                </span>
              </div>
              <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Website
                </span>
                {lead.companyWebsite && lead.companyWebsite !== "#" ? (
                  <a
                    href={lead.companyWebsite}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-mono truncate max-w-[240px]"
                  >
                    <span>{lead.companyWebsite}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ) : (
                  <span className="text-slate-400 italic">No active website</span>
                )}
              </div>
            </div>
          </section>

          {/* Location & Discovery Source */}
          <section className="space-y-2.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>Location &amp; Discovery</span>
            </h3>
            <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] divide-y divide-slate-100 dark:divide-white/[0.06]">
              <div className="px-3.5 py-2.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Locality &amp; City</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{lead.location}</span>
              </div>
              <div className="px-3.5 py-2.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Source Provider</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">{lead.enrichment.provider}</span>
              </div>
              <div className="px-3.5 py-2.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Enrichment State</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50 text-[10px] font-mono uppercase">
                  {lead.enrichment.state}
                </span>
              </div>
            </div>
          </section>

          {/* Verification Diagnostics */}
          <section className="space-y-2.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verification Diagnostics</span>
            </h3>
            <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] divide-y divide-slate-100 dark:divide-white/[0.06]">
              <div className="px-3.5 py-2.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">SMTP Check</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100 uppercase">
                  {lead.verification.smtpCheck}
                </span>
              </div>
              <div className="px-3.5 py-2.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">MX Record</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">
                  {lead.verification.mxRecordValid ? `Valid (${lead.verification.mxHost})` : "Invalid"}
                </span>
              </div>
              <div className="px-3.5 py-2.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Flags</span>
                <div className="flex flex-wrap gap-1.5 justify-end">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 font-mono text-[10px]">
                    Catch-All: {lead.verification.isCatchAll ? "Yes" : "No"}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 font-mono text-[10px]">
                    Disposable: {lead.verification.isDisposable ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Detected Signals & Tags */}
          <section className="space-y-2.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Detected Signals &amp; Tech</span>
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {(lead.enrichment.techStack || []).map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40 text-[11px] font-medium"
                >
                  <Layers className="w-3 h-3" />
                  {item}
                </span>
              ))}
              {lead.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-white/[0.08] text-[11px] font-mono"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>

          {/* Timestamps */}
          <section className="space-y-2.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Timestamps</span>
            </h3>
            <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.08] divide-y divide-slate-100 dark:divide-white/[0.06]">
              <div className="px-3.5 py-2.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Discovered At</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">{formatTimestamp(lead.createdAt)}</span>
              </div>
              <div className="px-3.5 py-2.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Verified At</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">
                  {formatTimestamp(lead.verification.verifiedAt)}
                </span>
              </div>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
};
