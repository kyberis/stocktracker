import { describe, expect, it } from "vitest";

import type {
  HardDataOutput,
  ScreeningReport,
} from "@/lib/screening/schemas";
import type { QaEvaluationContext } from "../types";
import { r9PeerFiltering } from "../r9-peer-filtering";
import { r10AnalystCount } from "../r10-analyst-count";

const baseHardCandidate = {
  ticker: "AAPL",
  name: "Apple",
  sector: "Technology",
  industry: null,
  country: "US",
  marketCapUsd: null,
  price: 100,
  rankScore: 60,
  rankReason: "sample",
};

function ctxFor(
  hardOverrides: Partial<typeof baseHardCandidate>,
  cardOverrides: Partial<ScreeningReport["cards"][number]>,
): QaEvaluationContext {
  const hardData: HardDataOutput = {
    status: "ok",
    universeSize: 100,
    candidates: [{ ...baseHardCandidate, ...hardOverrides }],
    deferredTickers: [],
    gaps: [],
    locale: "en",
    sources: [],
  };
  const report = {
    jobId: "r",
    mode: "user_report",
    locale: "en",
    generatedAt: "2026-01-01",
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
          fwdPe: null,
          ownHistPe: null,
          peerPe: null,
          evEbitda: null,
          ndEbitda: null,
          growthNote: null,
        },
        flags: { netCash: null, buyback: null, dividendYield: null, moatScore: null },
        thesis: "thesis",
        risks: [],
        priorityReason: "reason",
        citedFields: [],
        sources: [],
        ...cardOverrides,
      },
    ],
    disclaimer: "d",
    partial: false,
    pendingAgentKinds: [],
  } as unknown as ScreeningReport;
  return {
    runId: "r",
    hardData,
    irAggregate: null,
    webAggregate: null,
    technicalsAggregate: null,
    portfolioContext: null,
    risk: null,
    compilerDraft: null,
    report,
  };
}

describe("r9PeerFiltering", () => {
  it("passes when sector and country match Hard Data", () => {
    expect(r9PeerFiltering(ctxFor({}, {}))).toEqual([]);
  });

  it("flags when card sector diverges from Hard Data", () => {
    const issues = r9PeerFiltering(ctxFor({}, { sector: "Financials" }));
    expect(issues.some((i) => i.claimPath === "sector")).toBe(true);
  });
});

describe("r10AnalystCount", () => {
  it("passes when no target price is shown", () => {
    expect(r10AnalystCount(ctxFor({}, {}))).toEqual([]);
  });

  it("warns when target price is shown without a guidance source", () => {
    const issues = r10AnalystCount(
      ctxFor(
        {},
        {
          targetPrice: 150,
          sources: [{ url: "https://x.com", asOf: "2026", field: "other" }],
        },
      ),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].blocking).toBe(false);
  });

  it("does not warn when a guidance source is present", () => {
    const issues = r10AnalystCount(
      ctxFor(
        {},
        {
          targetPrice: 150,
          sources: [{ url: "https://x.com", asOf: "2026", field: "guidance" }],
        },
      ),
    );
    expect(issues).toEqual([]);
  });
});
