import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { getUserSettings, updateUserSettings, findUserById, getGlobalAlphaVantageApiKey, getGlobalOpenAIApiKey, resolveAllFlagsForUser } from "@/lib/db";
import { parseBody } from "@/lib/api-response";
import { userSettingsSchema } from "@/lib/schemas";
import { canAccessTheme } from "@/lib/subscription";
import { withMetrics } from "@/lib/with-metrics";
import type { SubscriptionPlan } from "@/lib/types";

export const GET = withMetrics("/api/user-settings", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const [settings, user, flags] = await Promise.all([
    getUserSettings(session.userId),
    findUserById(session.userId),
    resolveAllFlagsForUser(session.userId),
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
    defaultCurrency: settings.defaultCurrency,
    hasGlobalAvKey: getGlobalAlphaVantageApiKey().length > 0,
    hasOpenAIKey: getGlobalOpenAIApiKey().length > 0,
    alertsEnabled: flags.alerts_enabled,
    csvExportEnabled: flags.csv_export_enabled,
    deviceEnabled: flags.device_enabled,
    whatsappEnabled: flags.whatsapp_enabled,
    toolTransactionsEnabled: flags.tool_transactions_enabled,
    toolDividendsEnabled: flags.tool_dividends_enabled,
    toolPerformanceEnabled: flags.tool_performance_enabled,
    toolTaxonomyEnabled: flags.tool_taxonomy_enabled,
    toolRebalancingEnabled: flags.tool_rebalancing_enabled,
    toolAccountsEnabled: flags.tool_accounts_enabled,
    toolWatchlistEnabled: flags.tool_watchlist_enabled,
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
    defaultCurrency: next.defaultCurrency,
  });
});
