import { NextRequest } from "next/server";
import {
  listActiveAlertsForCron,
  markAlertTriggered,
  updateLastNotified,
  getUserHoldingsForAlerts,
  trackEvent,
  isFeatureEnabled,
} from "@/lib/db";
import type { CronAlert } from "@/lib/db";
import { dispatchAlert } from "@/lib/alert-dispatcher";
import type { AlertDispatchContext, AlertPayload } from "@/lib/alert-dispatcher";
import type { SubscriptionPlan } from "@/lib/types";
import { getEmailLocale } from "@/lib/email-i18n";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface QuoteData {
  regularMarketPrice: number;
  regularMarketChangePercent?: number;
  currency: string;
}

function isSameDay(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate();
}

function buildContext(alert: CronAlert): AlertDispatchContext {
  return {
    userId: alert.userId,
    email: alert.email,
    emailVerified: alert.emailVerified,
    plan: alert.plan as SubscriptionPlan,
    alertChannels: alert.alertChannels,
    telegramChatId: alert.telegramChatId,
    locale: getEmailLocale(alert.language),
  };
}

const runCheckAlerts = withCronLogging("check-alerts", async () => {
  if (!(await isFeatureEnabled("alerts_enabled"))) {
    return { checked: 0, triggered: 0, disabled: true };
  }

  const alerts = await listActiveAlertsForCron();
  if (alerts.length === 0) {
    return { checked: 0, triggered: 0 };
  }

  const perStockAlerts = alerts.filter((a) => !a.isPortfolioWide);
  const portfolioWideAlerts = alerts.filter((a) => a.isPortfolioWide);

  const allTickers = new Set<string>();
  for (const a of perStockAlerts) {
    if (a.ticker) allTickers.add(a.ticker);
  }

  const holdingsCache: Record<string, Awaited<ReturnType<typeof getUserHoldingsForAlerts>>> = {};
  for (const a of portfolioWideAlerts) {
    const key = `${a.userId}:${a.portfolioId || "all"}`;
    if (!holdingsCache[key]) {
      holdingsCache[key] = await getUserHoldingsForAlerts(a.userId, a.portfolioId || undefined);
      for (const h of holdingsCache[key]) allTickers.add(h.ticker);
    }
  }
  for (const a of perStockAlerts.filter((a) => a.alertType === "percent_change" && a.percentBasis === "purchase")) {
    const key = `${a.userId}:all`;
    if (!holdingsCache[key]) {
      holdingsCache[key] = await getUserHoldingsForAlerts(a.userId);
    }
  }

  let quotes: Record<string, QuoteData> = {};
  if (allTickers.size > 0) {
    try {
      const params = new URLSearchParams({ symbols: [...allTickers].join(",") });
      const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
      const res = await fetch(`${baseUrl}/api/quote?${params.toString()}`);
      if (res.ok) quotes = await res.json();
    } catch (err) {
      throw new Error(`Quote fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  let triggered = 0;

  for (const alert of perStockAlerts) {
    const quote = quotes[alert.ticker];
    if (!quote) continue;
    const price = quote.regularMarketPrice;

    if (alert.alertType === "threshold") {
      const shouldTrigger =
        (alert.condition === "above" && price >= alert.threshold) ||
        (alert.condition === "below" && price <= alert.threshold);
      if (!shouldTrigger) continue;

      await markAlertTriggered(alert.id);
      triggered++;

      trackEvent(alert.userId, "alert_triggered", {
        ticker: alert.ticker, condition: alert.condition,
        threshold: String(alert.threshold), price: String(price),
      });

      const payload: AlertPayload = {
        type: "threshold",
        ticker: alert.ticker, name: alert.name,
        condition: alert.condition, threshold: alert.threshold,
        currentPrice: price, currency: quote.currency || alert.currency,
      };

      await dispatchAlert(buildContext(alert), payload);
    } else if (alert.alertType === "percent_change") {
      let pctChange: number | null = null;

      if (alert.percentBasis === "daily") {
        pctChange = quote.regularMarketChangePercent ?? null;
      } else if (alert.percentBasis === "purchase") {
        const key = `${alert.userId}:all`;
        const holdings = holdingsCache[key] || [];
        const holding = holdings.find((h) => h.ticker === alert.ticker);
        if (holding && holding.purchasePrice > 0) {
          pctChange = ((price - holding.purchasePrice) / holding.purchasePrice) * 100;
        }
      }

      if (pctChange === null) continue;
      if (Math.abs(pctChange) < alert.percentValue) continue;

      await markAlertTriggered(alert.id);
      triggered++;

      trackEvent(alert.userId, "alert_triggered", {
        ticker: alert.ticker, alertType: "percent_change",
        percentBasis: alert.percentBasis, percentChange: String(pctChange.toFixed(2)),
      });

      const payload: AlertPayload = {
        type: "percent_change",
        ticker: alert.ticker, name: alert.name,
        currentPrice: price, currency: quote.currency || alert.currency,
        percentChange: pctChange, percentBasis: alert.percentBasis as "daily" | "purchase",
        isPortfolioWide: false,
      };

      await dispatchAlert(buildContext(alert), payload);
    }
  }

  for (const alert of portfolioWideAlerts) {
    const key = `${alert.userId}:${alert.portfolioId || "all"}`;
    const holdings = holdingsCache[key] || [];

    for (const holding of holdings) {
      const quote = quotes[holding.ticker];
      if (!quote) continue;
      const price = quote.regularMarketPrice;

      if (isSameDay(alert.lastNotifiedAt) && alert.lastNotifiedTicker === holding.ticker) continue;

      let pctChange: number | null = null;
      if (alert.percentBasis === "daily") {
        pctChange = quote.regularMarketChangePercent ?? null;
      } else if (alert.percentBasis === "purchase") {
        if (holding.purchasePrice > 0) {
          pctChange = ((price - holding.purchasePrice) / holding.purchasePrice) * 100;
        }
      }

      if (pctChange === null) continue;
      if (Math.abs(pctChange) < alert.percentValue) continue;

      await updateLastNotified(alert.id, holding.ticker);
      triggered++;

      trackEvent(alert.userId, "alert_triggered", {
        ticker: holding.ticker, alertType: "percent_change",
        percentBasis: alert.percentBasis, percentChange: String(pctChange.toFixed(2)),
        portfolioWide: "true",
      });

      const payload: AlertPayload = {
        type: "percent_change",
        ticker: holding.ticker, name: holding.name,
        currentPrice: price, currency: quote.currency || holding.displayCurrency,
        percentChange: pctChange, percentBasis: alert.percentBasis as "daily" | "purchase",
        isPortfolioWide: true,
      };

      await dispatchAlert(buildContext(alert), payload);
    }
  }

  return {
    checked: alerts.length,
    triggered,
    tickers: allTickers.size,
  };
});

export async function GET(req: NextRequest) {
  const denied = verifyCronAuth("check-alerts", req);
  if (denied) return denied;
  return runCheckAlerts();
}
