import { describe, it, expect, vi, beforeEach } from "vitest";

const dbMocks = vi.hoisted(() => ({
  listHoldings: vi.fn(),
  listCashEntries: vi.fn(),
  resolvePortfolioId: vi.fn(),
}));
vi.mock("@/lib/db", () => dbMocks);

const providerMocks = vi.hoisted(() => {
  const provider = {
    getQuote: vi.fn(),
    getExchangeRate: vi.fn(),
  };
  return {
    provider,
    createProvider: vi.fn(() => provider),
  };
});
vi.mock("@/lib/api-providers", () => ({ createProvider: providerMocks.createProvider }));

beforeEach(() => {
  vi.clearAllMocks();
  dbMocks.resolvePortfolioId.mockResolvedValue("pf-1");
  providerMocks.provider.getExchangeRate.mockResolvedValue(1);
});

describe("buildPortfolioSnapshot", () => {
  it("aggregates holdings into totals, top holdings and allocation", async () => {
    dbMocks.listHoldings.mockResolvedValueOnce([
      {
        id: "h1",
        name: "Apple",
        ticker: "AAPL",
        isin: "",
        assetType: "stock",
        shares: 10,
        purchasePrice: 100,
        displayCurrency: "EUR",
        exchange: "",
        valueInEUR: 0,
      },
      {
        id: "h2",
        name: "Microsoft",
        ticker: "MSFT",
        isin: "",
        assetType: "stock",
        shares: 5,
        purchasePrice: 200,
        displayCurrency: "EUR",
        exchange: "",
        valueInEUR: 0,
      },
    ]);
    dbMocks.listCashEntries.mockResolvedValueOnce([
      { id: "c1", name: "Bank", amountEUR: 500, type: "cash", displayCurrency: "EUR" },
    ]);
    providerMocks.provider.getQuote.mockImplementation(async (sym: string) => ({
      symbol: sym,
      shortName: sym,
      regularMarketPrice: sym === "AAPL" ? 110 : 220,
      regularMarketChange: 0,
      regularMarketChangePercent: 1.5,
      currency: "EUR",
      regularMarketPreviousClose: 100,
      fiftyTwoWeekHigh: 250,
      fiftyTwoWeekLow: 90,
    }));

    const { buildPortfolioSnapshot } = await import("../build-snapshot");
    const snap = await buildPortfolioSnapshot({
      userId: "u",
      portfolioId: "pf-1",
      baseCurrency: "EUR",
    });

    expect(snap.baseCurrency).toBe("EUR");
    expect(snap.holdingsCount).toBe(2);
    // 10*110 + 5*220 = 2200 stocks; cash 500. Total ~2700 EUR.
    expect(snap.totals.value).toBeGreaterThan(2500);
    expect(snap.topHoldings.map((h) => h.ticker).sort()).toEqual(["AAPL", "MSFT"]);
    expect(snap.cashSummary.EUR).toBe(500);
    // Allocation has at least Stocks + Cash buckets.
    expect(snap.allocation.length).toBeGreaterThan(0);
    const stockBucket = snap.allocation.find((a) => /stock/i.test(a.type));
    expect(stockBucket).toBeDefined();
  });

  it("returns per-holding price/cost in the holding's display currency, not the quote currency (LSE GBp/GBP regression)", async () => {
    // Yahoo returns LSE prices in GBp (pence). The user stores the holding
    // as GBP. Warren's snapshot must quote `purchasePrice`, `currentPrice`,
    // and `currency` in the same unit, otherwise the AI reports avg cost as
    // "45 GBp" or computes a 100x-wrong gain.
    dbMocks.listHoldings.mockResolvedValueOnce([
      {
        id: "h-ulvr",
        name: "Unilever",
        ticker: "ULVR",
        isin: "",
        assetType: "stock",
        shares: 10,
        purchasePrice: 45, // GBP per share (display currency)
        displayCurrency: "GBP",
        exchange: "LSE",
        valueInEUR: 0,
      },
    ]);
    dbMocks.listCashEntries.mockResolvedValueOnce([]);
    providerMocks.provider.getQuote.mockImplementation(async () => ({
      symbol: "ULVR",
      shortName: "Unilever",
      regularMarketPrice: 5000, // 50 GBP expressed as 5000 GBp
      regularMarketChange: 0,
      regularMarketChangePercent: 0,
      currency: "GBp",
      regularMarketPreviousClose: 5000,
      fiftyTwoWeekHigh: 6000,
      fiftyTwoWeekLow: 4000,
    }));
    // Rate convention: `getExchangeRate("EUR", "GBP")` returns "1 EUR = 0.87 GBP".
    // The snapshot must request rates in this shape so `convertToEUR` /
    // `convertCurrency` can find them under the `EUR<CCY>` key.
    providerMocks.provider.getExchangeRate.mockImplementation(
      async (from: string, to: string) => {
        if (from === "EUR" && to === "GBP") return 0.87;
        return 1;
      },
    );

    const { buildPortfolioSnapshot } = await import("../build-snapshot");
    const snap = await buildPortfolioSnapshot({
      userId: "u",
      portfolioId: "pf-1",
      baseCurrency: "EUR",
    });

    const row = snap.topHoldings.find((h) => h.ticker === "ULVR")!;
    expect(row).toBeDefined();
    // All per-share fields share the holding's display currency.
    expect(row.currency).toBe("GBP");
    expect(row.purchasePrice).toBe(45);
    expect(row.currentPrice).toBeCloseTo(50, 1);
    expect(row.fiftyTwoWeekHigh).toBeCloseTo(60, 1);
    expect(row.fiftyTwoWeekLow).toBeCloseTo(40, 1);
    // Gain ≈ (50 - 45) / 45 ≈ 11.11%, NOT the ~10000% the old buggy
    // mixed-units calc produced.
    expect(row.totalGainPct).toBeGreaterThan(10);
    expect(row.totalGainPct).toBeLessThan(15);
  });

  it("applies FX so totals.cost and totals.value reflect EUR for a non-EUR holding", async () => {
    // Regression for a long-standing bug where Warren's snapshot built FX
    // pairs as `<CCY>EUR` while convertToEUR/convertCurrency look them up
    // under `EUR<CCY>` — so non-EUR holdings silently kept their local
    // amounts and the AI's totals diverged from the web's totals.
    dbMocks.listHoldings.mockResolvedValueOnce([
      {
        id: "h-aapl",
        name: "Apple",
        ticker: "AAPL",
        isin: "",
        assetType: "stock",
        shares: 10,
        purchasePrice: 100, // USD per share
        displayCurrency: "USD",
        exchange: "NASDAQ",
        valueInEUR: 0,
      },
    ]);
    dbMocks.listCashEntries.mockResolvedValueOnce([]);
    providerMocks.provider.getQuote.mockImplementation(async () => ({
      symbol: "AAPL",
      shortName: "Apple",
      regularMarketPrice: 110,
      regularMarketChange: 0,
      regularMarketChangePercent: 0,
      currency: "USD",
      regularMarketPreviousClose: 110,
      fiftyTwoWeekHigh: 0,
      fiftyTwoWeekLow: 0,
    }));
    providerMocks.provider.getExchangeRate.mockImplementation(
      async (from: string, to: string) => {
        if (from === "EUR" && to === "USD") return 1.1; // 1 EUR = 1.1 USD
        return 1;
      },
    );

    const { buildPortfolioSnapshot } = await import("../build-snapshot");
    const snap = await buildPortfolioSnapshot({
      userId: "u",
      portfolioId: "pf-1",
      baseCurrency: "EUR",
    });

    // Cost = 10 × 100 USD = 1000 USD = 1000 / 1.1 ≈ 909.09 EUR
    expect(snap.totals.cost).toBeCloseTo(909.09, 1);
    // Value = 10 × 110 USD = 1100 USD = 1100 / 1.1 = 1000 EUR
    expect(snap.totals.value).toBeCloseTo(1000, 1);
  });

  it("keeps USD/USD holdings unchanged (no currency drift)", async () => {
    dbMocks.listHoldings.mockResolvedValueOnce([
      {
        id: "h-aapl",
        name: "Apple",
        ticker: "AAPL",
        isin: "",
        assetType: "stock",
        shares: 10,
        purchasePrice: 150,
        displayCurrency: "USD",
        exchange: "NASDAQ",
        valueInEUR: 0,
      },
    ]);
    dbMocks.listCashEntries.mockResolvedValueOnce([]);
    providerMocks.provider.getQuote.mockImplementation(async () => ({
      symbol: "AAPL",
      shortName: "Apple",
      regularMarketPrice: 180,
      regularMarketChange: 0,
      regularMarketChangePercent: 0,
      currency: "USD",
      regularMarketPreviousClose: 180,
      fiftyTwoWeekHigh: 200,
      fiftyTwoWeekLow: 120,
    }));

    const { buildPortfolioSnapshot } = await import("../build-snapshot");
    const snap = await buildPortfolioSnapshot({
      userId: "u",
      portfolioId: "pf-1",
      baseCurrency: "EUR",
    });

    const row = snap.topHoldings.find((h) => h.ticker === "AAPL")!;
    expect(row.currency).toBe("USD");
    expect(row.purchasePrice).toBe(150);
    expect(row.currentPrice).toBeCloseTo(180, 4);
    expect(row.totalGainPct).toBeCloseTo(20, 1);
  });

  it("tolerates a quote provider failure for a single ticker", async () => {
    dbMocks.listHoldings.mockResolvedValueOnce([
      {
        id: "h1",
        ticker: "AAPL",
        name: "Apple",
        isin: "",
        assetType: "stock",
        shares: 10,
        purchasePrice: 100,
        displayCurrency: "EUR",
        exchange: "",
        valueInEUR: 0,
      },
      {
        id: "h2",
        ticker: "BROKEN",
        name: "Broken",
        isin: "",
        assetType: "stock",
        shares: 1,
        purchasePrice: 50,
        displayCurrency: "EUR",
        exchange: "",
        valueInEUR: 0,
      },
    ]);
    dbMocks.listCashEntries.mockResolvedValueOnce([]);
    providerMocks.provider.getQuote.mockImplementation(async (sym: string) => {
      if (sym === "BROKEN") throw new Error("provider down");
      return {
        symbol: sym,
        shortName: sym,
        regularMarketPrice: 110,
        regularMarketChange: 0,
        regularMarketChangePercent: 0,
        currency: "EUR",
        regularMarketPreviousClose: 110,
        fiftyTwoWeekHigh: 0,
        fiftyTwoWeekLow: 0,
      };
    });

    const { buildPortfolioSnapshot } = await import("../build-snapshot");
    const snap = await buildPortfolioSnapshot({ userId: "u", portfolioId: "pf-1" });
    // BROKEN falls back to purchasePrice, snapshot still builds.
    expect(snap.holdingsCount).toBe(2);
    expect(snap.topHoldings).toHaveLength(2);
  });
});
