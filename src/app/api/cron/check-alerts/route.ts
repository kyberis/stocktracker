import { NextRequest } from "next/server";
import {
  listActiveAlertsForCron,
  claimAlertForOneShotDispatch,
  claimPortfolioWideTickerNotify,
  getUserHoldingsForAlerts,
  insertAlertDispatchLog,
  trackEvent,
  isFeatureEnabled,
} from "@/lib/db";
import { getAlertNewsContext } from "@/lib/alert-context";
import type { CronAlert } from "@/lib/db";
import {
  dispatchAlert,
  normalizeAlertChannels,
  type AlertDispatchContext,
  type AlertPayload,
} from "@/lib/alert-dispatcher";
import {
  isValidAlertQuote,
  priceInAlertCurrency,
  shouldTriggerThreshold,
  shouldTriggerPercent,
  percentChangeSincePurchase,
  tickerAlreadyNotifiedToday,
  mergeNotifiedTicker,
  isSameUtcDay,
  type AlertQuote,
} from "@/lib/alert-evaluation";
import type { ExchangeRates, SubscriptionPlan } from "@/lib/types";
import { getEmailLocale } from "@/lib/email-i18n";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";
import { fetchSharedQuotesAndRates, shouldFetchLiveMarketData } from "@/lib/cron-quotes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function buildContext(alert: CronAlert): AlertDispatchContext {
  return {
    userId: alert.userId,
    email: alert.email,
    emailVerified: alert.emailVerified,
    plan: alert.plan as SubscriptionPlan,
    alertChannels: normalizeAlertChannels(alert.alertChannels),
    telegramChatId: alert.telegramChatId,
    locale: getEmailLocale(alert.language),
  };
}

function toAlertQuotes(
  providerQuotes: Record<string, { regularMarketPrice: number; regularMarketChangePercent: number; currency: string }>,
): Record<string, AlertQuote> {
  const quotes: Record<string, AlertQuote> = {};
  for (const [symbol, quote] of Object.entries(providerQuotes)) {
    if (quote.regularMarketPrice > 0) {
      quotes[symbol] = {
        regularMarketPrice: quote.regularMarketPrice,
        regularMarketChangePercent: quote.regularMarketChangePercent,
        currency: quote.currency,
      };
    }
  }
  return quotes;
}

async function finalizeDispatch(
  alert: CronAlert,
  ticker: string,
  alertType: string,
  payload: AlertPayload,
  opts: { oneShot: boolean; portfolioWide?: boolean },
): Promise<"fired" | "dispatch_failed" | "skipped_config" | "already_claimed"> {
  if (opts.oneShot) {
    const claimed = await claimAlertForOneShotDispatch(alert.id);
    if (!claimed) return "already_claimed";
  }
  if (opts.portfolioWide) {
    const claimed = await claimPortfolioWideTickerNotify(alert.id, ticker);
    if (!claimed) return "already_claimed";
    alert.lastNotifiedTicker = mergeNotifiedTicker(
      alert.lastNotifiedTicker,
      ticker,
      isSameUtcDay(alert.lastNotifiedAt),
    );
    alert.lastNotifiedAt = new Date().toISOString();
  }

  const news = await getAlertNewsContext(ticker);
  const enriched: AlertPayload = { ...payload, alertId: alert.id, headlines: news.headlines };

  const ctx = buildContext(alert);
  const result = await dispatchAlert(ctx, enriched);

  let status: "fired" | "dispatch_failed" | "skipped_config";
  if (result.channelsSent.length > 0) status = "fired";
  else if (result.channelsFailed.length > 0) status = "dispatch_failed";
  else status = "skipped_config";

  await insertAlertDispatchLog({
    userId: alert.userId,
    alertId: alert.id,
    ticker,
    alertType,
    status,
    channelsRequested: result.channelsRequested,
    channelsSent: result.channelsSent,
    channelsFailed: result.channelsFailed.map((f) => f.channel),
    channelsSkipped: result.channelsSkipped,
    details: {
      oneShot: opts.oneShot,
      portfolioWide: !!opts.portfolioWide,
      fails: result.channelsFailed,
      price: payload.currentPrice,
      currency: payload.currency,
    },
  });

  trackEvent(alert.userId, "alert_dispatch", {
    ticker,
    alertType,
    status,
    channelsSent: result.channelsSent.join(",") || "none",
    channelsRequested: result.channelsRequested.join(",") || "none",
  });

  return status;
}

