import YahooFinance from "yahoo-finance2";
import type {
  StockDataProvider,
  ProviderQuoteResult,
  ProviderSearchResult,
  ProviderHistoricalPoint,
  TimePeriod,
} from "./types";
import { providerRequestsTotal, providerRequestDuration } from "@/lib/metrics";

const yahooFinance = new YahooFinance();

export class YahooProvider implements StockDataProvider {
  readonly name = "yahoo";

  async getQuote(symbol: string): Promise<ProviderQuoteResult> {
    const end = providerRequestDuration.startTimer({ provider: "yahoo", operation: "quote" });
    let ok = false;
    try {
      const quote = await yahooFinance.quote(symbol);
      ok = true;
      return {
        symbol: quote.symbol ?? symbol,
        shortName: quote.shortName || quote.longName || symbol,
        regularMarketPrice: quote.regularMarketPrice ?? 0,
        regularMarketChange: quote.regularMarketChange ?? 0,
        regularMarketChangePercent: quote.regularMarketChangePercent ?? 0,
        currency: quote.currency || "USD",
        regularMarketPreviousClose: quote.regularMarketPreviousClose ?? 0,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? 0,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? 0,
        marketCap: quote.marketCap ?? 0,
        trailingAnnualDividendRate: quote.trailingAnnualDividendRate ?? undefined,
        trailingAnnualDividendYield: quote.trailingAnnualDividendYield ?? undefined,
      };
    } finally {
      end();
      providerRequestsTotal.inc({ provider: "yahoo", operation: "quote", status: ok ? "success" : "error" });
    }
  }

  async search(query: string): Promise<ProviderSearchResult[]> {
    const end = providerRequestDuration.startTimer({ provider: "yahoo", operation: "search" });
    let ok = false;
    try {
      const result = await yahooFinance.search(query, { quotesCount: 8 });
      ok = true;
      return (result.quotes || [])
        .filter(
          (q): q is typeof q & { symbol: string; quoteType: string } =>
            "symbol" in q &&
            "quoteType" in q &&
            (q.quoteType === "EQUITY" || q.quoteType === "ETF")
        )
        .map((q) => ({
          symbol: q.symbol,
          shortname: String(
            ("shortname" in q ? q.shortname : "") ||
            ("longname" in q ? q.longname : "") ||
            q.symbol
          ),
          exchange: String(("exchange" in q ? q.exchange : "") || ""),
          quoteType: String(q.quoteType || ""),
        }));
    } finally {
      end();
      providerRequestsTotal.inc({ provider: "yahoo", operation: "search", status: ok ? "success" : "error" });
    }
  }

  async getHistorical(
    symbol: string,
    period: TimePeriod
  ): Promise<ProviderHistoricalPoint[]> {
    const end = providerRequestDuration.startTimer({ provider: "yahoo", operation: "historical" });
    let ok = false;
    try {
      const now = new Date();
      let period1: Date;
      let interval: "1d" | "1wk" | "1mo" = "1d";

      switch (period) {
        case "1w":
          period1 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          interval = "1d";
          break;
        case "1m":
          period1 = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          interval = "1d";
          break;
        case "3m":
          period1 = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          interval = "1d";
          break;
        case "6m":
          period1 = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
          interval = "1wk";
          break;
        case "1y":
          period1 = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          interval = "1wk";
          break;
        case "all":
          period1 = new Date(2000, 0, 1);
          interval = "1mo";
          break;
        default:
          period1 = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          interval = "1d";
      }

      const result = await yahooFinance.historical(symbol, {
        period1,
        period2: now,
        interval,
      });

      ok = true;
      return result.map((item) => ({
        date: item.date.toISOString().split("T")[0],
        open: item.open ?? 0,
        high: item.high ?? 0,
        low: item.low ?? 0,
        close: item.close ?? 0,
        volume: item.volume ?? 0,
      }));
    } finally {
      end();
      providerRequestsTotal.inc({ provider: "yahoo", operation: "historical", status: ok ? "success" : "error" });
    }
  }

  async getClassification(symbol: string): Promise<{ sector: string; region: string; assetClass: string } | null> {
    const end = providerRequestDuration.startTimer({ provider: "yahoo", operation: "classification" });
    let ok = false;
    try {
      const result = await yahooFinance.quoteSummary(symbol, { modules: ["assetProfile", "quoteType"] });
      ok = true;
      const profile = result.assetProfile;
      const qt = result.quoteType;

      const quoteType = qt?.quoteType ?? "";
      let assetClass = "Equity";
      if (quoteType === "ETF") assetClass = "ETF";
      else if (quoteType === "MUTUALFUND") assetClass = "Fund";

      return {
        sector: profile?.sector ?? "",
        region: profile?.country ?? "",
        assetClass,
      };
    } catch {
      return null;
    } finally {
      end();
      providerRequestsTotal.inc({ provider: "yahoo", operation: "classification", status: ok ? "success" : "error" });
    }
  }

  async getExchangeRate(from: string, to: string): Promise<number> {
    const end = providerRequestDuration.startTimer({ provider: "yahoo", operation: "exchange_rate" });
    let ok = false;
    try {
      const symbol = `${from}${to}=X`;
      const quote = await yahooFinance.quote(symbol);
      ok = true;
      return quote.regularMarketPrice ?? 0;
    } finally {
      end();
      providerRequestsTotal.inc({ provider: "yahoo", operation: "exchange_rate", status: ok ? "success" : "error" });
    }
  }
}
