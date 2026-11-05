import { NextRequest, NextResponse } from "next/server";
import { neonQuery } from "@/lib/neon-db";

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

    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }

    const uaLower = userAgent.toLowerCase();
    const isBot = BOT_AGENTS.some((b) => uaLower.includes(b));

    const leadRows = await neonQuery<{ id: number; hustle_id: number; stage_id: number }>(
      `SELECT id, hustle_id, stage_id FROM leads WHERE slug = $1 LIMIT 1`,
      [slug]
    );
    if (!leadRows.length) {
      return NextResponse.json({ logged: false, reason: "lead_not_in_neon" });
    }

    const lead = leadRows[0];
    const pkgRows = await neonQuery<{ id: number }>(
      `SELECT id FROM packages WHERE lead_id = $1 ORDER BY id DESC LIMIT 1`,
      [lead.id]
    );
    const packageId = pkgRows.length ? pkgRows[0].id : null;

    await neonQuery(
      `INSERT INTO events (lead_id, package_id, event_type, section, design_chosen, duration_seconds, user_agent, is_bot, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [lead.id, packageId, eventType, section, designChosen, durationSeconds, userAgent.slice(0, 390), isBot]
    );

    if (!isBot) {
      // Compute updated intent score from non-bot events in Neon
      const statsRows = await neonQuery<{
        views: string;
        choices: string;
        taps: string;
        dwell: string;
      }>(
        `SELECT
           COUNT(*) FILTER (WHERE event_type = 'page_view') AS views,
           COUNT(*) FILTER (WHERE event_type = 'design_choice') AS choices,
           COUNT(*) FILTER (WHERE event_type = 'whatsapp_tap') AS taps,
           COALESCE(SUM(duration_seconds), 0) AS dwell
         FROM events
         WHERE lead_id = $1 AND is_bot = FALSE`,
        [lead.id]
      );

      const s = statsRows[0] || { views: "1", choices: "0", taps: "0", dwell: "0" };
      const views = Number(s.views || 0);
      const choices = Number(s.choices || 0);
      const taps = Number(s.taps || 0);
      const dwell = Number(s.dwell || 0);

      let score = 0;
      const reasons: string[] = [];
      if (views >= 1) {
        score += 25;
        reasons.push(`Opened demo link (${views}x) (+25)`);
      }
      if (views >= 2) {
        score += 15;
        reasons.push("Repeat demo visits (+15)");
      }
      if (dwell >= 30) {
        score += 15;
        reasons.push(`Spent ${dwell}s exploring sections (+15)`);
      }
      if (choices >= 1) {
        score += 25;
        reasons.push(`Selected '${designChosen || "preferred"}' design (+25)`);
      }
      if (taps >= 1) {
        score += 25;
        reasons.push("Tapped WhatsApp CTA button on demo (+25)");
      }
      const finalScore = Math.min(99, score);

      let summary = `Opened live demo (${views}x, ${dwell}s dwell).`;
      if (eventType === "design_choice" && designChosen) {
        summary = `Doctor selected the '${designChosen.toUpperCase()}' design on the live preview!`;
      } else if (eventType === "whatsapp_tap") {
        summary = `Doctor tapped the WhatsApp button on the '${designChosen || "live"}' demo!`;
      }

      // Move stage to viewed_demo if currently in discovered / package_ready / queued / contacted
      await neonQuery(
        `UPDATE leads
         SET intent_score = $1,
             intent_reasons = $2::json,
             what_changed_summary = $3,
             stage_id = COALESCE(
               (SELECT s.id FROM stages s
                JOIN stages cur ON cur.id = leads.stage_id
                WHERE s.hustle_id = leads.hustle_id
                  AND s.slug = 'viewed_demo'
                  AND cur.slug IN ('discovered', 'package_ready', 'queued', 'contacted')
                LIMIT 1),
               leads.stage_id
             ),
             updated_at = NOW()
         WHERE id = $4`,
        [finalScore, JSON.stringify(reasons), summary, lead.id]
      );
    }

    return NextResponse.json({ logged: true, is_bot: isBot });
  } catch (err) {
    console.error("Track error:", err);
    return NextResponse.json({ logged: false }, { status: 200 });
  }
}
