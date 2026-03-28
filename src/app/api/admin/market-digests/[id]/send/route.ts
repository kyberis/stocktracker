import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import {
  getMarketDigestWithTranslations,
  markDigestEmailSent,
  getUsersForDigestEmail,
} from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { withMetrics } from "@/lib/with-metrics";

export const maxDuration = 120;

function buildDigestEmailHtml(
  title: string,
  summary: string,
  keyPoints: string[],
  tickers: string[],
  sentiment: string,
): string {
  const sentimentColor =
    sentiment === "bullish" ? "#10b981" : sentiment === "bearish" ? "#ef4444" : "#6b7280";
  const sentimentLabel =
    sentiment === "bullish" ? "Bullish" : sentiment === "bearish" ? "Bearish" : "Neutral";

  const pointsHtml = keyPoints
    .map((p) => `<li style="margin-bottom:6px;color:#374151;">${p}</li>`)
    .join("");

  const tickersHtml = tickers.length > 0
    ? `<div style="margin-top:16px;"><strong style="color:#6b7280;font-size:13px;">Mentioned tickers:</strong> <span style="color:#374151;">${tickers.join(", ")}</span></div>`
    : "";

  return `
<div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="padding:24px 0;border-bottom:1px solid #e5e7eb;">
    <h1 style="margin:0 0 4px;font-size:22px;color:#111827;">${title}</h1>
    <span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;color:white;background:${sentimentColor};">
      ${sentimentLabel}
    </span>
  </div>
  <div style="padding:20px 0;">
    ${summary.split("\n").map((p) => `<p style="margin:0 0 12px;line-height:1.6;color:#374151;">${p}</p>`).join("")}
  </div>
  ${pointsHtml ? `<ul style="padding-left:20px;margin:12px 0;">${pointsHtml}</ul>` : ""}
  ${tickersHtml}
  <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;">
    <p>This insight was prepared by trefolio's editorial team. It is for informational purposes only and does not constitute financial advice.</p>
    <p><a href="{{unsubscribe_url}}" style="color:#6b7280;">Unsubscribe</a></p>
  </div>
</div>`;
}

export const POST = withMetrics("/api/admin/market-digests/[id]/send", async (
  req: NextRequest,
  ctx: unknown,
) => {
  const { session, error } = await requireAdmin(req);
  if (error || !session) return error!;

  const { id } = (ctx as { params: { id: string } }).params;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body: { testEmail?: string; testLanguage?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* no body = full send */
  }

  const digest = await getMarketDigestWithTranslations(id);
  if (!digest) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const translationMap = new Map(digest.translations.map((t) => [t.language, t]));
  const enTranslation = translationMap.get("en");
  if (!enTranslation) {
    return NextResponse.json({ error: "No English translation found" }, { status: 400 });
  }

  // ── Test send: single email to a specific address ──
  if (body.testEmail) {
    const lang = body.testLanguage || "en";
    const t = translationMap.get(lang) || enTranslation;
    const html = buildDigestEmailHtml(
      t.title,
      t.summary,
      t.keyPoints,
      digest.mentionedTickers,
      digest.sentiment,
    );

    const result = await sendEmail({
      to: body.testEmail,
      subject: `[TEST] trefolio Market Insight: ${t.title}`,
      html,
      internal: true,
    });

    return NextResponse.json({
      ok: result.success,
      test: true,
      to: body.testEmail,
      language: lang,
      error: result.error,
    });
  }

  // ── Full send: all verified users ──
  if (digest.status !== "published") {
    return NextResponse.json({ error: "Digest must be published before sending" }, { status: 400 });
  }
  if (digest.emailSent) {
    return NextResponse.json({ error: "Email already sent for this digest" }, { status: 409 });
  }

  const users = await getUsersForDigestEmail();
  if (users.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: "No eligible users" });
  }

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    const t = translationMap.get(user.language) || enTranslation;
    const html = buildDigestEmailHtml(
      t.title,
      t.summary,
      t.keyPoints,
      digest.mentionedTickers,
      digest.sentiment,
    );

    try {
      const result = await sendEmail({
        to: user.email,
        subject: `trefolio Market Insight: ${t.title}`,
        html,
        userId: user.id,
      });
      if (result.success) sent++;
      else failed++;
    } catch {
      failed++;
    }
  }

  await markDigestEmailSent(id);
  return NextResponse.json({ ok: true, sent, failed, total: users.length });
});
