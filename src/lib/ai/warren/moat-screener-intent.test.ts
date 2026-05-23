import { describe, expect, it } from "vitest";

import {
  extractPeMaxFromMessage,
  wantsMoatScreenerIntent,
} from "./moat-screener-intent";
import { wantsMissionIntent } from "../office/office-intents";

describe("moat-screener-intent", () => {
  it("detects Spanish moat screener ideas prompt", () => {
    const msg = "dame ideas del moat screener con P/E bajo 15";
    expect(wantsMoatScreenerIntent(msg)).toBe(true);
    expect(wantsMissionIntent(msg)).toBe(false);
    expect(extractPeMaxFromMessage(msg)).toBe(15);
  });

  it("detects English low P/E screener", () => {
    expect(wantsMoatScreenerIntent("stock ideas from moat screener with P/E below 12")).toBe(true);
    expect(extractPeMaxFromMessage("P/E below 12")).toBe(12);
  });
});
