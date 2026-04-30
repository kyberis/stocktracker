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
