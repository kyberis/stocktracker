/**
 * Germany (DE) tax report module.
 * Kapitalertragsteuer / Abgeltungssteuer (25% + Soli + Church ≈ 26.375%)
 * Vorabpauschale for accumulating ETFs, Teilfreistellung for equity funds,
 * Sparerpauschbetrag (€1,000 single / €2,000 joint).
 */
import type { TaxReportInput, TaxReport, VorabpauschaleEntry, FormField } from "../types";
import { calculateRealizedGains, aggregateDividends, runDataQualityChecks } from "../engine";

/**
 * Published Basiszins by year (Bundesbank).
 * Updated annually; add new years as they're published.
 */
const BASISZINS: Record<number, number> = {
  2023: 2.55,
  2024: 2.29,
  2025: 2.29,
  2026: 2.29, // placeholder until published
};

const TEILFREISTELLUNG_EQUITY = 0.30;
const ABGELTUNGSSTEUER_RATE = 0.26375; // 25% + 5.5% Soli

function isEquityFund(ticker: string, assetType?: string): boolean {
  if (assetType === "etf") return true;
  const etfMarkers = ["ETF", "UCITS", "MSCI", "FTSE", "DAX", "STOXX"];
  const upper = ticker.toUpperCase();
  return etfMarkers.some((m) => upper.includes(m));
}

export function generateDE(input: TaxReportInput): TaxReport {
  const { taxYear, transactions, exchangeRates, baseCurrency, filingStatus } = input;

  const gains = calculateRealizedGains(transactions, taxYear, "fifo", exchangeRates, baseCurrency);
  const dividends = aggregateDividends(transactions, taxYear, exchangeRates, baseCurrency, ["DE"]);

  // Teilfreistellung: 30% exemption for equity ETF gains
  let teilfreistellungTotal = 0;
  for (const g of gains) {
    if (isEquityFund(g.ticker, g.assetType)) {
      const exempt = Math.abs(g.gain) * TEILFREISTELLUNG_EQUITY;
      teilfreistellungTotal += exempt;
      g.taxableGain = g.gain > 0 ? g.gain * (1 - TEILFREISTELLUNG_EQUITY) : g.gain;
      g.adjustmentLabel = `Teilfreistellung 30%`;
    } else {
      g.taxableGain = g.gain;
    }
  }

  const totalGain = gains.filter((g) => g.gain > 0).reduce((s, g) => s + g.gain, 0);
  const totalLoss = gains.filter((g) => g.gain < 0).reduce((s, g) => s + g.gain, 0);
  const netGain = totalGain + totalLoss;

  const totalGrossDividends = dividends.reduce((s, d) => s + d.grossAmount, 0);
  const totalWithholdingTax = dividends.reduce((s, d) => s + d.withholdingTax, 0);

  // Vorabpauschale for accumulating ETFs
  const basiszins = BASISZINS[taxYear] ?? 2.29;
  const vorabpauschaleEntries: VorabpauschaleEntry[] = [];
  let totalVorab = 0;

  if (input.jan1TickerValues && input.dec31TickerValues && basiszins > 0) {
    for (const [ticker, jan1Val] of Object.entries(input.jan1TickerValues)) {
      const dec31Val = input.dec31TickerValues[ticker];
      if (!dec31Val || !isEquityFund(ticker)) continue;
      const gain = dec31Val - jan1Val;
      if (gain <= 0) continue;

      const basisertrag = jan1Val * basiszins * 0.01 * 0.7;
      const vorab = Math.min(basisertrag, gain);
      const afterTeilfreistellung = vorab * (1 - TEILFREISTELLUNG_EQUITY);

      vorabpauschaleEntries.push({
        ticker,
        name: ticker,
        jan1Value: jan1Val,
        dec31Value: dec31Val,
        gain,
        basisertrag,
        teilfreistellung: TEILFREISTELLUNG_EQUITY,
        vorabpauschale: afterTeilfreistellung,
      });
      totalVorab += afterTeilfreistellung;
    }
  }

  // Sparerpauschbetrag
  const sparerLimit = filingStatus === "joint" ? 2000 : 1000;
  const taxableGainsAfterTeilfreistellung = gains.reduce((s, g) => s + (g.taxableGain ?? g.gain), 0);
  const totalCapitalIncome = taxableGainsAfterTeilfreistellung + totalGrossDividends + totalVorab;
  const sparerUsed = Math.min(sparerLimit, Math.max(0, totalCapitalIncome));
  const taxableIncome = Math.max(0, totalCapitalIncome - sparerUsed);
  const estimatedTax = taxableIncome * ABGELTUNGSSTEUER_RATE;

  // Domestic vs foreign dividends
  const domesticDividends = dividends.filter((d) => d.isDomestic).reduce((s, d) => s + d.grossAmount, 0);
  const foreignDividends = dividends.filter((d) => !d.isDomestic).reduce((s, d) => s + d.grossAmount, 0);
  const creditableWithholding = dividends.filter((d) => !d.isDomestic).reduce((s, d) => s + d.withholdingTax, 0);

  // Form field mapping (Anlage KAP)
  const formFields: FormField[] = [
    { label: "Capital gains from securities sales", reference: "Zeile 7", value: round(netGain) },
    { label: "Taxable gains after Teilfreistellung", reference: "Zeile 8", value: round(taxableGainsAfterTeilfreistellung) },
    { label: "Vorabpauschale (accumulating ETFs)", reference: "Zeile 9", value: round(totalVorab) },
    { label: "Sparerpauschbetrag (allowance claimed)", reference: "Zeile 12", value: round(sparerUsed) },
    { label: "Dividend income (domestic)", reference: "Zeile 14", value: round(domesticDividends) },
    { label: "Dividend income (foreign)", reference: "Zeile 15", value: round(foreignDividends) },
    { label: "Foreign withholding tax (creditable)", reference: "Zeile 41", value: round(creditableWithholding) },
    { label: "Total taxable capital income", reference: "Zeile 47", value: round(taxableIncome) },
  ];

  const dataQuality = runDataQualityChecks(
    transactions, taxYear, gains, dividends,
    input.jan1ValueEUR, input.dec31ValueEUR,
    input.jan1Estimated, input.dec31Estimated,
  );

  return {
    country: "DE",
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
    estimatedTax: round(estimatedTax),

    vorabpauschale: vorabpauschaleEntries,
    totalVorabpauschale: round(totalVorab),
    sparerpauschbetrag: sparerUsed,
    teilfreistellungAdjustment: round(teilfreistellungTotal),

    formFields,
    dataQuality,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
