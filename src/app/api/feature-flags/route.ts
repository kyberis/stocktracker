import { NextRequest, NextResponse } from "next/server";
import { isFeatureEnabled, resolveAllFlagsForUser } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth/session";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/feature-flags", async (req: NextRequest) => {
  const session = await getSessionFromRequest(req);

  if (session?.userId) {
    const flags = await resolveAllFlagsForUser(session.userId);
    const { support_chat_enabled: _, ...publicFlags } = flags;
    return NextResponse.json(publicFlags);
  }

  const [
    alertsEnabled, csvExportEnabled, appleSigninEnabled, deviceEnabled,
    mobileAppEnabled, whatsappEnabled,
    toolTransactions, toolDividends, toolPerformance,
    toolTaxonomy, toolRebalancing, toolAccounts, toolWatchlist,
    proTrialEnabled, aiReportEnabled, portfolioV2ChartEnabled,
    socialNetworkEnabled,
  ] = await Promise.all([
    isFeatureEnabled("alerts_enabled"),
    isFeatureEnabled("csv_export_enabled"),
    isFeatureEnabled("apple_signin_enabled"),
    isFeatureEnabled("device_enabled"),
    isFeatureEnabled("mobile_app_enabled"),
    isFeatureEnabled("whatsapp_enabled"),
    isFeatureEnabled("tool_transactions_enabled"),
    isFeatureEnabled("tool_dividends_enabled"),
    isFeatureEnabled("tool_performance_enabled"),
    isFeatureEnabled("tool_taxonomy_enabled"),
    isFeatureEnabled("tool_rebalancing_enabled"),
    isFeatureEnabled("tool_accounts_enabled"),
    isFeatureEnabled("tool_watchlist_enabled"),
    isFeatureEnabled("pro_trial_enabled"),
    isFeatureEnabled("ai_report_enabled"),
    isFeatureEnabled("portfolio_v2_chart_enabled"),
    isFeatureEnabled("social_network_enabled"),
  ]);

  return NextResponse.json({
    alerts_enabled: alertsEnabled,
    csv_export_enabled: csvExportEnabled,
    apple_signin_enabled: appleSigninEnabled,
    device_enabled: deviceEnabled,
    mobile_app_enabled: mobileAppEnabled,
    whatsapp_enabled: whatsappEnabled,
    tool_transactions_enabled: toolTransactions,
    tool_dividends_enabled: toolDividends,
    tool_performance_enabled: toolPerformance,
    tool_taxonomy_enabled: toolTaxonomy,
    tool_rebalancing_enabled: toolRebalancing,
    tool_accounts_enabled: toolAccounts,
    tool_watchlist_enabled: toolWatchlist,
    pro_trial_enabled: proTrialEnabled,
    ai_report_enabled: aiReportEnabled,
    portfolio_v2_chart_enabled: portfolioV2ChartEnabled,
    social_network_enabled: socialNetworkEnabled,
  });
});
