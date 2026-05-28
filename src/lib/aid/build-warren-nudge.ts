import { getAidWarrenNudgeDate, setAidWarrenNudgeDate } from "@/lib/db/aid-user-state";
import { computeTopHoldingsConcentration } from "@/lib/aid/concentration";
import { listCalendarEvents } from "@/lib/db";
import { derivePortfolioNewsTickersFromHoldings } from "@/lib/portfolio-news-tickers";
import type { Holding, QuoteData } from "@/lib/types";

export type WarrenNudgeKind = "mover" | "earnings" | "concentration";

export interface WarrenNudgeResult {
  kind: WarrenNudgeKind;
  ticker: string;
  movePct?: number;
  concentrationPct?: number;
  prompt: string;
}

export async function buildWarrenNudge(args: {
  userId: string;
  holdings: Holding[];
  quotes: Record<string, QuoteData>;
}): Promise<WarrenNudgeResult | null> {
  if (args.holdings.length === 0) return null;

  const today = new Date().toISOString().slice(0, 10);
  const shownDate = await getAidWarrenNudgeDate(args.userId);
  if (shownDate === today) return null;

  const movers = args.holdings
    .map((h) => ({
      ticker: h.ticker,
      pct: args.quotes[h.ticker]?.regularMarketChangePercent ?? null,
    }))
    .filter((m) => m.pct != null)
    .sort((a, b) => Math.abs(b.pct!) - Math.abs(a.pct!));

  const top = movers[0];
  if (top?.pct != null && Math.abs(top.pct) >= 2) {
    await setAidWarrenNudgeDate(args.userId, today);
    return {
      kind: "mover",
      ticker: top.ticker,
      movePct: top.pct,
      prompt: `What should I know about ${top.ticker} today? It moved ${top.pct >= 0 ? "+" : ""}${top.pct.toFixed(1)}%.`,
    };
  }

  const tickers = derivePortfolioNewsTickersFromHoldings(args.holdings);
  if (tickers.length > 0) {
    const earnings = await listCalendarEvents({
      types: ["earnings"],
      from: today,
      to: today,
      symbols: tickers.map((t) => t.toUpperCase()),
    });
    if (earnings.length > 0) {
      const sym = earnings[0]?.symbol ?? tickers[0]!;
      await setAidWarrenNudgeDate(args.userId, today);
      return {
        kind: "earnings",
        ticker: sym,
        prompt: `Summarize what I should watch for ${sym} earnings today.`,
      };
    }
  }

  const concentration = computeTopHoldingsConcentration(args.holdings, [], args.quotes, {}, "EUR");
  if (concentration.topThreePercent >= 45 && concentration.topTickers[0]) {
    await setAidWarrenNudgeDate(args.userId, today);
    return {
      kind: "concentration",
      ticker: concentration.topTickers[0],
      concentrationPct: concentration.topThreePercent,
      prompt: `Am I too concentrated in ${concentration.topTickers[0]}? My top 3 holdings are ${concentration.topThreePercent.toFixed(0)}% of the portfolio.`,
    };
  }

  return null;
}
