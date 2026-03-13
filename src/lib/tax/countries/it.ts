/**
 * Italy (IT) tax report module.
 * Quadro RT (capital gains, 26% flat), Quadro RW (foreign asset monitoring),
 * IVAFE (0.2% on foreign financial assets), regime dichiarativo (LIFO) vs amministrato (average).
 */
import type { TaxReportInput, TaxReport, FormField, QuadroRWEntry } from "../types";
import { calculateRealizedGains, aggregateDividends, runDataQualityChecks } from "../engine";

const IMPOSTA_SOSTITUTIVA_RATE = 0.26;
const IVAFE_RATE = 0.002;

export function generateIT(input: TaxReportInput): TaxReport {
  const { taxYear, transactions, exchangeRates, baseCurrency, italyRegime = "dichiarativo" } = input;

  const method = italyRegime === "dichiarativo" ? "lifo" : "average";
  const gains = calculateRealizedGains(transactions, taxYear, method as "lifo" | "average", exchangeRates, baseCurrency);
  const dividends = aggregateDividends(transactions, taxYear, exchangeRates, baseCurrency, ["IT"]);

  for (const g of gains) {
    g.taxableGain = g.gain;
  }

  const totalGain = gains.filter((g) => g.gain > 0).reduce((s, g) => s + g.gain, 0);
  const totalLoss = gains.filter((g) => g.gain < 0).reduce((s, g) => s + g.gain, 0);
  const netGain = totalGain + totalLoss;
  const carryForwardLosses = Math.abs(Math.min(0, totalLoss));

  const totalGrossDividends = dividends.reduce((s, d) => s + d.grossAmount, 0);
  const totalWithholdingTax = dividends.reduce((s, d) => s + d.withholdingTax, 0);

  const taxOnGains = Math.max(0, netGain) * IMPOSTA_SOSTITUTIVA_RATE;
  const taxOnDividends = totalGrossDividends * IMPOSTA_SOSTITUTIVA_RATE;

  // Quadro RW — foreign asset monitoring
  const quadroRW: QuadroRWEntry[] = [];
  let totalIVAFE = 0;
  if (input.dec31ValueEUR !== undefined && input.dec31ValueEUR > 0) {
    const jan1Val = input.jan1ValueEUR ?? 0;
    const ivafe = round(input.dec31ValueEUR * IVAFE_RATE);
    totalIVAFE = ivafe;
    quadroRW.push({
      description: "Portfolio (securities)",
      broker: input.brokerName || "Foreign Broker",
      country: input.brokerCountry || "Unknown",
      code: "20",
      jan1Value: round(jan1Val),
      dec31Value: round(input.dec31ValueEUR),
      ivafe,
    });
  }

  const estimatedTax = round(taxOnGains + taxOnDividends + totalIVAFE);

  const totalProceeds = gains.reduce((s, g) => s + g.proceeds, 0);
  const totalCostBasis = gains.reduce((s, g) => s + g.costBasis, 0);

  const formFields: FormField[] = [
    { label: "Corrispettivi (total proceeds)", reference: "RT21 col. 1", value: round(totalProceeds) },
    { label: "Costo o valore di acquisto", reference: "RT22 col. 1", value: round(totalCostBasis) },
    { label: "Plusvalenze nette", reference: "RT23 col. 1", value: round(Math.max(0, netGain)) },
    { label: "Minusvalenze riportabili", reference: "RT24 col. 1", value: round(carryForwardLosses), note: "4-year carry forward" },
    { label: "Imposta sostitutiva (26%)", reference: "RT26 col. 1", value: round(taxOnGains) },
    { label: "Dividendi lordi", reference: "RL1 col. 1", value: round(totalGrossDividends) },
    { label: "IVAFE dovuta", reference: "RW6 col. 1", value: round(totalIVAFE) },
  ];

  const dataQuality = runDataQualityChecks(
    transactions, taxYear, gains, dividends,
    input.jan1ValueEUR, input.dec31ValueEUR,
    input.jan1Estimated, input.dec31Estimated,
  );

  return {
    country: "IT",
    taxYear,
    baseCurrency,
    costBasisMethod: method,
    generatedAt: new Date().toISOString(),

    realizedGains: gains,
    totalRealizedGain: round(totalGain),
    totalRealizedLoss: round(totalLoss),
    netRealizedGain: round(netGain),

    dividends,
    totalGrossDividends: round(totalGrossDividends),
    totalWithholdingTax: round(totalWithholdingTax),
    totalNetDividends: round(totalGrossDividends - totalWithholdingTax),

    estimatedTaxableIncome: round(Math.max(0, netGain) + totalGrossDividends),
    estimatedTax,

    quadroRW,
    totalIVAFE: round(totalIVAFE),
    italyRegime,
    carryForwardLosses: round(carryForwardLosses),

    formFields,
    dataQuality,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
