import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { getUserSettings, updateUserSettings, getGlobalAlphaVantageApiKey, getGlobalOpenAIApiKey, isFeatureEnabled } from "@/lib/db";
import { parseBody } from "@/lib/api-response";
import { userSettingsSchema } from "@/lib/schemas";
import { withMetrics } from "@/lib/with-metrics";

export const GET = withMetrics("/api/user-settings", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const [
    settings, alertsEnabled, csvExportEnabled, deviceEnabled, whatsappEnabled,
    toolTransactions, toolDividends, toolPerformance,
    toolTaxonomy, toolRebalancing, toolAccounts, toolWatchlist,
  ] = await Promise.all([
    getUserSettings(session.userId),
    isFeatureEnabled("alerts_enabled"),
    isFeatureEnabled("csv_export_enabled"),
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
    language: settings.language,
    refreshInterval: settings.refreshInterval,
    hasGlobalAvKey: getGlobalAlphaVantageApiKey().length > 0,
    hasOpenAIKey: getGlobalOpenAIApiKey().length > 0,
    alertsEnabled,
    csvExportEnabled,
    deviceEnabled,
    whatsappEnabled,
    toolTransactionsEnabled: toolTransactions,
    toolDividendsEnabled: toolDividends,
    toolPerformanceEnabled: toolPerformance,
    toolTaxonomyEnabled: toolTaxonomy,
    toolRebalancingEnabled: toolRebalancing,
    toolAccountsEnabled: toolAccounts,
    toolWatchlistEnabled: toolWatchlist,
  });
});

export const PUT = withMetrics("/api/user-settings", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const result = await parseBody(req, userSettingsSchema);
  if (!result.success) return result.error;
  const updates = result.data;

  const next = await updateUserSettings(session.userId, updates);
  return NextResponse.json({
    language: next.language,
    refreshInterval: next.refreshInterval,
  });
});
