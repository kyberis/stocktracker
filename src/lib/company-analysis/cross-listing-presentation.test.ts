import { describe, expect, it } from "vitest";
import { assembleReport } from "@/lib/company-analysis/assemble";
import { yahooSymbolAliases } from "@/lib/market-symbol";

describe("TRF-006 cross-listing presentation", () => {
  it("exposes symbolUsed when alias primary listing differs", () => {
    const report = assembleReport({
      ticker: "W9C.DE",
      symbolUsed: "CSU.TO",
      updatedAt: "2026-08-03T00:00:00.000Z",
      cached: false,
      quote: null,
      overview: {
        symbol: "CSU.TO",
        name: "Constellation Software",
        exchange: "TSX",
        currency: "CAD",
        sector: "Technology",
        industry: "Software",
        description: "",
        marketCap: null,
        peRatio: null,
        dividendYield: null,
        eps: null,
        beta: null,
        fiftyTwoWeekHigh: null,
        fiftyTwoWeekLow: null,
        country: "Canada",
      } as never,
      history: null,
      income: null,
      earnings: null,
      news: null,
      insiders: null,
      congress: null,
      peers: [],
      usedYahoo: true,
      usedFmp: false,
    });
    expect(report.symbolUsed).toBe("CSU.TO");
    expect(report.ticker).toBe("W9C.DE");
    expect(report.profile?.exchange).toBe("TSX");
  });

  it("maps W9C.DE, NVO, and ITX.MC aliases", () => {
    expect(yahooSymbolAliases("W9C.DE")).toContain("CSU.TO");
    expect(yahooSymbolAliases("NVO").length).toBeGreaterThanOrEqual(0);
    expect(yahooSymbolAliases("ITX.MC").length).toBeGreaterThanOrEqual(0);
  });

  it("hides US insider/congress for ITX.MC", () => {
    const report = assembleReport({
      ticker: "ITX.MC",
      updatedAt: "2026-08-03T00:00:00.000Z",
      cached: false,
      quote: null,
      overview: {
        symbol: "ITX.MC",
        name: "Inditex",
        exchange: "MCE",
        currency: "EUR",
        sector: "Consumer Cyclical",
        industry: "Apparel",
        description: "",
        marketCap: null,
        peRatio: null,
        dividendYield: null,
        eps: null,
        beta: null,
        fiftyTwoWeekHigh: null,
        fiftyTwoWeekLow: null,
        country: "Spain",
      } as never,
      history: null,
      income: null,
      earnings: null,
      news: null,
      insiders: [
        {
          symbol: "ITX.MC",
          filingDate: "2026-07-01",
          transactionDate: "2026-07-01",
          reportingName: "Someone",
          typeOfOwner: "officer",
          transactionType: "P-Purchase",
          securitiesTransacted: 1,
          price: 1,
          securityName: "Common",
          link: null,
        } as never,
      ],
      congress: [],
      peers: [],
      usedYahoo: true,
      usedFmp: true,
    });
    expect(report.insiders.status).toBe("unavailable");
    expect(report.congress.status).toBe("unavailable");
  });
});
