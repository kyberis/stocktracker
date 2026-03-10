import { NextRequest, NextResponse } from "next/server";
import { getAdConfig } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/ad-config", async (_req: NextRequest) => {
  const config = await getAdConfig();

  if (!config.globalEnabled || !config.clientId) {
    return NextResponse.json({ enabled: false });
  }

  const enabledSlots: Record<string, string> = {};
  for (const [key, slot] of Object.entries(config.slots)) {
    if (slot.enabled && slot.slotId) {
      enabledSlots[key] = slot.slotId;
    }
  }

  return NextResponse.json({
    enabled: true,
    clientId: config.clientId,
    slots: enabledSlots,
  });
});
