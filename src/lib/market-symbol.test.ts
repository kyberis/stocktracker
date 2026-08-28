import { describe, expect, it } from "vitest";
import {
  isTickerExchangeCollision,
  marketDataSymbolForHolding,
  normalizeHkYahooSymbol,
  toYahooFinanceQuoteUrl,
  usShareClassSymbolAliases,
  yahooSymbolAliases,
  yahooSymbolFromTickerExchange,
  disambiguateListing,
  isListingCollisionRemap,
  knownNonUsIsinForBaseTicker,
  shouldPreserveListingAgainstFigiRename,
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

describe("usShareClassSymbolAliases", () => {
  it("maps FMP-style dotted share class to Yahoo dash form", () => {
    expect(usShareClassSymbolAliases("BRK.B")).toEqual(["BRK-B"]);
    expect(usShareClassSymbolAliases("BF.A")).toEqual(["BF-A"]);
  });

  it("maps Yahoo dash form to FMP-style dotted share class", () => {
    expect(usShareClassSymbolAliases("BRK-B")).toEqual(["BRK.B"]);
    expect(usShareClassSymbolAliases("BRK-A")).toEqual(["BRK.A"]);
  });

  it("does not rewrite venue suffixes or multi-letter classes", () => {
    expect(usShareClassSymbolAliases("SAP.DE")).toEqual([]);
    expect(usShareClassSymbolAliases("NOVO-B")).toEqual([]);
    expect(usShareClassSymbolAliases("AAPL")).toEqual([]);
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

  it("keeps exchange-suffixed tickers even when an ISIN is present", () => {
    expect(
      marketDataSymbolForHolding({
        ticker: "VWCE",
        exchange: "XET",
        isin: "IE00BK5BQT80",
      }),
    ).toBe("VWCE.DE");
  });

  it("quotes unsuffixed tickers with a non-US ISIN via ISIN, not the US namesake", () => {
    expect(
      marketDataSymbolForHolding({
        ticker: "SHOP",
        exchange: "",
        isin: "CA21037X1006",
      }),
    ).toBe("CA21037X1006");
    expect(
      marketDataSymbolForHolding({
        ticker: "SAP",
        exchange: "",
        isin: "DE0007164600",
      }),
    ).toBe("DE0007164600");
    expect(
      marketDataSymbolForHolding({
        ticker: "ITX",
        exchange: "",
        isin: "ES0148396007",
      }),
    ).toBe("ES0148396007");
  });

  it("leaves unsuffixed US listings on the ticker even when a US ISIN is stored", () => {
    expect(
      marketDataSymbolForHolding({
        ticker: "AAPL",
        exchange: "NASDAQ",
        isin: "US0378331005",
      }),
    ).toBe("AAPL");
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

describe("CoinShares BITC vs NYSE BITC namesake", () => {
  it("quotes CoinShares Physical Bitcoin by ISIN, not NYSE BITC", () => {
    expect(
      marketDataSymbolForHolding({
        ticker: "BITC",
        exchange: "",
        name: "CoinShares Physical Bitcoin",
      }),
    ).toBe("GB00BLD4ZL17");
    expect(
      marketDataSymbolForHolding({
        ticker: "BITC",
        exchange: "XET",
        isin: "GB00BLD4ZL17",
      }),
    ).toBe("GB00BLD4ZL17");
  });

  it("leaves the NYSE Bitwise ETF on the unsuffixed ticker", () => {
    expect(
      marketDataSymbolForHolding({
        ticker: "BITC",
        exchange: "NYSE",
        name: "Bitwise Bitcoin Strategy Optimum Roll ETF",
      }),
    ).toBe("BITC");
  });

  it("defaults unsuffixed BITC without a US identity to CoinShares", () => {
    expect(marketDataSymbolForHolding({ ticker: "BITC", exchange: "" })).toBe("GB00BLD4ZL17");
    expect(marketDataSymbolForHolding({ ticker: "BITC", exchange: "ARCA" })).toBe("GB00BLD4ZL17");
    expect(marketDataSymbolForHolding({ ticker: "BITC", exchange: "NYSE" })).toBe("GB00BLD4ZL17");
  });
});

describe("isTickerExchangeCollision with a missing exchange", () => {
  it("returns false instead of throwing", () => {
    expect(isTickerExchangeCollision("AAPL", undefined)).toBe(false);
    expect(isTickerExchangeCollision("AAPL", null)).toBe(false);
  });
});

describe("disambiguateListing", () => {
  it("maps CoinShares BITC to the Xetra display ticker and ISIN", () => {
    expect(
      disambiguateListing({
        ticker: "BITC",
        name: "CoinShares Physical Bitcoin",
        currency: "USD",
      }),
    ).toEqual({
      ticker: "BITC.DE",
      exchange: "XET",
      isin: "GB00BLD4ZL17",
    });
  });

  it("does not remap the US Bitwise ETF", () => {
    expect(
      disambiguateListing({
        ticker: "BITC",
        exchange: "NYSE",
        name: "Bitwise Bitcoin Strategy Optimum Roll ETF",
        currency: "USD",
      }),
    ).toEqual({
      ticker: "BITC",
      exchange: "NYSE",
      isin: "",
    });
  });

  it("defaults public /analisis/BITC and SnapTrade ARCA without ISIN to CoinShares", () => {
    expect(disambiguateListing({ ticker: "BITC" })).toEqual({
      ticker: "BITC.DE",
      exchange: "XET",
      isin: "GB00BLD4ZL17",
    });
    expect(disambiguateListing({ ticker: "BITC", exchange: "ARCA" })).toEqual({
      ticker: "BITC.DE",
      exchange: "XET",
      isin: "GB00BLD4ZL17",
    });
  });

  it("keeps a US ISIN on the unsuffixed namesake", () => {
    expect(
      disambiguateListing({
        ticker: "BITC",
        exchange: "NYSE",
        isin: "US09173C2017",
      }),
    ).toEqual({
      ticker: "BITC",
      exchange: "NYSE",
      isin: "US09173C2017",
    });
  });

  it("maps a GB ISIN even when SnapTrade sends the Bitwise namesake", () => {
    expect(
      disambiguateListing({
        ticker: "BITC",
        exchange: "ARCA",
        name: "Bitwise Trendwise Bitcoin and Treasuries Rotation Strategy ETF",
        isin: "GB00BLD4ZL17",
      }),
    ).toEqual({
      ticker: "BITC.DE",
      exchange: "XET",
      isin: "GB00BLD4ZL17",
    });
  });

  it("treats BITC → BITC.DE as a listing remap", () => {
    expect(isListingCollisionRemap("BITC", "BITC.DE")).toBe(true);
    expect(isListingCollisionRemap("AAPL", "AAPL.DE")).toBe(false);
  });
});

describe("knownNonUsIsinForBaseTicker", () => {
  it("returns the CoinShares ISIN for BITC", () => {
    expect(knownNonUsIsinForBaseTicker("BITC")).toBe("GB00BLD4ZL17");
    expect(knownNonUsIsinForBaseTicker("AAPL")).toBe("");
  });
});

describe("shouldPreserveListingAgainstFigiRename", () => {
  it("is true only for a non-US ISIN plus an unsuffixed incoming ticker", () => {
    expect(
      shouldPreserveListingAgainstFigiRename({
        existingIsin: "GB00BLD4ZL17",
        incomingTicker: "BITC",
        incomingExchange: "ARCX",
      }),
    ).toBe(true);
    expect(
      shouldPreserveListingAgainstFigiRename({
        existingIsin: "GB00BLD4ZL17",
        incomingTicker: "BITC.DE",
        incomingExchange: "XET",
      }),
    ).toBe(false);
  });
});
