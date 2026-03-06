import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { trackEvent } from "@/lib/db";
import { parseBody } from "@/lib/api-response";
import { trackEventSchema } from "@/lib/schemas";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/analytics/events", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const result = await parseBody(req, trackEventSchema);
  if (!result.success) return result.error;
  const { event, metadata } = result.data;

  await trackEvent(session.userId, event, metadata);
  return NextResponse.json({ ok: true });
});
