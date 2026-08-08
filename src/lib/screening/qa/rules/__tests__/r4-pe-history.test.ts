import { describe, expect, it } from "vitest";

import type {
  HardDataOutput,
  ScreeningReport,
} from "@/lib/screening/schemas";
import type { QaEvaluationContext } from "../types";
import { r4PeHistory } from "../r4-pe-history";

function baseHard(overrides: Partial<HardDataOutput["candidates"][number]> = {}): HardDataOutput {
  return {
    status: "ok",
    universeSize: 100,
    candidates: [
      {
        ticker: "AAPL",
        name: "Apple",
        sector: "Technology",
        industry: null,
        country: null,
        marketCapUsd: null,
        price: 100,
        rankScore: 60,
        rankReason: "sample",
        fwdPe: 20,
        ownHistPe: 22,
        evEbitda: 18,
        ndEbitda: 0.5,
        earningsResilient: true,
        revenueGrowthHistoryPct: [5, 6, 7, 4, 3],
        ...overrides,
      },
    ],
    deferredTickers: [],
    gaps: [],
    locale: "en",
    sources: [],
  };
}

function baseReport(overrides: Partial<ScreeningReport["cards"][number]>): ScreeningReport {
  return {
    jobId: "run-1",
    mode: "user_report",
    locale: "en",
    generatedAt: "2026-01-01T00:00:00Z",
    methodologyNote: "n",
    executiveSummary: "s",
    priorityOrder: ["AAPL"],
    comparisonRows: [],
    cards: [
      {
        ticker: "AAPL",
        companyName: "Apple",
        sector: "Technology",
        country: "US",
        business: null,
        mktCapUsd: null,
        currency: "USD",
        price: 100,
        priceAsOf: "2026-01-01",
        targetPrice: null,
        upsidePct: null,
        score: 5,
        verdict: null,
        stepsPassed: [],
        stepsFailed: [],
        catalyst: null,
        catalystDate: null,
        multiples: {
          fwdPe: 20,
          ownHistPe: 22,
          peerPe: null,
          evEbitda: 18,
          ndEbitda: 0.5,
          growthNote: null,
        },
        flags: { netCash: null, buyback: null, dividendYield: null, moatScore: null },
        thesis: "thesis",
        risks: [],
        priorityReason: "reason",
        citedFields: [],
        sources: [],
        ...overrides,
      },
    ],
    disclaimer: "d",
    partial: false,
    pendingAgentKinds: [],
  } as unknown as ScreeningReport;
}

function ctxFor(hd: HardDataOutput, report: ScreeningReport): QaEvaluationContext {
  return {
    runId: "run-1",
    hardData: hd,
    irAggregate: null,
    webAggregate: null,
    technicalsAggregate: null,
    portfolioContext: null,
    risk: null,
    compilerDraft: null,
    report,
  };
}

describe("r4PeHistory", () => {
  it("passes when multiples match Hard Data exactly", () => {
    expect(r4PeHistory(ctxFor(baseHard(), baseReport({})))).toEqual([]);
  });

  it("flags when card fwdPe drifts >10% from Hard Data", () => {
    const report = baseReport({
      multiples: {
        fwdPe: 40,
        ownHistPe: 22,
        peerPe: null,
        evEbitda: 18,
        ndEbitda: 0.5,
        growthNote: null,
      },
    });
    const issues = r4PeHistory(ctxFor(baseHard(), report));
    expect(issues.some((i) => i.claimPath === "multiples.fwdPe")).toBe(true);
  });

  it("flags earningsResilient=true without adequate growth history", () => {
    const hd = baseHard({
      earningsResilient: true,
      revenueGrowthHistoryPct: [5],
    });
    const issues = r4PeHistory(ctxFor(hd, baseReport({})));
    expect(issues.some((i) => i.claimPath === "earningsResilient")).toBe(true);
  });
});
