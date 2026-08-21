import { describe, expect, it } from "vitest";
import { deriveHoldingsFromTransactions } from "@/lib/derive-holdings";
import type { Transaction } from "@/lib/types";

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: partial.id || "tx",
    holdingId: partial.holdingId || "",
    ticker: partial.ticker || "AAPL",
    name: partial.name || "Apple",
    exchange: partial.exchange || "NASDAQ",
    isin: partial.isin || "",
    assetType: partial.assetType || "stock",
    accountId: partial.accountId || "",
    type: partial.type || "buy",
    date: partial.date || "2026-01-01",
    shares: partial.shares ?? 1,
    pricePerShare: partial.pricePerShare ?? 100,
    totalAmount: partial.totalAmount ?? 100,
    fees: partial.fees ?? 0,
    taxes: partial.taxes ?? 0,
    currency: partial.currency || "USD",
    displayCurrency: partial.displayCurrency || "USD",
    notes: partial.notes || "",
    createdAt: partial.createdAt || "2026-01-01T00:00:00.000Z",
  };
}

describe("deriveHoldingsFromTransactions", () => {
  it("aggregates buys into one position with weighted cost basis", () => {
    const holdings = deriveHoldingsFromTransactions(
      [
        tx({ id: "1", shares: 1, totalAmount: 100, pricePerShare: 100, date: "2026-01-01" }),
        tx({ id: "2", shares: 3, totalAmount: 450, pricePerShare: 150, date: "2026-01-02" }),
      ],
      new Map()
    );
    expect(holdings).toHaveLength(1);
    expect(holdings[0].shares).toBe(4);
    expect(holdings[0].purchasePrice).toBeCloseTo(137.5, 5);
  });

  it("reduces shares and keeps average-cost basis on sell", () => {
    const holdings = deriveHoldingsFromTransactions(
      [
        tx({ id: "1", shares: 10, totalAmount: 1000, pricePerShare: 100, date: "2026-01-01" }),
        tx({ id: "2", type: "sell", shares: 4, totalAmount: 600, pricePerShare: 150, date: "2026-01-02" }),
      ],
      new Map()
    );
    expect(holdings).toHaveLength(1);
    expect(holdings[0].shares).toBe(6);
    expect(holdings[0].purchasePrice).toBeCloseTo(100, 5);
  });

  it("returns no holding when fully sold", () => {
    const holdings = deriveHoldingsFromTransactions(
      [
        tx({ id: "1", shares: 5, totalAmount: 500, date: "2026-01-01" }),
        tx({ id: "2", type: "sell", shares: 5, totalAmount: 600, date: "2026-01-02" }),
      ],
      new Map()
    );
    expect(holdings).toHaveLength(0);
  });

  it("merges CPH and OMK buys for the same Copenhagen ticker into one lot", () => {
    const holdings = deriveHoldingsFromTransactions(
      [
        tx({
          id: "1",
          ticker: "NOVO-B.CO",
          exchange: "CPH",
          shares: 50,
          totalAmount: 16000,
          pricePerShare: 320,
          currency: "DKK",
          displayCurrency: "DKK",
          date: "2025-10-01",
        }),
        tx({
          id: "2",
          ticker: "NOVO-B.CO",
          exchange: "OMK",
          shares: 52,
          totalAmount: 16800,
          pricePerShare: 323,
          currency: "DKK",
          displayCurrency: "DKK",
          date: "2025-12-01",
        }),
      ],
      new Map()
    );
    expect(holdings).toHaveLength(1);
    expect(holdings[0].shares).toBe(102);
    expect(holdings[0].exchange).toBe("OMK");
  });
});
