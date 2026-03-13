/**
 * United Kingdom (GB) tax report module.
 * Capital Gains Tax: 10% basic rate / 20% higher rate (18%/24% for residential property, N/A here).
 * Section 104 share pooling (weighted average cost basis).
 * Annual Exempt Amount: £3,000 (2024/25 onwards). Dividend allowance: £1,000.
 */
import type { TaxReportInput, TaxReport, FormField } from "../types";
import { calculateRealizedGains, aggregateDividends, runDataQualityChecks } from "../engine";

const ANNUAL_EXEMPT_AMOUNT: Record<number, number> = {
  2023: 6000,  // 2023/24 tax year
  2024: 3000,  // 2024/25 onwards
  2025: 3000,
  2026: 3000,
};

const CGT_BASIC_RATE = 0.10;
const CGT_HIGHER_RATE = 0.20;
const DIVIDEND_ALLOWANCE = 1000; // 2024/25 onwards (was 2000 in 2023/24)
const DIVIDEND_BASIC_RATE = 0.0875;
const DIVIDEND_HIGHER_RATE = 0.3375;

export function generateGB(input: TaxReportInput): TaxReport {
  const { taxYear, transactions, exchangeRates, baseCurrency } = input;

  const gains = calculateRealizedGains(transactions, taxYear, "average", exchangeRates, baseCurrency);
  const dividends = aggregateDividends(transactions, taxYear, exchangeRates, baseCurrency, ["GB"]);

  for (const g of gains) {
    g.taxableGain = g.gain;
    g.adjustmentLabel = "Section 104 pool";
  }

  const totalGain = gains.filter((g) => g.gain > 0).reduce((s, g) => s + g.gain, 0);
  const totalLoss = gains.filter((g) => g.gain < 0).reduce((s, g) => s + g.gain, 0);
  const netGain = totalGain + totalLoss;

  const exemption = ANNUAL_EXEMPT_AMOUNT[taxYear] ?? 3000;
  const taxableGain = Math.max(0, netGain - exemption);
  const cgtRate = CGT_HIGHER_RATE; // conservative — user would need to specify income level for basic rate
  const cgtTax = round(taxableGain * cgtRate);

  const totalGrossDividends = dividends.reduce((s, d) => s + d.grossAmount, 0);
  const totalWithholdingTax = dividends.reduce((s, d) => s + d.withholdingTax, 0);
  const taxableDividends = Math.max(0, totalGrossDividends - DIVIDEND_ALLOWANCE);
  const dividendTax = round(taxableDividends * DIVIDEND_HIGHER_RATE);

  const estimatedTax = cgtTax + dividendTax;

  const formFields: FormField[] = [
    { label: "Total gains before losses", reference: "SA108 Box 21", value: round(totalGain) },
    { label: "Total losses", reference: "SA108 Box 22", value: round(Math.abs(totalLoss)) },
    { label: "Net gains", reference: "SA108 Box 23", value: round(netGain) },
    { label: "Annual exempt amount", reference: "SA108 Box 24", value: exemption },
    { label: "Taxable gains", reference: "SA108 Box 25", value: round(taxableGain) },
    { label: "CGT due", reference: "SA108 Box 26", value: cgtTax },
    { label: "Dividends received", reference: "SA100 Box 4", value: round(totalGrossDividends) },
    { label: "Dividend tax due", reference: "SA100 Box 5", value: dividendTax },
  ];

  const dataQuality = runDataQualityChecks(transactions, taxYear, gains, dividends, input.jan1ValueEUR, input.dec31ValueEUR);

  return {
    country: "GB",
    taxYear,
    baseCurrency,
    costBasisMethod: "average",
    generatedAt: new Date().toISOString(),
    realizedGains: gains,
    totalRealizedGain: round(totalGain),
    totalRealizedLoss: round(totalLoss),
    netRealizedGain: round(netGain),
    dividends,
    totalGrossDividends: round(totalGrossDividends),
    totalWithholdingTax: round(totalWithholdingTax),
    totalNetDividends: round(totalGrossDividends - totalWithholdingTax),
    estimatedTaxableIncome: round(taxableGain + taxableDividends),
    estimatedTax: round(estimatedTax),
    gbAnnualExemption: exemption,
    gbCgtRate: cgtRate,
    gbDividendAllowance: DIVIDEND_ALLOWANCE,
    formFields,
    dataQuality,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
