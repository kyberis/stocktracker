import { NextRequest, NextResponse } from "next/server";
import { isFeatureEnabled } from "@/lib/db";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

export const GET = withMetrics("/api/feature-flags", async (_req: NextRequest) => {
  const [
    alertsEnabled, csvExportEnabled, appleSigninEnabled, deviceEnabled,
    whatsappEnabled,
    toolTransactions, toolDividends, toolPerformance,
    toolTaxonomy, toolRebalancing, toolAccounts, toolWatchlist,
  ] = await Promise.all([
    isFeatureEnabled("alerts_enabled"),
    isFeatureEnabled("csv_export_enabled"),
    isFeatureEnabled("apple_signin_enabled"),
    isFeatureEnabled("device_enabled"),
    isFeatureEnabled("whatsapp_enabled"),
    isFeatureEnabled("tool_transactions_enabled"),
    isFeatureEnabled("tool_dividends_enabled"),
    isFeatureEnabled("tool_performance_enabled"),
    isFeatureEnabled("tool_taxonomy_enabled"),
    isFeatureEnabled("tool_rebalancing_enabled"),
    isFeatureEnabled("tool_accounts_enabled"),
    isFeatureEnabled("tool_watchlist_enabled"),
  ]);

  return NextResponse.json({
    alerts_enabled: alertsEnabled,
    csv_export_enabled: csvExportEnabled,
    apple_signin_enabled: appleSigninEnabled,
    device_enabled: deviceEnabled,
    whatsapp_enabled: whatsappEnabled,
    tool_transactions_enabled: toolTransactions,
    tool_dividends_enabled: toolDividends,
    tool_performance_enabled: toolPerformance,
    tool_taxonomy_enabled: toolTaxonomy,
    tool_rebalancing_enabled: toolRebalancing,
    tool_accounts_enabled: toolAccounts,
    tool_watchlist_enabled: toolWatchlist,
  });
});
