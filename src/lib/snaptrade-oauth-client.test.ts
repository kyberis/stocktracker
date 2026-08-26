// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  consumeSnapTradeOAuthPending,
  markSnapTradeOAuthPending,
} from "./snaptrade-oauth-client";

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
