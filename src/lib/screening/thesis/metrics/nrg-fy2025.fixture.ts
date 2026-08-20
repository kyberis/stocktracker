import type { StatementYear } from "./types";

/** NRG Energy FY2022–FY2025, frozen from the integrity spec (verified 20 Aug 2026). */
export const NRG_AS_OF = "2026-08-20T00:00:00.000Z";
export const NRG_FILED = "2026-02-24";
export const NRG_PRICE = 115.36;
export const NRG_EPS_TTM = 4.01;
export const NRG_SHARES_FY25 = 195_000_000;
export const NRG_SHARES_FY22 = 236_000_000;
export const NRG_HIGH_52W = NRG_PRICE / 0.61;
export const NRG_TARGET = NRG_PRICE * 1.754;

const REV_2022 = 31_543_000_000;
const REV_2025 = REV_2022 * (0.991 ** 3);

export const nrgStatementYears: StatementYear[] = [
  {
    year: 2022,
    revenue: REV_2022,
    ebit: 1_200_000_000,
    interestExpense: 600_000_000,
    ebitda: 2_400_000_000,
    netIncome: 1_200_000_000,
    freeCashFlow: 800_000_000,
    grossMarginPct: 22,
    sharesDiluted: NRG_SHARES_FY22,
    totalDebt: 8_000_000_000,
    cash: 1_000_000_000,
    shortTermInvestments: 0,
    totalEquity: 4_000_000_000,
    incomeTaxExpense: 250_000_000,
    incomeBeforeTax: 1_450_000_000,
    annualPe: 12,
    eps: 4.2,
  },
  {
    year: 2023,
    revenue: (REV_2022 + REV_2025) / 2,
    ebit: 900_000_000,
    interestExpense: 650_000_000,
    ebitda: 2_200_000_000,
    netIncome: 500_000_000,
    freeCashFlow: -400_000_000,
    grossMarginPct: 20,
    sharesDiluted: 222_000_000,
    totalDebt: 9_000_000_000,
    cash: 900_000_000,
    shortTermInvestments: 0,
    totalEquity: 3_800_000_000,
    incomeTaxExpense: 80_000_000,
    incomeBeforeTax: 580_000_000,
    annualPe: 14,
    eps: 2.1,
  },
  {
    year: 2024,
    revenue: REV_2022 * (0.991 ** 2),
    ebit: 1_400_000_000,
    interestExpense: 700_000_000,
    ebitda: 3_000_000_000,
    netIncome: 700_000_000,
    freeCashFlow: 1_141_000_000,
    grossMarginPct: 21,
    sharesDiluted: 208_000_000,
    totalDebt: 10_000_000_000,
    cash: 800_000_000,
    shortTermInvestments: 0,
    totalEquity: 3_600_000_000,
    incomeTaxExpense: 140_000_000,
    incomeBeforeTax: 840_000_000,
    annualPe: 16,
    eps: 3.2,
  },
  {
    year: 2025,
    filingDate: NRG_FILED,
    revenue: REV_2025,
    ebit: 1_850_000_000,
    interestExpense: 772_000_000,
    ebitda: 3_805_000_000,
    netIncome: 864_000_000,
    freeCashFlow: 766_000_000,
    grossMarginPct: 23,
    sharesDiluted: NRG_SHARES_FY25,
    totalDebt: 12_028_000_000,
    cash: 0,
    shortTermInvestments: 0,
    totalEquity: 3_500_000_000,
    incomeTaxExpense: 180_000_000,
    incomeBeforeTax: 1_044_000_000,
    annualPe: 22,
    eps: 4.43,
  },
];
