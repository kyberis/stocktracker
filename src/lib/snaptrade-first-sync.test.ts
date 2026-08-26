import { describe, it, expect } from "vitest";
import { shouldNotifyFirstSync } from "./snaptrade-first-sync";

describe("shouldNotifyFirstSync", () => {
  it("returns true on the 0 -> N holdings transition", () => {
    expect(shouldNotifyFirstSync({ hadHoldingsBefore: 0, holdingsAfter: 3 })).toBe(true);
  });

  it("returns false when there were no holdings before and none after", () => {
    expect(shouldNotifyFirstSync({ hadHoldingsBefore: 0, holdingsAfter: 0 })).toBe(false);
  });

  it("returns false when the user already had holdings before this sync", () => {
    expect(shouldNotifyFirstSync({ hadHoldingsBefore: 2, holdingsAfter: 2 })).toBe(false);
  });

  it("returns false for an N -> M transition (already had holdings, count changed)", () => {
    expect(shouldNotifyFirstSync({ hadHoldingsBefore: 2, holdingsAfter: 5 })).toBe(false);
  });
});