const runCheckAlerts = withCronLogging("check-alerts", async () => {
  if (!(await isFeatureEnabled("alerts_enabled"))) {
    return { checked: 0, triggered: 0, disabled: true };
  }

  const alerts = await listActiveAlertsForCron();
  if (alerts.length === 0) {
    return { checked: 0, triggered: 0, fired: 0, failed: 0, skipped: 0 };
  }

  const perStockAlerts = alerts.filter((a) => !a.isPortfolioWide);
  const portfolioWideAlerts = alerts.filter((a) => a.isPortfolioWide);

  const allTickers = new Set<string>();
  const currencies = new Set<string>(["EUR", "USD"]);

  for (const a of perStockAlerts) {
    if (a.ticker) allTickers.add(a.ticker);
    if (a.currency) currencies.add(a.currency.toUpperCase());
  }

  const holdingsCache: Record<string, Awaited<ReturnType<typeof getUserHoldingsForAlerts>>> = {};
  for (const a of portfolioWideAlerts) {
    const key = `${a.userId}:${a.portfolioId || "all"}`;
    if (!holdingsCache[key]) {
      holdingsCache[key] = await getUserHoldingsForAlerts(a.userId, a.portfolioId || undefined);
      for (const h of holdingsCache[key]) {
        allTickers.add(h.ticker);
        if (h.displayCurrency) currencies.add(h.displayCurrency.toUpperCase());
      }
    }
  }
  for (const a of perStockAlerts.filter((a) => a.alertType === "percent_change" && a.percentBasis === "purchase")) {
    const key = `${a.userId}:all`;
    if (!holdingsCache[key]) {
      holdingsCache[key] = await getUserHoldingsForAlerts(a.userId);
      for (const h of holdingsCache[key]) {
        if (h.displayCurrency) currencies.add(h.displayCurrency.toUpperCase());
      }
    }
  }

  const marketHoldings = [
    ...Object.values(holdingsCache).flat(),
    ...perStockAlerts.filter((a) => a.ticker).map(() => ({})),
  ];
  if (!shouldFetchLiveMarketData(marketHoldings)) {
    return {
      checked: alerts.length,
      triggered: 0,
      fired: 0,
      failed: 0,
      skipped: 0,
      skippedMarketsClosed: true,
      tickers: allTickers.size,
    };
  }

  const shared = await fetchSharedQuotesAndRates({
    tickers: [...allTickers],
    currencies,
  });
  const quotes = toAlertQuotes(shared.quotes);
  for (const q of Object.values(quotes)) {
    if (q.currency) currencies.add(q.currency.toUpperCase());
  }
  const rates: ExchangeRates = shared.exchangeRates;

  let triggered = 0;
  let fired = 0;
  let failed = 0;
  let skipped = 0;
  let quoteInvalid = 0;
  let fxUnavailable = 0;

  const bumpStatus = (status: "fired" | "dispatch_failed" | "skipped_config") => {
    triggered++;
    if (status === "fired") fired++;
    else if (status === "dispatch_failed") failed++;
    else skipped++;
  };

  for (const alert of perStockAlerts) {
    const quote = quotes[alert.ticker];
    if (!isValidAlertQuote(quote)) {
      quoteInvalid++;
      continue;
    }
    const price = quote.regularMarketPrice;
    const quoteCcy = quote.currency || alert.currency || "USD";

    if (alert.alertType === "threshold") {
      const priceCmp = priceInAlertCurrency(price, quoteCcy, alert.currency || quoteCcy, rates);
      if (priceCmp === null) {
        fxUnavailable++;
        await insertAlertDispatchLog({
          userId: alert.userId,
          alertId: alert.id,
          ticker: alert.ticker,
          alertType: "threshold",
          status: "fx_unavailable",
          channelsRequested: normalizeAlertChannels(alert.alertChannels),
          channelsSent: [],
          details: { quoteCcy, alertCcy: alert.currency, price },
        });
        continue;
      }
      if (!shouldTriggerThreshold(alert.condition, priceCmp, alert.threshold)) continue;

      trackEvent(alert.userId, "alert_triggered", {
        ticker: alert.ticker,
        condition: alert.condition,
        threshold: String(alert.threshold),
        price: String(price),
      });

      const payload: AlertPayload = {
        type: "threshold",
        ticker: alert.ticker,
        name: alert.name,
        condition: alert.condition,
        threshold: alert.threshold,
        currentPrice: price,
        currency: quoteCcy,
      };

      const status = await finalizeDispatch(alert, alert.ticker, "threshold", payload, { oneShot: true });
      if (status !== "already_claimed") bumpStatus(status);
    } else if (alert.alertType === "percent_change") {
      let pctChange: number | null = null;

      if (alert.percentBasis === "daily") {
        pctChange = quote.regularMarketChangePercent ?? null;
      } else if (alert.percentBasis === "purchase") {
        const holdings = holdingsCache[`${alert.userId}:all`] || [];
        const holding = holdings.find((h) => h.ticker === alert.ticker);
        if (holding) {
          pctChange = percentChangeSincePurchase(
            price,
            quoteCcy,
            holding.purchasePrice,
            holding.displayCurrency || quoteCcy,
            rates,
          );
        }
      }

      if (!shouldTriggerPercent(pctChange, alert.percentValue)) continue;

      trackEvent(alert.userId, "alert_triggered", {
        ticker: alert.ticker,
        alertType: "percent_change",
        percentBasis: alert.percentBasis,
        percentChange: String((pctChange as number).toFixed(2)),
      });

      const payload: AlertPayload = {
        type: "percent_change",
        ticker: alert.ticker,
        name: alert.name,
        currentPrice: price,
        currency: quoteCcy,
        percentChange: pctChange as number,
        percentBasis: alert.percentBasis as "daily" | "purchase",
        isPortfolioWide: false,
      };

      const status = await finalizeDispatch(alert, alert.ticker, "percent_change", payload, { oneShot: true });
      if (status !== "already_claimed") bumpStatus(status);
    }
  }

  for (const alert of portfolioWideAlerts) {
    const key = `${alert.userId}:${alert.portfolioId || "all"}`;
    const holdings = holdingsCache[key] || [];

    for (const holding of holdings) {
      const quote = quotes[holding.ticker];
      if (!isValidAlertQuote(quote)) {
        quoteInvalid++;
        continue;
      }
      const price = quote.regularMarketPrice;
      const quoteCcy = quote.currency || holding.displayCurrency || "USD";

      if (tickerAlreadyNotifiedToday(alert.lastNotifiedAt, alert.lastNotifiedTicker, holding.ticker)) {
        continue;
      }

      let pctChange: number | null = null;
      if (alert.percentBasis === "daily") {
        pctChange = quote.regularMarketChangePercent ?? null;
      } else if (alert.percentBasis === "purchase") {
        pctChange = percentChangeSincePurchase(
          price,
          quoteCcy,
          holding.purchasePrice,
          holding.displayCurrency || quoteCcy,
          rates,
        );
      }

      if (!shouldTriggerPercent(pctChange, alert.percentValue)) continue;

      trackEvent(alert.userId, "alert_triggered", {
        ticker: holding.ticker,
        alertType: "percent_change",
        percentBasis: alert.percentBasis,
        percentChange: String((pctChange as number).toFixed(2)),
        portfolioWide: "true",
      });

      const payload: AlertPayload = {
        type: "percent_change",
        ticker: holding.ticker,
        name: holding.name,
        currentPrice: price,
        currency: quoteCcy,
        percentChange: pctChange as number,
        percentBasis: alert.percentBasis as "daily" | "purchase",
        isPortfolioWide: true,
      };

      const status = await finalizeDispatch(alert, holding.ticker, "percent_change", payload, {
        oneShot: false,
        portfolioWide: true,
      });
      if (status !== "already_claimed") bumpStatus(status);
    }
  }

  return {
    checked: alerts.length,
    triggered,
    fired,
    failed,
    skipped,
    quoteInvalid,
    fxUnavailable,
    tickers: allTickers.size,
  };
});

export async function GET(req: NextRequest) {
  const denied = verifyCronAuth("check-alerts", req);
  if (denied) return denied;
  return runCheckAlerts();
}
