import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { listAlertedTickers, isFeatureEnabled } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/alerts/tickers", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const enabled = await isFeatureEnabled("alerts_enabled");
  if (!enabled) {
    return NextResponse.json({ tickers: [] });
  }

  const tickers = await listAlertedTickers(session.userId);
  return NextResponse.json({ tickers });
});
