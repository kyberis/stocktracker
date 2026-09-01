import { describe, expect, it } from "vitest";

import type { IncomeStatementReport } from "@/lib/api-providers/types";
import type { FundamentalData } from "@/lib/types";
import { deriveEarningsQualityFromIncome } from "@/lib/fundamentals/earnings-quality-from-income";

function quarter(
  netIncome: number,
  operatingIncome: number,
  revenue = 100,
): IncomeStatementReport {
  return {
    fiscalDateEnding: "2026-06-30",
    reportedCurrency: "USD",
    totalRevenue: revenue,
    costOfRevenue: null,
    grossProfit: null,
    operatingExpenses: null,
    operatingIncome,
    incomeBeforeTax: null,
    incomeTaxExpense: null,
    netIncome,
    ebitda: null,
    researchAndDevelopment: null,
    sellingGeneralAndAdmin: null,
    interestExpense: null,
  };
}

function incomeData(
  quarterly: IncomeStatementReport[],
  annual: IncomeStatementReport[],
): FundamentalData<IncomeStatementReport> {
  return { annual, quarterly };
}

describe("deriveEarningsQualityFromIncome", () => {
  it("flags when TTM net income far exceeds tax-adjusted operating income", () => {
    const income = incomeData(
      [
        quarter(98e9, 40.8e9),
        quarter(37.7e9, 39.7e9),
        quarter(12.8e9, 31.2e9),
        quarter(8e9, 36e9),
      ],
      [quarter(50e9, 120e9, 350e9)],
    );
    const res = deriveEarningsQualityFromIncome(income, {
      sharesOutstanding: 12e9,
      price: 339.35,
    });
    expect(res.earningsQualitySuspect).toBe(true);
    expect(res.reasons.some((r) => r.startsWith("net_vs_operating_ttm"))).toBe(true);
  });

  it("does not flag when operating and net income are aligned", () => {
    const income = incomeData(
      [
        quarter(3e9, 4e9, 50e9),
        quarter(3.1e9, 4.1e9, 51e9),
        quarter(2.9e9, 3.9e9, 49e9),
        quarter(3e9, 4e9, 50e9),
      ],
      [quarter(11.5e9, 15.5e9, 200e9)],
    );
    const res = deriveEarningsQualityFromIncome(income, {
      sharesOutstanding: 4e9,
      price: 60,
    });
    expect(res.earningsQualitySuspect).toBe(false);
  });
});
