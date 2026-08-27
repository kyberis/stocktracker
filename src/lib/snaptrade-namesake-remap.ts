import type { ExtractedHolding } from "@/hooks/import-types";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { EUROPEAN_YAHOO_SUFFIX } from "@/lib/api-providers/isin-resolver";
import { persistHoldingIsin, reenrichHoldingsValueInEUR } from "@/lib/db/holdings";
import { buildNeededFxPairs } from "@/lib/fx-pairs";
import { isinFromYahooSymbol, isNonUsIsin } from "@/lib/isin";
import { knownNonUsIsinForBaseTicker, yahooSymbolIsUnsuffixed } from "@/lib/market-symbol";
import { trackEvent } from "@/lib/db/analytics";
import { getRatesWithCache } from "@/lib/quote-cache";
import {
  compareBrokerMarks,
  MARK_GAP_ABS_EUR,
  MARK_GAP_REL_THRESHOLD,
} from "@/lib/snaptrade-mark-reconciliation";
import type { ExchangeRates, Holding } from "@/lib/types";
import { convertToEUR, hasExchangeRate } from "@/lib/utils";

/** US listing already agrees with broker — treat as same security (possibly stale). */
export const NAMESAKE_US_MATCH_REL = MARK_GAP_REL_THRESHOLD;
/**
 * European listing may differ from broker by FX/venue. Must still be much closer
 * than the US namesake. Production BITC: US ~61% vs CoinShares ~15% in EUR.
 */
export const NAMESAKE_CANDIDATE_MAX_REL = 0.2;

const SUFFIX_CANDIDATES = [".SW", ".DE", ".AS", ".L", ".SG", ".PA", ".MI"] as const;

export interface NamesakeQuote {
  symbol: string;
  price: number;
  currency: string;
}

export interface NamesakePick {
  symbol: string;
  isin: string;
}

function toEUR(amount: number, currency: string, rates: ExchangeRates): number | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const ccy = (currency || "EUR").toUpperCase();
  if (ccy === "EUR") return amount;
  if (!hasExchangeRate(ccy, rates)) return null;
  const v = convertToEUR(amount, ccy, rates);
  return Number.isFinite(v) && v > 0 ? v : null;
}

export function relativeGap(a: number, b: number): number {
  const denom = Math.min(Math.abs(a), Math.abs(b));
  return denom > 0 ? Math.abs(a - b) / denom : Number.POSITIVE_INFINITY;
}

export function isEuropeanYahooListing(symbol: string): boolean {
  const s = symbol.trim();
  if (isinFromYahooSymbol(s)) return true;
  return EUROPEAN_YAHOO_SUFFIX.test(s);
}

/**
 * Choose a European/ISIN Yahoo listing whose last matches the broker last
 * better than the current (US) market mark. Pure — no I/O.
 */
export function pickNamesakeListing(input: {
  brokerValueEUR: number;
  marketValueEUR: number;
  shares: number;
  rates: ExchangeRates;
  candidates: NamesakeQuote[];
  /** Used when the winning Yahoo symbol is a venue suffix without an embedded ISIN. */
  fallbackIsin?: string;
}): NamesakePick | null {
  const { brokerValueEUR, marketValueEUR, shares, rates, candidates } = input;
  if (!(brokerValueEUR > 0) || !(marketValueEUR > 0) || !(shares > 0)) return null;

  const usGap = relativeGap(brokerValueEUR, marketValueEUR);
  if (usGap < NAMESAKE_US_MATCH_REL) return null;

  let best: { pick: NamesakePick; gap: number } | null = null;
  for (const c of candidates) {
    if (!isEuropeanYahooListing(c.symbol) || !(c.price > 0)) continue;
    const native = shares * c.price;
    const eur = toEUR(native, c.currency, rates);
    if (eur == null) continue;
    const gap = relativeGap(brokerValueEUR, eur);
    if (gap > NAMESAKE_CANDIDATE_MAX_REL) continue;
    if (gap >= usGap * 0.5) continue;
    const isin = isinFromYahooSymbol(c.symbol);
    const pick: NamesakePick = { symbol: c.symbol, isin };
    if (
      !best ||
      (isin && !best.pick.isin) ||
      (Boolean(isin) === Boolean(best.pick.isin) && gap < best.gap)
    ) {
      best = { pick, gap };
    }
  }
  if (!best) return null;
  if (!best.pick.isin) {
    const fallback = (input.fallbackIsin || "").trim().toUpperCase();
    if (isNonUsIsin(fallback)) best.pick.isin = fallback;
  }
  if (!best.pick.isin) return null;
  return best.pick;
}

/** Skip FIGI-driven unsuffix when the stored row already has a non-US ISIN. */
export { shouldPreserveListingAgainstFigiRename } from "@/lib/market-symbol";

