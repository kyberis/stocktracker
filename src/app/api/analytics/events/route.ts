import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { trackEvent } from "@/lib/db";

const ALLOWED_EVENTS = new Set([
  "stock_view",
  "ai_analysis",
  "page_view",
  "settings_changed",
  "theme_toggled",
]);

export async function POST(req: NextRequest) {
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
}
