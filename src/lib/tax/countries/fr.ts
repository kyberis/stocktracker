/**
 * France (FR) tax report module.
 * PFU (Prélèvement Forfaitaire Unique) — 30% flat tax (12.8% IR + 17.2% PS).
 * Weighted-average cost basis, Déclaration 2074 form mapping.
 */
import type { TaxReportInput, TaxReport, FormField } from "../types";
import { calculateRealizedGains, aggregateDividends, runDataQualityChecks } from "../engine";

const PFU_IR_RATE = 0.128;
const PFU_SOCIAL_RATE = 0.172;
const PFU_TOTAL = PFU_IR_RATE + PFU_SOCIAL_RATE;

export function generateFR(input: TaxReportInput): TaxReport {
  const { taxYear, transactions, exchangeRates, baseCurrency } = input;

  const gains = calculateRealizedGains(transactions, taxYear, "average", exchangeRates, baseCurrency);
  const dividends = aggregateDividends(transactions, taxYear, exchangeRates, baseCurrency, ["FR"]);

  const totalGain = gains.filter((g) => g.gain > 0).reduce((s, g) => s + g.gain, 0);
  const totalLoss = gains.filter((g) => g.gain < 0).reduce((s, g) => s + Math.abs(g.gain), 0);
  const netGain = gains.reduce((s, g) => s + g.gain, 0);

  const totalGrossDividends = dividends.reduce((s, d) => s + d.grossAmount, 0);
  const totalWithholdingTax = dividends.reduce((s, d) => s + d.withholdingTax, 0);

  const totalInvestmentIncome = Math.max(0, netGain) + totalGrossDividends;
  const pfuIR = totalInvestmentIncome * PFU_IR_RATE;
  const pfuSocial = totalInvestmentIncome * PFU_SOCIAL_RATE;
  const estimatedTax = pfuIR + pfuSocial;

  for (const g of gains) {
    g.taxableGain = g.gain;
  }

  const formFields: FormField[] = [
    { label: "Plus-values nettes", reference: "Case 3VG", value: round(Math.max(0, netGain)) },
    { label: "Moins-values nettes (reportable)", reference: "Case 3VH", value: round(totalLoss), note: "Carry forward 10 years" },
    { label: "Dividendes bruts", reference: "Case 2DC", value: round(totalGrossDividends) },
    { label: "Crédit d'impôt (retenue à la source)", reference: "Case 2AB", value: round(totalWithholdingTax) },
    { label: "Revenus soumis au PFU", reference: "Case 2CK", value: round(totalInvestmentIncome) },
    { label: "IR sur revenus mobiliers (12.8%)", reference: "Case 2CK-IR", value: round(pfuIR) },
    { label: "Prélèvements sociaux (17.2%)", reference: "Case 2CK-PS", value: round(pfuSocial) },
  ];

  const dataQuality = runDataQualityChecks(
    transactions, taxYear, gains, dividends,
    input.jan1ValueEUR, input.dec31ValueEUR,
    input.jan1Estimated, input.dec31Estimated,
  );

  return {
    country: "FR",
    taxYear,
    baseCurrency,
    costBasisMethod: "average",
    generatedAt: new Date().toISOString(),

    realizedGains: gains,
    totalRealizedGain: round(totalGain),
    totalRealizedLoss: round(-totalLoss),
    netRealizedGain: round(netGain),

    dividends,
    totalGrossDividends: round(totalGrossDividends),
    totalWithholdingTax: round(totalWithholdingTax),
    totalNetDividends: round(totalGrossDividends - totalWithholdingTax),

    estimatedTaxableIncome: round(totalInvestmentIncome),
    estimatedTax: round(estimatedTax),

    pfuIncomeTax: round(pfuIR),
    pfuSocialContributions: round(pfuSocial),

    formFields,
    dataQuality,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
