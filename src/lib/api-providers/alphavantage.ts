import type {
  StockDataProvider,
  ProviderQuoteResult,
  ProviderSearchResult,
  ProviderHistoricalPoint,
  CompanyOverview,
  TimePeriod,
} from "./types";

const AV_BASE = "https://www.alphavantage.co/query";
// 75 requests/minute ~= 800ms between calls. Keep slight safety buffer.
const AV_MIN_DELAY = 850;

let pendingChain: Promise<void> = Promise.resolve();
let lastCallTime = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function throttled<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    pendingChain = pendingChain
      .then(async () => {
        const now = Date.now();
        const elapsed = now - lastCallTime;
        if (lastCallTime > 0 && elapsed < AV_MIN_DELAY) {
          await sleep(AV_MIN_DELAY - elapsed);
        }
        lastCallTime = Date.now();
      })
      .then(() => fn().then(resolve, reject));
  });
}

async function avFetchRaw(params: Record<string, string>): Promise<Record<string, unknown>> {
  const url = new URL(AV_BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Alpha Vantage request failed: ${res.status}`);
  const data = await res.json();
  if (data["Information"]) throw new Error("Alpha Vantage rate limit reached");
  if (data["Error Message"]) throw new Error(data["Error Message"]);
  return data;
}

function parseFloat0(val: unknown): number {
  if (val === undefined || val === null || val === "None" || val === "-") return 0;
  const n = parseFloat(String(val));
  return isNaN(n) ? 0 : n;
}

function parseFloatOrNull(val: unknown): number | null {
  if (val === undefined || val === null || val === "None" || val === "-" || val === "0") return null;
  const n = parseFloat(String(val));
  return isNaN(n) ? null : n;
}

export class AlphaVantageProvider implements StockDataProvider {
  readonly name = "alphavantage";
  private apiKey: string;
  private _callCount = 0;

  get callCount() {
    return this._callCount;
  }

  constructor(apiKey: string) {
    if (!apiKey) throw new Error("Alpha Vantage API key is required");
    this.apiKey = apiKey;
  }

  private avFetch(params: Record<string, string>): Promise<Record<string, unknown>> {
    this._callCount++;
    return throttled(() => avFetchRaw({ ...params, apikey: this.apiKey }));
  }

  async getQuote(symbol: string): Promise<ProviderQuoteResult> {
    const data = await this.avFetch({
      function: "GLOBAL_QUOTE",
      symbol,
    });

    const gq = data["Global Quote"] as Record<string, string> | undefined;
    if (!gq || !gq["05. price"]) {
      return {
        symbol,
        shortName: symbol,
        regularMarketPrice: 0,
        regularMarketChange: 0,
        regularMarketChangePercent: 0,
        currency: "USD",
        regularMarketPreviousClose: 0,
        fiftyTwoWeekHigh: 0,
        fiftyTwoWeekLow: 0,
        marketCap: 0,
        error: true,
      };
    }

    const price = parseFloat0(gq["05. price"]);
    const prevClose = parseFloat0(gq["08. previous close"]);
    const change = parseFloat0(gq["09. change"]);
    const changePercent = parseFloat0(gq["10. change percent"]?.replace("%", ""));

    return {
      symbol: gq["01. symbol"] || symbol,
      shortName: symbol,
      regularMarketPrice: price,
      regularMarketChange: change,
      regularMarketChangePercent: changePercent,
      currency: "USD",
      regularMarketPreviousClose: prevClose,
      fiftyTwoWeekHigh: 0,
      fiftyTwoWeekLow: 0,
      marketCap: 0,
    };
  }

  async search(query: string): Promise<ProviderSearchResult[]> {
    const data = await this.avFetch({
      function: "SYMBOL_SEARCH",
      keywords: query,
    });

    const matches = (data["bestMatches"] || []) as Array<Record<string, string>>;
    return matches
      .filter((m) => m["3. type"] === "Equity" || m["3. type"] === "ETF")
      .slice(0, 8)
      .map((m) => ({
        symbol: m["1. symbol"],
        shortname: m["2. name"] || m["1. symbol"],
        exchange: m["4. region"] || "",
        quoteType: m["3. type"] || "Equity",
      }));
  }

  async getHistorical(
    symbol: string,
    period: TimePeriod
  ): Promise<ProviderHistoricalPoint[]> {
    let fn: string;
    let tsKey: string;
    const params: Record<string, string> = { symbol };

    if (period === "all") {
      fn = "TIME_SERIES_MONTHLY";
      tsKey = "Monthly Time Series";
    } else if (period === "1y") {
      fn = "TIME_SERIES_WEEKLY";
      tsKey = "Weekly Time Series";
    } else {
      fn = "TIME_SERIES_DAILY";
      tsKey = "Time Series (Daily)";
      params.outputsize = period === "6m" ? "full" : "compact";
    }

    params.function = fn;
    const data = await this.avFetch(params);
    const timeSeries = data[tsKey] as Record<string, Record<string, string>> | undefined;
    if (!timeSeries) return [];

    const now = new Date();
    let cutoffDate: Date;
    switch (period) {
      case "1w":
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "1m":
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case "3m":
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case "6m":
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
      case "1y":
        cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        cutoffDate = new Date(2000, 0, 1);
    }

    const entries = Object.entries(timeSeries)
      .filter(([dateStr]) => new Date(dateStr) >= cutoffDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateStr, vals]) => ({
        date: dateStr,
        open: parseFloat0(vals["1. open"]),
        high: parseFloat0(vals["2. high"]),
        low: parseFloat0(vals["3. low"]),
        close: parseFloat0(vals["4. close"]),
        volume: parseFloat0(vals["5. volume"]),
      }));

    return entries;
  }

  async getExchangeRate(from: string, to: string): Promise<number> {
    const data = await this.avFetch({
      function: "CURRENCY_EXCHANGE_RATE",
      from_currency: from,
      to_currency: to,
    });

    const rate = data["Realtime Currency Exchange Rate"] as Record<string, string> | undefined;
    if (!rate) return 0;
    return parseFloat0(rate["5. Exchange Rate"]);
  }

  async getOverview(symbol: string): Promise<CompanyOverview | null> {
    const data = await this.avFetch({
      function: "OVERVIEW",
      symbol,
    });

    if (!data["Symbol"]) return null;

    const d = data as Record<string, string>;

    let analystRatings = null;
    if (d["AnalystRatingStrongBuy"]) {
      analystRatings = {
        strongBuy: parseInt(d["AnalystRatingStrongBuy"]) || 0,
        buy: parseInt(d["AnalystRatingBuy"]) || 0,
        hold: parseInt(d["AnalystRatingHold"]) || 0,
        sell: parseInt(d["AnalystRatingSell"]) || 0,
        strongSell: parseInt(d["AnalystRatingStrongSell"]) || 0,
      };
    }

    return {
      symbol: d["Symbol"],
      name: d["Name"],
      description: d["Description"],
      exchange: d["Exchange"],
      currency: d["Currency"],
      sector: d["Sector"],
      industry: d["Industry"],
      peRatio: parseFloatOrNull(d["PERatio"]),
      pegRatio: parseFloatOrNull(d["PEGRatio"]),
      eps: parseFloatOrNull(d["EPS"]),
      dividendPerShare: parseFloatOrNull(d["DividendPerShare"]),
      dividendYield: parseFloatOrNull(d["DividendYield"]),
      beta: parseFloatOrNull(d["Beta"]),
      profitMargin: parseFloatOrNull(d["ProfitMargin"]),
      returnOnEquity: parseFloatOrNull(d["ReturnOnEquityTTM"]),
      revenueTTM: parseFloatOrNull(d["RevenueTTM"]),
      analystTargetPrice: parseFloatOrNull(d["AnalystTargetPrice"]),
      analystRatings,
      fiftyDayMA: parseFloatOrNull(d["50DayMovingAverage"]),
      twoHundredDayMA: parseFloatOrNull(d["200DayMovingAverage"]),
      sharesOutstanding: parseFloatOrNull(d["SharesOutstanding"]),
      forwardPE: parseFloatOrNull(d["ForwardPE"]),
    };
  }

}
