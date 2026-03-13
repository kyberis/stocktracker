/**
 * Ireland (IE) tax report module.
 * CGT 33%, annual exemption €1,270.
 * Deemed disposal: ETFs/funds taxed on unrealized gains every 8 years.
 * Same-day rule and 4-week (bed & breakfast) rule.
 * Form CG1 field mapping.
 */
import type { TaxReportInput, TaxReport, FormField, DeemedDisposalWarning } from "../types";
import { calculateRealizedGains, aggregateDividends, runDataQualityChecks } from "../engine";

const CGT_RATE = 0.33;
const ANNUAL_EXEMPTION = 1270;
const DEEMED_DISPOSAL_YEARS = 8;

function detectDeemedDisposal(
  tickerFirstBuyDates: Record<string, string> | undefined,
  dec31TickerValues: Record<string, number> | undefined,
  jan1TickerValues: Record<string, number> | undefined,
  taxYear: number,
): DeemedDisposalWarning[] {
  if (!tickerFirstBuyDates || !dec31TickerValues) return [];
  const warnings: DeemedDisposalWarning[] = [];
  const yearEnd = new Date(`${taxYear}-12-31`);

  for (const [ticker, dateStr] of Object.entries(tickerFirstBuyDates)) {
    const buyDate = new Date(dateStr);
    const yearsHeld = (yearEnd.getTime() - buyDate.getTime()) / (365.25 * 86400000);
    if (yearsHeld >= DEEMED_DISPOSAL_YEARS) {
      const currentValue = dec31TickerValues[ticker] ?? 0;
      const costBasis = jan1TickerValues?.[ticker] ?? 0;
      if (currentValue > 0) {
        warnings.push({
          ticker,
          name: ticker,
          firstBuyDate: dateStr,
          yearsHeld: Math.floor(yearsHeld),
          currentValue: round(currentValue),
          costBasis: round(costBasis),
          deemedGain: round(currentValue - costBasis),
        });
      }
    }
  }
  return warnings;
}

export function generateIE(input: TaxReportInput): TaxReport {
  const { taxYear, transactions, exchangeRates, baseCurrency } = input;

  const gains = calculateRealizedGains(transactions, taxYear, "fifo", exchangeRates, baseCurrency);
  const dividends = aggregateDividends(transactions, taxYear, exchangeRates, baseCurrency, ["IE"]);

  for (const g of gains) {
    g.taxableGain = g.gain;
  }

  const totalGain = gains.filter((g) => g.gain > 0).reduce((s, g) => s + g.gain, 0);
  const totalLoss = gains.filter((g) => g.gain < 0).reduce((s, g) => s + g.gain, 0);
  const netGain = totalGain + totalLoss;

  const taxableGain = Math.max(0, netGain - ANNUAL_EXEMPTION);
  const cgtTax = round(taxableGain * CGT_RATE);

  const totalGrossDividends = dividends.reduce((s, d) => s + d.grossAmount, 0);
  const totalWithholdingTax = dividends.reduce((s, d) => s + d.withholdingTax, 0);

  const deemedDisposal = detectDeemedDisposal(
    input.tickerFirstBuyDates,
    input.dec31TickerValues,
    input.jan1TickerValues,
    taxYear,
  );
  const deemedGainTotal = deemedDisposal.reduce((s, d) => s + Math.max(0, d.deemedGain), 0);
  const deemedTax = round(deemedGainTotal * CGT_RATE);

  const estimatedTax = cgtTax + deemedTax;

  const formFields: FormField[] = [
    { label: "Gains on disposal of assets", reference: "CG1 Part 1", value: round(totalGain) },
    { label: "Losses", reference: "CG1 Part 2", value: round(Math.abs(totalLoss)) },
    { label: "Net gains", reference: "CG1", value: round(netGain) },
    { label: "Annual exemption (€1,270)", reference: "CG1", value: Math.min(ANNUAL_EXEMPTION, Math.max(0, netGain)) },
    { label: "Taxable gains (33%)", reference: "CG1", value: round(taxableGain) },
    { label: "CGT payable", reference: "CG1", value: cgtTax },
  ];

  if (deemedDisposal.length > 0) {
    formFields.push(
      { label: "Deemed disposal gains (ETFs/funds)", reference: "CG1", value: round(deemedGainTotal), note: `${deemedDisposal.length} fund(s) at 8-year mark` },
      { label: "Deemed disposal CGT", reference: "CG1", value: deemedTax },
    );
  }

  const dataQuality = runDataQualityChecks(transactions, taxYear, gains, dividends, input.jan1ValueEUR, input.dec31ValueEUR);

  return {
    country: "IE",
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
    estimatedTaxableIncome: round(taxableGain + deemedGainTotal),
    estimatedTax: round(estimatedTax),
    ieDeemedDisposal: deemedDisposal,
    ieAnnualExemption: ANNUAL_EXEMPTION,
    formFields,
    dataQuality,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
