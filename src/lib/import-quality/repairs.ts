import { YahooProvider } from "@/lib/api-providers/yahoo";
import { buildNeededFxPairs } from "@/lib/fx-pairs";
import {
  normalizeHkYahooSymbol,
  yahooSymbolAliases,
  yahooSymbolFromTickerExchange,
} from "@/lib/market-symbol";
import { convertToEUR, hasExchangeRate, normalizeCurrency, resolveQuoteCurrency } from "@/lib/utils";
import type { ExchangeRates, Holding } from "@/lib/types";
import type { ParsedTransaction } from "@/lib/broker-parsers/types";
import type { ImportQualityFinding, MarketQuoteRef } from "./types";

export async function fetchExchangeRatesForCurrencies(
  yahoo: YahooProvider,
  currencies: Iterable<string>,
): Promise<ExchangeRates> {
  const pairs = buildNeededFxPairs(currencies);
  const exchangeRates: ExchangeRates = {};
  const results = await Promise.allSettled(
    pairs.map(async (pair) => {
      const from = pair.substring(0, 3);
      const to = pair.substring(3);
      const rate = await yahoo.getExchangeRate(from, to);
      return { pair, rate };
    }),
  );
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.rate > 0) {
      exchangeRates[r.value.pair] = r.value.rate;
    }
  }
  return exchangeRates;
}

export async function fetchQuotesForTickers(
  yahoo: YahooProvider,
  tickers: { ticker: string; exchange?: string }[],
): Promise<Record<string, MarketQuoteRef>> {
  const quotes: Record<string, MarketQuoteRef> = {};
  const unique = new Map<string, string>(); // yahooSym -> original ticker
  for (const t of tickers) {
    if (!t.ticker) continue;
    const sym = yahooSymbolFromTickerExchange(t.ticker, t.exchange || "");
    const padded = normalizeHkYahooSymbol(sym);
    unique.set(padded, t.ticker);
    for (const alt of yahooSymbolAliases(padded)) {
      if (!unique.has(alt)) unique.set(alt, t.ticker);
    }
  }
  const symbols = [...unique.keys()];
  const BATCH = 8;
  for (let i = 0; i < symbols.length; i += BATCH) {
    const chunk = symbols.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      chunk.map(async (sym) => {
        const q = await yahoo.getQuote(sym);
        return { sym, price: q.regularMarketPrice, currency: q.currency };
      }),
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.price > 0) {
        const orig = unique.get(r.value.sym) || r.value.sym;
        // Prefer first successful quote per original ticker
        if (!quotes[orig]) {
          quotes[orig] = { price: r.value.price, currency: r.value.currency };
        }
        quotes[r.value.sym] = { price: r.value.price, currency: r.value.currency };
      }
    }
  }
  return quotes;
}

/** Apply safe preview-time fixes to parsed transactions (mutate copy). */
export function applyTransactionAutoFixes(
  transactions: ParsedTransaction[],
  findings: ImportQualityFinding[],
  quotes: Record<string, MarketQuoteRef>,
): { transactions: ParsedTransaction[]; findings: ImportQualityFinding[] } {
  const txs = transactions.map((t) => ({ ...t }));
  const byTicker = new Map(txs.map((t, i) => [t.ticker, i] as const));

  for (const f of findings) {
    if (!f.autoFixable || f.fixed) continue;
    if (!f.ticker) continue;
    const idx = byTicker.get(f.ticker);
    // May match multiple txs — fix all with same ticker for unit/currency
    const indices = txs
      .map((t, i) => (t.ticker === f.ticker ? i : -1))
      .filter((i) => i >= 0);
    if (indices.length === 0 && idx == null) continue;

    if (f.fixAction === "normalize_gbx") {
      for (const i of indices) {
        const before = { currency: txs[i].currency, pricePerShare: txs[i].pricePerShare };
        const cur = normalizeCurrency(txs[i].currency);
        // Only GBP/GBX family — never rewrite EUR/USD costs against pence quotes.
        if (cur === "GBP" || cur === "GBX" || cur === "GBp") {
          txs[i].currency = "GBX";
          if (txs[i].pricePerShare > 0 && txs[i].pricePerShare < 50) {
            txs[i].pricePerShare = txs[i].pricePerShare * 100;
            txs[i].totalAmount = txs[i].shares * txs[i].pricePerShare;
          }
        }
        f.fixed = true;
        f.before = before;
        f.after = { currency: txs[i].currency, pricePerShare: txs[i].pricePerShare };
      }
    }

    if (f.fixAction === "align_display_currency") {
      const q = quotes[f.ticker];
      if (!q) continue;
      const quoteCur = normalizeCurrency(q.currency);
      for (const i of indices) {
        const before = { currency: txs[i].currency };
        // Prefer GBX when quote is pence-labeled GBP on .L tickers with high prices
        if (/\.L$/i.test(f.ticker) && quoteCur === "GBP" && q.price > 50) {
          txs[i].currency = "GBX";
        } else if (quoteCur === "GBX" || quoteCur === "GBP") {
          txs[i].currency = quoteCur === "GBP" && q.price > 50 ? "GBX" : quoteCur;
        } else {
          txs[i].currency = quoteCur;
        }
        f.fixed = true;
        f.before = before;
        f.after = { currency: txs[i].currency };
      }
    }
  }

  return { transactions: txs, findings };
}

