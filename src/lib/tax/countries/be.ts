/**
 * Belgium (BE) tax report module.
 * No capital gains tax on normal stock transactions (private investor).
 * TOB (Taks op Beursverrichtingen): 0.12% Belgian stocks, 0.35% foreign stocks, 1.32% accumulating funds.
 * 30% withholding tax on dividends. Précompte mobilier.
 */
import type { TaxReportInput, TaxReport, FormField, TobEntry } from "../types";
import { aggregateDividends, filterByTaxYear, runDataQualityChecks } from "../engine";

const TOB_RATES = {
  belgian_stock: 0.0012,
  foreign_stock: 0.0035,
  accumulating_fund: 0.0132,
};

const TOB_CAP_PER_TX = 4000;
const DIVIDEND_WHT_RATE = 0.30;
const DIVIDEND_EXEMPT = 833; // first €833 exempt from dividend WHT (2024)

function classifyTobRate(ticker: string, assetType?: string): number {
  if (assetType === "etf") return TOB_RATES.accumulating_fund;
  return TOB_RATES.foreign_stock; // conservative default
}

export function generateBE(input: TaxReportInput): TaxReport {
  const { taxYear, transactions, exchangeRates, baseCurrency } = input;

  const yearTxs = filterByTaxYear(transactions, taxYear).filter((t) => t.type === "buy" || t.type === "sell");
  const dividends = aggregateDividends(transactions, taxYear, exchangeRates, baseCurrency, ["BE"]);

  const tobEntries: TobEntry[] = [];
  let totalTob = 0;

  for (const tx of yearTxs) {
    const rate = classifyTobRate(tx.ticker, tx.assetType);
    const rawTob = tx.totalAmount * rate;
    const tobAmount = Math.min(rawTob, TOB_CAP_PER_TX);
    totalTob += tobAmount;

    tobEntries.push({
      transactionId: tx.id,
      ticker: (tx.ticker || "").toUpperCase(),
      name: tx.name || tx.ticker || "",
      date: tx.date,
      type: tx.type as "buy" | "sell",
      amount: tx.totalAmount,
      tobRate: rate,
      tobAmount: round(tobAmount),
    });
  }

  const totalGrossDividends = dividends.reduce((s, d) => s + d.grossAmount, 0);
  const totalWithholdingTax = dividends.reduce((s, d) => s + d.withholdingTax, 0);
  const taxableDividends = Math.max(0, totalGrossDividends - DIVIDEND_EXEMPT);
  const dividendTax = round(taxableDividends * DIVIDEND_WHT_RATE);

  const estimatedTax = round(totalTob + dividendTax);

  const formFields: FormField[] = [
    { label: "TOB (Taks op Beursverrichtingen)", reference: "Déclaration TOB", value: round(totalTob), note: `${tobEntries.length} transactions` },
    { label: "Dividendes bruts", reference: "Déclaration IPP", value: round(totalGrossDividends) },
    { label: "Exonération dividendes", reference: "Code 1437/2437", value: Math.min(DIVIDEND_EXEMPT, totalGrossDividends) },
    { label: "Précompte mobilier (30%)", reference: "Code 1170/2170", value: dividendTax },
    { label: "Retenue à la source étrangère", reference: "Code 1163/2163", value: round(totalWithholdingTax) },
  ];

  const dataQuality = runDataQualityChecks(transactions, taxYear, [], dividends, input.jan1ValueEUR, input.dec31ValueEUR);

  return {
    country: "BE",
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
    estimatedTaxableIncome: round(taxableDividends),
    estimatedTax,
    beTob: tobEntries,
    beTobTotal: round(totalTob),
    formFields,
    dataQuality,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
