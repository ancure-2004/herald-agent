"use client";

import { useEffect, useRef } from "react";
import { isRecorderUrl, sendTrackingBeacon } from "@/lib/tracking";

interface ViewTrackerProps {
  slug: string;
  design: "modern" | "premium" | "warm" | "switcher";
}

export { isRecorderUrl };

export async function sendDemoEvent(
  slug: string,
  eventType: "page_view" | "section_view" | "design_choice" | "whatsapp_tap",
  section: string,
  designChosen: string = "",
  durationSeconds: number = 0
) {
  return sendTrackingBeacon({
    slug,
    eventType,
    section,
    designChosen,
    durationSeconds,
  });
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
