import { describe, expect, it } from "vitest";

import {
  extractHoldingQueryFromMessage,
  wantsPortfolioHoldingIntent,
} from "./portfolio-holding-intent";
import { wantsMoatScreenerIntent } from "./moat-screener-intent";

describe("portfolio-holding-intent", () => {
  it("detects Spanish show-my-investment prompt", () => {
    const msg = "mostrame mi inversion en AAPL";
    expect(wantsPortfolioHoldingIntent(msg)).toBe(true);
    expect(wantsMoatScreenerIntent(msg)).toBe(false);
    expect(extractHoldingQueryFromMessage(msg)).toBe("AAPL");
  });

  it("detects English position lookup", () => {
    const msg = "show my position in AAPL";
    expect(wantsPortfolioHoldingIntent(msg)).toBe(true);
    expect(extractHoldingQueryFromMessage(msg)).toBe("AAPL");
  });

  it("does not treat moat screener as holding lookup", () => {
    const msg = "dame ideas del moat screener con P/E bajo 15";
    expect(wantsPortfolioHoldingIntent(msg)).toBe(false);
  });
});
