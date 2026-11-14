import { NextRequest, NextResponse } from "next/server";

const BACKEND_API_URL = process.env.PERSONAL_OS_API_URL || "http://localhost:8000";

const BOT_AGENTS = [
  "whatsapp",
  "telegrambot",
  "facebookexternalhit",
  "twitterbot",
  "slackbot",
  "discordbot",
  "linkedinbot",
  "googlebot",
  "bingbot",
];

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const eventType = typeof body.event_type === "string" ? body.event_type.trim() : "page_view";
    const section = typeof body.section === "string" ? body.section.trim() : "hero";
    const designChosen = typeof body.design_chosen === "string" ? body.design_chosen.trim() : "";
    const durationSeconds = Number(body.duration_seconds || 0);
    const userAgent = req.headers.get("user-agent") || (typeof body.user_agent === "string" ? body.user_agent : "");

    // Recorder guard: skip ALL writes and backend forwarding when this request
    // comes from the automated walkthrough recorder. We detect it across all 3 entrypoints:
    //   1. ?recorder=1 on the API URL itself (direct query)
    //   2. Referer header contains "recorder=1" (the page URL the browser loaded)
    //   3. body.is_recorder flag sent explicitly by ViewTracker.tsx or caller
    const referer = req.headers.get("referer") || "";
    const apiUrlRecorder = req.nextUrl?.searchParams?.get("recorder") === "1";
    const refererRecorder = referer.includes("recorder=1");
    const bodyRecorder = String(body.is_recorder ?? "0") !== "0" && body.is_recorder !== false;
    const isRecorder = apiUrlRecorder || refererRecorder || bodyRecorder;

    if (isRecorder) {
      return NextResponse.json({ logged: false, reason: "recorder" });
    }

    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }

    const uaLower = userAgent.toLowerCase();
    const isBot = BOT_AGENTS.some((b) => uaLower.includes(b));

    // Forward non-bot events to the FastAPI backend, which is the single
    // source of truth for tracking with 15-minute debounce and real-time SSE.
    if (!isBot) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(`${BACKEND_API_URL}/api/v1/public/track`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lead_slug: slug,
            event_type: eventType,
            section,
            design_chosen: designChosen,
            duration_seconds: durationSeconds,
            user_agent: userAgent,
            is_recorder: false,
          }),
          cache: "no-store",
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
          console.error("Track forward failed:", res.status);
          return NextResponse.json({ logged: false, backend_status: res.status }, { status: 200 });
        }
      } catch (upstreamErr) {
        // Graceful handling when FastAPI backend is busy or times out
        console.warn("Track upstream backend timeout/unreachable:", upstreamErr);
        return NextResponse.json({ logged: false, reason: "upstream_timeout" }, { status: 200 });
      }
    }

    return NextResponse.json({ logged: true, is_bot: isBot });
  } catch (err) {
    console.error("Track error:", err);
    return NextResponse.json({ logged: false }, { status: 200 });
  }
}
