/**
 * Portugal (PT) tax report module.
 * 28% flat tax on capital gains and dividends (general regime).
 * NHR (Non-Habitual Resident) regime: potential exemption on foreign-source dividends for 10 years.
 * FIFO cost basis. Modelo 3 Anexo J (foreign income) field mapping.
 */
import type { TaxReportInput, TaxReport, FormField } from "../types";
import { calculateRealizedGains, aggregateDividends, runDataQualityChecks } from "../engine";

const IRS_RATE = 0.28;

export function generatePT(input: TaxReportInput): TaxReport {
  const { taxYear, transactions, exchangeRates, baseCurrency, portugalNhr } = input;

  const gains = calculateRealizedGains(transactions, taxYear, "fifo", exchangeRates, baseCurrency);
  const dividends = aggregateDividends(transactions, taxYear, exchangeRates, baseCurrency, ["PT"]);

  for (const g of gains) {
    g.taxableGain = g.gain;
  }

  const totalGain = gains.filter((g) => g.gain > 0).reduce((s, g) => s + g.gain, 0);
  const totalLoss = gains.filter((g) => g.gain < 0).reduce((s, g) => s + g.gain, 0);
  const netGain = totalGain + totalLoss;

  const totalGrossDividends = dividends.reduce((s, d) => s + d.grossAmount, 0);
  const totalWithholdingTax = dividends.reduce((s, d) => s + d.withholdingTax, 0);
  const foreignDividends = dividends.filter((d) => !d.isDomestic).reduce((s, d) => s + d.grossAmount, 0);

  // NHR: foreign dividends may be exempt if sourced from a treaty country
  const nhrExemptDividends = portugalNhr ? foreignDividends : 0;
  const taxableDividends = totalGrossDividends - nhrExemptDividends;
  const taxableIncome = Math.max(0, netGain) + taxableDividends;
  const estimatedTax = round(taxableIncome * IRS_RATE);

  const formFields: FormField[] = [
    { label: "Mais-valias (capital gains)", reference: "Anexo J Quadro 9.2A", value: round(Math.max(0, netGain)) },
    { label: "Menos-valias (capital losses)", reference: "Anexo J Quadro 9.2A", value: round(Math.abs(totalLoss)) },
    { label: "Dividendos brutos", reference: "Anexo J Quadro 8", value: round(totalGrossDividends) },
    { label: "Imposto pago no estrangeiro", reference: "Anexo J Quadro 8", value: round(totalWithholdingTax) },
  ];

  if (portugalNhr) {
    formFields.push(
      { label: "NHR exempt foreign dividends", reference: "Anexo L", value: round(nhrExemptDividends), note: "10-year NHR regime" },
    );
  }

  formFields.push(
    { label: "Rendimento tributável", reference: "IRS", value: round(taxableIncome) },
    { label: "Imposto (28%)", reference: "IRS", value: estimatedTax },
  );

  const dataQuality = runDataQualityChecks(transactions, taxYear, gains, dividends, input.jan1ValueEUR, input.dec31ValueEUR);

  return {
    country: "PT",
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
    ptNhrApplied: !!portugalNhr,
    formFields,
    dataQuality,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
