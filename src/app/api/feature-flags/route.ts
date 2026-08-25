import { NextRequest, NextResponse } from "next/server";
import {
  getAllPlatformSettings,
  resolveAllFlagsForUser,
  resolveFeatureEnabledFromSettingsMap,
  type PlatformFeature,
} from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth/session";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

const ANONYMOUS_FLAGS = [
  "alerts_enabled", "csv_export_enabled", "apple_signin_enabled", "device_enabled",
  "mobile_app_enabled", "telegram_enabled",
  "tool_transactions_enabled", "tool_dividends_enabled", "tool_performance_enabled",
  "tool_taxonomy_enabled", "tool_rebalancing_enabled", "tool_accounts_enabled",
  "tool_watchlist_enabled",
  "pro_trial_enabled", "ai_report_enabled", "portfolio_v2_chart_enabled",
  "social_network_enabled",
  "market_data_fmp_search",
  "market_data_fmp_fundamentals",
  "market_data_fmp_intelligence",
  "market_data_fmp_portfolio_news",
  "market_data_fmp_economic_indicators",
  "market_data_fmp_crypto",
  "market_data_fmp_dividends",
  "market_data_fmp_event_sync",
  "commerce_enabled",
  "tool_tax_reports_enabled",
  "tool_simulator_enabled",
  "tool_planning_enabled",
] as const satisfies readonly PlatformFeature[];

export const GET = withMetrics("/api/feature-flags", async (req: NextRequest) => {
  const session = await getSessionFromRequest(req);

  if (session?.userId) {
    const flags = await resolveAllFlagsForUser(session.userId);
    const { support_chat_enabled: _, ...publicFlags } = flags;
    return NextResponse.json(publicFlags);
  }

  const allSettings = await getAllPlatformSettings();
  const flags = Object.fromEntries(
    ANONYMOUS_FLAGS.map((f) => [f, resolveFeatureEnabledFromSettingsMap(f, allSettings)]),
  );
  return NextResponse.json(flags);
});
