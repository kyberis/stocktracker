// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  shouldNotifyFirstSync,
  consumeSnapTradeOAuthPending,
  markSnapTradeOAuthPending,
} from "./snaptrade-first-sync";

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

describe("SnapTrade OAuth pending flag", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("mark and consume round-trip once", () => {
    expect(consumeSnapTradeOAuthPending()).toBe(false);
    markSnapTradeOAuthPending();
    expect(consumeSnapTradeOAuthPending()).toBe(true);
    expect(consumeSnapTradeOAuthPending()).toBe(false);
  });
});
