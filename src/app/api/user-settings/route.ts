import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { getUserSettings, updateUserSettings, findUserById, getGlobalAlphaVantageApiKey, getGlobalOpenAIApiKey, isFeatureEnabled } from "@/lib/db";
import { parseBody } from "@/lib/api-response";
import { userSettingsSchema } from "@/lib/schemas";
import { canAccessTheme } from "@/lib/subscription";
import { withMetrics } from "@/lib/with-metrics";
import type { SubscriptionPlan } from "@/lib/types";

export const GET = withMetrics("/api/user-settings", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const [
    settings, user, alertsEnabled, csvExportEnabled, deviceEnabled, whatsappEnabled,
    toolTransactions, toolDividends, toolPerformance,
    toolTaxonomy, toolRebalancing, toolAccounts, toolWatchlist,
  ] = await Promise.all([
    getUserSettings(session.userId),
    findUserById(session.userId),
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

  const plan: SubscriptionPlan = (user?.plan as SubscriptionPlan) || session.plan || "free";
  let { dashboardTheme } = settings;
  if (!canAccessTheme(dashboardTheme, plan)) {
    dashboardTheme = "default";
    updateUserSettings(session.userId, { dashboardTheme: "default" }).catch(() => {});
  }

  return NextResponse.json({
    language: settings.language,
    refreshInterval: settings.refreshInterval,
    dashboardTheme,
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
    dashboardTheme: next.dashboardTheme,
  });
});
