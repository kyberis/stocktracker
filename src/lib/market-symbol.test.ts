import { describe, expect, it } from "vitest";
import {
  isTickerExchangeCollision,
  marketDataSymbolForHolding,
  yahooSymbolFromTickerExchange,
} from "./market-symbol";

describe("isTickerExchangeCollision", () => {
  it("detects TDG venue stored as symbol", () => {
    expect(isTickerExchangeCollision("TDG", "TDG")).toBe(true);
    expect(isTickerExchangeCollision("TDG.DE", "TDG")).toBe(true);
  });

  it("does not flag valid tickers", () => {
    expect(isTickerExchangeCollision("VWCE", "XET")).toBe(false);
    expect(isTickerExchangeCollision("VWCE.DE", "XET")).toBe(false);
  });
});

describe("marketDataSymbolForHolding", () => {
  it("uses ISIN when ticker is the exchange code", () => {
    expect(
      marketDataSymbolForHolding({
        ticker: "TDG.DE",
        exchange: "TDG",
        isin: "IE00BK5BQT80",
      }),
    ).toBe("IE00BK5BQT80");
  });

  it("keeps normal tickers", () => {
    expect(
      marketDataSymbolForHolding({
        ticker: "VWCE",
        exchange: "XET",
        isin: "IE00BK5BQT80",
      }),
    ).toBe("VWCE.DE");
  });
});

describe("yahooSymbolFromTickerExchange", () => {
  it("adds German suffix", () => {
    expect(yahooSymbolFromTickerExchange("SAP", "XET")).toBe("SAP.DE");
  });
});
