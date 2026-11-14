"use client";

import React from "react";
import { DeliverabilityStatus, VerificationDetails } from "../types";
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { VerificationTooltip } from "./VerificationTooltip";

interface VerificationBadgeProps {
  status: DeliverabilityStatus;
  details?: VerificationDetails;
  showTooltip?: boolean;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  status,
  details,
  showTooltip = true,
}) => {
  const getBadgeConfig = () => {
    switch (status) {
      case "deliverable":
        return {
          label: "Verified No-Site",
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />,
          classes: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
        };
      case "risky":
        return {
          label: "Needs Check",
          icon: <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />,
          classes: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
        };
      case "invalid":
        return {
          label: "Has Active Site",
          icon: <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />,
          classes: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20",
        };
      case "pending":
      default:
        return {
          label: "Probing...",
          icon: <Loader2 className="w-3 h-3 text-sky-600 dark:text-sky-400 animate-spin" />,
          classes: "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/20",
        };
    }
  };

  const config = getBadgeConfig();

  const badgeContent = (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border font-mono tracking-tight cursor-default ${config.classes}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );

  if (showTooltip && details) {
    return <VerificationTooltip details={details}>{badgeContent}</VerificationTooltip>;
  }

  return badgeContent;
};
