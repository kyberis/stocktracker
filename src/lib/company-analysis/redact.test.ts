import { describe, expect, it } from "vitest";
import { redactPaidSections } from "./redact";
import type { CompanyAnalysisReport } from "./types";

function reportWithPaidSections(): CompanyAnalysisReport {
  return {
    ticker: "AAPL",
    generatedAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
    cached: true,
    quote: {
      price: 1,
      change: 0,
      changePercent: 0,
      dayHigh: 1,
      dayLow: 1,
      marketCap: 1,
      fiftyTwoWeekHigh: 1,
      fiftyTwoWeekLow: 1,
      ma50: 1,
      ma200: 1,
      currency: "USD",
    },
    profile: {
      name: "Apple",
      sector: "Tech",
      industry: "Hardware",
      description: "",
      exchange: "NASDAQ",
      ipoDate: null,
    },
    fundamentals: {
      status: "ok",
      lastQuarterLabel: "Q1",
      lastReportDate: null,
      rows: [],
      nextQuarterLabel: null,
      nextReportDate: null,
      companyGuidanceRevenue: null,
      companyGuidanceRevenueVarPct: null,
      companyGuidanceSourceUrl: null,
      consensusRevenue: null,
      consensusRevenueVarPct: null,
      consensusEps: null,
      consensusEpsVarPct: null,
      lastEps: null,
      lastEpsVsConsensusPct: null,
      lastEpsSourceUrl: null,
      lastRevenue: null,
      lastRevenueYoyPct: null,
    },
    technicals: {
      status: "ok",
      closeHigh12m: null,
      closeHigh12mDate: null,
      distanceToCloseHigh12mPct: null,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow: null,
      ma50: null,
      ma200: null,
      support: null,
      resistance: null,
      latestVolume: null,
      avgVolume: null,
      nextCatalystDate: null,
    },
    news: { status: "ok", items: [] },
    insiders: {
      status: "ok",
      items: [
        {
          name: "CEO",
          role: "CEO",
          date: "2026-01-01",
          transactionType: "Buy",
          tag: "tag-buy",
          detail: "",
          shares: 1,
          price: 1,
          url: null,
        },
      ],
    },
    congress: {
      status: "ok",
      items: [
        {
          name: "Sen. X",
          chamber: "senate",
          officeOrDistrict: "CA",
          date: "2026-01-01",
          transactionType: "Purchase",
          amountRange: null,
          url: null,
        },
      ],
    },
    alternative: {
      status: "unavailable",
      ticker: null,
      name: null,
      tagline: null,
      why: null,
      distanceTo52wHighPct: null,
      price: null,
      peersConsidered: [],
    },
    sources: [],
  };
}

describe("redactPaidSections", () => {
  it("locks Congress and insiders without mutating the cached report", () => {
    const original = reportWithPaidSections();
    const redacted = redactPaidSections(original);

    expect(redacted.congress).toEqual({ status: "locked", items: [] });
    expect(redacted.insiders).toEqual({ status: "locked", items: [] });
    expect(original.congress.status).toBe("ok");
    expect(original.congress.items).toHaveLength(1);
    expect(original.insiders.status).toBe("ok");
  });
});
