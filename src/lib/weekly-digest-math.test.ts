import { describe, expect, it } from "vitest";
import type { Transaction } from "@/lib/types";
import {
  computeNetBuyFlowEUR,
  DIGEST_BASELINE_MAX_AGE_DAYS,
  isDigestBaselineTooOld,
  transactionAmountEUR,
  utcDaysBetween,
} from "./weekly-digest-math";

describe("utcDaysBetween", () => {
  it("counts calendar days in UTC", () => {
    expect(utcDaysBetween("2026-03-23", "2026-04-06")).toBe(14);
    expect(utcDaysBetween("2026-03-22", "2026-04-06")).toBe(15);
  });
});

describe("isDigestBaselineTooOld", () => {
  it("returns false when snapshot is within max age of week start", () => {
    expect(isDigestBaselineTooOld("2026-04-05", "2026-04-06", DIGEST_BASELINE_MAX_AGE_DAYS)).toBe(false);
    expect(isDigestBaselineTooOld("2026-03-23", "2026-04-06", DIGEST_BASELINE_MAX_AGE_DAYS)).toBe(false);
  });

  it("returns true when snapshot is older than max age", () => {
    expect(isDigestBaselineTooOld("2026-03-22", "2026-04-06", DIGEST_BASELINE_MAX_AGE_DAYS)).toBe(true);
  });

  it("returns true for malformed dates", () => {
    expect(isDigestBaselineTooOld("", "2026-04-06")).toBe(true);
  });
});

describe("transactionAmountEUR", () => {
  it("uses EUR amount directly", () => {
    const tx = { currency: "EUR", totalAmount: 100, exchangeRateEur: 1 } as Transaction;
    expect(transactionAmountEUR(tx)).toBe(100);
  });

  it("converts via exchangeRateEur when not EUR", () => {
    const tx = { currency: "USD", totalAmount: 110, exchangeRateEur: 1.1 } as Transaction;
    expect(transactionAmountEUR(tx)).toBeCloseTo(100, 5);
  });
});

describe("computeNetBuyFlowEUR", () => {
  const weekStart = "2026-04-07";
  const weekEnd = "2026-04-13";

  it("sums buys minus sells in range", () => {
    const txs = [
      { type: "buy", date: "2026-04-08", totalAmount: 1000, currency: "EUR" },
      { type: "sell", date: "2026-04-09", totalAmount: 200, currency: "EUR" },
      { type: "dividend", date: "2026-04-10", totalAmount: 50, currency: "EUR" },
    ] as Transaction[];
    expect(computeNetBuyFlowEUR(txs, weekStart, weekEnd)).toBe(800);
  });

  it("ignores transactions outside week", () => {
    const txs = [{ type: "buy", date: "2026-04-01", totalAmount: 999, currency: "EUR" }] as Transaction[];
    expect(computeNetBuyFlowEUR(txs, weekStart, weekEnd)).toBe(0);
  });
});
