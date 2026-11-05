"use client";

import { useEffect, useRef } from "react";

interface ViewTrackerProps {
  slug: string;
  design: "modern" | "premium" | "warm" | "switcher";
}

export async function sendDemoEvent(
  slug: string,
  eventType: "page_view" | "section_view" | "design_choice" | "whatsapp_tap",
  section: string,
  designChosen: string = "",
  durationSeconds: number = 0
) {
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
