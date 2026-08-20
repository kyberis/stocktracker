import { describe, expect, it } from "vitest";
import { evaluateMoat } from "./moat-evaluator";
import type {
  BalanceSheetReport,
  CashFlowReport,
  CompanyOverview,
  EarningsReport,
  FundamentalData,
  IncomeStatementReport,
} from "./types";

function overview(partial: Partial<CompanyOverview> = {}): CompanyOverview {
  return {
    symbol: "TEST",
    name: "Test Co",
    description: "",
    exchange: "NASDAQ",
    currency: "USD",
    sector: "Technology",
    industry: "Consumer Electronics",
    peRatio: 28,
    pegRatio: null,
    eps: 6,
    dividendPerShare: null,
    dividendYield: null,
    beta: null,
    profitMargin: 0.25,
    returnOnEquity: 1.519,
    revenueTTM: 400e9,
    analystTargetPrice: null,
    analystRatings: null,
    fiftyDayMA: null,
    twoHundredDayMA: null,
    sharesOutstanding: 15e9,
    forwardPE: 26,
    ...partial,
  };
}

function emptyEarnings(): FundamentalData<EarningsReport> {
  return { annual: [], quarterly: [] };
}

function incomeYear(n: number, opts: Partial<IncomeStatementReport> = {}): IncomeStatementReport {
  return {
    fiscalDateEnding: `202${n}-09-30`,
    reportedCurrency: "USD",
    totalRevenue: 380e9,
    costOfRevenue: 200e9,
    grossProfit: 180e9,
    operatingExpenses: 50e9,
    operatingIncome: 120e9,
    incomeBeforeTax: 120e9,
    incomeTaxExpense: 20e9,
    netIncome: 94e9,
    ebitda: 130e9,
    researchAndDevelopment: 30e9,
    sellingGeneralAndAdmin: 25e9,
    interestExpense: 4e9,
    ...opts,
  };
}

function balanceYear(
  n: number,
  opts: Partial<BalanceSheetReport> = {},
): BalanceSheetReport {
  return {
    fiscalDateEnding: `202${n}-09-30`,
    reportedCurrency: "USD",
    totalAssets: 350e9,
    totalCurrentAssets: 140e9,
    cashAndEquivalents: 50e9,
    totalNonCurrentAssets: 210e9,
    totalLiabilities: 280e9,
    totalCurrentLiabilities: 120e9,
    totalNonCurrentLiabilities: 160e9,
    totalShareholderEquity: 57e9,
    retainedEarnings: 40e9,
    longTermDebt: 85e9,
    shortTermDebt: 15e9,
    commonStockSharesOutstanding: 15e9,
    ...opts,
  };
}

function cashYear(n: number, opts: Partial<CashFlowReport> = {}): CashFlowReport {
  return {
    fiscalDateEnding: `202${n}-09-30`,
    reportedCurrency: "USD",
    operatingCashflow: 110e9,
    capitalExpenditures: 10e9,
    changeInCash: 0,
    freeCashFlow: 100e9,
    dividendPayout: 15e9,
    shareRepurchase: 80e9,
    proceedsFromIssuanceOfDebt: 0,
    paymentsForRepurchaseOfEquity: 0,
    ...opts,
  };
}

describe("evaluateMoat", () => {
  it("scores ROIC, not buyback-inflated ROE, and does not double-count FCF-funded buybacks as an RE failure", () => {
    const evaluation = evaluateMoat({
      overview: overview(),
      income: {
        annual: [incomeYear(5), incomeYear(4), incomeYear(3)],
        quarterly: [],
      },
      balance: {
        annual: [
          balanceYear(5, { totalShareholderEquity: 57e9, retainedEarnings: 40e9 }),
          balanceYear(4, { totalShareholderEquity: 70e9, retainedEarnings: 55e9 }),
          balanceYear(3, { totalShareholderEquity: 90e9, retainedEarnings: 80e9 }),
        ],
        quarterly: [],
      },
      cashflow: {
        annual: [cashYear(5), cashYear(4), cashYear(3)],
        quarterly: [],
      },
      earnings: emptyEarnings(),
    });

    const roic = evaluation.criteria.find((c) => c.key === "return_on_invested_capital");
    const roe = evaluation.criteria.find((c) => c.key === "return_on_equity");
    const re = evaluation.criteria.find((c) => c.key === "retained_earnings");

    expect(roe).toBeUndefined();
    expect(roic).toBeDefined();
    expect(roic?.numericValue).not.toBeNull();
    // 94/57 ≈ 165% ROE would have been the old displayed figure.
    expect(roic?.numericValue ?? 0).toBeLessThan(120);
    expect(roic?.status).toBe("pass");
    expect(re?.status).toBe("pass");
    expect(re?.value).toMatch(/Buybacks/i);
  });

  it("still flags declining retained earnings when there are no buybacks", () => {
    const evaluation = evaluateMoat({
      overview: overview({ sector: "Consumer Defensive", returnOnEquity: 0.18 }),
      income: {
        annual: [incomeYear(5), incomeYear(4), incomeYear(3)],
        quarterly: [],
      },
      balance: {
        annual: [
          balanceYear(5, { retainedEarnings: 40e9, totalShareholderEquity: 200e9 }),
          balanceYear(4, { retainedEarnings: 70e9, totalShareholderEquity: 200e9 }),
          balanceYear(3, { retainedEarnings: 100e9, totalShareholderEquity: 200e9 }),
        ],
        quarterly: [],
      },
      cashflow: {
        annual: [
          cashYear(5, { shareRepurchase: 0, freeCashFlow: 40e9 }),
          cashYear(4, { shareRepurchase: 0, freeCashFlow: 40e9 }),
          cashYear(3, { shareRepurchase: 0, freeCashFlow: 40e9 }),
        ],
        quarterly: [],
      },
      earnings: emptyEarnings(),
    });

    const re = evaluation.criteria.find((c) => c.key === "retained_earnings");
    expect(re?.status).not.toBe("pass");
  });
});
