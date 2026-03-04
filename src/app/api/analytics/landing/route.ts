import { NextRequest, NextResponse } from "next/server";
import { trackLandingEvent } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

const ALLOWED_EVENTS = new Set([
  "landing_page_view",
  "landing_feature_tab",
  "landing_cta_click",
  "landing_section_view",
  "landing_pricing_view",
  "landing_faq_open",
]);

const MAX_METADATA_KEYS = 5;
const MAX_VALUE_LENGTH = 128;

export const POST = withMetrics("/api/analytics/landing", async (req: NextRequest) => {
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

  let sanitized: Record<string, string> | undefined;
  if (body.metadata && typeof body.metadata === "object") {
    sanitized = {};
    const entries = Object.entries(body.metadata).slice(0, MAX_METADATA_KEYS);
    for (const [k, v] of entries) {
      sanitized[k.slice(0, 64)] = String(v).slice(0, MAX_VALUE_LENGTH);
    }
  }

  const referrer = req.headers.get("referer") || undefined;

  await trackLandingEvent(event, sanitized, referrer);
  return NextResponse.json({ ok: true });
});
