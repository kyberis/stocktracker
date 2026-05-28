import { describe, expect, it } from "vitest";
import {
  computeDigestImpactScore,
  computeFinPulseImpactScore,
  mergePriorityFeed,
  sortByImpactScore,
  withDigestImpactScore,
} from "@/lib/aid/impact-score";
import type { AidDigestItem, AidFinPulseItem } from "@/lib/types";

describe("impact-score", () => {
  it("boosts digest score for earnings and large moves", () => {
    expect(
      computeDigestImpactScore({
        impact: "medium",
        movePct: 6,
        filterTags: ["earnings", "move"],
      }),
    ).toBe(5);
    expect(
      computeDigestImpactScore({ impact: "low", movePct: 1, filterTags: ["news"] }),
    ).toBe(2);
  });

  it("boosts finpulse score for portfolio relevance", () => {
    expect(
      computeFinPulseImpactScore({
        impact: "high",
        portfolioRelevant: true,
        tickers: ["NVDA"],
      }),
    ).toBe(5);
  });

  it("sorts by impactScore then date", () => {
    const items = sortByImpactScore([
      withDigestImpactScore({
        id: "a",
        ticker: "A",
        movePct: 1,
        headline: "low",
        bullets: [],
        impact: "low",
        filterTags: ["news"],
        usedWeb: false,
        cachedAt: "2026-05-28T10:00:00Z",
        eventKey: "x",
      }),
      withDigestImpactScore({
        id: "b",
        ticker: "B",
        movePct: 5,
        headline: "high",
        bullets: [],
        impact: "high",
        filterTags: ["move"],
        usedWeb: false,
        cachedAt: "2026-05-28T09:00:00Z",
        eventKey: "y",
      }),
    ]);
    expect(items[0]?.id).toBe("b");
  });

  it("merges priority feed with top scores first", () => {
    const digest: AidDigestItem[] = [
      withDigestImpactScore({
        id: "d1",
        ticker: "AAPL",
        movePct: 2,
        headline: "News",
        bullets: [],
        impact: "medium",
        filterTags: ["news"],
        usedWeb: false,
        cachedAt: "2026-05-28T12:00:00Z",
        eventKey: "n1",
      }),
    ];
    const finPulse: AidFinPulseItem[] = [
      {
        id: "f1",
        handle: "federalreserve",
        displayName: "Fed",
        sourceUrl: "https://x.com/x",
        publishedAt: "2026-05-28T11:00:00Z",
        headline: "Rates",
        bullets: [],
        impact: "high",
        impactScore: 5,
        tickers: [],
        tags: ["macro"],
        cachedAt: "2026-05-28T11:00:00Z",
        portfolioRelevant: true,
      },
    ];
    const priority = mergePriorityFeed({ digest, finPulse, earnings: [], limit: 2 });
    expect(priority[0]?.source).toBe("finpulse");
    expect(priority.length).toBeLessThanOrEqual(2);
  });
});
