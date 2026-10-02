import { YahooProvider } from "@/lib/api-providers/yahoo";
import { listDistinctHoldingTickers, listDistinctWatchlistTickers } from "@/lib/db";

const MAX_SYMBOLS = 40;

export interface YahooEarningsRow {
  id: string;
  event_type: "earnings";
  symbol: string;
  name: string;
  event_date: string;
  event_time: string | null;
  details: string;
}

/** Next report date for holdings and watchlist symbols, capped so the cron stays inside its window. */
export async function fetchYahooHoldingsEarnings(
  from: string,
  to: string,
): Promise<YahooEarningsRow[]> {
  const [holdings, watchlist] = await Promise.all([
    listDistinctHoldingTickers(),
    listDistinctWatchlistTickers(),
  ]);
  const symbols = [
    ...new Set(
      [...holdings.map((h) => h.ticker), ...watchlist]
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean),
    ),
  ].slice(0, MAX_SYMBOLS);

  const yahoo = new YahooProvider();
  const rows: YahooEarningsRow[] = [];
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const outlooks = await Promise.all(
      batch.map(async (symbol) => {
        try {
          return { symbol, outlook: await yahoo.getNextQuarterConsensus(symbol) };
        } catch {
          return { symbol, outlook: null };
        }
      }),
    );
    for (const { symbol, outlook } of outlooks) {
      const date = outlook?.nextReportDate;
      if (!date || date < from || date > to) continue;
      rows.push({
        id: `earnings:${symbol}:${date}`,
        event_type: "earnings",
        symbol,
        name: symbol,
        event_date: date,
        event_time: null,
        details: JSON.stringify({
          epsEstimated: outlook?.consensusEps ?? null,
          revenueEstimated: outlook?.consensusRevenue ?? null,
          source: "yahoo",
        }),
      });
    }
  }
  return rows;
}
