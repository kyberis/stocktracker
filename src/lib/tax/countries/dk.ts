/**
 * Denmark (DK) tax report module.
 * Aktieindkomst: 27% below ~61,000 DKK, 42% above.
 * ETFs taxed as kapitalindkomst (mark-to-market on unrealized gains).
 * Average cost basis. Årsopgørelse field mapping.
 */
import type { TaxReportInput, TaxReport, FormField, MarkToMarketEntry } from "../types";
import { calculateRealizedGains, aggregateDividends, runDataQualityChecks } from "../engine";

const AKTIE_BRACKETS: { limit: number; rate: number }[] = [
  { limit: 61000, rate: 0.27 },
  { limit: Infinity, rate: 0.42 },
];

const KAPITAL_RATE = 0.42; // kapitalindkomst for mark-to-market ETFs

function calcAktieTax(income: number): { brackets: { from: number; to: number; rate: number; tax: number }[]; total: number } {
  const brackets: { from: number; to: number; rate: number; tax: number }[] = [];
  let remaining = Math.max(0, income);
  let from = 0;
  for (const { limit, rate } of AKTIE_BRACKETS) {
    if (remaining <= 0) break;
    const size = limit === Infinity ? remaining : Math.min(remaining, limit - from);
    const tax = size * rate;
    brackets.push({ from: round(from), to: round(from + size), rate, tax: round(tax) });
    remaining -= size;
    from += size;
  }
  return { brackets, total: round(brackets.reduce((s, b) => s + b.tax, 0)) };
}

function isEtf(ticker: string, assetType?: string): boolean {
  if (assetType === "etf") return true;
  const markers = ["ETF", "UCITS"];
  return markers.some((m) => ticker.toUpperCase().includes(m));
}

export function generateDK(input: TaxReportInput): TaxReport {
  const { taxYear, transactions, exchangeRates, baseCurrency } = input;

  const gains = calculateRealizedGains(transactions, taxYear, "average", exchangeRates, baseCurrency);
  const dividends = aggregateDividends(transactions, taxYear, exchangeRates, baseCurrency, ["DK"]);

  const stockGains = gains.filter((g) => !isEtf(g.ticker, g.assetType));
  const etfGains = gains.filter((g) => isEtf(g.ticker, g.assetType));

  for (const g of stockGains) { g.taxableGain = g.gain; g.adjustmentLabel = "Aktieindkomst"; }
  for (const g of etfGains) { g.taxableGain = g.gain; g.adjustmentLabel = "Kapitalindkomst"; }

  const totalGain = gains.filter((g) => g.gain > 0).reduce((s, g) => s + g.gain, 0);
  const totalLoss = gains.filter((g) => g.gain < 0).reduce((s, g) => s + g.gain, 0);
  const netGain = totalGain + totalLoss;

  const totalGrossDividends = dividends.reduce((s, d) => s + d.grossAmount, 0);
  const totalWithholdingTax = dividends.reduce((s, d) => s + d.withholdingTax, 0);

  const stockNetGain = stockGains.reduce((s, g) => s + g.gain, 0);
  const aktieIncome = Math.max(0, stockNetGain) + totalGrossDividends;
  const { brackets, total: aktieTax } = calcAktieTax(aktieIncome);

  // Mark-to-market on ETFs
  const markToMarket: MarkToMarketEntry[] = [];
  if (input.jan1TickerValues && input.dec31TickerValues) {
    for (const [ticker, dec31Val] of Object.entries(input.dec31TickerValues)) {
      if (!isEtf(ticker)) continue;
      const jan1Val = input.jan1TickerValues[ticker] ?? 0;
      markToMarket.push({
        ticker,
        name: ticker,
        jan1Value: round(jan1Val),
        dec31Value: round(dec31Val),
        unrealizedGain: round(dec31Val - jan1Val),
      });
    }
  }
  const unrealizedEtfGain = markToMarket.reduce((s, m) => s + Math.max(0, m.unrealizedGain), 0);
  const kapitalTax = round(unrealizedEtfGain * KAPITAL_RATE);

  const estimatedTax = aktieTax + kapitalTax;

  const formFields: FormField[] = [
    { label: "Aktieindkomst (stocks + dividends)", reference: "Årsopgørelse", value: round(aktieIncome) },
    { label: "Aktieskat", reference: "Årsopgørelse", value: aktieTax },
    { label: "Kapitalindkomst (ETF mark-to-market)", reference: "Årsopgørelse", value: round(unrealizedEtfGain) },
    { label: "Kapitalskat", reference: "Årsopgørelse", value: kapitalTax },
    { label: "Udenlandsk kildeskat (foreign WHT)", reference: "Årsopgørelse", value: round(totalWithholdingTax) },
  ];

  const dataQuality = runDataQualityChecks(transactions, taxYear, gains, dividends, input.jan1ValueEUR, input.dec31ValueEUR);

  return {
    country: "DK",
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
    estimatedTaxableIncome: round(aktieIncome + unrealizedEtfGain),
    estimatedTax: round(estimatedTax),
    dkMarkToMarket: markToMarket,
    dkBrackets: brackets,
    formFields,
    dataQuality,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
