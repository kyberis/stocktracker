import { NextRequest } from "next/server";
import { upsertScreenerCache } from "@/lib/db";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";
import screenerUniverse from "@/../data/screener-universe.json";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH_SIZE = 20;
const DELAY_MS = 500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Infer listing currency from Yahoo-style exchange suffix when provider omits it. */
function inferCurrencyFromSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  if (upper.endsWith(".OL")) return "NOK";
  if (upper.endsWith(".ST")) return "SEK";
  if (upper.endsWith(".CO")) return "DKK";
  if (upper.endsWith(".HE")) return "EUR";
  if (upper.endsWith(".PA") || upper.endsWith(".AS") || upper.endsWith(".DE") || upper.endsWith(".F") || upper.endsWith(".MC") || upper.endsWith(".MI") || upper.endsWith(".BR") || upper.endsWith(".LS")) return "EUR";
  if (upper.endsWith(".L")) return "GBP";
  if (upper.endsWith(".TO") || upper.endsWith(".V")) return "CAD";
  if (upper.endsWith(".HK")) return "HKD";
  if (upper.endsWith(".T")) return "JPY";
  if (upper.endsWith(".AX")) return "AUD";
  if (upper.endsWith(".SW")) return "CHF";
  return "USD";
}

function createSync(offset = 0, limit = 0) {
  return withCronLogging("screener-sync", async () => {
    const yahoo = new YahooProvider();
    const allTickers: string[] = screenerUniverse.tickers;
    const tickers = limit > 0 ? allTickers.slice(offset, offset + limit) : allTickers;

  let synced = 0;
  let errors = 0;
  let skipped = 0;

  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    const batch = tickers.slice(i, i + BATCH_SIZE);

    const promises = batch.map(async (symbol) => {
      try {
        const [overview, quote] = await Promise.all([
          yahoo.getOverview(symbol),
          yahoo.getQuote(symbol).catch(() => null),
        ]);

        if (!overview) {
          skipped++;
          return;
        }

        await upsertScreenerCache({
          symbol,
          shortName: quote?.shortName || overview.name || symbol,
          sector: overview.sector || "",
          industry: overview.industry || "",
          country: "",
          exchange: quote?.symbol ? "" : "",
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
        synced++;
      } catch (err) {
        console.error(`[screener-sync] Failed to sync ${symbol}:`, err instanceof Error ? err.message : err);
        errors++;
      }
    });

    await Promise.all(promises);

    if (i + BATCH_SIZE < tickers.length) {
      await sleep(DELAY_MS);
    }
  }

  return { synced, errors, skipped, total: tickers.length };
  });
}

export async function GET(request: NextRequest) {
  const denied = verifyCronAuth("screener-sync", request);
  if (denied) return denied;

  const url = new URL(request.url);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);
  const limit = parseInt(url.searchParams.get("limit") || "0", 10);

  const runSync = createSync(offset, limit);
  return runSync();
}
