import { describe, expect, it } from "vitest";
import { providerQuotesToQuoteMap } from "./quotes-map";
import type { ProviderQuoteResult } from "@/lib/api-providers/types";

function quote(overrides: Partial<ProviderQuoteResult> = {}): ProviderQuoteResult {
  return {
    symbol: "AAPL",
    shortName: "Apple",
    regularMarketPrice: 150,
    regularMarketChange: 2,
    regularMarketChangePercent: 1.3,
    currency: "USD",
    regularMarketPreviousClose: 148,
    fiftyTwoWeekHigh: 180,
    fiftyTwoWeekLow: 120,
    marketCap: 1,
    ...overrides,
  };
}

describe("providerQuotesToQuoteMap", () => {
  it("copies regularMarketTime onto QuoteData", () => {
    const tradedAt = Date.parse("2026-08-14T20:00:00Z");
    const map = providerQuotesToQuoteMap({ AAPL: quote({ regularMarketTime: tradedAt }) });
    expect(map.AAPL.regularMarketTime).toBe(tradedAt);
  });
});
