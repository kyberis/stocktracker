import { describe, expect, it } from "vitest";
import { derivePortfolioNewsTickersFromHoldings } from "./portfolio-news-tickers";

describe("derivePortfolioNewsTickersFromHoldings", () => {
  it("keeps hyphenated EU tickers and strips exchange suffix", () => {
    const tickers = derivePortfolioNewsTickersFromHoldings([
      { ticker: "NOVO-B.CO", valueInEUR: 1000 },
      { ticker: "SAP.DE", valueInEUR: 500 },
    ]);
    expect(tickers).toContain("NOVO-B");
    expect(tickers).toContain("SAP");
  });

  it("drops ISIN-only rows but keeps other holdings", () => {
    const tickers = derivePortfolioNewsTickersFromHoldings([
      { ticker: "IE00B4L5Y983", valueInEUR: 900 },
      { ticker: "VWCE", valueInEUR: 100 },
    ]);
    expect(tickers).toEqual(["VWCE"]);
  });
});
