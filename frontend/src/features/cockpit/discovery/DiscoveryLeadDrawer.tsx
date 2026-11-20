"use client";

import React, { useEffect, useState } from "react";
import { DiscoveryLead } from "../types";
import { VerificationBadge } from "./VerificationBadge";
import {
  X,
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
  Building2,
  Calendar,
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

  const rawPhone = lead.phone || "";
  const phoneDigits = rawPhone.replace(/[^0-9]/g, "");

  // Real email check: ignore synthetic/fallback emails like *@wa.me or contact@clinic.in
  const hasRealEmail =
    Boolean(lead.contactEmail) &&
    !lead.contactEmail.includes("@wa.me") &&
    !lead.contactEmail.endsWith("@clinic.in");

  // Real MX host check: ignore placeholder smtp.clinic.in
  const hasRealMxHost =
    Boolean(lead.verification.mxHost) &&
    lead.verification.mxHost !== "smtp.clinic.in";

  const doctorFormatted = lead.contactName
    ? /^dr\.?\s+/i.test(lead.contactName)
      ? lead.contactName
      : `Dr. ${lead.contactName}`
    : "Doctor In-Charge";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="discovery-drawer-title"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="my-2 mr-2 h-[calc(100vh-16px)] w-full max-w-[480px] sm:w-[480px] rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/[0.08] shadow-2xl overflow-hidden flex flex-col z-50 animate-in slide-in-from-right duration-300"
      >
        {/* 1. COMPACT HEADER */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
          {/* Row 1: Status Dot + Clinic Name + Close Button */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <h2
                id="discovery-drawer-title"
                className="text-base font-bold text-zinc-900 dark:text-white truncate"
                title={lead.companyName}
              >
                {lead.companyName}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-zinc-900 dark:hover:text-white rounded-lg p-1 transition-colors cursor-pointer shrink-0"
              title="Close drawer (Esc)"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Row 2: Doctor & Locality + Fit Score & Verification Inline */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                {doctorFormatted}
              </span>
              <span>•</span>
              <span className="text-[11px]">{lead.contactTitle || "Clinical Director"}</span>
              <span>•</span>
              <span className="truncate">{lead.location || "Delhi NCR"}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="bg-slate-100 dark:bg-slate-800 text-zinc-800 dark:text-zinc-200 border border-slate-200/80 dark:border-slate-700 rounded-md px-1.5 py-0.5 text-[11px] font-medium font-mono">
                Fit {lead.verification.confidenceScore || 0}%
              </span>
              <VerificationBadge
                status={lead.verification.status}
                details={lead.verification}
                lead={lead}
                placement="bottom"
              />
            </div>
          </div>

          {/* Row 3: Action Buttons / Quick Link Bar */}
          <div className="grid grid-cols-2 gap-2.5 mt-3">
            {phoneDigits ? (
              <a
                href={`https://wa.me/${phoneDigits}?text=Hi%20${encodeURIComponent(doctorFormatted)},`}
                target="_blank"
                rel="noreferrer"
                className="bg-slate-100 hover:bg-zinc-900 hover:text-white dark:bg-slate-800 dark:hover:bg-zinc-100 dark:hover:text-zinc-900 text-zinc-800 dark:text-zinc-200 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Phone className="w-3 h-3 fill-current shrink-0" />
                <span className="truncate">{lead.phone}</span>
              </a>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-400 text-xs rounded-xl px-3 py-1.5 flex items-center justify-center italic">
                No phone registered
              </div>
            )}

            {lead.companyWebsite && lead.companyWebsite !== "#" ? (
              <a
                href={lead.companyWebsite}
                target="_blank"
                rel="noreferrer"
                className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center justify-center gap-1.5 transition-colors truncate"
              >
                <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">Visit Website</span>
                <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" />
              </a>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-400 text-xs rounded-xl px-3 py-1.5 flex items-center justify-center italic">
                No existing site
              </div>
            )}
          </div>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Executive Strategy & Discovery Summary Callout Box */}
          <div className="bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-white min-w-0 truncate">
                <Sparkles className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 shrink-0" />
                <span className="truncate">Discovery Assessment</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono shrink-0">
                {formatTimestamp(lead.createdAt)}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words font-sans">
              {lead.companyWebsite && lead.companyWebsite !== "#"
                ? `Clinic discovered via ${lead.enrichment.provider || "automated pipeline"} with an active web domain (${lead.companyDomain}). Evaluated for modern redesign and mobile responsiveness.`
                : `Clinic discovered via ${lead.enrichment.provider || "automated pipeline"} with no active website detected. Prime high-intent candidate for 3 bespoke website previews and direct WhatsApp outreach.`}
            </p>
          </div>

          {/* Card 1: Contact & Links */}
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                <span>Contact &amp; Links</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Direct Channels</span>
            </div>

            <div className="rounded-lg border border-slate-100 dark:border-white/[0.06] divide-y divide-slate-100 dark:divide-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]">
              {/* Doctor */}
              <div className="px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400">Doctor In-Charge</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {doctorFormatted}
                </span>
              </div>

              {/* Phone */}
              <div className="px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-slate-400" /> Phone
                </span>
                <div className="flex items-center gap-1.5 font-mono text-zinc-900 dark:text-zinc-100">
                  <span>{lead.phone || "-"}</span>
                  {lead.phone && (
                    <button
                      type="button"
                      onClick={() => handleCopy(lead.phone!, "phone")}
                      className="p-1 rounded hover:bg-slate-200/60 dark:hover:bg-white/[0.08] text-slate-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer transition-colors"
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

              {/* Email */}
              <div className="px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-slate-400" /> Email
                </span>
                {hasRealEmail ? (
                  <div className="flex items-center gap-1.5 font-mono text-zinc-900 dark:text-zinc-100 truncate">
                    <span className="truncate max-w-[220px]">{lead.contactEmail}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(lead.contactEmail, "email")}
                      className="p-1 rounded hover:bg-slate-200/60 dark:hover:bg-white/[0.08] text-slate-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer transition-colors"
                      title="Copy email"
                    >
                      {copiedField === "email" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ) : (
                  <span className="text-slate-400 italic">Not available</span>
                )}
              </div>

              {/* Website */}
              <div className="px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Globe className="w-3 h-3 text-slate-400" /> Website
                </span>
                {lead.companyWebsite && lead.companyWebsite !== "#" ? (
                  <a
                    href={lead.companyWebsite}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-mono truncate max-w-[220px]"
                  >
                    <span className="truncate">{lead.companyWebsite}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ) : (
                  <span className="text-slate-400 italic">No website found</span>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Discovery Source & Location */}
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>Discovery Source &amp; Location</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Geo &amp; Pipeline</span>
            </div>

            <div className="rounded-lg border border-slate-100 dark:border-white/[0.06] divide-y divide-slate-100 dark:divide-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]">
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Locality &amp; City</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{lead.location}</span>
              </div>
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Source Provider</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">{lead.enrichment.provider}</span>
              </div>
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Industry Sector</span>
                <span className="text-zinc-800 dark:text-zinc-200">{lead.industry || "Dental Healthcare"}</span>
              </div>
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Enrichment State</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50 text-[10px] font-mono uppercase">
                  {lead.enrichment.state}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Website Verification & Signals */}
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Website Verification &amp; Signals</span>
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                {lead.demoReady ? "Demo Ready" : "Staged"}
              </span>
            </div>

            <div className="rounded-lg border border-slate-100 dark:border-white/[0.06] divide-y divide-slate-100 dark:divide-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]">
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Verification Status</span>
                <VerificationBadge
                  status={lead.verification.status}
                  details={lead.verification}
                  lead={lead}
                  placement="bottom"
                />
              </div>
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Confidence / Fit</span>
                <span className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-zinc-800 dark:text-zinc-200 text-[11px] px-2 py-0.5 rounded font-mono font-medium">
                  {lead.verification.confidenceScore}%
                </span>
              </div>
              {hasRealMxHost && (
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">MX Host</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200 truncate max-w-[200px]">
                    {lead.verification.mxHost}
                  </span>
                </div>
              )}
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Detected Stack</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {(lead.enrichment.techStack || []).length > 0 ? (
                    lead.enrichment.techStack!.map((tech) => (
                      <span
                        key={tech}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40 text-[10px] font-medium"
                      >
                        <Layers className="w-2.5 h-2.5" />
                        {tech}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">None</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Discovered Details & Timestamps */}
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>Discovered Details</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Metadata</span>
            </div>

            <div className="rounded-lg border border-slate-100 dark:border-white/[0.06] divide-y divide-slate-100 dark:divide-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]">
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-slate-400" /> Discovered
                </span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">
                  {formatTimestamp(lead.createdAt)}
                </span>
              </div>
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-slate-400" /> Verified
                </span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">
                  {formatTimestamp(lead.verification.verifiedAt)}
                </span>
              </div>
              {lead.tags && lead.tags.length > 0 && (
                <div className="px-3 py-2 flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Tags</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {lead.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-white/[0.08] text-[10px] font-mono"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 5. CLEAN ACTION FOOTER */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#141721] grid grid-cols-2 gap-2.5 shrink-0">
          {phoneDigits ? (
            <a
              href={`https://wa.me/${phoneDigits}?text=Hi%20${encodeURIComponent(doctorFormatted)},`}
              target="_blank"
              rel="noreferrer"
              className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 rounded-xl py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              <span>WhatsApp Doctor</span>
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="bg-slate-100 dark:bg-slate-800/60 text-slate-400 border border-slate-200/60 dark:border-slate-700/60 rounded-xl py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed"
            >
              <Phone className="w-4 h-4" />
              <span>No Phone</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-zinc-900 dark:text-zinc-100 border border-slate-200/80 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  );
};
