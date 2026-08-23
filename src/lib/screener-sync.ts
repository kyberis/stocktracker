import {
  upsertScreenerCache,
  listDistinctHoldingTickers,
} from "@/lib/db";
import { listHotScreenerSymbols, listStaleOrMissingScreenerSymbols } from "@/lib/db/screener";
import { YahooProvider } from "@/lib/api-providers/yahoo";

const BATCH_SIZE = 20;
const DELAY_MS = 500;
const ENSURE_MAX_AGE_HOURS = 24;

export function inferCurrencyFromSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  if (upper.endsWith(".OL")) return "NOK";
  if (upper.endsWith(".ST")) return "SEK";
  if (upper.endsWith(".CO")) return "DKK";
  if (upper.endsWith(".HE")) return "EUR";
  if (
    upper.endsWith(".PA") ||
    upper.endsWith(".AS") ||
    upper.endsWith(".DE") ||
    upper.endsWith(".F") ||
    upper.endsWith(".MC") ||
    upper.endsWith(".MI") ||
    upper.endsWith(".BR") ||
    upper.endsWith(".LS")
  ) {
    return "EUR";
  }
  if (upper.endsWith(".L")) return "GBP";
  if (upper.endsWith(".TO") || upper.endsWith(".V")) return "CAD";
  if (upper.endsWith(".HK")) return "HKD";
  if (upper.endsWith(".T")) return "JPY";
  if (upper.endsWith(".AX")) return "AUD";
  if (upper.endsWith(".SW")) return "CHF";
  return "USD";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

export function mergeScreenerSyncTargets(holdings: string[], hot: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [...holdings, ...hot]) {
    const symbol = normalizeSymbol(raw);
    if (!symbol || seen.has(symbol)) continue;
    seen.add(symbol);
    out.push(symbol);
  }
  return out;
}

export async function resolveScreenerSyncTargets(): Promise<{
  tickers: string[];
  holdings: number;
  hot: number;
}> {
  const [holdingRows, hot] = await Promise.all([
    listDistinctHoldingTickers(),
    listHotScreenerSymbols(),
  ]);
  const holdingTickers = holdingRows.map((h) => h.ticker);
  const tickers = mergeScreenerSyncTargets(holdingTickers, hot);
  return { tickers, holdings: holdingTickers.length, hot: hot.length };
}

export async function syncScreenerTickers(
  tickers: string[],
): Promise<{ synced: number; errors: number; skipped: number; total: number }> {
  const yahoo = new YahooProvider();
  let synced = 0;
  let errors = 0;
  let skipped = 0;

  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    const batch = tickers.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (symbol) => {
        try {
          const [overview, quote] = await Promise.all([
            yahoo.getOverview(symbol),
            yahoo.getQuote(symbol).catch(() => null),
          ]);

          if (!overview) {
            skipped += 1;
            return;
          }

          await upsertScreenerCache({
            symbol,
            shortName: quote?.shortName || overview.name || symbol,
            sector: overview.sector || "",
            industry: overview.industry || "",
            country: "",
            exchange: "",
            currency: overview.currency || quote?.currency || inferCurrencyFromSymbol(symbol),
            marketCap: quote?.marketCap ?? null,
            peRatio: overview.peRatio,
            forwardPe: overview.forwardPE,
            dividendYield: overview.dividendYield,
            dividendPerShare: overview.dividendPerShare,
            eps: overview.eps,
            beta: overview.beta,
            profitMargin: overview.profitMargin,
            returnOnEquity: overview.returnOnEquity,
            fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh ?? null,
            fiftyTwoWeekLow: quote?.fiftyTwoWeekLow ?? null,
            regularMarketPrice: quote?.regularMarketPrice ?? null,
            regularMarketChangePercent: quote?.regularMarketChangePercent ?? null,
            analystStrongBuy: overview.analystRatings?.strongBuy ?? 0,
            analystBuy: overview.analystRatings?.buy ?? 0,
            analystHold: overview.analystRatings?.hold ?? 0,
            analystSell: overview.analystRatings?.sell ?? 0,
            analystStrongSell: overview.analystRatings?.strongSell ?? 0,
          });
          synced += 1;
        } catch (err) {
          console.error(
            `[screener-sync] Failed to sync ${symbol}:`,
            err instanceof Error ? err.message : err,
          );
          errors += 1;
        }
      }),
    );

    if (i + BATCH_SIZE < tickers.length) {
      await sleep(DELAY_MS);
    }
  }

  return { synced, errors, skipped, total: tickers.length };
}

/** Fetch + persist missing or stale symbols (UI on-miss). */
export async function ensureScreenerSymbols(
  symbols: string[],
  opts?: { maxSync?: number },
): Promise<{ needed: string[]; synced: number; errors: number; skipped: number }> {
  const unique = [...new Set(symbols.map(normalizeSymbol).filter(Boolean))];
  if (unique.length === 0) {
    return { needed: [], synced: 0, errors: 0, skipped: 0 };
  }

  const needed = await listStaleOrMissingScreenerSymbols(unique, ENSURE_MAX_AGE_HOURS);
  const capped = opts?.maxSync != null ? needed.slice(0, opts.maxSync) : needed;
  if (capped.length === 0) {
    return { needed: [], synced: 0, errors: 0, skipped: 0 };
  }

  const result = await syncScreenerTickers(capped);
  return {
    needed: capped,
    synced: result.synced,
    errors: result.errors,
    skipped: result.skipped,
  };
}
