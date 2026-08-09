import { describe, expect, it } from "vitest";
import {
  deriveCategoriesFromCard,
  ensureCardCategories,
  ensureReportCategories,
} from "./ensure-categories";
import type { ScreeningCandidateCard, ScreeningReport } from "./schemas";

function stubCard(
  overrides: Partial<ScreeningCandidateCard> = {},
): ScreeningCandidateCard {
  return {
    ticker: "KO",
    companyName: "Coca-Cola",
    sector: "Consumer Defensive",
    country: "US",
    business: null,
    mktCapUsd: 2e11,
    currency: "USD",
    price: 60,
    priceAsOf: "2026-08-09",
    targetPrice: null,
    upsidePct: null,
    score: 6,
    verdict: "fuerte",
    stepsPassed: [1, 5, 7],
    stepsFailed: [],
    catalyst: null,
    catalystDate: null,
    multiples: {
      fwdPe: 28,
      ownHistPe: 22,
      histPeAvg: 20,
      histPeYears: 5,
      peerPe: null,
      evEbitda: 18,
      ndEbitda: 1.2,
      growthNote: null,
    },
    flags: {
      netCash: false,
      buyback: null,
      dividendYield: 0.03,
      moatScore: 74,
    },
    thesis: "Legacy card without categories.",
    risks: [],
    priorityReason: "Quality compounder",
    citedFields: [],
    sources: [],
    suitability: "fit",
    ...overrides,
  };
}

describe("ensureCardCategories", () => {
  it("derives cheap/fit/solidity for legacy cards missing categories", () => {
    const card = stubCard({ categories: undefined });
    const ensured = ensureCardCategories(card);
    expect(ensured.categories).toBeDefined();
    expect(ensured.categories!.cheap.label).toBe("expensive");
    expect(ensured.categories!.fit.label).toBe("fit");
    expect(ensured.categories!.solidity.label).toBe("solid");
  });

  it("does not overwrite existing categories", () => {
    const existing = deriveCategoriesFromCard(
      stubCard({
        multiples: {
          fwdPe: 10,
          ownHistPe: 18,
          histPeAvg: 18,
          histPeYears: 5,
          peerPe: null,
          evEbitda: null,
          ndEbitda: null,
          growthNote: null,
        },
      }),
    );
    const card = stubCard({ categories: existing });
    expect(ensureCardCategories(card).categories).toBe(existing);
  });
});

describe("ensureReportCategories", () => {
  it("fills comparison row labels from derived card categories", () => {
    const card = stubCard({ categories: undefined, score: null, verdict: null });
    const report = {
      jobId: "legacy",
      mode: "user_report",
      locale: "en",
      generatedAt: "2026-08-09T00:00:00.000Z",
      methodologyNote: "note",
      executiveSummary: "summary",
      priorityOrder: ["KO"],
      comparisonRows: [
        {
          ticker: "KO",
          companyName: "Coca-Cola",
          valuationNote: "P/E 28x",
          growthNote: "—",
          score: 6,
          verdict: "fuerte",
        },
      ],
      cards: [card],
      disclaimer: "Not advice.",
      partial: false,
      pendingAgentKinds: [],
    } as ScreeningReport;

    const ensured = ensureReportCategories(report);
    expect(ensured.cards[0]!.categories?.solidity.label).toBe("solid");
    expect(ensured.comparisonRows[0]!.cheapLabel).toBe("expensive");
    expect(ensured.comparisonRows[0]!.fitLabel).toBe("fit");
    expect(ensured.comparisonRows[0]!.solidityLabel).toBe("solid");
  });
});
