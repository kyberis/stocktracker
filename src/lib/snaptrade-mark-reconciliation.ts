import type { ExchangeRates } from "@/lib/types";
import { convertToEUR, hasExchangeRate } from "@/lib/utils";

/** Relative gap vs the smaller of the two marks (avoids tiny-base noise). */
export const MARK_GAP_REL_THRESHOLD = 0.05;
/** Ignore gaps smaller than this in EUR even if the % is large. */
export const MARK_GAP_ABS_EUR = 100;

export interface BrokerMarkPosition {
  ticker: string;
  name?: string;
  shares: number;
  displayCurrency: string;
  /** Last price from the broker (SnapTrade `position.price`). */
  brokerPrice?: number | null;
  /** Live market last (Yahoo), same currency as `marketCurrency` when set. */
  marketPrice?: number | null;
  marketCurrency?: string;
  /** Yahoo-based position value already converted to EUR. */
  marketValueEUR?: number | null;
}

export interface MarkGap {
  ticker: string;
  name: string;
  shares: number;
  currency: string;
  brokerPrice: number;
  marketPrice: number;
  brokerValueEUR: number;
  marketValueEUR: number;
  deltaEUR: number;
  absPct: number;
}

export interface MarkReconciliation {
  asOf: string;
  gaps: MarkGap[];
  brokerHoldingsEUR: number;
  marketHoldingsEUR: number;
  totalDeltaEUR: number;
  brokerNavEUR: number | null;
}

function toEUR(amount: number, currency: string, rates: ExchangeRates): number | null {
  if (!Number.isFinite(amount)) return null;
  if (currency === "EUR" || !currency) return amount;
  if (!hasExchangeRate(currency, rates)) return null;
  const v = convertToEUR(amount, currency, rates);
  return Number.isFinite(v) ? v : null;
}

/**
 * Compare broker last prices with trefolio market marks.
 * A gap is reported when both the EUR absolute and relative thresholds fire.
 */
export function compareBrokerMarks(
  positions: BrokerMarkPosition[],
  rates: ExchangeRates,
  opts?: { asOf?: string; brokerNavEUR?: number | null },
): MarkReconciliation {
  const gaps: MarkGap[] = [];
  let brokerHoldingsEUR = 0;
  let marketHoldingsEUR = 0;

  for (const pos of positions) {
    const ticker = (pos.ticker || "").trim().toUpperCase();
    if (!ticker || pos.shares <= 0) continue;
    const brokerPrice = pos.brokerPrice ?? 0;
    if (!(brokerPrice > 0)) continue;

    const ccy = (pos.displayCurrency || "EUR").toUpperCase();
    const brokerNative = pos.shares * brokerPrice;
    const brokerEUR = toEUR(brokerNative, ccy, rates);
    if (brokerEUR == null) continue;

    let marketEUR = pos.marketValueEUR != null && pos.marketValueEUR > 0 ? pos.marketValueEUR : null;
    const marketPrice = pos.marketPrice ?? 0;
    if (marketEUR == null && marketPrice > 0) {
      const mCcy = (pos.marketCurrency || ccy).toUpperCase();
      marketEUR = toEUR(pos.shares * marketPrice, mCcy, rates);
    }
    if (marketEUR == null || !(marketEUR > 0)) continue;

    brokerHoldingsEUR += brokerEUR;
    marketHoldingsEUR += marketEUR;

    const deltaEUR = brokerEUR - marketEUR;
    const denom = Math.min(Math.abs(brokerEUR), Math.abs(marketEUR));
    const absPct = denom > 0 ? Math.abs(deltaEUR) / denom : 0;
    if (Math.abs(deltaEUR) < MARK_GAP_ABS_EUR || absPct < MARK_GAP_REL_THRESHOLD) continue;

    const resolvedMarketPrice =
      marketPrice > 0 ? marketPrice : pos.shares > 0 ? marketEUR / pos.shares : 0;

    gaps.push({
      ticker,
      name: pos.name || ticker,
      shares: pos.shares,
      currency: ccy,
      brokerPrice,
      marketPrice: resolvedMarketPrice,
      brokerValueEUR: brokerEUR,
      marketValueEUR: marketEUR,
      deltaEUR,
      absPct,
    });
  }

  gaps.sort((a, b) => Math.abs(b.deltaEUR) - Math.abs(a.deltaEUR));

  return {
    asOf: opts?.asOf ?? new Date().toISOString(),
    gaps,
    brokerHoldingsEUR,
    marketHoldingsEUR,
    totalDeltaEUR: brokerHoldingsEUR - marketHoldingsEUR,
    brokerNavEUR: opts?.brokerNavEUR ?? null,
  };
}

/** Stable identity of *which* tickers currently diverge — used to avoid hourly spam. */
export function markGapFingerprint(result: MarkReconciliation): string {
  if (result.gaps.length === 0) return "";
  return result.gaps
    .map((g) => g.ticker)
    .sort()
    .join(",");
}

const NOTIFY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function parseStoredMarkReconciliation(raw: string): MarkReconciliation | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as MarkReconciliation;
    if (!parsed || !Array.isArray(parsed.gaps)) return null;
    if (parsed.gaps.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function shouldNotifyMarkGap(input: {
  fingerprint: string;
  lastFingerprint: string;
  lastNotifiedAt: string;
  now?: Date;
}): boolean {
  if (!input.fingerprint) return false;
  if (input.fingerprint !== input.lastFingerprint) return true;
  if (!input.lastNotifiedAt) return true;
  const last = Date.parse(input.lastNotifiedAt);
  if (!Number.isFinite(last)) return true;
  const now = (input.now ?? new Date()).getTime();
  return now - last >= NOTIFY_COOLDOWN_MS;
}
