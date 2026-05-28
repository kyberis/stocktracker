import type { ProviderQuoteResult } from "@/lib/api-providers/types";
import type { QuoteData } from "@/lib/types";

export function providerQuotesToQuoteMap(
  quotes: Record<string, ProviderQuoteResult>,
): Record<string, QuoteData> {
  const out: Record<string, QuoteData> = {};
  for (const [sym, q] of Object.entries(quotes)) {
    out[sym] = {
      symbol: q.symbol || sym,
      shortName: q.shortName,
      regularMarketPrice: q.regularMarketPrice,
      regularMarketChange: q.regularMarketChange,
      regularMarketChangePercent: q.regularMarketChangePercent,
      currency: q.currency,
      regularMarketPreviousClose: q.regularMarketPreviousClose,
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: q.fiftyTwoWeekLow,
      marketCap: q.marketCap,
      trailingAnnualDividendRate: q.trailingAnnualDividendRate,
      trailingAnnualDividendYield: q.trailingAnnualDividendYield,
      quoteType: q.quoteType,
    };
  }
  return out;
}
