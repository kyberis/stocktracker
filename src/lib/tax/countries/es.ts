/**
 * Spain (ES) tax report module.
 * IRPF progressive savings brackets (19%/21%/23%/26%/28%),
 * FIFO mandatory, Modelo 720 foreign asset threshold, 2-month wash sale rule.
 */
import type { TaxReportInput, TaxReport, FormField, Modelo720Asset, WashSaleWarning } from "../types";
import { calculateRealizedGains, aggregateDividends, filterByTaxYear, runDataQualityChecks } from "../engine";

const SAVINGS_BRACKETS: { limit: number; rate: number }[] = [
  { limit: 6000, rate: 0.19 },
  { limit: 50000, rate: 0.21 },
  { limit: 200000, rate: 0.23 },
  { limit: 300000, rate: 0.26 },
  { limit: Infinity, rate: 0.28 },
];

const MODELO_720_THRESHOLD = 50000;

function calculateProgressiveTax(income: number): { brackets: { from: number; to: number; rate: number; tax: number }[]; total: number } {
  const brackets: { from: number; to: number; rate: number; tax: number }[] = [];
  let remaining = Math.max(0, income);
  let from = 0;

  for (const { limit, rate } of SAVINGS_BRACKETS) {
    if (remaining <= 0) break;
    const bracketSize = limit === Infinity ? remaining : Math.min(remaining, limit - from);
    const tax = bracketSize * rate;
    brackets.push({ from: round(from), to: round(from + bracketSize), rate, tax: round(tax) });
    remaining -= bracketSize;
    from += bracketSize;
  }

  return { brackets, total: round(brackets.reduce((s, b) => s + b.tax, 0)) };
}

function detectWashSales(
  allTransactions: import("@/lib/types").Transaction[],
  taxYear: number,
  gains: import("../types").TaxRealizedGain[],
): WashSaleWarning[] {
  const yearTxs = filterByTaxYear(allTransactions, taxYear);
  const warnings: WashSaleWarning[] = [];

  const lossSells = gains.filter((g) => g.gain < 0);
  const buys = yearTxs.filter((t) => t.type === "buy");

  for (const loss of lossSells) {
    const sellDate = new Date(loss.sellDate);
    const twoMonthsBefore = new Date(sellDate);
    twoMonthsBefore.setMonth(twoMonthsBefore.getMonth() - 2);
    const twoMonthsAfter = new Date(sellDate);
    twoMonthsAfter.setMonth(twoMonthsAfter.getMonth() + 2);

    const ticker = loss.ticker.toUpperCase();
    const matchingBuy = buys.find((b) => {
      if ((b.ticker || "").toUpperCase() !== ticker) return false;
      const buyDate = new Date(b.date);
      return buyDate >= twoMonthsBefore && buyDate <= twoMonthsAfter && b.date !== loss.sellDate;
    });

    if (matchingBuy) {
      const days = Math.abs(
        Math.floor((new Date(matchingBuy.date).getTime() - sellDate.getTime()) / 86400000),
      );
      warnings.push({
        ticker,
        sellDate: loss.sellDate,
        rebuyDate: matchingBuy.date,
        lossAmount: Math.abs(loss.gain),
        daysApart: days,
      });
    }
  }

  return warnings;
}

export function generateES(input: TaxReportInput): TaxReport {
  const { taxYear, transactions, exchangeRates, baseCurrency } = input;

  const gains = calculateRealizedGains(transactions, taxYear, "fifo", exchangeRates, baseCurrency);
  const dividends = aggregateDividends(transactions, taxYear, exchangeRates, baseCurrency, ["ES"]);

  for (const g of gains) {
    g.taxableGain = g.gain;
  }

  const totalGain = gains.filter((g) => g.gain > 0).reduce((s, g) => s + g.gain, 0);
  const totalLoss = gains.filter((g) => g.gain < 0).reduce((s, g) => s + g.gain, 0);
  const netGain = totalGain + totalLoss;

  const totalGrossDividends = dividends.reduce((s, d) => s + d.grossAmount, 0);
  const totalWithholdingTax = dividends.reduce((s, d) => s + d.withholdingTax, 0);

  const savingsBase = Math.max(0, netGain) + totalGrossDividends;
  const { brackets, total: estimatedTax } = calculateProgressiveTax(savingsBase);

  // Modelo 720 check
  const modelo720: Modelo720Asset[] = [];
  if (input.dec31ValueEUR !== undefined) {
    const securitiesAsset: Modelo720Asset = {
      category: "Valores (Securities)",
      broker: input.brokerName || "Foreign Broker",
      country: input.brokerCountry || "Unknown",
      dec31Value: round(input.dec31ValueEUR),
      threshold: MODELO_720_THRESHOLD,
      exceeds: input.dec31ValueEUR > MODELO_720_THRESHOLD,
    };
    modelo720.push(securitiesAsset);
  }

  const washSaleWarnings = detectWashSales(transactions, taxYear, gains);

  const formFields: FormField[] = [
    { label: "Ganancias patrimoniales (base del ahorro)", reference: "Casilla 0340", value: round(Math.max(0, netGain)) },
    { label: "Pérdidas patrimoniales", reference: "Casilla 0341", value: round(Math.abs(totalLoss)) },
    { label: "Rendimientos de capital mobiliario", reference: "Casilla 0029", value: round(totalGrossDividends) },
    { label: "Retenciones e ingresos a cuenta", reference: "Casilla 0588", value: round(totalWithholdingTax) },
    { label: "Cuota íntegra estatal (ahorro)", reference: "Casilla 0545", value: round(estimatedTax) },
  ];

  const dataQuality = runDataQualityChecks(
    transactions, taxYear, gains, dividends,
    input.jan1ValueEUR, input.dec31ValueEUR,
    input.jan1Estimated, input.dec31Estimated,
  );

  return {
    country: "ES",
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

    estimatedTaxableIncome: round(savingsBase),
    estimatedTax: round(estimatedTax),

    esBrackets: brackets,
    modelo720,
    washSaleWarnings,

    formFields,
    dataQuality,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