export interface HoldingRepairResult {
  holdingId: string;
  updates: Partial<Holding>;
  findingIds: string[];
}

/** Compute holding field updates for auto-fixable findings (does not persist). */
export function planHoldingAutoFixes(
  holdings: Holding[],
  findings: ImportQualityFinding[],
  quotes: Record<string, MarketQuoteRef>,
  exchangeRates: ExchangeRates,
): { plans: HoldingRepairResult[]; findings: ImportQualityFinding[] } {
  const plans: HoldingRepairResult[] = [];
  const byTicker = new Map(holdings.map((h) => [h.ticker, h]));

  for (const f of findings) {
    if (!f.autoFixable || f.fixed) continue;
    if (f.fixAction === "fetch_fx") {
      // FX fetch is handled by caller refreshing rates; mark fixed if rate now present
      const ccy = String(f.evidence.currency || "");
      if (ccy && hasExchangeRate(ccy, exchangeRates)) {
        f.fixed = true;
        f.after = { ratePresent: true };
      }
      continue;
    }

    if (!f.ticker) continue;
    const h = byTicker.get(f.ticker);
    if (!h?.id) continue;

    const updates: Partial<Holding> = {};
    const before: Record<string, unknown> = {};

    if (f.fixAction === "pad_hk_ticker") {
      before.ticker = h.ticker;
      before.exchange = h.exchange;
      const padded = normalizeHkYahooSymbol(
        yahooSymbolFromTickerExchange(h.ticker, h.exchange || "HKG"),
      );
      // Keep bare ticker but ensure exchange is HKG for marketDataSymbol
      updates.exchange = h.exchange || "HKG";
      if (/^\d+$/.test(h.ticker)) {
        // leave ticker numeric; market-symbol pads at quote time
        updates.exchange = "HKG";
      }
      f.fixed = true;
      f.before = before;
      f.after = { exchange: updates.exchange, yahooSymbol: padded };
      plans.push({ holdingId: h.id, updates, findingIds: [f.id] });
      continue;
    }

    if (f.fixAction === "normalize_gbx") {
      before.displayCurrency = h.displayCurrency;
      before.purchasePrice = h.purchasePrice;
      updates.displayCurrency = "GBX";
      const cur = normalizeCurrency(h.displayCurrency);
      // Pounds stored as GBP, or pounds mislabeled as GBX (price still in £ range).
      if (
        (cur === "GBP" || cur === "GBX" || cur === "GBp") &&
        h.purchasePrice > 0 &&
        h.purchasePrice < 50
      ) {
        updates.purchasePrice = h.purchasePrice * 100;
      }
      f.fixed = true;
      f.before = before;
      f.after = { displayCurrency: updates.displayCurrency, purchasePrice: updates.purchasePrice };
      plans.push({ holdingId: h.id, updates, findingIds: [f.id] });
      continue;
    }

    if (f.fixAction === "align_display_currency") {
      const q = quotes[h.ticker];
      if (!q) continue;
      const quoteCur = normalizeCurrency(q.currency);
      before.displayCurrency = h.displayCurrency;
      if (/\.L$/i.test(h.ticker) || (h.exchange || "").toUpperCase() === "LSE") {
        updates.displayCurrency =
          quoteCur === "GBP" && q.price > 50 ? "GBX" : quoteCur === "GBX" ? "GBX" : quoteCur;
      } else {
        updates.displayCurrency = quoteCur;
      }
      f.fixed = true;
      f.before = before;
      f.after = { displayCurrency: updates.displayCurrency };
      plans.push({ holdingId: h.id, updates, findingIds: [f.id] });
      continue;
    }

    if (f.fixAction === "recompute_value_in_eur") {
      const q = quotes[h.ticker];
      if (!q) continue;
      const quoteCurrency = resolveQuoteCurrency(h.displayCurrency, q.currency);
      if (!hasExchangeRate(quoteCurrency, exchangeRates) && quoteCurrency !== "EUR") continue;
      const valueEUR = convertToEUR(h.shares * q.price, quoteCurrency, exchangeRates);
      if (!Number.isFinite(valueEUR) || valueEUR <= 0) continue;
      before.valueInEUR = h.valueInEUR;
      updates.valueInEUR = valueEUR;
      f.fixed = true;
      f.before = before;
      f.after = { valueInEUR: valueEUR };
      plans.push({ holdingId: h.id, updates, findingIds: [f.id] });
    }
  }

  // Always recompute valueInEUR when we changed currency/price and have quote+FX
  for (const plan of plans) {
    const h = holdings.find((x) => x.id === plan.holdingId);
    if (!h) continue;
    if (plan.updates.valueInEUR != null) continue;
    const q = quotes[h.ticker];
    if (!q) continue;
    const displayCurrency = plan.updates.displayCurrency ?? h.displayCurrency;
    const quoteCurrency = resolveQuoteCurrency(displayCurrency, q.currency);
    if (!hasExchangeRate(quoteCurrency, exchangeRates) && quoteCurrency !== "EUR") continue;
    const valueEUR = convertToEUR(h.shares * q.price, quoteCurrency, exchangeRates);
    if (Number.isFinite(valueEUR) && valueEUR > 0) {
      plan.updates.valueInEUR = valueEUR;
    }
  }

  return { plans, findings };
}
