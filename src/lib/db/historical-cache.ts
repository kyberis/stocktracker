import { ensureInitialized } from "./client";
import type { ProviderHistoricalPoint } from "@/lib/api-providers/types";

/**
 * Load cached historical price points for a symbol.
 * Returns all stored daily rows for the symbol, sorted by date ascending.
 */
export async function getCachedHistorical(
  symbol: string,
): Promise<ProviderHistoricalPoint[]> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT date, open, high, low, close, volume FROM yahoo_historical_cache WHERE symbol = ? ORDER BY date ASC",
    args: [symbol],
  });
  return result.rows.map((r) => ({
    date: r.date as string,
    open: r.open as number,
    high: r.high as number,
    low: r.low as number,
    close: r.close as number,
    volume: r.volume as number,
  }));
}

/**
 * Load the set of dates already cached for a symbol.
 * Used to determine which dates still need fetching.
 */
export async function getCachedDates(symbol: string): Promise<Set<string>> {
  const client = await ensureInitialized();
  const result = await client.execute({
    sql: "SELECT date FROM yahoo_historical_cache WHERE symbol = ?",
    args: [symbol],
  });
  return new Set(result.rows.map((r) => r.date as string));
}

/**
 * Store historical price points permanently. Uses INSERT OR IGNORE
 * so existing rows are never overwritten (historical data is immutable).
 */
export async function cacheHistoricalPoints(
  symbol: string,
  points: ProviderHistoricalPoint[],
): Promise<number> {
  if (points.length === 0) return 0;
  const client = await ensureInitialized();

  const BATCH_SIZE = 50;
  let inserted = 0;

  for (let i = 0; i < points.length; i += BATCH_SIZE) {
    const batch = points.slice(i, i + BATCH_SIZE);
    const stmts = batch
      .filter((p) => p.close > 0 && !p.date.includes(" ") && !p.date.includes("T"))
      .map((p) => ({
        sql: `INSERT OR IGNORE INTO yahoo_historical_cache (symbol, date, open, high, low, close, volume)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [symbol, p.date, p.open, p.high, p.low, p.close, p.volume],
      }));
    if (stmts.length > 0) {
      const results = await client.batch(stmts, "write");
      inserted += results.reduce((sum, r) => sum + (r.rowsAffected ?? 0), 0);
    }
  }
  return inserted;
}
