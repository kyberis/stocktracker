import { describe, expect, it } from "vitest";

import {
  FORWARD_PE_MAX_PREMIUM_VS_TRAILING,
  forwardPeWasRejected,
  isPlausiblePe,
  sanitizePeMultiples,
  sanitizeOverviewPe,
} from "./normalize-overview-pe";

describe("sanitizePeMultiples", () => {
  it("keeps GOOGL-like forward near trailing", () => {
    const r = sanitizePeMultiples(17.3, 23.3);
    expect(r.peRatio).toBe(17.3);
    expect(r.forwardPE).toBe(23.3);
  });

  it("drops SRB.L-like absurd forward vs trailing", () => {
    const r = sanitizePeMultiples(5, 216.3);
    expect(r.peRatio).toBe(5);
    expect(r.forwardPE).toBeNull();
  });

  it("drops out-of-band trailing and forward", () => {
    expect(sanitizePeMultiples(250, 30).peRatio).toBeNull();
    expect(sanitizePeMultiples(12, 400).forwardPE).toBeNull();
  });

  it("keeps lower forward when earnings are recovering", () => {
    const r = sanitizePeMultiples(80, 40);
    expect(r.peRatio).toBe(80);
    expect(r.forwardPE).toBe(40);
  });

  it("flags rejected forward when trailing is sane", () => {
    expect(forwardPeWasRejected(5, 216.3)).toBe(true);
    expect(forwardPeWasRejected(17.3, 23.3)).toBe(false);
  });

  it("sanitizes overview objects", () => {
    const out = sanitizeOverviewPe({
      symbol: "SRB.L",
      name: "Serabi",
      description: "",
      exchange: "LSE",
      currency: "USD",
      sector: "",
      industry: "",
      peRatio: 5,
      forwardPE: 216.3,
      pegRatio: null,
      eps: null,
      dividendPerShare: null,
      dividendYield: null,
      beta: null,
      profitMargin: null,
      returnOnEquity: null,
      revenueTTM: null,
      analystTargetPrice: 456,
      analystRatings: null,
      fiftyDayMA: null,
      twoHundredDayMA: null,
      sharesOutstanding: null,
    });
    expect(out.forwardPE).toBeNull();
    expect(out.peRatio).toBe(5);
  });

  it("documents the forward premium threshold", () => {
    expect(FORWARD_PE_MAX_PREMIUM_VS_TRAILING).toBe(3);
    expect(isPlausiblePe(5)).toBe(true);
    expect(isPlausiblePe(216)).toBe(false);
  });
});
