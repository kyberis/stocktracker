import { listHoldings, listTransactions } from "@/lib/db";
import { buildPortfolioSnapshot } from "@/lib/ai/warren/build-snapshot";
import {
  computeEstimatedDividends,
  computeTotalEstimatedEUR,
  filterDividendTransactions,
  sumAnnualDividends,
} from "@/lib/services/dividend-calculator";
import { createProvider } from "@/lib/api-providers";
import type { ExchangeRates, QuoteData } from "@/lib/types";
import type { ServiceResult } from "@/lib/services/service-result";
import { serviceErr } from "@/lib/services/service-result";
import { normalizeCurrency } from "@/lib/utils";

export interface DividendSummary {
  portfolioId?: string;
  estimated: {
    totalAnnualIncomeEUR: number;
    portfolioYieldPct: number;
    payingHoldings: number;
    byHolding: Array<{
      ticker: string;
      name: string;
      shares: number;
      annualIncomeEUR: number;
      dividendYield: number;
      yieldOnCost: number;
      currency: string;
    }>;
  };
  received: {
    currentYear: number;
    priorYear: number;
    recentTransactions: Array<{
      date: string;
      ticker: string;
      amountEUR: number;
      currency: string;
    }>;
  };
}

export async function getDividendSummaryForUser(
  userId: string,
  opts?: { portfolioId?: string; baseCurrency?: string },
): Promise<ServiceResult<DividendSummary>> {
  if (!userId) return serviceErr("userId is required", "invalid_input");

  const [holdings, allTxs] = await Promise.all([
    listHoldings(userId, opts?.portfolioId),
    listTransactions(userId, undefined, opts?.portfolioId),
  ]);

  const snapshot = await buildPortfolioSnapshot({
    userId,
    portfolioId: opts?.portfolioId,
    baseCurrency: opts?.baseCurrency || "EUR",
    enrichForPortfolioAi: false,
  });

  const provider = createProvider("yahoo");
  const tickers = Array.from(new Set(holdings.map((h) => h.ticker).filter(Boolean)));
  const quotes: Record<string, QuoteData> = {};
  await Promise.all(
    tickers.map(async (t) => {
      try {
        const q = await provider.getQuote(t);
        quotes[t] = {
          symbol: q.symbol || t,
          shortName: q.shortName || t,
          regularMarketPrice: q.regularMarketPrice || 0,
          regularMarketChange: q.regularMarketChange || 0,
          regularMarketChangePercent: q.regularMarketChangePercent || 0,
          currency: q.currency || "USD",
          regularMarketPreviousClose: q.regularMarketPreviousClose || 0,
          fiftyTwoWeekHigh: q.fiftyTwoWeekHigh || 0,
          fiftyTwoWeekLow: q.fiftyTwoWeekLow || 0,
        };
      } catch {
        /* tolerate missing quotes */
      }
    }),
  );

  const exchangeRates: ExchangeRates = {};
  const pairs = new Set(
    holdings.flatMap((h) => [`EUR${normalizeCurrency(h.displayCurrency)}`, `EUR${normalizeCurrency(quotes[h.ticker]?.currency || "USD")}`]),
  );
  await Promise.all(
    [...pairs].map(async (pair) => {
      try {
        const rate = await provider.getExchangeRate(pair.slice(0, 3), pair.slice(3));
        if (rate > 0) exchangeRates[pair] = rate;
      } catch {
        /* ignore */
      }
    }),
  );

  const estimatedRows = computeEstimatedDividends(holdings, quotes, exchangeRates);
  const totalEstimatedEUR = computeTotalEstimatedEUR(estimatedRows);
  const portfolioValue = snapshot.totals.value;
  const portfolioYieldPct =
    portfolioValue > 0 ? Math.round((totalEstimatedEUR / portfolioValue) * 10000) / 100 : 0;

  const dividendTxs = filterDividendTransactions(allTxs);
  const year = new Date().getFullYear();
  const currentYear = sumAnnualDividends(dividendTxs, year);
  const priorYear = sumAnnualDividends(dividendTxs, year - 1);

  const recentTransactions = dividendTxs
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20)
    .map((tx) => ({
      date: tx.date,
      ticker: tx.ticker,
      amountEUR: tx.totalAmount,
      currency: tx.currency,
    }));

  return {
    ok: true,
    data: {
      portfolioId: opts?.portfolioId,
      estimated: {
        totalAnnualIncomeEUR: Math.round(totalEstimatedEUR * 100) / 100,
        portfolioYieldPct,
        payingHoldings: estimatedRows.length,
        byHolding: estimatedRows.map((d) => ({
          ticker: d.ticker,
          name: d.name,
          shares: d.shares,
          annualIncomeEUR: Math.round(d.annualIncomeEUR * 100) / 100,
          dividendYield: d.dividendYield,
          yieldOnCost: d.yieldOnCost,
          currency: d.currency,
        })),
      },
      received: {
        currentYear: Math.round(currentYear * 100) / 100,
        priorYear: Math.round(priorYear * 100) / 100,
        recentTransactions,
      },
    },
  };
}
