import { getServerSession } from "@/lib/auth/server-session";
import { listHoldings, listCashEntries, listPortfolios } from "@/lib/db";
import { getQuotesWithCache, getRatesWithCache } from "@/lib/quote-cache";
import { normalizeCurrency } from "@/lib/utils";
import type { Holding, QuoteData, ExchangeRates } from "@/lib/types";
import type { Portfolio } from "@/lib/db";
import DashboardShell from "./dashboard-shell";

const BASE_FX_PAIRS = ["EURUSD", "EURGBP", "EURDKK", "EURCAD"];

function buildServerFxPairs(holdings: Holding[], portfolioCurrency?: string): string[] {
  const needed = new Set<string>(BASE_FX_PAIRS);
  for (const h of holdings) {
    const norm = normalizeCurrency(h.displayCurrency);
    if (norm === "EUR") continue;
    if (norm === "GBX") { needed.add("EURGBP"); continue; }
    needed.add(`EUR${norm}`);
  }
  if (portfolioCurrency && portfolioCurrency !== "EUR") {
    needed.add(`EUR${portfolioCurrency}`);
  }
  return [...needed];
}

export default async function Home() {
  const session = await getServerSession();

  let initialHoldings: Holding[] | undefined;
  let initialCash;
  let initialPortfolios: Portfolio[] | undefined;
  let initialQuotes: Record<string, QuoteData> | undefined;
  let initialExchangeRates: ExchangeRates | undefined;

  if (session) {
    [initialHoldings, initialCash, initialPortfolios] = await Promise.all([
      listHoldings(session.userId),
      listCashEntries(session.userId),
      listPortfolios(session.userId),
    ]);

    const tickers = [...new Set(initialHoldings.map(h => h.ticker))];
    const defaultPortfolio = initialPortfolios.find(p => p.isDefault);
    const pairs = buildServerFxPairs(initialHoldings, defaultPortfolio?.currency);

    [initialQuotes, initialExchangeRates] = await Promise.all([
      getQuotesWithCache(tickers) as Promise<Record<string, QuoteData>>,
      getRatesWithCache(pairs),
    ]);
  }

  return (
    <DashboardShell
      initialHoldings={initialHoldings ?? []}
      initialCash={initialCash ?? []}
      initialQuotes={initialQuotes}
      initialExchangeRates={initialExchangeRates}
      initialPortfolios={initialPortfolios}
    />
  );
}
