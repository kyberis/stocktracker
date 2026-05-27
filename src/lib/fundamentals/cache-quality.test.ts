import { describe, it, expect } from "vitest";
import { isCacheableFundamentalData } from "./cache-quality";
import type { FundamentalData, IncomeStatementReport } from "@/lib/types";

describe("isCacheableFundamentalData", () => {
  it("rejects null data", () => {
    expect(isCacheableFundamentalData("income", null, "yahoo")).toBe(false);
  });

  it("rejects empty annual and quarterly", () => {
    expect(
      isCacheableFundamentalData("income", { annual: [], quarterly: [] }, "fmp")
    ).toBe(false);
  });

  it("rejects Yahoo-sparse income (revenue without cost/gross)", () => {
    const sparse: FundamentalData<IncomeStatementReport> = {
      annual: [
        {
          fiscalDateEnding: "2024-12-31",
          reportedCurrency: "USD",
          totalRevenue: 500_000_000,
          costOfRevenue: 0,
          grossProfit: 0,
          operatingExpenses: null,
          operatingIncome: null,
          incomeBeforeTax: null,
          incomeTaxExpense: null,
          netIncome: 400_000_000,
          ebitda: null,
          researchAndDevelopment: null,
          sellingGeneralAndAdmin: null,
          interestExpense: null,
        },
      ],
      quarterly: [],
    };
    expect(isCacheableFundamentalData("income", sparse, "yahoo")).toBe(false);
  });

  it("accepts complete income", () => {
    const complete: FundamentalData<IncomeStatementReport> = {
      annual: [
        {
          fiscalDateEnding: "2024-12-31",
          reportedCurrency: "USD",
          totalRevenue: 500_000_000,
          costOfRevenue: 200_000_000,
          grossProfit: 300_000_000,
          operatingExpenses: null,
          operatingIncome: null,
          incomeBeforeTax: null,
          incomeTaxExpense: null,
          netIncome: 400_000_000,
          ebitda: null,
          researchAndDevelopment: null,
          sellingGeneralAndAdmin: null,
          interestExpense: null,
        },
      ],
      quarterly: [],
    };
    expect(isCacheableFundamentalData("income", complete, "fmp")).toBe(true);
  });

  it("rejects earnings with no quarterly or annual rows", () => {
    expect(
      isCacheableFundamentalData("earnings", { annual: [], quarterly: [] }, "yahoo")
    ).toBe(false);
  });

  it("accepts earnings with quarterly rows", () => {
    expect(
      isCacheableFundamentalData(
        "earnings",
        {
          annual: [],
          quarterly: [
            {
              fiscalDateEnding: "2024-09-30",
              reportedEPS: 1.2,
              estimatedEPS: 1.1,
              surprise: 0.1,
              surprisePercentage: 5,
            },
          ],
        },
        "fmp"
      )
    ).toBe(true);
  });
});
