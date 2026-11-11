"use client";

import { useEffect, useRef } from "react";

interface ViewTrackerProps {
  slug: string;
  design: "modern" | "premium" | "warm" | "switcher";
}

/** Returns true when the current page URL contains ?recorder=1 (walkthrough recorder mode). */
function isRecorderSession(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("recorder") === "1";
}

export async function sendDemoEvent(
  slug: string,
  eventType: "page_view" | "section_view" | "design_choice" | "whatsapp_tap",
  section: string,
  designChosen: string = "",
  durationSeconds: number = 0
) {
  // Never record analytics when the walkthrough recorder is driving the browser.
  // This prevents fake views / inflated intent scores from automated recordings.
  if (isRecorderSession()) return;

  try {
    await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        event_type: eventType,
        section,
        design_chosen: designChosen,
        duration_seconds: durationSeconds,
        is_recorder: false,
      }),
      keepalive: true,
    });
  } catch {
    // non-blocking telemetry
  }
}

export default function ViewTracker({ slug, design }: ViewTrackerProps) {
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    sendDemoEvent(slug, "page_view", `${design}_landing`, design, 0);

    const interval = setInterval(() => {
      sendDemoEvent(slug, "section_view", `${design}_active`, design, 15);
    }, 15000);

    return () => clearInterval(interval);
  }, [slug, design]);

  return null;
}
