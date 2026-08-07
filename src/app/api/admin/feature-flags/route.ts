import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { isFeatureEnabled, setFeatureEnabled, getFeatureFlagOverrideCounts, type PlatformFeature } from "@/lib/db";
import { parseBody } from "@/lib/api-response";
import { featureFlagSchema } from "@/lib/schemas";
import { withMetrics } from "@/lib/with-metrics";

const ALLOWED_FLAGS: PlatformFeature[] = [
  "alerts_enabled", "csv_export_enabled", "apple_signin_enabled", "device_enabled",
  "mobile_app_enabled", "telegram_enabled",
  "tool_transactions_enabled", "tool_dividends_enabled", "tool_performance_enabled",
  "tool_taxonomy_enabled", "tool_rebalancing_enabled", "tool_accounts_enabled",
  "tool_watchlist_enabled",
  "support_chat_enabled",
  "pro_trial_enabled",
  "ai_report_enabled",
  "portfolio_v2_chart_enabled",
  "social_network_enabled",
  "market_data_fmp_search",
  "market_data_fmp_fundamentals",
  "market_data_fmp_intelligence",
  "market_data_fmp_portfolio_news",
  "market_data_fmp_economic_indicators",
  "market_data_fmp_crypto",
  "market_data_fmp_dividends",
  "market_data_fmp_event_sync",
  "market_data_alpha_vantage",
  "weekly_digest_enabled",
  "daily_digests_enabled",
  "aid_beta",
  "home_v2",
  "classic_home",
  "commerce_enabled",
  "tool_tax_reports_enabled",
  "tool_simulator_enabled",
  "tool_planning_enabled",
  "investment_screening_enabled",
  "screening_dev_lab_enabled",
  "screening_pipeline_real_enabled",
  "screening_ir_agent_enabled",
];

export const GET = withMetrics("/api/admin/feature-flags", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const [overrideCounts, ...flagValues] = await Promise.all([
    getFeatureFlagOverrideCounts(),
    ...ALLOWED_FLAGS.map((f) => isFeatureEnabled(f)),
  ]);

  const flags: Record<string, boolean> = {};
  ALLOWED_FLAGS.forEach((f, i) => { flags[f] = flagValues[i]; });

  return NextResponse.json({ flags, overrideCounts });
});

export const PUT = withMetrics("/api/admin/feature-flags", async (req: NextRequest) => {
  const { error } = await requireAdmin(req);
  if (error) return error;

  const result = await parseBody(req, featureFlagSchema);
  if (!result.success) return result.error;
  const { flag, enabled } = result.data;

  await setFeatureEnabled(flag, enabled);
  return NextResponse.json({ ok: true, flag, enabled });
});
