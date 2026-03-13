/**
 * Norway (NO) tax report module.
 * Effective rate: 22% × 1.72 uplift factor = 37.84% on capital gains.
 * Skjermingsfradrag (shielding deduction) based on gov bond rate × cost basis.
 * Average cost basis. RF-1159 form field mapping.
 */
import type { TaxReportInput, TaxReport, FormField } from "../types";
import { calculateRealizedGains, aggregateDividends, runDataQualityChecks } from "../engine";

const BASE_TAX_RATE = 0.22;
const UPLIFT_FACTOR = 1.72;
const EFFECTIVE_RATE = BASE_TAX_RATE * UPLIFT_FACTOR; // 0.3784

const SHIELDING_RATE: Record<number, number> = {
  2023: 3.2,
  2024: 3.6,
  2025: 3.6, // placeholder
  2026: 3.6,
};

export function generateNO(input: TaxReportInput): TaxReport {
  const { taxYear, transactions, exchangeRates, baseCurrency } = input;

  const gains = calculateRealizedGains(transactions, taxYear, "average", exchangeRates, baseCurrency);
  const dividends = aggregateDividends(transactions, taxYear, exchangeRates, baseCurrency, ["NO"]);

  const totalGain = gains.filter((g) => g.gain > 0).reduce((s, g) => s + g.gain, 0);
  const totalLoss = gains.filter((g) => g.gain < 0).reduce((s, g) => s + g.gain, 0);
  const netGain = totalGain + totalLoss;

  const totalGrossDividends = dividends.reduce((s, d) => s + d.grossAmount, 0);
  const totalWithholdingTax = dividends.reduce((s, d) => s + d.withholdingTax, 0);

  // Shielding deduction on cost basis of shares held
  const shieldingRate = SHIELDING_RATE[taxYear] ?? 3.6;
  const totalCostBasis = gains.reduce((s, g) => s + g.costBasis, 0);
  const shieldingDeduction = round(totalCostBasis * shieldingRate / 100);

  const totalCapitalIncome = Math.max(0, netGain) + totalGrossDividends;
  const taxableAfterShielding = Math.max(0, totalCapitalIncome - shieldingDeduction);

  for (const g of gains) {
    g.taxableGain = g.gain;
  }

  // Uplift: taxable income × 1.72, then taxed at 22%
  const uplifted = round(taxableAfterShielding * UPLIFT_FACTOR);
  const estimatedTax = round(uplifted * BASE_TAX_RATE);

  const formFields: FormField[] = [
    { label: "Gevinst ved realisasjon av aksjer", reference: "RF-1159 Post 3.1.8", value: round(Math.max(0, netGain)) },
    { label: "Tap ved realisasjon av aksjer", reference: "RF-1159 Post 3.3.8", value: round(Math.abs(totalLoss)) },
    { label: "Utbytte", reference: "RF-1159 Post 3.1.6", value: round(totalGrossDividends) },
    { label: `Skjermingsfradrag (${shieldingRate}%)`, reference: "RF-1159 Post 3.1.6", value: shieldingDeduction },
    { label: "Skattepliktig inntekt (etter oppjustering)", reference: "RF-1159", value: round(uplifted) },
    { label: "Utenlandsk kildeskatt", reference: "RF-1159", value: round(totalWithholdingTax) },
    { label: "Beregnet skatt (22%)", reference: "Skattemelding", value: estimatedTax },
  ];

  const dataQuality = runDataQualityChecks(transactions, taxYear, gains, dividends, input.jan1ValueEUR, input.dec31ValueEUR);

  return {
    country: "NO",
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
    estimatedTaxableIncome: round(taxableAfterShielding),
    estimatedTax,
    noShieldingDeduction: shieldingDeduction,
    noUpliftFactor: UPLIFT_FACTOR,
    formFields,
    dataQuality,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
