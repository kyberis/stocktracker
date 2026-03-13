/**
 * United States (US) tax report module.
 * Short-term (<=1 year) taxed as ordinary income; long-term at 0%/15%/20%.
 * 30-day wash sale rule. Schedule D / Form 8949 / 1099-DIV field mapping.
 */
import type { TaxReportInput, TaxReport, FormField, WashSaleWarning } from "../types";
import { calculateRealizedGains, aggregateDividends, filterByTaxYear, runDataQualityChecks } from "../engine";

const LTCG_BRACKETS: { limit: number; rate: number }[] = [
  { limit: 47025, rate: 0.00 },   // 2024 single filer
  { limit: 518900, rate: 0.15 },
  { limit: Infinity, rate: 0.20 },
];

const NIIT_THRESHOLD = 200000; // Net Investment Income Tax threshold (single)
const NIIT_RATE = 0.038;

function calcLtcgTax(income: number): { brackets: { from: number; to: number; rate: number; tax: number }[]; total: number } {
  const brackets: { from: number; to: number; rate: number; tax: number }[] = [];
  let remaining = Math.max(0, income);
  let from = 0;
  for (const { limit, rate } of LTCG_BRACKETS) {
    if (remaining <= 0) break;
    const size = limit === Infinity ? remaining : Math.min(remaining, limit - from);
    const tax = size * rate;
    brackets.push({ from: round(from), to: round(from + size), rate, tax: round(tax) });
    remaining -= size;
    from += size;
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
    const windowStart = new Date(sellDate);
    windowStart.setDate(windowStart.getDate() - 30);
    const windowEnd = new Date(sellDate);
    windowEnd.setDate(windowEnd.getDate() + 30);

    const ticker = loss.ticker.toUpperCase();
    const match = buys.find((b) => {
      if ((b.ticker || "").toUpperCase() !== ticker) return false;
      const d = new Date(b.date);
      return d >= windowStart && d <= windowEnd && b.date !== loss.sellDate;
    });

    if (match) {
      warnings.push({
        ticker,
        sellDate: loss.sellDate,
        rebuyDate: match.date,
        lossAmount: Math.abs(loss.gain),
        daysApart: Math.abs(Math.floor((new Date(match.date).getTime() - sellDate.getTime()) / 86400000)),
      });
    }
  }
  return warnings;
}

export function generateUS(input: TaxReportInput): TaxReport {
  const { taxYear, transactions, exchangeRates, baseCurrency } = input;

  const gains = calculateRealizedGains(transactions, taxYear, "fifo", exchangeRates, baseCurrency);
  const dividends = aggregateDividends(transactions, taxYear, exchangeRates, baseCurrency, ["US"]);

  let shortTermGain = 0;
  let longTermGain = 0;

  for (const g of gains) {
    const isLongTerm = (g.holdingDays ?? 0) > 365;
    if (isLongTerm) {
      longTermGain += g.gain;
      g.adjustmentLabel = "Long-term";
    } else {
      shortTermGain += g.gain;
      g.adjustmentLabel = "Short-term";
    }
    g.taxableGain = g.gain;
  }

  const totalGain = gains.filter((g) => g.gain > 0).reduce((s, g) => s + g.gain, 0);
  const totalLoss = gains.filter((g) => g.gain < 0).reduce((s, g) => s + g.gain, 0);
  const netGain = totalGain + totalLoss;

  const totalGrossDividends = dividends.reduce((s, d) => s + d.grossAmount, 0);
  const totalWithholdingTax = dividends.reduce((s, d) => s + d.withholdingTax, 0);

  // Short-term taxed as ordinary income (estimate 24% bracket)
  const stTax = round(Math.max(0, shortTermGain) * 0.24);
  const { brackets, total: ltTax } = calcLtcgTax(Math.max(0, longTermGain));
  const divTax = round(totalGrossDividends * 0.15); // qualified dividends at 15%
  const estimatedTax = stTax + ltTax + divTax;

  const washSaleWarnings = detectWashSales(transactions, taxYear, gains);

  const formFields: FormField[] = [
    { label: "Short-term gains (Form 8949 Part I)", reference: "Schedule D Line 7", value: round(shortTermGain) },
    { label: "Long-term gains (Form 8949 Part II)", reference: "Schedule D Line 15", value: round(longTermGain) },
    { label: "Net capital gain", reference: "Schedule D Line 16", value: round(netGain) },
    { label: "Ordinary dividends", reference: "1099-DIV Box 1a", value: round(totalGrossDividends) },
    { label: "Qualified dividends", reference: "1099-DIV Box 1b", value: round(totalGrossDividends), note: "Verify qualified status" },
    { label: "Foreign tax paid", reference: "1099-DIV Box 7", value: round(totalWithholdingTax) },
  ];

  const dataQuality = runDataQualityChecks(transactions, taxYear, gains, dividends, input.jan1ValueEUR, input.dec31ValueEUR);

  return {
    country: "US",
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
    estimatedTaxableIncome: round(Math.max(0, netGain) + totalGrossDividends),
    estimatedTax: round(estimatedTax),
    usShortTermGain: round(shortTermGain),
    usLongTermGain: round(longTermGain),
    usBrackets: brackets,
    washSaleWarnings,
    formFields,
    dataQuality,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
