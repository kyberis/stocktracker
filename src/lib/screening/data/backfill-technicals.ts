import { getGlobalFmpApiKey } from "@/lib/db";
import { FmpMarketDataProvider } from "@/lib/api-providers/fmp-market-data";
import { deriveScreeningTechnicals } from "@/lib/screening/data/technicals-derive";
import {
  aggregateTechnicalsOutputSchema,
  type AggregateTechnicalsOutput,
  type TechnicalsOutput,
} from "@/lib/screening/schemas";

/**
 * On-read backfill: build the technicals aggregate for older runs where the
 * technicals agent never ran (pre-Phase 2). Returns null when no backfill is
 * needed (existing row already covers all tickers) or when tickers is empty.
 *
 * Mirrors the shape of {@link backfillHardDataOutputJson}: called once per
 * report GET, best-effort, never throws.
 */
export async function backfillTechnicalsAggregateOutputJson(input: {
  existingOutputJson: string | null;
  tickers: string[];
}): Promise<string | null> {
  const uniqueTickers = Array.from(
    new Set(input.tickers.map((t) => t.trim().toUpperCase()).filter(Boolean)),
  );
  if (uniqueTickers.length === 0) return null;

  let existing: AggregateTechnicalsOutput | null = null;
  if (input.existingOutputJson) {
    try {
      const parsed = aggregateTechnicalsOutputSchema.safeParse(
        JSON.parse(input.existingOutputJson),
      );
      if (parsed.success) existing = parsed.data;
    } catch {
      existing = null;
    }
  }

  const haveTickers = new Set(
    (existing?.tickers ?? []).map((t) => t.ticker.toUpperCase()),
  );
  const missing = uniqueTickers.filter((t) => !haveTickers.has(t));
  if (missing.length === 0) return null;

  const apiKey = getGlobalFmpApiKey();
  if (!apiKey) return null;
  const provider = new FmpMarketDataProvider(apiKey);
  const CONCURRENCY = 3;
  const built: TechnicalsOutput[] = [];
  for (let i = 0; i < missing.length; i += CONCURRENCY) {
    const chunk = missing.slice(i, i + CONCURRENCY);
    const rows = await Promise.all(
      chunk.map(async (ticker) => {
        try {
          const [quote, history] = await Promise.all([
            provider.getQuote(ticker).catch(() => null),
            provider.getHistorical(ticker, "1y").catch(() => []),
          ]);
          return deriveScreeningTechnicals({
            ticker,
            history: history ?? [],
            currentPrice: quote?.regularMarketPrice ?? null,
            currency: quote?.currency ?? null,
          });
        } catch {
          return deriveScreeningTechnicals({
            ticker,
            history: [],
            currentPrice: null,
            currency: null,
          });
        }
      }),
    );
    built.push(...rows);
  }

  const combined: TechnicalsOutput[] = [...(existing?.tickers ?? []), ...built];
  const aggregate = aggregateTechnicalsOutputSchema.parse({
    tickers: combined.slice(0, 15),
    generatedAt: new Date().toISOString(),
  });
  return JSON.stringify(aggregate);
}
