import { describe, expect, it, vi } from "vitest";

import { wantsValuationIntent } from "./valuation-intent";

vi.mock("@/lib/db", () => ({
  listHoldings: vi.fn(),
}));

vi.mock("@/lib/services/warren-valuation", () => ({
  analyzeValuationForWarren: vi.fn(),
}));

describe("valuation-intent", () => {
  it("detects Spanish portfolio expensive question", () => {
    expect(wantsValuationIntent("Quiero saber que stock parecen caras")).toBe(true);
  });

  it("detects English cheap/expensive wording", () => {
    expect(wantsValuationIntent("Which of my holdings look expensive on fundamentals?")).toBe(true);
  });

  it("does not steal moat screener ideas prompts", () => {
    expect(wantsValuationIntent("dame ideas del moat screener con P/E bajo 15")).toBe(false);
  });

  it("ignores unrelated portfolio questions", () => {
    expect(wantsValuationIntent("What is my total portfolio value?")).toBe(false);
  });
});
