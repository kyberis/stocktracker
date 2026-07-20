import { describe, expect, it } from "vitest";
import {
  findNarrativeGaps,
  findReportGaps,
  mergeNarrativeFill,
  mergeReportFill,
  shouldRetryNarrativeGaps,
  NARRATIVE_GAP_RETRY_MS,
} from "./gaps";
import type { CompanyAnalysisReport } from "./types";

function baseReport(overrides: Partial<CompanyAnalysisReport> = {}): CompanyAnalysisReport {
  return {
    ticker: "MCD",
    generatedAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    cached: true,
    quote: { price: 100, change: 1, changePercent: 1, dayHigh: 101, dayLow: 99, marketCap: 1e9, fiftyTwoWeekHigh: 120, fiftyTwoWeekLow: 80, ma50: 95, ma200: 90, currency: "USD" },
    profile: { name: "McDonald's", sector: "Consumer", industry: "Restaurants", description: "QSR", exchange: "NYSE", ipoDate: null },
    fundamentals: {
      status: "ok",
      lastQuarterLabel: "Q1",
      lastReportDate: "2026-01-01",
      rows: [{ label: "eps", value: 2.5, yoyPct: 5, unit: "eps" }],
      nextQuarterLabel: "Q2",
      nextReportDate: "2026-04-01",
      companyGuidanceRevenue: null,
      companyGuidanceRevenueVarPct: null,
      companyGuidanceSourceUrl: null,
      consensusRevenue: 6e9,
      consensusRevenueVarPct: 3,
      consensusEps: 2.6,
      consensusEpsVarPct: 2,
      lastEps: 2.5,
      lastEpsVsConsensusPct: 1,
      lastEpsSourceUrl: null,
      lastRevenue: 5e9,
      lastRevenueYoyPct: 4,
    },
    technicals: {
      status: "ok",
      closeHigh12m: 120,
      closeHigh12mDate: "2026-01-01",
      distanceToCloseHigh12mPct: -10,
      fiftyTwoWeekHigh: 120,
      fiftyTwoWeekLow: 80,
      ma50: 95,
      ma200: 90,
      support: 90,
      resistance: 110,
      latestVolume: 1e6,
      avgVolume: 1e6,
      nextCatalystDate: null,
    },
    news: { status: "ok", items: [] },
    insiders: { status: "ok", items: [] },
    congress: { status: "ok", items: [] },
    alternative: {
      status: "ok",
      ticker: "YUM",
      name: "Yum",
      tagline: null,
      why: null,
      distanceTo52wHighPct: -5,
      price: 140,
      peersConsidered: [],
    },
    sources: [{ name: "yahoo", url: "https://finance.yahoo.com" }],
    ...overrides,
  };
}

describe("findReportGaps", () => {
  it("returns empty when report is complete", () => {
    expect(findReportGaps(baseReport())).toEqual([]);
  });

  it("flags unavailable congress/insiders/news and missing EPS", () => {
    const report = baseReport({
      congress: { status: "unavailable", items: [] },
      insiders: { status: "unavailable", items: [] },
      news: { status: "unavailable", items: [] },
      fundamentals: {
        ...baseReport().fundamentals,
        lastEps: null,
        consensusEps: null,
        consensusRevenue: null,
        nextReportDate: null,
      },
    });
    const gaps = findReportGaps(report);
    expect(gaps).toContain("congress");
    expect(gaps).toContain("insiders");
    expect(gaps).toContain("news");
    expect(gaps).toContain("earnings");
    expect(gaps).toContain("nextQuarter");
  });
});

describe("mergeReportFill", () => {
  it("fills unavailable sections without wiping good data", () => {
    const base = baseReport({
      congress: { status: "unavailable", items: [] },
      fundamentals: { ...baseReport().fundamentals, lastEps: null },
    });
    const fill = baseReport({
      congress: {
        status: "ok",
        items: [
          {
            name: "Sen. X",
            chamber: "senate",
            officeOrDistrict: "CA",
            date: "2026-01-01",
            transactionType: "Purchase",
            amountRange: "$1-15k",
            url: null,
          },
        ],
      },
      fundamentals: { ...baseReport().fundamentals, lastEps: 3.1 },
    });
    const merged = mergeReportFill(base, fill);
    expect(merged.congress.status).toBe("ok");
    expect(merged.congress.items).toHaveLength(1);
    expect(merged.fundamentals.lastEps).toBe(3.1);
    expect(merged.quote?.price).toBe(100);
    expect(merged.generatedAt).toBe(base.generatedAt);
  });
});

describe("narrative gaps + merge", () => {
  it("detects empty text fields and optional numeric gaps", () => {
    expect(
      findNarrativeGaps(
        { description: "ok", competitive: "", sectorOutlook: "x", risks: "y", technicalReading: "z", insiderReading: "w" },
        { needLastEps: true, needGuidance: true },
      ),
    ).toEqual(expect.arrayContaining(["competitive", "lastEps", "companyGuidanceRevenue"]));
  });

  it("merges only empty fields from fill", () => {
    const merged = mergeNarrativeFill(
      { description: "keep", sectorOutlook: "", lastEps: null },
      { description: "ignore", sectorOutlook: "filled", lastEps: 1.2, lastEpsSourceUrl: "https://example.com" },
    );
    expect(merged.description).toBe("keep");
    expect(merged.sectorOutlook).toBe("filled");
    expect(merged.lastEps).toBe(1.2);
  });

  it("rate-limits narrative gap retries to 24h", () => {
    const now = Date.parse("2026-07-20T12:00:00.000Z");
    expect(shouldRetryNarrativeGaps(null, now)).toBe(true);
    expect(shouldRetryNarrativeGaps(new Date(now - NARRATIVE_GAP_RETRY_MS + 1000).toISOString(), now)).toBe(false);
    expect(shouldRetryNarrativeGaps(new Date(now - NARRATIVE_GAP_RETRY_MS - 1000).toISOString(), now)).toBe(true);
  });
});
