"use client";

import { useEffect, useState } from "react";

/**
 * Network-aware and Tab-visibility polling backoff utility.
 * Calculates dynamic intervals based on:
 * - document.visibilityState ('hidden' vs 'visible')
 * - navigator.connection.effectiveType ('slow-2g', '2g', '3g', '4g')
 * - navigator.connection.saveData
 */
export function getPollingInterval(baseMs: number, minBackgroundMs = 10000): number {
  if (typeof window === "undefined") return baseMs;

  let multiplier = 1;

  // 1. Tab visibility backoff: when tab is hidden, back off significantly
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    multiplier *= 3;
  }

  // 2. Network connection awareness: back off on 2G / 3G / saveData
  if (typeof navigator !== "undefined" && "connection" in navigator) {
    const conn = (navigator as unknown as {
      connection?: {
        effectiveType?: string;
        saveData?: boolean;
      };
    }).connection;

    if (conn) {
      if (conn.saveData) {
        multiplier *= 2;
      }
      switch (conn.effectiveType) {
        case "slow-2g":
        case "2g":
          multiplier *= 3;
          break;
        case "3g":
          multiplier *= 1.8;
          break;
        case "4g":
        default:
          break;
      }
    }
  }

  const computed = Math.round(baseMs * multiplier);
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return Math.max(computed, minBackgroundMs);
  }
  return computed;
}

/**
 * React hook that returns the current dynamic polling interval, updating on
 * visibilitychange or connection change events.
 */
export function usePollingInterval(baseMs: number, minBackgroundMs = 10000): number {
  const [intervalMs, setIntervalMs] = useState<number>(() => getPollingInterval(baseMs, minBackgroundMs));

  useEffect(() => {
    if (typeof window === "undefined") return;

    const update = () => {
      setIntervalMs(getPollingInterval(baseMs, minBackgroundMs));
    };

    document.addEventListener("visibilitychange", update);

    const conn = (navigator as unknown as {
      connection?: EventTarget & {
        effectiveType?: string;
        saveData?: boolean;
      };
    }).connection;

    if (conn && typeof conn.addEventListener === "function") {
      conn.addEventListener("change", update);
    }

    return () => {
      document.removeEventListener("visibilitychange", update);
      if (conn && typeof conn.removeEventListener === "function") {
        conn.removeEventListener("change", update);
      }
    };
  }, [baseMs, minBackgroundMs]);

  return intervalMs;
}
