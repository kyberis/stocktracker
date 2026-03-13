/**
 * Netherlands (NL) tax report module.
 * Box 3 — vermogensrendementsheffing (wealth tax on deemed return).
 * No tax on realized gains; tax based on Jan 1 asset snapshot × deemed rates.
 */
import type { TaxReportInput, TaxReport, Box3Category, FormField } from "../types";
import { aggregateDividends, runDataQualityChecks } from "../engine";

/**
 * Deemed return rates per asset category per year.
 * Published annually by the Dutch tax authority.
 */
const DEEMED_RATES: Record<number, { bank: number; investments: number; debts: number }> = {
  2023: { bank: 0.36, investments: 6.17, debts: 2.57 },
  2024: { bank: 1.44, investments: 6.04, debts: 2.47 },
  2025: { bank: 1.44, investments: 6.04, debts: 2.47 }, // same until updated
  2026: { bank: 1.44, investments: 6.04, debts: 2.47 }, // placeholder
};

const THRESHOLDS: Record<number, number> = {
  2023: 57000,
  2024: 57000,
  2025: 57684,
  2026: 57684,
};

const BOX3_TAX_RATE = 0.36;

export function generateNL(input: TaxReportInput): TaxReport {
  const { taxYear, transactions, exchangeRates, baseCurrency } = input;

  const investmentsJan1 = input.jan1ValueEUR ?? 0;
  const bankJan1 = input.bankDepositsJan1EUR ?? 0;
  const debtsJan1 = input.debtsJan1EUR ?? 0;
  const totalWealth = investmentsJan1 + bankJan1 - debtsJan1;

  const rates = DEEMED_RATES[taxYear] ?? DEEMED_RATES[2025];
  const threshold = THRESHOLDS[taxYear] ?? 57684;

  const categories: Box3Category[] = [
    {
      label: "Banktegoeden (Bank deposits)",
      value: round(bankJan1),
      deemedReturnRate: rates.bank,
      deemedReturn: round(bankJan1 * rates.bank / 100),
    },
    {
      label: "Overige beleggingen (Investments)",
      value: round(investmentsJan1),
      deemedReturnRate: rates.investments,
      deemedReturn: round(investmentsJan1 * rates.investments / 100),
    },
    {
      label: "Schulden (Debts)",
      value: round(-debtsJan1),
      deemedReturnRate: rates.debts,
      deemedReturn: round(-debtsJan1 * rates.debts / 100),
    },
  ];

  const totalDeemedReturn = categories.reduce((s, c) => s + c.deemedReturn, 0);
  const taxableBase = Math.max(0, totalWealth - threshold);

  // Weighted deemed return applied to taxable base
  const weightedRate = totalWealth > 0 ? totalDeemedReturn / totalWealth : 0;
  const taxableDeemedReturn = round(taxableBase * weightedRate);
  const box3Tax = round(taxableDeemedReturn * BOX3_TAX_RATE);

  // Still aggregate dividends for informational purposes / actual return comparison
  const dividends = aggregateDividends(transactions, taxYear, exchangeRates, baseCurrency, ["NL"]);
  const totalGrossDividends = dividends.reduce((s, d) => s + d.grossAmount, 0);
  const totalWithholdingTax = dividends.reduce((s, d) => s + d.withholdingTax, 0);

  const formFields: FormField[] = [
    { label: "Totaal vermogen (total wealth Jan 1)", reference: "Box 3", value: round(totalWealth) },
    { label: "Heffingsvrij vermogen (threshold)", reference: "Box 3", value: threshold },
    { label: "Grondslag (taxable base)", reference: "Box 3", value: round(taxableBase) },
    { label: "Forfaitair rendement (deemed return)", reference: "Box 3", value: round(taxableDeemedReturn) },
    { label: "Belasting Box 3 (36%)", reference: "Box 3", value: box3Tax },
  ];

  const dataQuality = runDataQualityChecks(
    transactions, taxYear, [], dividends,
    input.jan1ValueEUR, input.dec31ValueEUR,
    input.jan1Estimated, input.dec31Estimated,
  );

  return {
    country: "NL",
    taxYear,
    baseCurrency,
    costBasisMethod: "fifo",
    generatedAt: new Date().toISOString(),

    realizedGains: [],
    totalRealizedGain: 0,
    totalRealizedLoss: 0,
    netRealizedGain: 0,

    dividends,
    totalGrossDividends: round(totalGrossDividends),
    totalWithholdingTax: round(totalWithholdingTax),
    totalNetDividends: round(totalGrossDividends - totalWithholdingTax),

    estimatedTaxableIncome: round(taxableDeemedReturn),
    estimatedTax: box3Tax,

    box3Categories: categories,
    box3TotalWealth: round(totalWealth),
    box3WealthEstimated: !!input.jan1Estimated,
    box3Threshold: threshold,
    box3TaxableBase: round(taxableBase),
    box3DeemedReturn: round(taxableDeemedReturn),
    box3TaxRate: BOX3_TAX_RATE,

    formFields,
    dataQuality,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
