import { describe, it, expect } from "vitest";
import { computeTagAllocations } from "./tag-allocation";
import type { Holding, CashEntry, QuoteData, ExchangeRates } from "@/lib/types";

const emptyRates: ExchangeRates = {};
const labels = {
  untagged: "Untagged",
  crypto: "Crypto",
  manual: {
    cash: "Cash",
    real_estate: "Real Estate",
    savings: "Savings",
    pension: "Pension",
    fixed_return: "Fixed return",
  },
};

function q(price: number, currency = "USD"): QuoteData {
  return {
    symbol: "X",
    shortName: "X",
    regularMarketPrice: price,
    regularMarketChange: 0,
    regularMarketChangePercent: 0,
    currency,
    regularMarketPreviousClose: price,
    fiftyTwoWeekHigh: price,
    fiftyTwoWeekLow: price,
  };
}

describe("computeTagAllocations", () => {
  it("puts untagged stock in untagged bucket", () => {
    const holdings: Holding[] = [
      {
        id: "1",
        name: "A",
        ticker: "A",
        isin: "",
        assetType: "stock",
        shares: 2,
        purchasePrice: 10,
        displayCurrency: "EUR",
        exchange: "NYSE",
        valueInEUR: 100,
      },
    ];
    const quotes: Record<string, QuoteData> = { A: q(50, "EUR") };
    const out = computeTagAllocations(holdings, [], quotes, emptyRates, "EUR", labels);
    const u = out.find((x) => x.label === "Untagged");
    expect(u).toBeDefined();
    expect(u!.percent).toBe(100);
  });

  it("splits stock value equally across two tags", () => {
    const holdings: Holding[] = [
      {
        id: "1",
        name: "A",
        ticker: "A",
        isin: "",
        assetType: "stock",
        shares: 1,
        purchasePrice: 1,
        displayCurrency: "EUR",
        exchange: "NYSE",
        valueInEUR: 100,
        tags: ["a", "b"],
      },
    ];
    const quotes: Record<string, QuoteData> = { A: q(100, "EUR") };
    const out = computeTagAllocations(holdings, [], quotes, emptyRates, "EUR", labels);
    const ta = out.find((x) => x.label === "a");
    const tb = out.find((x) => x.label === "b");
    expect(ta?.percent).toBe(50);
    expect(tb?.percent).toBe(50);
  });

  it("aggregates crypto into crypto label", () => {
    const holdings: Holding[] = [
      {
        id: "1",
        name: "BTC",
        ticker: "BTC-USD",
        isin: "",
        assetType: "crypto",
        shares: 1,
        purchasePrice: 1,
        displayCurrency: "USD",
        exchange: "CRYPTO",
        valueInEUR: 200,
      },
    ];
    const quotes: Record<string, QuoteData> = { "BTC-USD": q(100, "EUR") };
    const out = computeTagAllocations(holdings, [], quotes, emptyRates, "EUR", labels);
    expect(out.some((x) => x.label === "Crypto")).toBe(true);
  });

  it("includes cash entries as manual buckets", () => {
    const cash: CashEntry[] = [{ id: "c1", name: "Bank", amountEUR: 1000, type: "cash" }];
    const out = computeTagAllocations([], cash, {}, emptyRates, "EUR", labels);
    const c = out.find((x) => x.label === "Cash");
    expect(c?.percent).toBe(100);
  });
});
