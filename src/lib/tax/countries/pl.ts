/**
 * Poland (PL) tax report module.
 * Podatek Belki: 19% flat tax on capital gains and dividends.
 * FIFO cost basis mandatory. No annual exemption.
 * PIT-38 form field mapping.
 */
import type { TaxReportInput, TaxReport, FormField } from "../types";
import { calculateRealizedGains, aggregateDividends, runDataQualityChecks } from "../engine";

const BELKA_RATE = 0.19;

export function generatePL(input: TaxReportInput): TaxReport {
  const { taxYear, transactions, exchangeRates, baseCurrency } = input;

  const gains = calculateRealizedGains(transactions, taxYear, "fifo", exchangeRates, baseCurrency);
  const dividends = aggregateDividends(transactions, taxYear, exchangeRates, baseCurrency, ["PL"]);

  for (const g of gains) {
    g.taxableGain = g.gain;
  }

  const totalGain = gains.filter((g) => g.gain > 0).reduce((s, g) => s + g.gain, 0);
  const totalLoss = gains.filter((g) => g.gain < 0).reduce((s, g) => s + g.gain, 0);
  const netGain = totalGain + totalLoss;

  const totalGrossDividends = dividends.reduce((s, d) => s + d.grossAmount, 0);
  const totalWithholdingTax = dividends.reduce((s, d) => s + d.withholdingTax, 0);

  const totalProceeds = gains.reduce((s, g) => s + g.proceeds, 0);
  const totalCostBasis = gains.reduce((s, g) => s + g.costBasis, 0);

  const taxableIncome = Math.max(0, netGain) + totalGrossDividends;
  const estimatedTax = round(taxableIncome * BELKA_RATE);

  const formFields: FormField[] = [
    { label: "Przychód z odpłatnego zbycia", reference: "PIT-38 Poz. 20", value: round(totalProceeds) },
    { label: "Koszty uzyskania przychodów", reference: "PIT-38 Poz. 21", value: round(totalCostBasis) },
    { label: "Dochód", reference: "PIT-38 Poz. 22", value: round(Math.max(0, netGain)) },
    { label: "Strata", reference: "PIT-38 Poz. 23", value: round(Math.abs(Math.min(0, netGain))) },
    { label: "Dywidendy", reference: "PIT-38", value: round(totalGrossDividends) },
    { label: "Podatek zagraniczny", reference: "PIT-38", value: round(totalWithholdingTax) },
    { label: "Podatek (19%)", reference: "PIT-38 Poz. 33", value: estimatedTax },
  ];

  const dataQuality = runDataQualityChecks(transactions, taxYear, gains, dividends, input.jan1ValueEUR, input.dec31ValueEUR);

  return {
    country: "PL",
    taxYear,
    baseCurrency,
    costBasisMethod: "fifo",
    generatedAt: new Date().toISOString(),
    realizedGains: gains,
    totalRealizedGain: round(totalGain),
    totalRealizedLoss: round(totalLoss),
    netRealizedGain: round(netGain),
    dividends,
    totalGrossDividends: round(totalGrossDividends),
    totalWithholdingTax: round(totalWithholdingTax),
    totalNetDividends: round(totalGrossDividends - totalWithholdingTax),
    estimatedTaxableIncome: round(taxableIncome),
    estimatedTax,
    formFields,
    dataQuality,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
