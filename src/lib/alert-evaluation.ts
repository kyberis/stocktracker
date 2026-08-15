import { convertCurrency } from "@/lib/utils";
import type { ExchangeRates } from "@/lib/types";

export interface AlertQuote {
  regularMarketPrice: number;
  regularMarketChangePercent?: number;
  currency: string;
  error?: boolean;
}

/** Reject missing, errored, or non-positive quotes so "below" alerts cannot false-fire. */
export function isValidAlertQuote(quote: AlertQuote | null | undefined): quote is AlertQuote {
  if (!quote || quote.error) return false;
  return Number.isFinite(quote.regularMarketPrice) && quote.regularMarketPrice > 0;
}

/**
 * Compare threshold in alert currency against live quote currency.
 * Returns null when FX is required but unavailable (skip this cycle; do not fire).
 */
export function priceInAlertCurrency(
  quotePrice: number,
  quoteCurrency: string,
  alertCurrency: string,
  rates: ExchangeRates,
): number | null {
  const from = (quoteCurrency || "USD").toUpperCase();
  const to = (alertCurrency || from).toUpperCase();
  if (from === to) return quotePrice;
  const converted = convertCurrency(quotePrice, from, to, rates);
  if (!Number.isFinite(converted)) return null;
  return converted;
}

export function shouldTriggerThreshold(
  condition: "above" | "below",
  priceInAlertCcy: number,
  threshold: number,
): boolean {
  if (!Number.isFinite(priceInAlertCcy) || !Number.isFinite(threshold)) return false;
  if (condition === "above") return priceInAlertCcy >= threshold;
  return priceInAlertCcy <= threshold;
}

export function shouldTriggerPercent(
  pctChange: number | null,
  percentValue: number,
): boolean {
  if (pctChange === null || !Number.isFinite(pctChange) || !Number.isFinite(percentValue)) {
    return false;
  }
  return Math.abs(pctChange) >= percentValue;
}

/** Purchase-basis %: convert cost basis into quote currency when needed. */
export function percentChangeSincePurchase(
  quotePrice: number,
  quoteCurrency: string,
  purchasePrice: number,
  purchaseCurrency: string,
  rates: ExchangeRates,
): number | null {
  if (!(purchasePrice > 0) || !(quotePrice > 0)) return null;
  const from = (purchaseCurrency || quoteCurrency || "USD").toUpperCase();
  const to = (quoteCurrency || from).toUpperCase();
  let cost = purchasePrice;
  if (from !== to) {
    const converted = convertCurrency(purchasePrice, from, to, rates);
    if (!Number.isFinite(converted) || !(converted > 0)) return null;
    cost = converted;
  }
  return ((quotePrice - cost) / cost) * 100;
}

export function isSameUtcDay(dateStr: string, now = new Date()): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}

/** One-shot alerts deactivate after a successful send or after all channels are permanently skipped. */
export function shouldFinalizeOneShot(args: {
  channelsRequested: string[];
  channelsSent: string[];
  channelsFailed: string[];
}): boolean {
  if (args.channelsSent.length > 0) return true;
  if (args.channelsRequested.length === 0) return true;
  // Transient failures → keep active for retry
  if (args.channelsFailed.length > 0) return false;
  // Everything was skipped (unverified email, no Telegram link, etc.)
  return true;
}
