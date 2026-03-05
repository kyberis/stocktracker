import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { trackEvent } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

const ALLOWED_EVENTS = new Set([
  "stock_view",
  "ai_analysis",
  "page_view",
  "settings_changed",
  "theme_toggled",
  "billing_checkout_started",
  "billing_checkout_completed",
  "billing_portal_opened",
  "paywall_shown",
  "upgrade_compare_shown",
  "upgrade_compare_clicked",
  "portfolio_period_returns_viewed",
  "alert_created",
  "alert_triggered",
  "alert_limit_reached",
  "alert_email_sent",
  "csv_exported",
]);

export const POST = withMetrics("/api/analytics/events", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  let body: { event?: string; metadata?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const event = body.event?.trim();
  if (!event || !ALLOWED_EVENTS.has(event)) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  await trackEvent(session.userId, event, body.metadata);
  return NextResponse.json({ ok: true });
});
