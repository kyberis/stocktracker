import { describe, expect, it } from "vitest";

import {
  computeNormalizedPe,
  evaluateEarningsQuality,
} from "./earnings-quality";

describe("evaluateEarningsQuality", () => {
  it("flags MKC-like TTM EPS / margin jump vs FY", () => {
    const r = evaluateEarningsQuality({
      epsTtm: 6.05,
      epsFy: 2.94,
      netMarginTtmPct: 22.05,
      netMarginFyPct: 11.54,
    });
    expect(r.suspect).toBe(true);
    expect(r.reasons.length).toBeGreaterThanOrEqual(1);
  });

  it("does not flag when TTM and FY are aligned", () => {
    const r = evaluateEarningsQuality({
      epsTtm: 3.1,
      epsFy: 2.9,
      netMarginTtmPct: 12,
      netMarginFyPct: 11.5,
    });
    expect(r.suspect).toBe(false);
  });
});

describe("computeNormalizedPe", () => {
  it("returns price / FY EPS", () => {
    expect(computeNormalizedPe(52.92, 2.94)).toBeCloseTo(18.0, 0);
  });
});
