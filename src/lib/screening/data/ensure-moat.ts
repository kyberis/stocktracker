/**
 * Ensure MOAT cache rows exist for screening shortlist tickers.
 * On miss: evaluate via FMP fundamentals + evaluateMoat, write-through to
 * moat_cache. Ops path (no user stock_evaluation quota) — same idea as moat-sync.
 */

import { getMoatCacheForSymbols, upsertMoatCache } from "@/lib/db/moat-cache";
import { resolvePremiumStockDataProvider } from "@/lib/market-data/resolve-provider";
import { evaluateMoat } from "@/lib/moat-evaluator";

const CONCURRENCY = 2;

export interface EnsureMoatResult {
  /** Tickers that already had cache or were successfully generated. */
  available: string[];
  /** Tickers still without a usable MOAT after this pass. */
  missing: string[];
  generated: number;
  failed: number;
}

/**
 * For each ticker without a moat_cache row, fetch fundamentals and cache an
 * evaluation. Fail-open on provider errors / rate limits.
 */
export async function ensureMoatForTickers(
  tickers: readonly string[],
): Promise<EnsureMoatResult> {
  const unique = [
    ...new Set(tickers.map((t) => t.toUpperCase().trim()).filter(Boolean)),
  ];
  const available: string[] = [];
  const missing: string[] = [];
  let generated = 0;
  let failed = 0;

  if (unique.length === 0) {
    return { available, missing, generated, failed };
  }

  const cached = await getMoatCacheForSymbols(unique, 30);
  const needGenerate: string[] = [];
  for (const t of unique) {
    if (cached.has(t)) available.push(t);
    else needGenerate.push(t);
  }

  if (needGenerate.length === 0) {
    return { available, missing, generated, failed };
  }

  const resolved = await resolvePremiumStockDataProvider(null, "moat_sync");
  if (!resolved) {
    missing.push(...needGenerate);
    return { available, missing, generated, failed };
  }
  const { provider } = resolved;

  for (let i = 0; i < needGenerate.length; i += CONCURRENCY) {
    const chunk = needGenerate.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      chunk.map(async (symbol) => {
        try {
          const [overview, income, balance, cashflow, earnings] =
            await Promise.all([
              provider.getOverview?.(symbol) ?? Promise.resolve(null),
              provider.getIncomeStatement?.(symbol) ?? Promise.resolve(null),
              provider.getBalanceSheet?.(symbol) ?? Promise.resolve(null),
              provider.getCashFlow?.(symbol) ?? Promise.resolve(null),
              provider.getEarnings?.(symbol) ?? Promise.resolve(null),
            ]);
          if (!overview || !income || !balance || !cashflow || !earnings) {
            return { symbol, ok: false as const, reason: "insufficient_data" };
          }
          const evaluation = evaluateMoat({
            overview,
            income,
            balance,
            cashflow,
            earnings,
          });
          await upsertMoatCache(evaluation);
          return { symbol, ok: true as const };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(
            `[screening/ensure-moat] ${symbol} failed:`,
            msg.slice(0, 200),
          );
          return { symbol, ok: false as const, reason: msg };
        }
      }),
    );

    for (const r of results) {
      if (r.ok) {
        available.push(r.symbol);
        generated++;
      } else {
        missing.push(r.symbol);
        failed++;
        if (r.reason?.toLowerCase().includes("rate limit")) {
          // Stop generating further; remaining stay missing.
          const rest = needGenerate.slice(
            needGenerate.indexOf(r.symbol) + 1,
          );
          for (const s of rest) {
            if (!missing.includes(s) && !available.includes(s)) missing.push(s);
          }
          return { available, missing, generated, failed };
        }
      }
    }
  }

  return { available, missing, generated, failed };
}
