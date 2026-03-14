import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { isFeatureEnabled, getPlatformSetting } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/support-chat/config", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const enabled = await isFeatureEnabled("support_chat_enabled");
  const welcomeMessage = enabled ? await getPlatformSetting("support_chat_welcome") : "";

  return NextResponse.json({ enabled, welcomeMessage: welcomeMessage || "" });
});
