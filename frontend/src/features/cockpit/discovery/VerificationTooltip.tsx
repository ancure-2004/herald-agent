"use client";

import React, { useState } from "react";
import { VerificationDetails } from "../types";
import { CheckCircle2, ShieldCheck, Clock, Server, AlertCircle } from "lucide-react";

interface VerificationTooltipProps {
  details: VerificationDetails;
  children: React.ReactNode;
}

export const VerificationTooltip: React.FC<VerificationTooltipProps> = ({ details, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {children}

      {isOpen && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 p-3 rounded-lg bg-[#17181D] border border-white/[0.12] shadow-2xl text-[11px] text-slate-200 pointer-events-none animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/[0.08]">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              SMTP &amp; MX Audit
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              Score: {details.confidenceScore}%
            </span>
          </div>

          <div className="space-y-1 font-mono text-[10px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Server className="w-3 h-3 text-slate-500" /> MX Host:
              </span>
              <span className="text-slate-200 truncate max-w-[130px]">
                {details.mxHost || "None"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">SMTP Handshake:</span>
              <span className={`font-semibold ${details.smtpCheck === "passed" ? "text-emerald-400" : details.smtpCheck === "failed" ? "text-rose-400" : "text-amber-400"}`}>
                {details.smtpCheck.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Catch-All Domain:</span>
              <span className={details.isCatchAll ? "text-amber-400 font-semibold" : "text-slate-400"}>
                {details.isCatchAll ? "YES (Risky)" : "NO"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Role / Disposable:</span>
              <span className={details.isRoleAccount || details.isDisposable ? "text-amber-400 font-semibold" : "text-slate-400"}>
                {details.isRoleAccount ? "ROLE" : details.isDisposable ? "DISPOSABLE" : "CLEAN"}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/[0.05] text-[9px] text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" /> Provider: {details.provider}
              </span>
              <span>{new Date(details.verifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
