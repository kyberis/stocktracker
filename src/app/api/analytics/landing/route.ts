import { NextRequest, NextResponse } from "next/server";
import { trackLandingEvent } from "@/lib/db";
import { parseBody } from "@/lib/api-response";
import { landingEventSchema } from "@/lib/schemas";
import { withMetrics } from "@/lib/with-metrics";

export const POST = withMetrics("/api/analytics/landing", async (req: NextRequest) => {
  const result = await parseBody(req, landingEventSchema);
  if (!result.success) return result.error;
  const { event, metadata } = result.data;

  const referrer = req.headers.get("referer") || undefined;

  await trackLandingEvent(event, metadata, referrer);
  return NextResponse.json({ ok: true });
});
