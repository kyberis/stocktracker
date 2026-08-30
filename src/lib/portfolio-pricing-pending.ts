import type { ExchangeRates, Holding, QuoteData } from "./types";
import { canConvertCurrency, resolveQuoteCurrency } from "./utils";

export interface PortfolioPricingPendingArgs {
  holdings: Holding[];
  quotes: Record<string, QuoteData>;
  exchangeRates: ExchangeRates;
  baseCurrency: string;
  refreshingTickers?: ReadonlySet<string>;
  isRefreshing?: boolean;
}

/**
 * True while market prices and/or FX needed to display invested totals are still
 * loading. Used to show “Calculating…” instead of €0 after the first add.
 */
export function isPortfolioPricingPending({
  holdings,
  quotes,
  exchangeRates,
  baseCurrency,
  refreshingTickers,
  isRefreshing = false,
}: PortfolioPricingPendingArgs): boolean {
  if (holdings.length === 0) return false;
  if (isRefreshing) return true;

  for (const h of holdings) {
    if (refreshingTickers?.has(h.ticker)) return true;

    const quote = quotes[h.ticker];
    if (!quote?.regularMarketPrice || quote.regularMarketPrice <= 0) return true;

    const quoteCurrency = resolveQuoteCurrency(h.displayCurrency, quote.currency);
    if (!canConvertCurrency(quoteCurrency, baseCurrency, exchangeRates)) return true;
    if (!canConvertCurrency(h.displayCurrency || "EUR", baseCurrency, exchangeRates)) {
      return true;
    }
  }

  return false;
}
