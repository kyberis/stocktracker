import { describe, expect, it } from "vitest";
import {
  isTickerExchangeCollision,
  marketDataSymbolForHolding,
  normalizeHkYahooSymbol,
  toYahooFinanceQuoteUrl,
  yahooSymbolAliases,
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

describe("yahooSymbolAliases", () => {
  it("maps Constellation Tradegate ticker to Frankfurt/Toronto", () => {
    expect(yahooSymbolAliases("W9C.DE")).toEqual(["W9C.F", "CSU.TO"]);
  });
});

describe("normalizeHkYahooSymbol", () => {
  it("zero-pads numeric Hong Kong tickers to 4 digits", () => {
    expect(normalizeHkYahooSymbol("215.HK")).toBe("0215.HK");
    expect(normalizeHkYahooSymbol("5.HK")).toBe("0005.HK");
    expect(normalizeHkYahooSymbol("0215.HK")).toBe("0215.HK");
  });

  it("leaves non-HK symbols unchanged", () => {
    expect(normalizeHkYahooSymbol("AAPL")).toBe("AAPL");
    expect(normalizeHkYahooSymbol("SAP.DE")).toBe("SAP.DE");
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

  it("pads unpadded Hong Kong tickers for Yahoo", () => {
    expect(
      marketDataSymbolForHolding({
        ticker: "215.HK",
        exchange: "HKG",
        isin: "KYG4672G1064",
      }),
    ).toBe("0215.HK");
  });
});

describe("toYahooFinanceQuoteUrl", () => {
  it("builds a quote URL from ticker + exchange", () => {
    expect(toYahooFinanceQuoteUrl("SAP", "XET")).toBe("https://finance.yahoo.com/quote/SAP.DE");
    expect(toYahooFinanceQuoteUrl("AAPL", "NASDAQ")).toBe("https://finance.yahoo.com/quote/AAPL");
  });
});

describe("yahooSymbolFromTickerExchange", () => {
  it("adds German suffix", () => {
    expect(yahooSymbolFromTickerExchange("SAP", "XET")).toBe("SAP.DE");
  });

  it("pads bare numeric HK tickers with HKG exchange", () => {
    expect(yahooSymbolFromTickerExchange("215", "HKG")).toBe("0215.HK");
    expect(yahooSymbolFromTickerExchange("215", "XHKG")).toBe("0215.HK");
  });
});
