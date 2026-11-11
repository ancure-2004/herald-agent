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
    const body = await req.json();
    const slug = String(body.slug || "").trim();
    const eventType = String(body.event_type || "page_view").trim();
    const section = String(body.section || "hero").trim();
    const designChosen = String(body.design_chosen || "").trim();
    const durationSeconds = Number(body.duration_seconds || 0);
    const userAgent = req.headers.get("user-agent") || String(body.user_agent || "");

    // Recorder guard: skip ALL writes and backend forwarding when this request
    // comes from the automated walkthrough recorder.  We detect it three ways:
    //   1. body.is_recorder flag sent explicitly by ViewTracker.tsx
    //   2. ?recorder=1 on the API URL itself (direct call)
    //   3. Referer header contains "recorder=1" (the page URL the browser loaded)
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
    // source of truth for tracking (no Neon DB writes from the demo engine).
    if (!isBot) {
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
        signal: AbortSignal.timeout(3000),
      });

      if (!res.ok) {
        console.error("Track forward failed:", res.status);
        return NextResponse.json({ logged: false, backend_status: res.status }, { status: 200 });
      }
    }

    return NextResponse.json({ logged: true, is_bot: isBot });
  } catch (err) {
    console.error("Track error:", err);
    return NextResponse.json({ logged: false }, { status: 200 });
  }
}
