import { NextRequest } from "next/server";
import { withCronLogging, verifyCronAuth } from "@/lib/cron-logging";
import { AlphaVantageProvider } from "@/lib/api-providers/alphavantage";
import { getGlobalAlphaVantageApiKey } from "@/lib/db/settings";
import { evaluateMoat } from "@/lib/moat-evaluator";
import { upsertMoatCache, getStaleMoatSymbols } from "@/lib/db/moat-cache";
import { listMoatAutoTickers } from "@/lib/db/moat-auto-tickers";
import screenerUniverse from "@/../data/screener-universe.json";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH_SIZE = 30;
const MAX_AGE_DAYS = 7;

const runMoatSync = withCronLogging("moat-sync", async () => {
  const apiKey = getGlobalAlphaVantageApiKey();
  if (!apiKey) {
    return { ok: false, error: "Alpha Vantage API key not configured" };
  }

  const autoTickers = await listMoatAutoTickers();
  const autoSymbols = autoTickers.map((t) => t.symbol);
  const allSymbols = [...new Set([...screenerUniverse.tickers, ...autoSymbols])];

  const stale = await getStaleMoatSymbols(allSymbols, MAX_AGE_DAYS, BATCH_SIZE);
  if (stale.length === 0) {
    return { ok: true, processed: 0, succeeded: 0, failed: 0, skipped: 0, remaining: 0, universe: allSymbols.length };
  }

  const av = new AlphaVantageProvider(apiKey);
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (const symbol of stale) {
    try {
      const [overview, income, balance, cashflow, earnings] = await Promise.all([
        av.getOverview(symbol),
        av.getIncomeStatement(symbol),
        av.getBalanceSheet(symbol),
        av.getCashFlow(symbol),
        av.getEarnings(symbol),
      ]);

      if (!overview || !income || !balance || !cashflow || !earnings) {
        console.log(`[moat-sync] Skipping ${symbol}: insufficient data`);
        skipped++;
        continue;
      }

      const evaluation = evaluateMoat({ overview, income, balance, cashflow, earnings });
      await upsertMoatCache(evaluation);
      succeeded++;
      console.log(`[moat-sync] Evaluated ${symbol}: ${evaluation.verdict} (${evaluation.totalScore}/${evaluation.maxScore})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[moat-sync] Failed ${symbol}:`, msg);
      failed++;

      if (msg.includes("rate limit")) {
        console.warn("[moat-sync] Rate limit hit, stopping batch early");
        break;
      }
    }
  }

  const remainingStale = await getStaleMoatSymbols(allSymbols, MAX_AGE_DAYS, 1);

  return {
    ok: true,
    processed: succeeded + failed + skipped,
    succeeded,
    failed,
    skipped,
    remaining: remainingStale.length > 0 ? "more" : 0,
    universe: allSymbols.length,
  };
});

export async function GET(request: NextRequest) {
  const denied = verifyCronAuth("moat-sync", request.headers.get("authorization"));
  if (denied) return denied;
  return runMoatSync();
}
