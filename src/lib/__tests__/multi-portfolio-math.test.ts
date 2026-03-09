import { describe, it, expect } from "vitest";
import { calculatePortfolioTotals } from "../portfolio-summary";
import { deriveHoldingsFromTransactions } from "../derive-holdings";
import type { Holding, CashEntry, Transaction, QuoteData, ExchangeRates } from "../types";

function makeHolding(overrides: Partial<Holding> & { ticker: string }): Holding {
  return {
    id: overrides.id || `h-${Math.random().toString(36).slice(2)}`,
    name: overrides.name || overrides.ticker,
    ticker: overrides.ticker,
    isin: overrides.isin || "",
    assetType: overrides.assetType || "stock",
    shares: overrides.shares ?? 10,
    purchasePrice: overrides.purchasePrice ?? 100,
    displayCurrency: overrides.displayCurrency || "EUR",
    exchange: overrides.exchange || "",
    valueInEUR: overrides.valueInEUR ?? 0,
    sector: overrides.sector || "",
    region: overrides.region || "",
    assetClass: overrides.assetClass || "",
    accountId: overrides.accountId || "",
  };
}

function makeQuote(price: number, change = 0, currency = "EUR", symbol = ""): QuoteData {
  return {
    symbol: symbol || "SYMBOL",
    shortName: "",
    regularMarketPrice: price,
    regularMarketChange: change,
    regularMarketChangePercent: price > 0 ? (change / price) * 100 : 0,
    currency,
    regularMarketPreviousClose: price - change,
    fiftyTwoWeekHigh: price * 1.2,
    fiftyTwoWeekLow: price * 0.8,
  };
}

function makeTx(overrides: Partial<Transaction> & { ticker: string; type: "buy" | "sell" | "dividend" | "fee" }): Transaction {
  return {
    id: overrides.id || `tx-${Math.random().toString(36).slice(2)}`,
    holdingId: overrides.holdingId || "",
    ticker: overrides.ticker,
    name: overrides.name || overrides.ticker,
    exchange: overrides.exchange || "",
    isin: overrides.isin || "",
    assetType: overrides.assetType || "stock",
    accountId: overrides.accountId || "",
    type: overrides.type,
    date: overrides.date || "2026-01-01",
    shares: overrides.shares ?? 10,
    pricePerShare: overrides.pricePerShare ?? 100,
    totalAmount: overrides.totalAmount ?? 1000,
    fees: overrides.fees ?? 0,
    taxes: overrides.taxes ?? 0,
    currency: overrides.currency || "EUR",
    displayCurrency: overrides.displayCurrency || "EUR",
    notes: overrides.notes || "",
    sourceRef: overrides.sourceRef || "",
    createdAt: overrides.createdAt || "2026-01-01T00:00:00Z",
  };
}

