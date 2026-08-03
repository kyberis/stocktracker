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

  it("maps bare European / HK news bases to Yahoo venues", () => {
    expect(yahooSymbolAliases("W9C")).toEqual(["W9C.DE", "W9C.F", "CSU.TO"]);
    expect(yahooSymbolAliases("NOVO-B")).toEqual(["NOVO-B.CO", "NVO"]);
    expect(yahooSymbolAliases("NA9")).toEqual(["NA9.DE", "NA9.F"]);
    expect(yahooSymbolAliases("215")).toEqual(["0215.HK"]);
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

  it("does not throw when exchange is missing (holding created before exchange resolution)", () => {
    expect(yahooSymbolFromTickerExchange("AAPL", undefined)).toBe("AAPL");
    expect(yahooSymbolFromTickerExchange("AAPL", null)).toBe("AAPL");
    expect(yahooSymbolFromTickerExchange("AAPL", "")).toBe("AAPL");
  });
});

describe("marketDataSymbolForHolding with a missing exchange", () => {
  // Regression: fetchProviderQuotesForHoldings (holding-quotes.ts) calls this
  // for every AID/Home quote lookup — a holding without an exchange yet
  // (e.g. mid-import) crashed the whole batch with "Cannot read properties
  // of undefined (reading 'trim')" instead of degrading that one symbol.
  it("falls back to the bare ticker instead of throwing", () => {
    expect(marketDataSymbolForHolding({ ticker: "AAPL", exchange: undefined })).toBe("AAPL");
    expect(marketDataSymbolForHolding({ ticker: "AAPL", exchange: null })).toBe("AAPL");
  });
});

describe("isTickerExchangeCollision with a missing exchange", () => {
  it("returns false instead of throwing", () => {
    expect(isTickerExchangeCollision("AAPL", undefined)).toBe(false);
    expect(isTickerExchangeCollision("AAPL", null)).toBe(false);
  });
});
