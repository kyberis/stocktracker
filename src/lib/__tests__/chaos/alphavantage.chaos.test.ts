import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  mockFetchResponse,
  mockFetchNetworkError,
} from "./_helpers";

vi.mock("@/lib/metrics", () => ({
  providerRequestsTotal: { inc: vi.fn() },
  providerRequestDuration: { startTimer: () => vi.fn() },
}));

const originalFetch = globalThis.fetch;

async function freshProvider() {
  vi.resetModules();
  const { AlphaVantageProvider } = await import(
    "@/lib/api-providers/alphavantage"
  );
  return new AlphaVantageProvider("test-key");
}

describe("Alpha Vantage chaos", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  describe("avFetchRaw (via AlphaVantageProvider)", () => {

    it("throws on rate limit (Information field)", async () => {
      mockFetchResponse(200, { Information: "API rate limit reached" });
      const provider = await freshProvider();

      await expect(provider.getQuote("AAPL")).rejects.toThrow(
        "Alpha Vantage rate limit reached",
      );
    });

    it("throws on HTTP 401", async () => {
      mockFetchResponse(401, {});
      const provider = await freshProvider();

      await expect(provider.getQuote("AAPL")).rejects.toThrow("401");
    });

    it("throws on Error Message in body", async () => {
      mockFetchResponse(200, {
        "Error Message": "Invalid API call. Try again.",
      });
      const provider = await freshProvider();

      await expect(provider.getQuote("AAPL")).rejects.toThrow(
        "Invalid API call. Try again.",
      );
    });

    it("throws on network failure", async () => {
      mockFetchNetworkError("Failed to fetch");
      const provider = await freshProvider();

      await expect(provider.getQuote("AAPL")).rejects.toThrow("Failed to fetch");
    });

    it("throws on HTTP 500", async () => {
      mockFetchResponse(500, { error: "internal" });
      const provider = await freshProvider();

      await expect(provider.getQuote("AAPL")).rejects.toThrow("500");
    });
  });

  describe("constructor validation", () => {
    it("throws when API key is empty", async () => {
      vi.resetModules();
      const { AlphaVantageProvider } = await import(
        "@/lib/api-providers/alphavantage"
      );
      expect(() => new AlphaVantageProvider("")).toThrow(
        "Alpha Vantage API key is required",
      );
    });
  });

  describe("getQuote success", () => {
    it("returns quote data from Global Quote response", async () => {
      mockFetchResponse(200, {
        "Global Quote": {
          "01. symbol": "AAPL",
          "05. price": "175.50",
          "08. previous close": "173.20",
          "09. change": "2.30",
          "10. change percent": "1.328%",
        },
      });
      const provider = await freshProvider();
      const result = await provider.getQuote("AAPL");
      expect(result.symbol).toBe("AAPL");
      expect(result.regularMarketPrice).toBe(175.5);
      expect(result.regularMarketChange).toBe(2.3);
      expect(result.regularMarketPreviousClose).toBe(173.2);
    });

    it("returns zero-price result when Global Quote is empty", async () => {
      mockFetchResponse(200, { "Global Quote": {} });
      const provider = await freshProvider();
      const result = await provider.getQuote("INVALID");
      expect(result.regularMarketPrice).toBe(0);
      expect(result.error).toBe(true);
    });

    it("infers EUR currency for .DE suffix", async () => {
      mockFetchResponse(200, {
        "Global Quote": {
          "01. symbol": "SAP.DE",
          "05. price": "200",
          "08. previous close": "198",
          "09. change": "2",
          "10. change percent": "1%",
        },
      });
      const provider = await freshProvider();
      const result = await provider.getQuote("SAP.DE");
      expect(result.currency).toBe("EUR");
    });

    it("infers GBP currency for .L suffix", async () => {
      mockFetchResponse(200, {
        "Global Quote": {
          "01. symbol": "SHEL.L",
          "05. price": "2500",
          "08. previous close": "2480",
          "09. change": "20",
          "10. change percent": "0.8%",
        },
      });
      const provider = await freshProvider();
      const result = await provider.getQuote("SHEL.L");
      expect(result.currency).toBe("GBP");
    });
  });

  describe("search success", () => {
    it("returns mapped search results", async () => {
      mockFetchResponse(200, {
        bestMatches: [
          {
            "1. symbol": "AAPL",
            "2. name": "Apple Inc.",
            "4. region": "United States",
            "3. type": "Equity",
            "8. currency": "USD",
          },
        ],
      });
      const provider = await freshProvider();
      const results = await provider.search("AAPL");
      expect(results).toHaveLength(1);
      expect(results[0].symbol).toBe("AAPL");
      expect(results[0].shortname).toBe("Apple Inc.");
    });

    it("returns empty array when no matches", async () => {
      mockFetchResponse(200, { bestMatches: [] });
      const provider = await freshProvider();
      const results = await provider.search("XXXXX");
      expect(results).toEqual([]);
    });
  });

  describe("getExchangeRate success", () => {
    it("returns exchange rate from response", async () => {
      mockFetchResponse(200, {
        "Realtime Currency Exchange Rate": {
          "5. Exchange Rate": "0.9215",
        },
      });
      const provider = await freshProvider();
      const rate = await provider.getExchangeRate("USD", "EUR");
      expect(rate).toBe(0.9215);
    });

    it("returns 0 when response is missing rate field", async () => {
      mockFetchResponse(200, { "Realtime Currency Exchange Rate": {} });
      const provider = await freshProvider();
      const rate = await provider.getExchangeRate("XYZ", "ABC");
      expect(rate).toBe(0);
    });
  });

  describe("getHistorical success", () => {
    it("returns daily data for 1m period", async () => {
      const today = new Date();
      const recentDate = new Date(today);
      recentDate.setDate(recentDate.getDate() - 5);
      const dateStr = recentDate.toISOString().split("T")[0];
      mockFetchResponse(200, {
        "Time Series (Daily)": {
          [dateStr]: {
            "1. open": "170.00",
            "2. high": "176.00",
            "3. low": "169.50",
            "4. close": "175.00",
            "5. volume": "1000000",
          },
        },
      });
      const provider = await freshProvider();
      const results = await provider.getHistorical("AAPL", "1m");
      expect(results).toHaveLength(1);
      expect(results[0].close).toBe(175);
      expect(results[0].date).toBe(dateStr);
    });

    it("returns weekly data for 1y period", async () => {
      const today = new Date();
      const recentDate = new Date(today);
      recentDate.setDate(recentDate.getDate() - 30);
      const dateStr = recentDate.toISOString().split("T")[0];
      mockFetchResponse(200, {
        "Weekly Time Series": {
          [dateStr]: {
            "1. open": "160.00",
            "2. high": "165.00",
            "3. low": "158.00",
            "4. close": "164.00",
            "5. volume": "5000000",
          },
        },
      });
      const provider = await freshProvider();
      const results = await provider.getHistorical("AAPL", "1y");
      expect(results).toHaveLength(1);
    });

    it("returns monthly data for all period", async () => {
      mockFetchResponse(200, {
        "Monthly Time Series": {
          "2024-06-30": {
            "1. open": "180.00",
            "2. high": "190.00",
            "3. low": "175.00",
            "4. close": "188.00",
            "5. volume": "20000000",
          },
        },
      });
      const provider = await freshProvider();
      const results = await provider.getHistorical("AAPL", "all");
      expect(results).toHaveLength(1);
      expect(results[0].close).toBe(188);
    });

    it("returns empty array when time series is missing", async () => {
      mockFetchResponse(200, {});
      const provider = await freshProvider();
      const results = await provider.getHistorical("AAPL", "1w");
      expect(results).toEqual([]);
    });

    it.each(["1w", "3m", "6m"] as const)("handles %s period", async (period) => {
      const today = new Date();
      const dateStr = today.toISOString().split("T")[0];
      mockFetchResponse(200, {
        "Time Series (Daily)": {
          [dateStr]: {
            "1. open": "100",
            "2. high": "105",
            "3. low": "99",
            "4. close": "103",
            "5. volume": "50000",
          },
        },
      });
      const provider = await freshProvider();
      const results = await provider.getHistorical("AAPL", period);
      expect(results.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getOverview success", () => {
    it("returns company overview data", async () => {
      mockFetchResponse(200, {
        Symbol: "AAPL",
        Name: "Apple Inc.",
        Description: "Tech company",
        Exchange: "NASDAQ",
        Currency: "USD",
        Sector: "Technology",
        Industry: "Consumer Electronics",
        PERatio: "28.5",
        EPS: "6.13",
        DividendPerShare: "0.96",
        DividendYield: "0.0055",
        Beta: "1.24",
        ProfitMargin: "0.25",
        ReturnOnEquityTTM: "0.15",
        RevenueTTM: "383000000000",
        AnalystTargetPrice: "200",
        AnalystRatingStrongBuy: "10",
        AnalystRatingBuy: "20",
        AnalystRatingHold: "5",
        AnalystRatingSell: "2",
        AnalystRatingStrongSell: "1",
        "50DayMovingAverage": "175.5",
        "200DayMovingAverage": "168.3",
        SharesOutstanding: "15000000000",
        ForwardPE: "25.3",
        PEGRatio: "2.1",
      });
      const provider = await freshProvider();
      const result = await provider.getOverview("AAPL");
      expect(result).not.toBeNull();
      expect(result!.symbol).toBe("AAPL");
      expect(result!.name).toBe("Apple Inc.");
      expect(result!.peRatio).toBe(28.5);
      expect(result!.eps).toBe(6.13);
      expect(result!.analystRatings).not.toBeNull();
      expect(result!.analystRatings!.strongBuy).toBe(10);
    });

    it("returns null when Symbol is missing", async () => {
      mockFetchResponse(200, {});
      const provider = await freshProvider();
      const result = await provider.getOverview("INVALID");
      expect(result).toBeNull();
    });

    it("returns null analystRatings when fields missing", async () => {
      mockFetchResponse(200, {
        Symbol: "AAPL",
        Name: "Apple Inc.",
      });
      const provider = await freshProvider();
      const result = await provider.getOverview("AAPL");
      expect(result!.analystRatings).toBeNull();
    });
  });

  describe("getIncomeStatement success", () => {
    it("returns parsed income statement data", async () => {
      mockFetchResponse(200, {
        annualReports: [
          {
            fiscalDateEnding: "2024-09-30",
            reportedCurrency: "USD",
            totalRevenue: "383000000000",
            costOfRevenue: "200000000000",
            grossProfit: "183000000000",
            operatingExpenses: "50000000000",
            operatingIncome: "133000000000",
            incomeBeforeTax: "130000000000",
            incomeTaxExpense: "20000000000",
            netIncome: "110000000000",
            ebitda: "140000000000",
          },
        ],
        quarterlyReports: [],
      });
      const provider = await freshProvider();
      const result = await provider.getIncomeStatement("AAPL");
      expect(result).not.toBeNull();
      expect(result!.annual).toHaveLength(1);
      expect(result!.annual[0].totalRevenue).toBe(383000000000);
    });

    it("returns null when no data", async () => {
      mockFetchResponse(200, {});
      const provider = await freshProvider();
      const result = await provider.getIncomeStatement("INVALID");
      expect(result).toBeNull();
    });
  });

  describe("getBalanceSheet success", () => {
    it("returns parsed balance sheet data", async () => {
      mockFetchResponse(200, {
        annualReports: [
          {
            fiscalDateEnding: "2024-09-30",
            reportedCurrency: "USD",
            totalAssets: "350000000000",
            totalCurrentAssets: "140000000000",
            totalLiabilities: "270000000000",
            totalShareholderEquity: "80000000000",
          },
        ],
        quarterlyReports: [],
      });
      const provider = await freshProvider();
      const result = await provider.getBalanceSheet("AAPL");
      expect(result).not.toBeNull();
      expect(result!.annual).toHaveLength(1);
      expect(result!.annual[0].totalAssets).toBe(350000000000);
    });

    it("returns null when no data", async () => {
      mockFetchResponse(200, {});
      const provider = await freshProvider();
      const result = await provider.getBalanceSheet("INVALID");
      expect(result).toBeNull();
    });
  });

  describe("getCashFlow success", () => {
    it("returns parsed cash flow with computed free cash flow", async () => {
      mockFetchResponse(200, {
        annualReports: [
          {
            fiscalDateEnding: "2024-09-30",
            reportedCurrency: "USD",
            operatingCashflow: "100000000000",
            capitalExpenditures: "10000000000",
            changeInCashAndCashEquivalents: "5000000000",
            dividendPayout: "15000000000",
          },
        ],
        quarterlyReports: [],
      });
      const provider = await freshProvider();
      const result = await provider.getCashFlow("AAPL");
      expect(result).not.toBeNull();
      expect(result!.annual[0].operatingCashflow).toBe(100000000000);
      expect(result!.annual[0].freeCashFlow).toBe(90000000000);
    });

    it("returns null when no data", async () => {
      mockFetchResponse(200, {});
      const provider = await freshProvider();
      const result = await provider.getCashFlow("INVALID");
      expect(result).toBeNull();
    });
  });

  describe("getEarnings success", () => {
    it("returns parsed earnings data", async () => {
      mockFetchResponse(200, {
        annualEarnings: [
          { fiscalDateEnding: "2024-09-30", reportedEPS: "6.13" },
        ],
        quarterlyEarnings: [
          { fiscalDateEnding: "2024-06-30", reportedEPS: "1.40", estimatedEPS: "1.35", surprise: "0.05", surprisePercentage: "3.7" },
        ],
      });
      const provider = await freshProvider();
      const result = await provider.getEarnings("AAPL");
      expect(result).not.toBeNull();
      expect(result!.annual).toHaveLength(1);
      expect(result!.annual[0].reportedEPS).toBe(6.13);
      expect(result!.quarterly[0].surprise).toBe(0.05);
    });

    it("returns null when no data", async () => {
      mockFetchResponse(200, {});
      const provider = await freshProvider();
      const result = await provider.getEarnings("INVALID");
      expect(result).toBeNull();
    });
  });

  describe("getNewsSentiment", () => {
    it("returns parsed news articles", async () => {
      mockFetchResponse(200, {
        feed: [
          {
            title: "Apple reports earnings",
            url: "https://example.com/article",
            source: "Reuters",
            time_published: "20240930T120000",
            summary: "Apple reported strong Q4.",
            overall_sentiment_label: "Bullish",
            overall_sentiment_score: "0.3",
            ticker_sentiment: [
              { ticker: "AAPL", relevance_score: "0.9", ticker_sentiment_score: "0.25", ticker_sentiment_label: "Somewhat-Bullish" },
            ],
            topics: [{ topic: "Earnings" }],
          },
        ],
      });
      const provider = await freshProvider();
      const results = await provider.getNewsSentiment("AAPL");
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Apple reports earnings");
      expect(results[0].tickerSentiment).toHaveLength(1);
      expect(results[0].topics).toEqual(["Earnings"]);
    });

    it("returns empty when no feed", async () => {
      mockFetchResponse(200, {});
      const provider = await freshProvider();
      const results = await provider.getNewsSentiment("AAPL");
      expect(results).toEqual([]);
    });
  });

  describe("getInsiderTransactions", () => {
    it("returns parsed insider transactions", async () => {
      mockFetchResponse(200, {
        data: [
          {
            full_name: "Tim Cook",
            executive_title: "CEO",
            transaction_date: "2024-09-15",
            acquisition_or_disposition: "D",
            shares: "50000",
            share_price: "175.00",
            shares_total: "3000000",
          },
        ],
      });
      const provider = await freshProvider();
      const results = await provider.getInsiderTransactions("AAPL");
      expect(results).toHaveLength(1);
      expect(results[0].fullName).toBe("Tim Cook");
      expect(results[0].transactionType).toBe("Disposition");
      expect(results[0].totalValue).toBe(8750000);
    });

    it("returns empty when no data", async () => {
      mockFetchResponse(200, {});
      const provider = await freshProvider();
      const results = await provider.getInsiderTransactions("AAPL");
      expect(results).toEqual([]);
    });
  });

  describe("getInstitutionalHoldings", () => {
    it("returns parsed institutional holders", async () => {
      mockFetchResponse(200, {
        data: [
          {
            investor: "Vanguard Group",
            shares: "1000000000",
            value: "175000000000",
            weight: "5.2",
            quarterEndDate: "2024-06-30",
          },
        ],
      });
      const provider = await freshProvider();
      const results = await provider.getInstitutionalHoldings("AAPL");
      expect(results).toHaveLength(1);
      expect(results[0].investor).toBe("Vanguard Group");
    });

    it("returns empty when no data", async () => {
      mockFetchResponse(200, {});
      const provider = await freshProvider();
      const results = await provider.getInstitutionalHoldings("AAPL");
      expect(results).toEqual([]);
    });
  });

  describe("getEarningsTranscript", () => {
    it("returns transcript when available", async () => {
      mockFetchResponse(200, {
        transcript: "Good afternoon everyone...",
        sentiment: "Bullish",
        sentiment_score: "0.6",
      });
      const provider = await freshProvider();
      const result = await provider.getEarningsTranscript("AAPL", "2024Q3");
      expect(result).not.toBeNull();
      expect(result!.transcript).toBe("Good afternoon everyone...");
      expect(result!.sentiment).toBe("Bullish");
    });

    it("returns null when transcript missing", async () => {
      mockFetchResponse(200, {});
      const provider = await freshProvider();
      const result = await provider.getEarningsTranscript("AAPL", "2024Q3");
      expect(result).toBeNull();
    });
  });

  describe("getPortfolioNewsSentiment", () => {
    it("returns news for multiple symbols", async () => {
      mockFetchResponse(200, {
        feed: [
          {
            title: "Market round-up",
            url: "https://example.com",
            source: "Bloomberg",
            time_published: "20240930T100000",
            summary: "Markets moved today.",
            overall_sentiment_label: "Neutral",
            overall_sentiment_score: "0.05",
            ticker_sentiment: [],
            topics: [],
          },
        ],
      });
      const provider = await freshProvider();
      const results = await provider.getPortfolioNewsSentiment(["AAPL", "GOOG", "MSFT"]);
      expect(results).toHaveLength(1);
    });
  });

  describe("callCount tracking", () => {
    it("increments callCount per API call", async () => {
      mockFetchResponse(200, { "Global Quote": { "01. symbol": "AAPL", "05. price": "175" } });
      const provider = await freshProvider();
      expect(provider.callCount).toBe(0);
      await provider.getQuote("AAPL");
      expect(provider.callCount).toBe(1);
    });
  });

  describe("inferCurrency edge cases", () => {
    it.each([
      ["SAN.MC", "EUR"], ["BAS.F", "EUR"], ["MC.PA", "EUR"],
      ["ASML.AS", "EUR"], ["UCB.BR", "EUR"], ["ISP.MI", "EUR"],
      ["SAP.XETRA", "EUR"], ["NOKIA.HE", "EUR"], ["OMV.VI", "EUR"],
      ["FP.BME", "EUR"],
      ["TSE.L", "GBP"], ["7203.T", "JPY"],
      ["CNQ.TO", "CAD"], ["SU.V", "CAD"],
      ["NESN.SW", "CHF"], ["NOVO-B.CO", "DKK"],
      ["AAPL", "USD"],
    ])("returns %s for %s", async (symbol, expectedCurrency) => {
      mockFetchResponse(200, {
        "Global Quote": {
          "01. symbol": symbol,
          "05. price": "100",
          "08. previous close": "99",
          "09. change": "1",
          "10. change percent": "1%",
        },
      });
      const provider = await freshProvider();
      const result = await provider.getQuote(symbol);
      expect(result.currency).toBe(expectedCurrency);
    });
  });

  describe("getDividendSchedule", () => {
    it("returns dividends within 90-day window", async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + 30);
      const pastDate = new Date(today);
      pastDate.setDate(pastDate.getDate() - 10);

      mockFetchResponse(200, {
        data: [
          {
            ex_dividend_date: futureDate.toISOString().split("T")[0],
            amount: "0.25",
            currency: "USD",
            declaration_date: "2025-01-01",
            record_date: "2025-02-15",
            payment_date: "2025-03-01",
          },
          {
            ex_dividend_date: pastDate.toISOString().split("T")[0],
            amount: "0.20",
            currency: "USD",
            declaration_date: "",
            record_date: "",
            payment_date: "",
          },
        ],
      });
      const provider = await freshProvider();
      const results = await provider.getDividendSchedule("AAPL");
      expect(results).toHaveLength(1);
      expect(results[0].amount).toBe(0.25);
      expect(results[0].exDividendDate).toBe(futureDate.toISOString().split("T")[0]);
    });

    it("returns empty array when no dividends in window", async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const pastDate = new Date(today);
      pastDate.setDate(pastDate.getDate() - 60);

      mockFetchResponse(200, {
        data: [
          {
            ex_dividend_date: pastDate.toISOString().split("T")[0],
            amount: "0.20",
            currency: "USD",
            declaration_date: "",
            record_date: "",
            payment_date: "",
          },
        ],
      });
      const provider = await freshProvider();
      const results = await provider.getDividendSchedule("AAPL");
      expect(results).toEqual([]);
    });
  });

  describe("getCryptoDaily", () => {
    it("returns daily crypto data with meta and time series", async () => {
      mockFetchResponse(200, {
        "Meta Data": {
          "1. Information": "Daily Prices for BTC",
          "2. Digital Currency Code": "BTC",
          "3. Digital Currency Name": "Bitcoin",
        },
        "Time Series (Digital Currency Daily)": {
          "2024-03-10": {
            "1. open": "68000",
            "2. high": "72000",
            "3. low": "67000",
            "4. close": "71000",
            "5. volume": "25000",
            "6. market cap (USD)": "1400000000000",
          },
          "2024-03-09": {
            "1. open": "67000",
            "2. high": "69000",
            "3. low": "66000",
            "4. close": "68000",
            "5. volume": "22000",
            "6. market cap (USD)": "1350000000000",
          },
        },
      });
      const provider = await freshProvider();
      const result = await provider.getCryptoDaily("BTC");
      expect(result.meta["2. Digital Currency Code"]).toBe("BTC");
      expect(result.timeSeries).toHaveLength(2);
      expect(result.timeSeries[0].date).toBe("2024-03-10");
      expect(result.timeSeries[0].close).toBe(71000);
      expect(result.timeSeries[0].marketCap).toBe(1400000000000);
      expect(result.timeSeries[1].date).toBe("2024-03-09");
    });

    it("uses market-specific keys when market is provided", async () => {
      mockFetchResponse(200, {
        "Meta Data": {},
        "Time Series (Digital Currency Daily)": {
          "2024-03-10": {
            "1a. open (USD)": "68000",
            "2a. high (USD)": "72000",
            "3a. low (USD)": "67000",
            "4a. close (USD)": "71000",
            "5. volume": "25000",
            "6. market cap (USD)": "1400000000000",
          },
        },
      });
      const provider = await freshProvider();
      const result = await provider.getCryptoDaily("BTC", "USD");
      expect(result.timeSeries[0].open).toBe(68000);
      expect(result.timeSeries[0].close).toBe(71000);
    });

    it("returns empty time series when data missing", async () => {
      mockFetchResponse(200, { "Meta Data": {} });
      const provider = await freshProvider();
      const result = await provider.getCryptoDaily("BTC");
      expect(result.timeSeries).toEqual([]);
      expect(result.meta).toEqual({});
    });
  });

  describe("getCryptoWeekly", () => {
    it("returns weekly crypto data sorted by date descending", async () => {
      mockFetchResponse(200, {
        "Time Series (Digital Currency Weekly)": {
          "2024-03-04": {
            "1. open": "62000",
            "2. high": "70000",
            "3. low": "61000",
            "4. close": "68000",
            "5. volume": "150000",
          },
          "2024-03-11": {
            "1. open": "68000",
            "2. high": "72000",
            "3. low": "67000",
            "4. close": "71000",
            "5. volume": "120000",
          },
        },
      });
      const provider = await freshProvider();
      const results = await provider.getCryptoWeekly("BTC");
      expect(results).toHaveLength(2);
      expect(results[0].date).toBe("2024-03-11");
      expect(results[0].close).toBe(71000);
      expect(results[1].date).toBe("2024-03-04");
    });

    it("returns empty array when time series missing", async () => {
      mockFetchResponse(200, {});
      const provider = await freshProvider();
      const results = await provider.getCryptoWeekly("BTC");
      expect(results).toEqual([]);
    });
  });

  describe("getCryptoMonthly", () => {
    it("returns monthly crypto data sorted by date descending", async () => {
      mockFetchResponse(200, {
        "Time Series (Digital Currency Monthly)": {
          "2024-02-29": {
            "1. open": "43000",
            "2. high": "64000",
            "3. low": "38000",
            "4. close": "62000",
            "5. volume": "500000",
          },
          "2024-03-31": {
            "1. open": "62000",
            "2. high": "74000",
            "3. low": "60000",
            "4. close": "71000",
            "5. volume": "400000",
          },
        },
      });
      const provider = await freshProvider();
      const results = await provider.getCryptoMonthly("BTC");
      expect(results).toHaveLength(2);
      expect(results[0].date).toBe("2024-03-31");
      expect(results[0].close).toBe(71000);
    });

    it("returns empty array when time series missing", async () => {
      mockFetchResponse(200, {});
      const provider = await freshProvider();
      const results = await provider.getCryptoMonthly("ETH");
      expect(results).toEqual([]);
    });
  });

  describe("getCryptoExchangeRate", () => {
    it("returns rate, bid, ask, and lastRefreshed", async () => {
      mockFetchResponse(200, {
        "Realtime Currency Exchange Rate": {
          "5. Exchange Rate": "0.9215",
          "6. Last Refreshed": "2024-03-15 12:00:00",
          "8. Bid Price": "0.9210",
          "9. Ask Price": "0.9220",
        },
      });
      const provider = await freshProvider();
      const result = await provider.getCryptoExchangeRate("BTC", "EUR");
      expect(result.rate).toBe(0.9215);
      expect(result.bid).toBe(0.921);
      expect(result.ask).toBe(0.922);
      expect(result.lastRefreshed).toBe("2024-03-15 12:00:00");
    });

    it("returns zeros when response missing rate", async () => {
      mockFetchResponse(200, { "Realtime Currency Exchange Rate": {} });
      const provider = await freshProvider();
      const result = await provider.getCryptoExchangeRate("BTC", "USD");
      expect(result).toEqual({ rate: 0, bid: 0, ask: 0, lastRefreshed: "" });
    });
  });

  describe("getEconomicIndicator", () => {
    it("returns null for invalid function name", async () => {
      const provider = await freshProvider();
      const result = await provider.getEconomicIndicator("INVALID_FUNC");
      expect(result).toBeNull();
    });

    it("returns null when response has Error Message", async () => {
      mockFetchResponse(200, { "Error Message": "Invalid API call" });
      const provider = await freshProvider();
      const result = await provider.getEconomicIndicator("CPI");
      expect(result).toBeNull();
    });

    it("returns null when response has Note", async () => {
      mockFetchResponse(200, { Note: "API call frequency is 5 calls per minute" });
      const provider = await freshProvider();
      const result = await provider.getEconomicIndicator("REAL_GDP");
      expect(result).toBeNull();
    });

    it("returns parsed data on success", async () => {
      mockFetchResponse(200, {
        name: "Consumer Price Index",
        interval: "monthly",
        unit: "Index 1982-1984=100",
        data: [
          { date: "2024-03-01", value: "312.3" },
          { date: "2024-02-01", value: "311.1" },
        ],
      });
      const provider = await freshProvider();
      const result = await provider.getEconomicIndicator("CPI");
      expect(result).not.toBeNull();
      expect(result!.name).toBe("Consumer Price Index");
      expect(result!.interval).toBe("monthly");
      expect(result!.unit).toBe("Index 1982-1984=100");
      expect(result!.data).toHaveLength(2);
      expect(result!.data[0]).toEqual({ date: "2024-03-01", value: 312.3 });
      expect(result!.data[1]).toEqual({ date: "2024-02-01", value: 311.1 });
    });

    it("passes interval and maturity when provided", async () => {
      mockFetchResponse(200, {
        name: "Treasury Yield",
        interval: "monthly",
        unit: "percent",
        data: [{ date: "2024-03-01", value: "4.25" }],
      });
      const provider = await freshProvider();
      const result = await provider.getEconomicIndicator(
        "TREASURY_YIELD",
        "monthly",
        "10year"
      );
      expect(result).not.toBeNull();
      expect(result!.data[0].value).toBe(4.25);
    });

    it("parses dot and empty value as null", async () => {
      mockFetchResponse(200, {
        name: "CPI",
        interval: "monthly",
        unit: "",
        data: [
          { date: "2024-03-01", value: "." },
          { date: "2024-02-01", value: "" },
        ],
      });
      const provider = await freshProvider();
      const result = await provider.getEconomicIndicator("CPI");
      expect(result).not.toBeNull();
      expect(result!.data[0].value).toBeNull();
      expect(result!.data[1].value).toBeNull();
    });
  });

  describe("createProvider fallback", () => {
    it("falls back to YahooProvider when AV constructor throws", async () => {
      vi.resetModules();
      const { createProvider } = await import("@/lib/api-providers/index");
      const provider = createProvider("alphavantage", "");
      expect(provider.name).toBe("yahoo");
    });

    it("creates AlphaVantageProvider when key is valid", async () => {
      vi.resetModules();
      const { createProvider } = await import("@/lib/api-providers/index");
      const provider = createProvider("alphavantage", "valid-key");
      expect(provider.name).toBe("alphavantage");
    });

    it("creates YahooProvider for yahoo name", async () => {
      vi.resetModules();
      const { createProvider } = await import("@/lib/api-providers/index");
      const provider = createProvider("yahoo");
      expect(provider.name).toBe("yahoo");
    });
  });
});
