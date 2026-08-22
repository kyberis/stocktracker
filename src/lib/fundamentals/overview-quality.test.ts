import { describe, it, expect } from "vitest";
import type { CompanyOverview } from "@/lib/api-providers/types";
import {
  hasValuationMetrics,
  mergeOverviews,
  overviewQualityScore,
} from "./overview-quality";

const sparse: CompanyOverview = {
  symbol: "GOOGL",
  name: "GOOGL",
  description: "",
  exchange: "",
  currency: "USD",
  sector: "",
  industry: "",
  peRatio: null,
  forwardPE: null,
  pegRatio: null,
  eps: null,
  dividendPerShare: null,
  dividendYield: null,
  beta: null,
  profitMargin: null,
  returnOnEquity: null,
  revenueTTM: null,
  analystTargetPrice: null,
  analystRatings: null,
  fiftyDayMA: null,
  twoHundredDayMA: null,
  sharesOutstanding: null,
};

describe("hasValuationMetrics", () => {
  it("returns false when all multiples are null", () => {
    expect(hasValuationMetrics(sparse)).toBe(false);
  });

  it("returns true when P/E is present", () => {
    expect(hasValuationMetrics({ ...sparse, peRatio: 24 })).toBe(true);
  });
});

describe("mergeOverviews", () => {
  it("fills null fields from a secondary overview", () => {
    const merged = mergeOverviews(sparse, {
      ...sparse,
      symbol: "GOOGL",
      name: "Alphabet Inc.",
      peRatio: 28.5,
      forwardPE: 25.1,
    });
    expect(merged.name).toBe("Alphabet Inc.");
    expect(merged.peRatio).toBe(28.5);
    expect(merged.forwardPE).toBe(25.1);
    expect(merged.symbol).toBe("GOOGL");
  });
});

describe("overviewQualityScore", () => {
  it("ranks richer overviews higher", () => {
    const low = overviewQualityScore(sparse);
    const high = overviewQualityScore({
      ...sparse,
      name: "Alphabet Inc.",
      peRatio: 28,
      forwardPE: 25,
      returnOnEquity: 0.3,
    });
    expect(high).toBeGreaterThan(low);
  });
});
