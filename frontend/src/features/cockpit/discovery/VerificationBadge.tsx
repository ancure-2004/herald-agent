"use client";

import React from "react";
import { DeliverabilityStatus, DiscoveryLead, VerificationDetails } from "../types";
import { VerificationTooltip } from "./VerificationTooltip";

interface VerificationBadgeProps {
  status: DeliverabilityStatus;
  details?: VerificationDetails;
  lead?: DiscoveryLead;
  placement?: "top" | "bottom";
  showTooltip?: boolean;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  status,
  details,
  lead,
  placement = "top",
  showTooltip = true,
}) => {
  const getConfig = () => {
    switch (status) {
      case "deliverable":
        return {
          label: "Verified No-Site",
          dotClass: "bg-emerald-500",
        };
      case "risky":
        return {
          label: "Needs Check",
          dotClass: "bg-amber-500",
        };
      case "invalid":
        return {
          label: "Has Active Site",
          dotClass: "bg-rose-500",
        };
      case "pending":
      default:
        return {
          label: "Probing...",
          dotClass: "bg-sky-500 animate-pulse",
        };
    }
  };

  const config = getConfig();

  const badgeContent = (
    <span
      className="bg-slate-100 hover:bg-slate-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-zinc-700 rounded-full px-2.5 py-1 text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-default select-none shrink-0"
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dotClass}`} />
      <span>{config.label}</span>
    </span>
  );

  if (showTooltip && details) {
    return (
      <VerificationTooltip details={details} lead={lead} placement={placement}>
        {badgeContent}
      </VerificationTooltip>
    );
  }

  return badgeContent;
};
