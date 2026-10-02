import { YahooProvider } from "@/lib/api-providers/yahoo";
import type {
  AnnualFinancialPoint,
  FmpFundamentalsBundle,
} from "@/lib/screening/data/fmp-fundamentals";

function emptyBundle(ticker: string, errors: string[]): FmpFundamentalsBundle {
  return {
    ticker,
    currency: null,
    price: null,
    fwdPe: null,
    ownHistPe: null,
    histPeAvg: null,
    histPeYears: 0,
    evEbitda: null,
    evEbit: null,
    ndEbitda: null,
    dividendYield: null,
    targetPrice: null,
    netCash: null,
    revenueGrowthPct: null,
    revenueGrowthHistoryPct: [],
    epsTtm: null,
    epsFy: null,
    yearHigh: null,
    normalizedPe: null,
    earningsQualitySuspect: false,
    description: null,
    annualSeries: [],
    fcfYield: null,
    interestCoverage: null,
    buyback: null,
    severeDilution: null,
    avgVolume: null,
    thinLiquidity: null,
    peerPe: null,
    priceToBook: null,
    roicPct: null,
    errors,
  };
}

function pct(part: number | null, whole: number | null): number | null {
  if (part == null || whole == null || whole === 0) return null;
  return (part / whole) * 100;
}

/**
 * Screening enrichment from Yahoo when the FMP fundamentals flag is off.
 * Ratios FMP calculates (ROIC, FCF yield, net debt/EBITDA) stay null.
 */
export async function fetchYahooFundamentalsBundle(
  ticker: string,
): Promise<FmpFundamentalsBundle> {
  const symbol = ticker.toUpperCase();
  const yahoo = new YahooProvider();
  try {
    const [overview, quote, income, cash, balance] = await Promise.all([
      yahoo.getOverview(symbol),
      yahoo.getQuote(symbol).catch(() => null),
      yahoo.getIncomeStatement(symbol),
      yahoo.getCashFlow(symbol),
      yahoo.getBalanceSheet(symbol),
    ]);
    if (!overview && !income) return emptyBundle(symbol, ["yahoo_empty"]);

    const annualIncome = income?.annual ?? [];
    const growth: number[] = [];
    for (let i = 0; i < annualIncome.length - 1; i++) {
      const newer = annualIncome[i]?.totalRevenue ?? null;
      const older = annualIncome[i + 1]?.totalRevenue ?? null;
      const g = pct(newer != null && older != null ? newer - older : null, older);
      if (g != null) growth.push(g);
    }

    const annualSeries: AnnualFinancialPoint[] = annualIncome.slice(0, 10).map((row, i) => {
      const cashRow = cash?.annual?.[i];
      const balRow = balance?.annual?.[i];
      const year = Number(row.fiscalDateEnding.slice(0, 4));
      const ebit = row.operatingIncome;
      const interest = row.interestExpense;
      return {
        year: Number.isFinite(year) ? year : null,
        revenue: row.totalRevenue,
        grossMarginPct: pct(row.grossProfit, row.totalRevenue),
        operatingMarginPct: pct(row.operatingIncome, row.totalRevenue),
        netMarginPct: pct(row.netIncome, row.totalRevenue),
        eps: null,
        operatingCashFlow: cashRow?.operatingCashflow ?? null,
        freeCashFlow: cashRow?.freeCashFlow ?? null,
        roicPct: null,
        sharesOutstanding: balRow?.commonStockSharesOutstanding ?? overview?.sharesOutstanding ?? null,
        ebit,
        interestExpense: interest,
        ebitda: row.ebitda,
        netIncome: row.netIncome,
        totalDebt:
          balRow?.longTermDebt != null || balRow?.shortTermDebt != null
            ? (balRow?.longTermDebt ?? 0) + (balRow?.shortTermDebt ?? 0)
            : null,
        cash: balRow?.cashAndEquivalents ?? null,
        shortTermInvestments: null,
        totalEquity: balRow?.totalShareholderEquity ?? null,
        incomeTaxExpense: row.incomeTaxExpense,
        incomeBeforeTax: row.incomeBeforeTax,
        annualPe: null,
        filingDate: row.fiscalDateEnding || null,
      };
    });

    const shares = annualSeries
      .map((p) => p.sharesOutstanding)
      .filter((n): n is number => n != null && n > 0);
    let buyback: boolean | null = null;
    let severeDilution: boolean | null = null;
    if (shares.length >= 2) {
      const change = ((shares[0]! - shares[shares.length - 1]!) / shares[shares.length - 1]!) * 100;
      buyback = change < -2;
      severeDilution = change >= 15;
    }

    const latest = annualSeries[0];
    const interestCoverage =
      latest?.ebit != null && latest.interestExpense != null && latest.interestExpense !== 0
        ? latest.ebit / Math.abs(latest.interestExpense)
        : null;

    const price = quote?.regularMarketPrice ?? null;
    const epsFy = overview?.eps ?? null;
    const normalizedPe =
      price != null && epsFy != null && epsFy > 0 ? price / epsFy : overview?.peRatio ?? null;

    return {
      ...emptyBundle(symbol, []),
      currency: overview?.currency || quote?.currency || null,
      price,
      fwdPe: overview?.forwardPE ?? null,
      ownHistPe: overview?.peRatio ?? null,
      dividendYield: overview?.dividendYield ?? null,
      targetPrice: overview?.analystTargetPrice ?? null,
      revenueGrowthPct: growth[0] ?? null,
      revenueGrowthHistoryPct: growth,
      epsTtm: overview?.eps ?? null,
      epsFy,
      yearHigh: quote?.fiftyTwoWeekHigh ?? null,
      normalizedPe,
      description: overview?.description || null,
      annualSeries,
      interestCoverage,
      buyback,
      severeDilution,
    };
  } catch (err) {
    return emptyBundle(symbol, [err instanceof Error ? err.message : "yahoo_error"]);
  }
}
