import { NextRequest, NextResponse } from "next/server";
import { getPromoBannerConfig } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/promo-banner", async (_req: NextRequest) => {
  const config = await getPromoBannerConfig();
  if (!config.enabled) {
    return NextResponse.json({ enabled: false });
  }
  return NextResponse.json(config);
});
