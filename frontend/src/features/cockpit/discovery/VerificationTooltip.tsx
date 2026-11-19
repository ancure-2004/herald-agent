"use client";

import React, { useState } from "react";
import { DiscoveryLead, VerificationDetails } from "../types";
import { ShieldCheck, Phone, Globe, MapPin, Star } from "lucide-react";

interface VerificationTooltipProps {
  details: VerificationDetails;
  lead?: DiscoveryLead;
  placement?: "top" | "bottom";
  children: React.ReactNode;
}

export const VerificationTooltip: React.FC<VerificationTooltipProps> = ({
  details,
  lead,
  placement = "top",
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const phone = lead?.phone;
  const isWhatsAppMobile = Boolean(phone && phone.replace(/\D/g, "").length >= 10);
  const websiteLabel =
    details.status === "deliverable"
      ? "No Website"
      : details.status === "risky"
        ? "Needs Check"
        : details.status === "invalid"
          ? "Active Site"
          : "Probing...";
  const positionClass = placement === "bottom" ? "top-full mt-2" : "bottom-full mb-2";

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {children}

      {isOpen && (
        <div
          className={`absolute ${positionClass} left-1/2 -translate-x-1/2 z-50 w-64 p-3 rounded-lg bg-[#17181D] border border-white/[0.12] shadow-2xl text-[11px] text-slate-200 pointer-events-none animate-in fade-in zoom-in-95 duration-100`}
        >
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/[0.08]">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Discovery Audit
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              Fit: {details.confidenceScore}%
            </span>
          </div>

          <div className="space-y-1.5 font-mono text-[10px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400 flex items-center gap-1 shrink-0">
                <Phone className="w-3 h-3 text-slate-500" /> WhatsApp:
              </span>
              <span className={`truncate ${isWhatsAppMobile ? "text-emerald-400 font-semibold" : "text-amber-400"}`}>
                {phone || "No mobile"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400 flex items-center gap-1 shrink-0">
                <Globe className="w-3 h-3 text-slate-500" /> Website:
              </span>
              <span className={`font-semibold ${details.status === "deliverable" ? "text-emerald-400" : details.status === "invalid" ? "text-rose-400" : "text-amber-400"}`}>
                {websiteLabel}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400 flex items-center gap-1 shrink-0">
                <Star className="w-3 h-3 text-slate-500" /> Source:
              </span>
              <span className="text-slate-200 truncate max-w-[130px]">
                {lead?.enrichment?.provider || "GooglePlaces"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.05] text-[10px] text-slate-400">
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">{lead?.location || "Delhi NCR"}</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
