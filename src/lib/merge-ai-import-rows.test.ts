import { describe, it, expect } from "vitest";
import { mergeHoldingsIntoTransactions } from "./merge-ai-import-rows";
import type { ExtractedHolding, ExtractedTransaction } from "@/hooks/import-types";

describe("mergeHoldingsIntoTransactions", () => {
  const bond: ExtractedHolding = {
    name: "Italy BTP",
    ticker: "IT0003934657",
    shares: 30_000,
    purchasePrice: 99.6,
    displayCurrency: "EUR",
    exchange: "",
    assetType: "stock",
  };

  const stockTx: ExtractedTransaction = {
    date: "2024-01-15",
    type: "buy",
    ticker: "AAPL",
    name: "Apple",
    shares: 10,
    pricePerShare: 180,
    totalAmount: 1800,
    fees: 0,
    currency: "USD",
  };

  it("uses only holdings when transactions empty", () => {
    const out = mergeHoldingsIntoTransactions([bond], []);
    expect(out).toHaveLength(1);
    expect(out[0].ticker).toBe("IT0003934657");
    expect(out[0].type).toBe("buy");
  });

  it("merges holdings not present in transactions", () => {
    const out = mergeHoldingsIntoTransactions([bond], [stockTx]);
    expect(out).toHaveLength(2);
    expect(out.map((t) => t.ticker).sort()).toEqual(["AAPL", "IT0003934657"]);
  });

  it("skips holdings whose ticker already appears in transactions", () => {
    const dup: ExtractedTransaction = {
      date: "2024-02-01",
      type: "buy",
      ticker: "IT0003934657",
      name: "Italy BTP",
      shares: 30_000,
      pricePerShare: 99.6,
      totalAmount: 30_000 * 99.6,
      fees: 0,
      currency: "EUR",
    };
    const out = mergeHoldingsIntoTransactions([bond], [dup]);
    expect(out).toHaveLength(1);
    expect(out[0].ticker).toBe("IT0003934657");
  });
});
