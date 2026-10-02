import { describe, expect, it } from "vitest";
import { amountFromDividendHistory } from "./dividend-amount";

describe("amountFromDividendHistory", () => {
  it("returns the last amount when the next ex-date matches the cadence", () => {
    const amount = amountFromDividendHistory("2026-05-08", [
      { date: "2025-11-07", amount: 0.25 },
      { date: "2026-02-06", amount: 0.26 },
    ]);
    expect(amount).toBe(0.26);
  });

  it("returns null when only one historical payment exists", () => {
    expect(
      amountFromDividendHistory("2026-05-08", [{ date: "2026-02-06", amount: 0.26 }]),
    ).toBeNull();
  });

  it("returns null when the upcoming date does not match the interval", () => {
    expect(
      amountFromDividendHistory("2026-12-01", [
        { date: "2025-11-07", amount: 0.25 },
        { date: "2026-02-06", amount: 0.26 },
      ]),
    ).toBeNull();
  });
});
