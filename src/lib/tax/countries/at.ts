/**
 * Austria (AT) tax report module.
 * KESt (Kapitalertragsteuer) 27.5% flat on capital gains and dividends.
 * Average cost basis (Durchschnittsmethode). Verlustausgleich (loss offset within year).
 * Form E1kv field mapping.
 */
import type { TaxReportInput, TaxReport, FormField } from "../types";
import { calculateRealizedGains, aggregateDividends, runDataQualityChecks } from "../engine";

const KEST_RATE = 0.275;

export function generateAT(input: TaxReportInput): TaxReport {
  const { taxYear, transactions, exchangeRates, baseCurrency } = input;

  const gains = calculateRealizedGains(transactions, taxYear, "average", exchangeRates, baseCurrency);
  const dividends = aggregateDividends(transactions, taxYear, exchangeRates, baseCurrency, ["AT"]);

  for (const g of gains) {
    g.taxableGain = g.gain;
  }

  const totalGain = gains.filter((g) => g.gain > 0).reduce((s, g) => s + g.gain, 0);
  const totalLoss = gains.filter((g) => g.gain < 0).reduce((s, g) => s + g.gain, 0);
  const netGain = totalGain + totalLoss;

  const totalGrossDividends = dividends.reduce((s, d) => s + d.grossAmount, 0);
  const totalWithholdingTax = dividends.reduce((s, d) => s + d.withholdingTax, 0);

  // Verlustausgleich: gains and dividends offset within the year
  const totalCapitalIncome = Math.max(0, netGain) + totalGrossDividends;
  const verlustausgleich = netGain < 0 ? Math.min(Math.abs(netGain), totalGrossDividends) : 0;
  const taxableIncome = Math.max(0, totalCapitalIncome - verlustausgleich);
  const estimatedTax = round(taxableIncome * KEST_RATE);

  const formFields: FormField[] = [
    { label: "Einkünfte aus Kapitalvermögen (Veräußerungsgewinne)", reference: "E1kv Zeile 981", value: round(Math.max(0, netGain)) },
    { label: "Verluste aus Kapitalvermögen", reference: "E1kv Zeile 982", value: round(Math.abs(totalLoss)) },
    { label: "Dividendenerträge", reference: "E1kv Zeile 983", value: round(totalGrossDividends) },
    { label: "Verlustausgleich", reference: "E1kv Zeile 984", value: round(verlustausgleich), note: "Losses offset against dividends" },
    { label: "Anrechenbare ausländische Quellensteuer", reference: "E1kv Zeile 998", value: round(totalWithholdingTax) },
    { label: "Steuerpflichtiges Einkommen aus Kapitalvermögen", reference: "E1kv", value: round(taxableIncome) },
    { label: "KESt (27.5%)", reference: "E1kv", value: estimatedTax },
  ];

  const dataQuality = runDataQualityChecks(transactions, taxYear, gains, dividends, input.jan1ValueEUR, input.dec31ValueEUR);

  return {
    country: "AT",
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
    estimatedTaxableIncome: round(taxableIncome),
    estimatedTax,
    atKestRate: KEST_RATE,
    formFields,
    dataQuality,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
