import { describe, expect, it } from "vitest";
import {
  addMonthsUTC,
  annualizedReturnPct,
  dayChangeFixedReturn,
  fixedReturnProgress,
  isFixedReturnMatured,
  maturityDateFor,
  maturityValue,
  valueFixedReturnAt,
} from "./fixed-return";

const CIVISLEND = {
  principal: 1500,
  startDate: "2024-01-01",
  termMonths: 24,
  totalReturnPct: 25,
};

describe("maturityDateFor / addMonthsUTC", () => {
  it("adds whole months", () => {
    expect(maturityDateFor(CIVISLEND)).toBe("2026-01-01");
    expect(addMonthsUTC("2024-01-31", 1)).toBe("2024-02-29");
  });
});

describe("maturityValue / annualizedReturnPct", () => {
  it("computes maturity lock and display annualized rate", () => {
    expect(maturityValue(CIVISLEND)).toBe(1875);
    expect(annualizedReturnPct(CIVISLEND)).toBe(12.5);
  });
});

describe("valueFixedReturnAt", () => {
  it("is 0 before start", () => {
    expect(valueFixedReturnAt(CIVISLEND, "2023-12-31")).toBe(0);
  });

  it("equals principal on start date", () => {
    expect(valueFixedReturnAt(CIVISLEND, "2024-01-01")).toBe(1500);
  });

  it("accrues linearly by elapsed time (leap-year aware)", () => {
    // 2024 is a leap year → day 366/731 of the term, slightly above half
    const mid = valueFixedReturnAt(CIVISLEND, "2025-01-01");
    expect(mid).toBeGreaterThan(1687.5);
    expect(mid).toBeLessThan(1690);
    expect(mid).toBeCloseTo(1500 + 375 * (366 / 731), 5);
  });

  it("locks at maturity value on and after maturity", () => {
    expect(valueFixedReturnAt(CIVISLEND, "2026-01-01")).toBe(1875);
    expect(valueFixedReturnAt(CIVISLEND, "2027-06-15")).toBe(1875);
  });

  it("returns 0 for invalid params", () => {
    expect(valueFixedReturnAt({ ...CIVISLEND, termMonths: 0 }, "2025-01-01")).toBe(0);
    expect(valueFixedReturnAt({ ...CIVISLEND, startDate: "bad" }, "2025-01-01")).toBe(0);
  });
});

describe("dayChangeFixedReturn", () => {
  it("is positive during accrual and zero after maturity", () => {
    const mid = dayChangeFixedReturn(CIVISLEND, "2025-01-01");
    expect(mid).toBeGreaterThan(0);
    expect(dayChangeFixedReturn(CIVISLEND, "2026-01-02")).toBe(0);
    expect(dayChangeFixedReturn(CIVISLEND, "2023-12-31")).toBe(0);
  });
});

describe("isFixedReturnMatured / fixedReturnProgress", () => {
  it("tracks maturity and progress", () => {
    expect(isFixedReturnMatured(CIVISLEND, "2025-12-31")).toBe(false);
    expect(isFixedReturnMatured(CIVISLEND, "2026-01-01")).toBe(true);
    expect(fixedReturnProgress(CIVISLEND, "2024-01-01")).toBe(0);
    expect(fixedReturnProgress(CIVISLEND, "2025-01-01")).toBeCloseTo(366 / 731, 5);
    expect(fixedReturnProgress(CIVISLEND, "2026-01-01")).toBe(1);
  });
});