export async function collectNamesakeCandidateQuotes(
  yahoo: YahooProvider,
  baseTicker: string,
): Promise<NamesakeQuote[]> {
  const base = baseTicker.trim().toUpperCase();
  const symbols = new Set<string>();

  try {
    const results = await yahoo.search(base);
    for (const r of results) {
      const sym = (r.symbol || "").trim().toUpperCase();
      if (!sym || sym === base) continue;
      if (isEuropeanYahooListing(sym)) symbols.add(sym);
    }
  } catch {
    // search optional
  }

  for (const suffix of SUFFIX_CANDIDATES) {
    symbols.add(`${base}${suffix}`);
  }
  const knownIsin = knownNonUsIsinForBaseTicker(base);
  if (knownIsin) symbols.add(`${knownIsin}.SG`);

  const out: NamesakeQuote[] = [];
  const toFetch = [...symbols].slice(0, 12);
  const settled = await Promise.allSettled(
    toFetch.map(async (symbol) => {
      const q = await yahoo.getQuote(symbol);
      if (!(q.regularMarketPrice > 0)) return null;
      return { symbol, price: q.regularMarketPrice, currency: q.currency || "EUR" };
    }),
  );
  for (const r of settled) {
    if (r.status === "fulfilled" && r.value) out.push(r.value);
  }
  return out;
}

/**
 * After the first Yahoo enrich, remap unsuffixed namesakes onto a sticky non-US
 * ISIN when broker last matches a European listing. Returns the same holding
 * objects with updated `isin` / `valueInEUR`.
 */
export async function remapNamesakesFromBrokerMarks(
  userId: string,
  positions: ExtractedHolding[],
  upserted: Holding[],
): Promise<Holding[]> {
  if (positions.length === 0 || upserted.length === 0) return upserted;

  const marketByTicker = new Map(upserted.map((h) => [h.ticker.toUpperCase(), h]));
  const currencies = new Set<string>();
  for (const pos of positions) {
    if (pos.displayCurrency) currencies.add(pos.displayCurrency);
  }
  let rates = await getRatesWithCache(buildNeededFxPairs(currencies));

  const preview = compareBrokerMarks(
    positions.map((pos) => {
      const market = marketByTicker.get(pos.ticker.toUpperCase());
      return {
        ticker: pos.ticker,
        name: pos.name,
        shares: pos.shares,
        displayCurrency: pos.displayCurrency,
        brokerPrice: pos.brokerPrice,
        marketValueEUR: market?.valueInEUR,
      };
    }),
    rates,
  );

  const gaps = preview.gaps.filter((g) => Math.abs(g.deltaEUR) >= MARK_GAP_ABS_EUR);
  if (gaps.length === 0) return upserted;

  const yahoo = new YahooProvider();
  const remapped: Holding[] = [];

  for (const gap of gaps) {
    const holding = marketByTicker.get(gap.ticker.toUpperCase());
    if (!holding) continue;
    if (isNonUsIsin(holding.isin || "")) continue;
    if (!yahooSymbolIsUnsuffixed(holding.ticker, holding.exchange)) continue;

    let candidates: NamesakeQuote[] = [];
    try {
      candidates = await collectNamesakeCandidateQuotes(yahoo, holding.ticker);
    } catch (err) {
      console.warn(
        `[namesake-remap] candidate fetch failed for ${holding.ticker}:`,
        err instanceof Error ? err.message : err,
      );
      continue;
    }
    if (candidates.length === 0) continue;

    const extraCcy = candidates.map((c) => c.currency);
    if (extraCcy.length > 0) {
      const extraRates = await getRatesWithCache(buildNeededFxPairs(extraCcy));
      rates = { ...rates, ...extraRates };
    }

    const pick = pickNamesakeListing({
      brokerValueEUR: gap.brokerValueEUR,
      marketValueEUR: gap.marketValueEUR,
      shares: gap.shares,
      rates,
      candidates,
      fallbackIsin: knownNonUsIsinForBaseTicker(holding.ticker),
    });
    if (!pick) continue;

    try {
      await persistHoldingIsin(userId, holding.id, pick.isin);
    } catch (err) {
      console.warn(
        `[namesake-remap] persist ISIN failed for ${holding.ticker}:`,
        err instanceof Error ? err.message : err,
      );
      continue;
    }
    holding.isin = pick.isin;
    remapped.push(holding);
    trackEvent(userId, "snaptrade_namesake_remapped", {
      ticker: holding.ticker,
      isin: pick.isin,
      symbol: pick.symbol,
    });
  }

  if (remapped.length > 0) {
    await reenrichHoldingsValueInEUR(userId, remapped).catch((err) =>
      console.warn("[namesake-remap] re-enrich failed:", err instanceof Error ? err.message : err),
    );
  }

  return upserted;
}
