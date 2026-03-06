import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import { ensureInitialized } from "@/lib/db/client";
import { str, num } from "@/lib/db/helpers";
import { YahooProvider } from "@/lib/api-providers/yahoo";

/**
 * POST /api/transactions/backfill-rates
 *
 * Populates exchange_rate_eur for existing transactions that lack it.
 * Fetches historical daily FX close prices from Yahoo Finance for each
 * currency pair, then matches transactions to the nearest available date.
 */
export const POST = withMetrics("/api/transactions/backfill-rates", async (req: NextRequest) => {
  const { session, error } = await requireSession(req);
  if (error || !session) return error;

  const client = await ensureInitialized();

  const result = await client.execute({
    sql: `SELECT id, currency, date FROM transactions
          WHERE user_id = ? AND exchange_rate_eur IS NULL AND currency != 'EUR'
          ORDER BY date ASC`,
    args: [session.userId],
  });

  if (result.rows.length === 0) {
    return NextResponse.json({ updated: 0, message: "All transactions already have exchange rates." });
  }

  const byPair = new Map<string, { id: string; date: string }[]>();
  for (const row of result.rows) {
    const cur = str(row.currency);
    if (!byPair.has(cur)) byPair.set(cur, []);
    byPair.get(cur)!.push({ id: str(row.id), date: str(row.date) });
  }

  const yahoo = new YahooProvider();
  let updated = 0;

  for (const [currency, txs] of byPair) {
    const dates = txs.map((t) => t.date).sort();
    const earliest = new Date(dates[0]);
    earliest.setDate(earliest.getDate() - 5);

    let dailyRates: Map<string, number>;
    try {
      const history = await yahoo.getHistorical(`EUR${currency}=X`, "all");
      dailyRates = new Map(history.map((p) => [p.date, p.close]));
    } catch {
      try {
        const rate = await yahoo.getExchangeRate("EUR", currency);
        if (rate > 0) {
          dailyRates = new Map([[new Date().toISOString().slice(0, 10), rate]]);
        } else {
          continue;
        }
      } catch {
        continue;
      }
    }

    for (const tx of txs) {
      const rate = findClosestRate(dailyRates, tx.date);
      if (rate && rate > 0) {
        await client.execute({
          sql: "UPDATE transactions SET exchange_rate_eur = ? WHERE id = ? AND user_id = ?",
          args: [rate, tx.id, session.userId],
        });
        updated++;
      }
    }
  }

  return NextResponse.json({ updated, total: result.rows.length });
});

function findClosestRate(rates: Map<string, number>, target: string): number | null {
  if (rates.has(target)) return rates.get(target)!;

  const targetMs = new Date(target).getTime();
  let bestDate: string | null = null;
  let bestDiff = Infinity;

  for (const date of rates.keys()) {
    const diff = Math.abs(new Date(date).getTime() - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestDate = date;
    }
  }

  if (bestDate && bestDiff <= 7 * 86400000) {
    return rates.get(bestDate)!;
  }
  return null;
}
