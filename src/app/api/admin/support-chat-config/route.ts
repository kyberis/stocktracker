import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { getPlatformSetting, setPlatformSetting, isFeatureEnabled } from "@/lib/db";
import { parseBody } from "@/lib/api-response";
import { supportChatConfigSchema } from "@/lib/schemas";
import { withMetrics } from "@/lib/with-metrics";
import { PLATFORM_LIMITS } from "@/lib/platform-config";

export const GET = withMetrics("/api/admin/support-chat-config", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const [enabled, starterDaily, proDaily, welcome, instructions, msgsMonth] = await Promise.all([
    isFeatureEnabled("support_chat_enabled"),
    getPlatformSetting("support_chat_starter_daily"),
    getPlatformSetting("support_chat_pro_daily"),
    getPlatformSetting("support_chat_welcome"),
    getPlatformSetting("support_chat_instructions"),
    getPlatformSetting("support_chat_msgs_month"),
  ]);

  return NextResponse.json({
    enabled,
    starterDailyLimit: starterDaily ? parseInt(starterDaily, 10) : PLATFORM_LIMITS.SUPPORT_CHAT_FREE_DAILY_DEFAULT,
    proDailyLimit: proDaily ? parseInt(proDaily, 10) : PLATFORM_LIMITS.SUPPORT_CHAT_PRO_DAILY_DEFAULT,
    welcomeMessage: welcome || "",
    customInstructions: instructions || "",
    messagesThisMonth: msgsMonth ? parseInt(msgsMonth, 10) : 0,
  });
});

export const PUT = withMetrics("/api/admin/support-chat-config", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const result = await parseBody(req, supportChatConfigSchema);
  if (!result.success) return result.error;
  const { starterDailyLimit, proDailyLimit, welcomeMessage, customInstructions } = result.data;

  await Promise.all([
    setPlatformSetting("support_chat_starter_daily", String(starterDailyLimit)),
    setPlatformSetting("support_chat_pro_daily", String(proDailyLimit)),
    setPlatformSetting("support_chat_welcome", welcomeMessage || ""),
    setPlatformSetting("support_chat_instructions", customInstructions || ""),
  ]);

  return NextResponse.json({ ok: true });
});
