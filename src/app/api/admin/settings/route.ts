import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import {
  isFeatureEnabled,
  type PlatformFeature,
  getGlobalResendApiKey,
  getPlatformSetting,
  getAllStripePriceConfig,
  getPromoBannerConfig,
  getGaMeasurementId,
  getAdConfig,
  getUtmTaxonomyConfig,
  countProSubscribers,
  getRateLimitStats,
} from "@/lib/db";
import { getCronStats } from "@/lib/cron-logging";
import { isGrafanaCloudConfigured } from "@/lib/grafana-push";
import { PLATFORM_LIMITS } from "@/lib/platform-config";

const ALLOWED_FLAGS: PlatformFeature[] = [
  "alerts_enabled", "csv_export_enabled", "apple_signin_enabled", "device_enabled",
  "mobile_app_enabled", "whatsapp_enabled",
  "tool_transactions_enabled", "tool_dividends_enabled", "tool_performance_enabled",
  "tool_taxonomy_enabled", "tool_rebalancing_enabled", "tool_accounts_enabled",
  "tool_watchlist_enabled",
  "support_chat_enabled",
];

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/admin/settings", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const [
    flagEntries,
    resendKey,
    chatEnabled,
    chatStarterLimit,
    chatProLimit,
    chatWelcome,
    chatInstructions,
    chatMsgCount,
    stripePrices,
    promoBanner,
    gaConfig,
    adConfig,
    utmTaxonomy,
    cronData,
    proCount,
    rateLimits,
  ] = await Promise.all([
    Promise.all(ALLOWED_FLAGS.map(async (f) => [f, await isFeatureEnabled(f)] as const)),
    getGlobalResendApiKey(),
    isFeatureEnabled("support_chat_enabled"),
    getPlatformSetting("support_chat_starter_daily_limit").then((v) => parseInt(v || "10", 10)),
    getPlatformSetting("support_chat_pro_daily_limit").then((v) => parseInt(v || "50", 10)),
    getPlatformSetting("support_chat_welcome_message"),
    getPlatformSetting("support_chat_custom_instructions"),
    getPlatformSetting("support_chat_messages_this_month").then((v) => parseInt(v || "0", 10)),
    getAllStripePriceConfig(),
    getPromoBannerConfig(),
    getGaMeasurementId().then((gaId) => ({
      gaId,
      source: gaId === (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "") ? "env" as const : "database" as const,
    })),
    getAdConfig(),
    getUtmTaxonomyConfig(),
    getCronStats(),
    countProSubscribers(),
    getRateLimitStats(),
  ]);

  const flags: Record<string, boolean> = {};
  for (const [flag, enabled] of flagEntries) {
    flags[flag] = enabled;
  }

  const cloudUrl = process.env.GRAFANA_CLOUD_DASHBOARD_URL || "";
  const localUrl = process.env.GRAFANA_URL || "";

  const maxCount = PLATFORM_LIMITS.MAX_PRO_SUBSCRIBERS;

  return NextResponse.json({
    flags,
    resendKey: {
      hasKey: resendKey.length > 0,
      maskedKey: resendKey ? `${resendKey.slice(0, 4)}...${resendKey.slice(-4)}` : "",
    },
    supportChat: {
      enabled: chatEnabled,
      starterDailyLimit: chatStarterLimit,
      proDailyLimit: chatProLimit,
      welcomeMessage: chatWelcome || "",
      customInstructions: chatInstructions || "",
      messagesThisMonth: chatMsgCount,
    },
    stripePrices,
    promoBanner: { config: promoBanner },
    gaConfig,
    adConfig,
    utmTaxonomy: { config: utmTaxonomy },
    cronStats: cronData,
    grafana: {
      url: cloudUrl || localUrl,
      source: cloudUrl ? "cloud" : localUrl ? "local" : "none",
      cloudConfigured: isGrafanaCloudConfigured(),
    },
    capacity: {
      available: proCount < maxCount,
      currentCount: proCount,
      maxCount,
      remaining: Math.max(0, maxCount - proCount),
    },
    rateLimits,
  });
});
