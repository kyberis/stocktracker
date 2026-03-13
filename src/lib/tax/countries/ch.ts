/**
 * Switzerland (CH) tax report module.
 * No federal capital gains tax on private securities.
 * Verrechnungssteuer (withholding tax) 35% on Swiss dividends — reclaimable.
 * Canton-based wealth tax on total assets (varies 0.1–1.0% depending on canton).
 */
import type { TaxReportInput, TaxReport, FormField } from "../types";
import { aggregateDividends, runDataQualityChecks } from "../engine";

const VERRECHNUNGSSTEUER_RATE = 0.35;

const CANTON_WEALTH_TAX_RATES: Record<string, number> = {
  ZH: 0.0030, // Zürich ~0.30%
  BE: 0.0040, // Bern ~0.40%
  LU: 0.0015, // Luzern ~0.15%
  UR: 0.0020, SZ: 0.0015, OW: 0.0015, NW: 0.0010, GL: 0.0025,
  ZG: 0.0010, // Zug ~0.10%
  FR: 0.0045, SO: 0.0035, BS: 0.0050, BL: 0.0040,
  SH: 0.0030, AR: 0.0025, AI: 0.0015, SG: 0.0035,
  GR: 0.0025, AG: 0.0025, TG: 0.0025,
  TI: 0.0030, // Ticino ~0.30%
  VD: 0.0050, // Vaud ~0.50%
  VS: 0.0035,
  NE: 0.0065, // Neuchâtel ~0.65%
  GE: 0.0050, // Genève ~0.50%
  JU: 0.0055,
};

export function generateCH(input: TaxReportInput): TaxReport {
  const { taxYear, transactions, exchangeRates, baseCurrency, swissCanton } = input;

  const dividends = aggregateDividends(transactions, taxYear, exchangeRates, baseCurrency, ["CH"]);

  const totalGrossDividends = dividends.reduce((s, d) => s + d.grossAmount, 0);
  const totalWithholdingTax = dividends.reduce((s, d) => s + d.withholdingTax, 0);
  const swissDividends = dividends.filter((d) => d.isDomestic).reduce((s, d) => s + d.grossAmount, 0);
  const verrechnungssteuer = round(swissDividends * VERRECHNUNGSSTEUER_RATE);

  const canton = (swissCanton || "ZH").toUpperCase();
  const cantonRate = CANTON_WEALTH_TAX_RATES[canton] ?? 0.003;
  const portfolioValue = input.dec31ValueEUR ?? 0;
  const wealthTax = round(portfolioValue * cantonRate);

  const estimatedTax = round(wealthTax); // Verrechnungssteuer is reclaimable

  const formFields: FormField[] = [
    { label: "Wertschriftenverzeichnis (securities)", reference: "DA-1", value: round(portfolioValue) },
    { label: "Dividends (gross)", reference: "DA-1", value: round(totalGrossDividends) },
    { label: "Verrechnungssteuer (reclaimable)", reference: "DA-1", value: verrechnungssteuer, note: "35% on Swiss dividends — file DA-1 to reclaim" },
    { label: `Vermögenssteuer (${canton})`, reference: "Steuererklärung", value: wealthTax },
  ];

  const dataQuality = runDataQualityChecks(transactions, taxYear, [], dividends, input.jan1ValueEUR, input.dec31ValueEUR);

  return {
    country: "CH",
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
    estimatedTaxableIncome: round(totalGrossDividends),
    estimatedTax,
    chCantonRate: cantonRate,
    chWealthTax: wealthTax,
    chVerrechnungssteuer: verrechnungssteuer,
    formFields,
    dataQuality,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