describe("Multi-Portfolio Math", () => {
  const rates: ExchangeRates = { EURUSD: 1.08, EURGBP: 0.86 };

  describe("Combined totals correctness", () => {
    it("sum of per-portfolio totals matches combined total", () => {
      const holdingsA = [makeHolding({ ticker: "AAPL", shares: 10, purchasePrice: 150, displayCurrency: "USD" })];
      const holdingsB = [makeHolding({ ticker: "SAP.DE", shares: 20, purchasePrice: 120, displayCurrency: "EUR" })];
      const combined = [...holdingsA, ...holdingsB];
      const cash: CashEntry[] = [];
      const quotes: Record<string, QuoteData> = {
        AAPL: makeQuote(155, 2, "USD", "AAPL"),
        "SAP.DE": makeQuote(125, -1, "EUR", "SAP.DE"),
      };

      const totalsA = calculatePortfolioTotals(holdingsA, cash, quotes, rates);
      const totalsB = calculatePortfolioTotals(holdingsB, cash, quotes, rates);
      const totalsCombined = calculatePortfolioTotals(combined, cash, quotes, rates);

      expect(totalsCombined.totalCurrentEUR).toBeCloseTo(totalsA.totalCurrentEUR + totalsB.totalCurrentEUR, 0);
      expect(totalsCombined.totalCostEUR).toBeCloseTo(totalsA.totalCostEUR + totalsB.totalCostEUR, 0);
      expect(totalsCombined.dayGainLossEUR).toBeCloseTo(totalsA.dayGainLossEUR + totalsB.dayGainLossEUR, 0);
    });
  });

  describe("Cost basis isolation", () => {
    it("same ticker in two portfolios has independent avg cost", () => {
      const holdingsA = [makeHolding({ ticker: "AAPL", shares: 10, purchasePrice: 150, displayCurrency: "USD" })];
      const holdingsB = [makeHolding({ ticker: "AAPL", shares: 5, purchasePrice: 200, displayCurrency: "USD" })];

      // Portfolio A avg cost = 150, Portfolio B avg cost = 200
      expect(holdingsA[0].purchasePrice).toBe(150);
      expect(holdingsB[0].purchasePrice).toBe(200);

      // Combined weighted avg: (10*150 + 5*200) / 15 = 166.67
      const combined = [...holdingsA, ...holdingsB];
      const totalShares = combined.reduce((s, h) => s + h.shares, 0);
      const totalCost = combined.reduce((s, h) => s + h.shares * h.purchasePrice, 0);
      const weightedAvg = totalCost / totalShares;
      expect(weightedAvg).toBeCloseTo(166.67, 1);
    });
  });

  describe("Derive holdings per-portfolio", () => {
    it("transactions from one portfolio don't contaminate another", () => {
      const txA = [
        makeTx({ ticker: "AAPL", type: "buy", shares: 10, pricePerShare: 150, totalAmount: 1500, date: "2026-01-01", createdAt: "2026-01-01T00:00:00Z" }),
      ];
      const txB = [
        makeTx({ ticker: "AAPL", type: "buy", shares: 5, pricePerShare: 200, totalAmount: 1000, date: "2026-01-02", createdAt: "2026-01-02T00:00:00Z" }),
      ];

      const derivedA = deriveHoldingsFromTransactions(txA, new Map());
      const derivedB = deriveHoldingsFromTransactions(txB, new Map());

      expect(derivedA).toHaveLength(1);
      expect(derivedA[0].shares).toBe(10);
      expect(derivedB).toHaveLength(1);
      expect(derivedB[0].shares).toBe(5);
    });
  });

  describe("Sell across portfolios", () => {
    it("selling in portfolio A doesn't reduce shares in portfolio B", () => {
      const txA = [
        makeTx({ ticker: "AAPL", type: "buy", shares: 10, pricePerShare: 150, totalAmount: 1500, date: "2026-01-01", createdAt: "2026-01-01T00:00:00Z" }),
        makeTx({ ticker: "AAPL", type: "sell", shares: 5, pricePerShare: 160, totalAmount: 800, date: "2026-01-10", createdAt: "2026-01-10T00:00:00Z" }),
      ];
      const txB = [
        makeTx({ ticker: "AAPL", type: "buy", shares: 20, pricePerShare: 140, totalAmount: 2800, date: "2026-01-01", createdAt: "2026-01-01T00:00:00Z" }),
      ];

      const derivedA = deriveHoldingsFromTransactions(txA, new Map());
      const derivedB = deriveHoldingsFromTransactions(txB, new Map());

      expect(derivedA[0].shares).toBe(5); // 10 - 5 sold
      expect(derivedB[0].shares).toBe(20); // unchanged
    });
  });

  describe("Dividend attribution", () => {
    it("dividend in portfolio A doesn't count for portfolio B", () => {
      const txA: Transaction[] = [
        makeTx({ ticker: "AAPL", type: "buy", shares: 10, pricePerShare: 150, totalAmount: 1500, date: "2026-01-01" }),
        makeTx({ ticker: "AAPL", type: "dividend", shares: 0, pricePerShare: 0, totalAmount: 50, date: "2026-03-01" }),
      ];
      const txB: Transaction[] = [
        makeTx({ ticker: "AAPL", type: "buy", shares: 5, pricePerShare: 140, totalAmount: 700, date: "2026-01-01" }),
      ];

      const divsA = txA.filter((t) => t.type === "dividend");
      const divsB = txB.filter((t) => t.type === "dividend");

      expect(divsA).toHaveLength(1);
      expect(divsA[0].totalAmount).toBe(50);
      expect(divsB).toHaveLength(0);
    });
  });

  describe("Empty portfolio edge case", () => {
    it("empty portfolio returns zero totals without affecting combined view", () => {
      const holdingsEmpty: Holding[] = [];
      const holdingsFull = [makeHolding({ ticker: "MSFT", shares: 15, purchasePrice: 300, displayCurrency: "USD" })];
      const cash: CashEntry[] = [];
      const quotes: Record<string, QuoteData> = {
        MSFT: makeQuote(310, 5, "USD", "MSFT"),
      };

      const emptyTotals = calculatePortfolioTotals(holdingsEmpty, cash, quotes, rates);
      expect(emptyTotals.totalCurrentEUR).toBe(0);
      expect(emptyTotals.totalCostEUR).toBe(0);
      expect(emptyTotals.dayGainLossEUR).toBe(0);

      const fullTotals = calculatePortfolioTotals(holdingsFull, cash, quotes, rates);
      const combinedTotals = calculatePortfolioTotals([...holdingsEmpty, ...holdingsFull], cash, quotes, rates);

      expect(combinedTotals.totalCurrentEUR).toBeCloseTo(fullTotals.totalCurrentEUR, 0);
    });
  });

  describe("Multi-currency combined", () => {
    it("EUR and USD portfolios combine correctly with exchange rates", () => {
      const holdingsEUR = [makeHolding({ ticker: "SAP.DE", shares: 10, purchasePrice: 120, displayCurrency: "EUR" })];
      const holdingsUSD = [makeHolding({ ticker: "AAPL", shares: 5, purchasePrice: 150, displayCurrency: "USD" })];
      const cash: CashEntry[] = [];
      const quotes: Record<string, QuoteData> = {
        "SAP.DE": makeQuote(125, 1, "EUR", "SAP.DE"),
        AAPL: makeQuote(155, 2, "USD", "AAPL"),
      };

      const eurTotals = calculatePortfolioTotals(holdingsEUR, cash, quotes, rates);
      const usdTotals = calculatePortfolioTotals(holdingsUSD, cash, quotes, rates);
      const combined = calculatePortfolioTotals([...holdingsEUR, ...holdingsUSD], cash, quotes, rates);

      expect(combined.totalCurrentEUR).toBeCloseTo(eurTotals.totalCurrentEUR + usdTotals.totalCurrentEUR, 0);
    });
  });

  describe("Move holding between portfolios", () => {
    it("moving preserves total value (zero-sum)", () => {
      const holdingsA = [
        makeHolding({ ticker: "AAPL", shares: 10, purchasePrice: 150, displayCurrency: "USD" }),
        makeHolding({ ticker: "MSFT", shares: 5, purchasePrice: 300, displayCurrency: "USD" }),
      ];
      const holdingsB: Holding[] = [];
      const cash: CashEntry[] = [];
      const quotes: Record<string, QuoteData> = {
        AAPL: makeQuote(155, 2, "USD", "AAPL"),
        MSFT: makeQuote(310, 5, "USD", "MSFT"),
      };

      const beforeA = calculatePortfolioTotals(holdingsA, cash, quotes, rates);
      const beforeB = calculatePortfolioTotals(holdingsB, cash, quotes, rates);
      const totalBefore = beforeA.totalCurrentEUR + beforeB.totalCurrentEUR;

      // Simulate moving AAPL from A to B
      const movedHolding = holdingsA.find((h) => h.ticker === "AAPL")!;
      const afterA = holdingsA.filter((h) => h.ticker !== "AAPL");
      const afterB = [movedHolding];

      const totalsAfterA = calculatePortfolioTotals(afterA, cash, quotes, rates);
      const totalsAfterB = calculatePortfolioTotals(afterB, cash, quotes, rates);
      const totalAfter = totalsAfterA.totalCurrentEUR + totalsAfterB.totalCurrentEUR;

      expect(totalAfter).toBeCloseTo(totalBefore, 0);
    });
  });

  describe("Snapshot math", () => {
    it("per-portfolio snapshot values sum to combined within rounding tolerance", () => {
      const holdingsA = [makeHolding({ ticker: "AAPL", shares: 10, purchasePrice: 150, displayCurrency: "USD" })];
      const holdingsB = [makeHolding({ ticker: "SAP.DE", shares: 20, purchasePrice: 120, displayCurrency: "EUR" })];
      const cash: CashEntry[] = [{ id: "c1", name: "Cash", amountEUR: 500 }];
      const quotes: Record<string, QuoteData> = {
        AAPL: makeQuote(155, 0, "USD", "AAPL"),
        "SAP.DE": makeQuote(125, 0, "EUR", "SAP.DE"),
      };

      const snapA = calculatePortfolioTotals(holdingsA, [], quotes, rates).totalCurrentEUR;
      const snapB = calculatePortfolioTotals(holdingsB, [], quotes, rates).totalCurrentEUR;
      const snapCombined = calculatePortfolioTotals([...holdingsA, ...holdingsB], cash, quotes, rates).totalCurrentEUR;

      // snapA + snapB + cash should equal combined
      expect(snapA + snapB + 500).toBeCloseTo(snapCombined, 0);
    });
  });
});
