import { describe, expect, it } from "vitest";
import type { ClaraSavingsSummary } from "@/lib/ai/office/types";
import {
  formatSignedCurrency,
  isUsableSurplus,
  mapClaraSavingsToDeskStatus,
  parseClaraDeskStatus,
  remainingDaysInMonth,
  resolveClaraPulseDisplay,
  resolveMoneyDeskHandoff,
} from "./clara-desk-status";

describe("mapClaraSavingsToDeskStatus", () => {
  it("returns unlinked when Clara is unavailable", () => {
    expect(mapClaraSavingsToDeskStatus({ available: false, note: "404" })).toEqual({
      linked: false,
    });
  });

  it("maps aggregated fields when linked", () => {
    const clara: ClaraSavingsSummary = {
      available: true,
      surplusEur: 420,
      currency: "EUR",
      dayOfMonth: 16,
      daysInMonth: 28,
      monthBalance: 120,
      hasMonthRecord: true,
      remainingExpenses: 300,
    };
    expect(mapClaraSavingsToDeskStatus(clara)).toEqual({
      linked: true,
      surplusEur: 420,
      currency: "EUR",
      dayOfMonth: 16,
      daysInMonth: 28,
      monthBalance: 120,
      hasMonthRecord: true,
      remainingExpenses: 300,
    });
  });

  it("drops non-finite surplus", () => {
    expect(
      mapClaraSavingsToDeskStatus({
        available: true,
        surplusEur: Number.NaN,
      }).surplusEur,
    ).toBeUndefined();
  });
});

describe("parseClaraDeskStatus", () => {
  it("parses the API shape", () => {
    expect(
      parseClaraDeskStatus({
        linked: true,
        surplusEur: 80,
        currency: "EUR",
        dayOfMonth: 2,
        daysInMonth: 30,
        monthBalance: 10,
        hasMonthRecord: true,
        remainingExpenses: 50,
      }),
    ).toEqual({
      linked: true,
      surplusEur: 80,
      currency: "EUR",
      dayOfMonth: 2,
      daysInMonth: 30,
      monthBalance: 10,
      hasMonthRecord: true,
      remainingExpenses: 50,
    });
  });

  it("treats missing or false linked as unlinked", () => {
    expect(parseClaraDeskStatus({ linked: false, surplusEur: 99 })).toEqual({ linked: false });
    expect(parseClaraDeskStatus(null)).toEqual({ linked: false });
  });
});

describe("resolveMoneyDeskHandoff", () => {
  it("shows surplus handoff only when holdings, linked, and surplus > 0", () => {
    expect(
      resolveMoneyDeskHandoff({ hasHoldings: true, linked: true, surplusEur: 300 }),
    ).toBe("surplus");
    expect(
      resolveMoneyDeskHandoff({ hasHoldings: true, linked: true, surplusEur: 0 }),
    ).toBeNull();
    expect(
      resolveMoneyDeskHandoff({ hasHoldings: true, linked: false, surplusEur: 300 }),
    ).toBeNull();
  });

  it("shows add-first when Clara is linked but portfolio is empty", () => {
    expect(
      resolveMoneyDeskHandoff({ hasHoldings: false, linked: true, surplusEur: 300 }),
    ).toBe("add_first");
  });

  it("is silent when both are empty", () => {
    expect(resolveMoneyDeskHandoff({ hasHoldings: false, linked: false })).toBeNull();
  });
});

describe("resolveClaraPulseDisplay", () => {
  it("returns unlinked when Clara is not linked", () => {
    expect(resolveClaraPulseDisplay(null)).toEqual({ kind: "unlinked", tone: "neutral" });
    expect(resolveClaraPulseDisplay({ linked: false })).toEqual({ kind: "unlinked", tone: "neutral" });
  });

  it("returns setup when linked but month is not configured", () => {
    expect(resolveClaraPulseDisplay({ linked: true, hasMonthRecord: false })).toEqual({
      kind: "setup",
      tone: "neutral",
    });
    expect(resolveClaraPulseDisplay({ linked: true })).toEqual({ kind: "setup", tone: "neutral" });
  });

  it("returns balance tones for positive, zero, and negative month balance", () => {
    expect(
      resolveClaraPulseDisplay({ linked: true, hasMonthRecord: true, monthBalance: 120 }),
    ).toEqual({ kind: "balance", value: 120, tone: "positive" });
    expect(
      resolveClaraPulseDisplay({ linked: true, hasMonthRecord: true, monthBalance: 0 }),
    ).toEqual({ kind: "zero", value: 0, tone: "neutral" });
    expect(
      resolveClaraPulseDisplay({ linked: true, hasMonthRecord: true, monthBalance: -45 }),
    ).toEqual({ kind: "balance", value: -45, tone: "negative" });
  });

  it("infers month record from monthBalance when hasMonthRecord is omitted", () => {
    expect(resolveClaraPulseDisplay({ linked: true, monthBalance: 25 })).toEqual({
      kind: "balance",
      value: 25,
      tone: "positive",
    });
  });
});

describe("isUsableSurplus / remainingDaysInMonth / formatSignedCurrency", () => {
  it("rejects non-positive surplus", () => {
    expect(isUsableSurplus(undefined)).toBe(false);
    expect(isUsableSurplus(0)).toBe(false);
    expect(isUsableSurplus(-10)).toBe(false);
    expect(isUsableSurplus(1)).toBe(true);
  });

  it("computes remaining days", () => {
    expect(remainingDaysInMonth(16, 28)).toBe(12);
    expect(remainingDaysInMonth(28, 28)).toBe(0);
    expect(remainingDaysInMonth(0, 30)).toBeNull();
    expect(remainingDaysInMonth(31, 30)).toBeNull();
  });

  it("prefixes plus on gains", () => {
    expect(formatSignedCurrency(412, "EUR")).toMatch(/^\+/);
    expect(formatSignedCurrency(-61, "EUR")).toMatch(/^-/);
  });
});
