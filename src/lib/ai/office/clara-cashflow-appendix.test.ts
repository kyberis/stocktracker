import { describe, expect, it } from "vitest";

import { formatClaraCashflowAppendix } from "./clara-cashflow-appendix";

describe("formatClaraCashflowAppendix", () => {
  it("says unavailable without inventing numbers", () => {
    const text = formatClaraCashflowAppendix({
      available: false,
      note: "Clara HTTP 403",
    });
    expect(text).toContain("unavailable");
    expect(text).toContain("Clara HTTP 403");
    expect(text).toContain("Do not invent");
  });

  it("includes calendar, emergency pile, and month totals", () => {
    const text = formatClaraCashflowAppendix({
      available: true,
      currency: "EUR",
      monthKey: "2026-08",
      dayOfMonth: 26,
      daysInMonth: 31,
      hasMonthRecord: true,
      emergencyBalanceEur: 15000,
      emergencyTargetEur: 9000,
      surplusEur: 6000,
      incomeReceived: 3000,
      incomeExpected: 3000,
      plannedExpenses: 2200,
      paidExpenses: 1800,
      remainingExpenses: 400,
      monthBalance: 800,
    });
    expect(text).toContain("2026-08");
    expect(text).toContain("day 26 of 31");
    expect(text).toContain("15000");
    expect(text).toContain("remaining EUR 400");
    expect(text).toContain("not a licensed advisor");
    expect(text).toContain("Never tell them to buy or sell");
  });
});
