import { describe, expect, it } from "vitest";
import { buildEducationalThesis } from "../thesis";

describe("buildEducationalThesis", () => {
  it("explains valuation and technicals in plain language", () => {
    const thesis = buildEducationalThesis({
      locale: "en",
      companyName: "McCormick & Company",
      ticker: "MKC",
      lead: "McCormick is a leader in flavor solutions with a dated merger catalyst.",
      fwdPe: 8.8,
      evEbitda: 13.72,
      ndEbitda: 3.35,
      dividendYield: 0.036,
      upsidePct: 11,
      score: 5,
      stepsPassed: [1, 2, 3, 4, 6],
      catalyst: "Merger with Unilever",
      catalystDate: "2026-07-29",
      positionKind: "new_position",
      suitability: "fit",
      technicals: {
        distanceTo52wHighPct: -27,
        return1yPct: -25,
        return3mPct: 10,
        aboveMa200: false,
        volatilityAnnPct: 30,
      },
    });

    expect(thesis).toContain("P/E");
    expect(thesis).toContain("8.8x");
    expect(thesis).toContain("EV/EBITDA");
    expect(thesis).toContain("Net debt / EBITDA");
    expect(thesis).toContain("Dividend yield");
    expect(thesis).toContain("200-day");
    expect(thesis).toContain("Merger with Unilever");
    expect(thesis).toContain("not financial advice");
    expect(thesis.split("\n\n").length).toBeGreaterThanOrEqual(4);
  });

  it("writes Spanish copy when locale is es", () => {
    const thesis = buildEducationalThesis({
      locale: "es",
      companyName: "McCormick",
      ticker: "MKC",
      fwdPe: 8.8,
      score: 5,
    });
    expect(thesis).toContain("PER");
    expect(thesis).toMatch(/asesoramiento financiero|investigación automatizada/i);
  });
});
