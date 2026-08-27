import { mapQuote } from "@/lib/company-analysis/assemble";
import type { CompanyAnalysisReport } from "@/lib/company-analysis/types";
import { marketDataSymbolForHolding } from "@/lib/market-symbol";
import { getQuotesWithCache } from "@/lib/quote-cache";

/**
 * Overlay a fresh quote onto a cached report without rewriting durable storage.
 * Price / change / marketCap move with the market; fundamentals stay day-cached.
 */
export async function withLiveQuote(
  report: CompanyAnalysisReport,
): Promise<CompanyAnalysisReport> {
  try {
    const symbol = marketDataSymbolForHolding({
      ticker: report.ticker,
      exchange: report.profile?.exchange,
      name: report.profile?.name,
    });
    const quotes = await getQuotesWithCache([symbol]);
    const providerQuote = quotes[symbol] ?? quotes[report.ticker];
    if (!providerQuote || !(providerQuote.regularMarketPrice > 0)) {
      return report;
    }
    const live = mapQuote(providerQuote, null);
    if (!live) return report;
    return {
      ...report,
      quote: {
        price: live.price,
        change: live.change,
        changePercent: live.changePercent,
        dayHigh: live.dayHigh,
        dayLow: live.dayLow,
        marketCap: live.marketCap ?? report.quote?.marketCap ?? null,
        fiftyTwoWeekHigh: live.fiftyTwoWeekHigh ?? report.quote?.fiftyTwoWeekHigh ?? null,
        fiftyTwoWeekLow: live.fiftyTwoWeekLow ?? report.quote?.fiftyTwoWeekLow ?? null,
        ma50: report.quote?.ma50 ?? live.ma50,
        ma200: report.quote?.ma200 ?? live.ma200,
        currency: live.currency ?? report.quote?.currency ?? null,
      },
    };
  } catch {
    return report;
  }
}
