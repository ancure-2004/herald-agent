/**
 * Shared tracking beacon and telemetry utilities for the dental clinic demo engine.
 */

export interface TrackingBeaconPayload {
  slug: string;
  eventType: "page_view" | "section_view" | "design_choice" | "whatsapp_tap";
  section: string;
  designChosen?: string;
  durationSeconds?: number;
}

/**
 * Returns true when running in a browser session driven by the walkthrough recorder (?recorder=1).
 */
export function isRecorderUrl(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("recorder") === "1";
}

/**
 * Dispatches a non-blocking tracking beacon to /api/track.
 * Automatically respects recorder=1 to avoid skewing CRM telemetry.
 */
export async function sendTrackingBeacon({
  slug,
  eventType,
  section,
  designChosen = "",
  durationSeconds = 0,
}: TrackingBeaconPayload): Promise<void> {
  if (isRecorderUrl()) return;

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
    // Non-blocking telemetry
  }
}
