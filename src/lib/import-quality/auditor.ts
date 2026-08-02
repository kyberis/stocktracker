import { buildNeededFxPairs } from "@/lib/fx-pairs";
import { normalizeHkYahooSymbol, yahooSymbolFromTickerExchange } from "@/lib/market-symbol";
import { hasExchangeRate, normalizeCurrency } from "@/lib/utils";
import type { ExchangeRates } from "@/lib/types";
import type {
  AuditHoldingInput,
  AuditTransactionInput,
  ImportQualityFinding,
  MarketQuoteRef,
} from "./types";

const RECENT_TRADE_DAYS = 7;
const RECENT_TRADE_PCT = 0.15;
const MAGNITUDE_RATIO_MIN = 80;
const MAGNITUDE_RATIO_MAX = 120;

function findingId(code: string, key: string): string {
  return `${code}:${key}`;
}

function daysBetween(dateIso: string, now: Date): number {
  const d = new Date(`${dateIso.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return Infinity;
  return Math.abs(now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
}

function quoteForTicker(
  ticker: string,
  quotes: Record<string, MarketQuoteRef>,
): MarketQuoteRef | undefined {
  if (quotes[ticker]) return quotes[ticker];
  const upper = ticker.toUpperCase();
  if (quotes[upper]) return quotes[upper];
  // Try without exchange suffix
  const bare = upper.replace(/\.[A-Z]+$/, "");
  if (quotes[bare]) return quotes[bare];
  return undefined;
}

/** Ratio of quote price to import/purchase price in comparable units. */
function priceRatio(importPrice: number, quotePrice: number): number | null {
  if (!(importPrice > 0) || !(quotePrice > 0)) return null;
  return quotePrice / importPrice;
}

export function auditImportBatch(args: {
  transactions: AuditTransactionInput[];
  holdings?: AuditHoldingInput[];
  quotes: Record<string, MarketQuoteRef>;
  exchangeRates: ExchangeRates;
  unmappedIsins?: string[];
  now?: Date;
}): ImportQualityFinding[] {
  const now = args.now ?? new Date();
  const findings: ImportQualityFinding[] = [];
  const seen = new Set<string>();

  const push = (f: ImportQualityFinding) => {
    if (seen.has(f.id)) return;
    seen.add(f.id);
    findings.push(f);
  };

  for (const isin of args.unmappedIsins ?? []) {
    push({
      id: findingId("unresolved_ticker", isin),
      severity: "warn",
      code: "unresolved_ticker",
      isin,
      message: `ISIN ${isin} could not be mapped to a ticker symbol.`,
      evidence: { isin },
      autoFixable: false,
      fixAction: "none",
    });
  }

  const currencies = new Set<string>();
  for (const tx of args.transactions) {
    if (tx.currency) currencies.add(normalizeCurrency(tx.currency));
  }
  for (const h of args.holdings ?? []) {
    if (h.displayCurrency) currencies.add(normalizeCurrency(h.displayCurrency));
  }
  for (const q of Object.values(args.quotes)) {
    if (q.currency) currencies.add(normalizeCurrency(q.currency));
  }

  for (const pair of buildNeededFxPairs(currencies)) {
    const ccy = pair === "EURGBP" ? "GBP" : pair.slice(3);
    if (!args.exchangeRates[pair]) {
      push({
        id: findingId("missing_fx", pair),
        severity: "error",
        code: "missing_fx",
        message: `Missing exchange rate ${pair} — foreign values may be wrong until the rate is fetched.`,
        evidence: { pair, currency: ccy },
        autoFixable: true,
        fixAction: "fetch_fx",
      });
    }
  }

  for (const tx of args.transactions) {
    if (!tx.ticker) {
      if (tx.isin) {
        push({
          id: findingId("unresolved_ticker", tx.isin),
          severity: "warn",
          code: "unresolved_ticker",
          isin: tx.isin,
          message: `Transaction on ${tx.date} has ISIN ${tx.isin} but no ticker.`,
          evidence: { date: tx.date, isin: tx.isin },
          autoFixable: false,
          fixAction: "none",
        });
      }
      continue;
    }

    if (!(tx.pricePerShare > 0) && (tx.type === "buy" || tx.type === "sell")) {
      push({
        id: findingId("unit_magnitude", `${tx.ticker}:nonpositive`),
        severity: "error",
        code: "unit_magnitude",
        ticker: tx.ticker,
        message: `${tx.ticker}: imported price is missing or not positive.`,
        evidence: { pricePerShare: tx.pricePerShare, date: tx.date },
        autoFixable: false,
        fixAction: "none",
      });
    }

    const quote = quoteForTicker(tx.ticker, args.quotes);
    if (!quote) {
      push({
        id: findingId("missing_quote", tx.ticker),
        severity: "warn",
        code: "missing_quote",
        ticker: tx.ticker,
        message: `No live market quote found for ${tx.ticker}.`,
        evidence: { ticker: tx.ticker },
        autoFixable: false,
        fixAction: "none",
      });
      continue;
    }

    const txCur = normalizeCurrency(tx.currency);
    const quoteCur = normalizeCurrency(quote.currency);
    if (
      txCur !== quoteCur &&
      !(txCur === "GBP" && quoteCur === "GBX") &&
      !(txCur === "GBX" && quoteCur === "GBP")
    ) {
      const magnitudeOk =
        tx.pricePerShare > 0 &&
        quote.price > 0 &&
        Math.abs(tx.pricePerShare - quote.price) / quote.price < 0.25;
      push({
        id: findingId("currency_mismatch", tx.ticker),
        severity: "warn",
        code: "currency_mismatch",
        ticker: tx.ticker,
        message: `${tx.ticker}: import currency ${txCur} differs from market quote currency ${quoteCur}.`,
        evidence: { importCurrency: txCur, quoteCurrency: quoteCur, quotePrice: quote.price },
        autoFixable: magnitudeOk,
        fixAction: magnitudeOk ? "align_display_currency" : "none",
      });
    }

    // GBX / GBP 100× unit errors on LSE-style names
    const ratio = priceRatio(tx.pricePerShare, quote.price);
    if (
      ratio != null &&
      ratio >= MAGNITUDE_RATIO_MIN &&
      ratio <= MAGNITUDE_RATIO_MAX &&
      (txCur === "GBP" || quoteCur === "GBX" || /\.L$/i.test(tx.ticker))
    ) {
      push({
        id: findingId("unit_magnitude", tx.ticker),
        severity: "error",
        code: "unit_magnitude",
        ticker: tx.ticker,
        message: `${tx.ticker}: import price looks ~100× off vs market (possible GBX/GBP unit error).`,
        evidence: {
          importPrice: tx.pricePerShare,
          quotePrice: quote.price,
          ratio,
          importCurrency: txCur,
          quoteCurrency: quoteCur,
        },
        autoFixable: true,
        fixAction: "normalize_gbx",
      });
    }

    if (
      (tx.type === "buy" || tx.type === "sell") &&
      daysBetween(tx.date, now) <= RECENT_TRADE_DAYS &&
      ratio != null
    ) {
      // Compare in similar units: if currencies are GBX/GBP family, normalize
      let comparableImport = tx.pricePerShare;
      let comparableQuote = quote.price;
      if (txCur === "GBP" && quoteCur === "GBX") comparableImport *= 100;
      if (txCur === "GBX" && quoteCur === "GBP") comparableQuote *= 100;
      const pct = Math.abs(comparableImport - comparableQuote) / comparableQuote;
      if (pct > RECENT_TRADE_PCT && !(ratio >= MAGNITUDE_RATIO_MIN && ratio <= MAGNITUDE_RATIO_MAX)) {
        push({
          id: findingId("recent_trade_price", `${tx.ticker}:${tx.date}`),
          severity: "warn",
          code: "recent_trade_price",
          ticker: tx.ticker,
          message: `${tx.ticker}: recent trade price differs ${(pct * 100).toFixed(0)}% from market — confirm before keeping.`,
          evidence: {
            date: tx.date,
            importPrice: tx.pricePerShare,
            quotePrice: quote.price,
            pctDiff: pct,
          },
          autoFixable: false,
          fixAction: "set_price_per_share",
        });
      }
    }
  }

  for (const h of args.holdings ?? []) {
    findings.push(...auditHolding(h, args.quotes, args.exchangeRates));
  }

  // de-dupe again after holdings
  const out: ImportQualityFinding[] = [];
  const ids = new Set<string>();
  for (const f of [...findings]) {
    if (ids.has(f.id)) continue;
    ids.add(f.id);
    out.push(f);
  }
  return out;
}

export function auditHolding(
  h: AuditHoldingInput,
  quotes: Record<string, MarketQuoteRef>,
  exchangeRates: ExchangeRates,
): ImportQualityFinding[] {
  const findings: ImportQualityFinding[] = [];
  const cur = normalizeCurrency(h.displayCurrency);
  const quote = quoteForTicker(h.ticker, quotes);

  // HK bare numeric tickers
  const yahooSym = yahooSymbolFromTickerExchange(h.ticker, h.exchange || "");
  const padded = normalizeHkYahooSymbol(yahooSym);
  if (padded !== yahooSym || (/^\d{1,3}(\.HK)?$/i.test(h.ticker) && (h.exchange || "").toUpperCase().includes("HK"))) {
    if (/^\d{1,4}/.test(h.ticker.replace(/\.HK$/i, "")) && !/^0\d{3}/.test(h.ticker.replace(/\.HK$/i, ""))) {
      findings.push({
        id: findingId("hk_ticker_padding", h.ticker),
        severity: "warn",
        code: "hk_ticker_padding",
        ticker: h.ticker,
        message: `${h.ticker}: Hong Kong tickers need Yahoo’s 4-digit form (e.g. 0215.HK).`,
        evidence: { ticker: h.ticker, suggestedSymbol: padded, exchange: h.exchange },
        autoFixable: true,
        fixAction: "pad_hk_ticker",
      });
    }
  }

  if (cur !== "EUR" && !hasExchangeRate(cur, exchangeRates)) {
    findings.push({
      id: findingId("missing_fx", cur),
      severity: "error",
      code: "missing_fx",
      ticker: h.ticker,
      message: `${h.ticker}: missing FX rate for ${cur}.`,
      evidence: { currency: cur },
      autoFixable: true,
      fixAction: "fetch_fx",
    });
  }

  if (!quote) {
    findings.push({
      id: findingId("missing_quote", h.ticker),
      severity: "warn",
      code: "missing_quote",
      ticker: h.ticker,
      message: `No live market quote found for ${h.ticker}.`,
      evidence: { ticker: h.ticker },
      autoFixable: false,
      fixAction: "none",
    });
    return findings;
  }

  const quoteCur = normalizeCurrency(quote.currency);
  if (
    cur !== quoteCur &&
    !(cur === "GBP" && quoteCur === "GBX") &&
    !(cur === "GBX" && (quoteCur === "GBP" || quoteCur === "GBX"))
  ) {
    // Only auto-align when purchase price is already in quote units (similar magnitude).
    // Otherwise changing displayCurrency without converting cost basis would corrupt P&L.
    const magnitudeOk =
      h.purchasePrice > 0 &&
      quote.price > 0 &&
      Math.abs(h.purchasePrice - quote.price) / quote.price < 0.25;
    findings.push({
      id: findingId("currency_mismatch", h.ticker),
      severity: "warn",
      code: "currency_mismatch",
      ticker: h.ticker,
      message: `${h.ticker}: holding currency ${cur} differs from quote ${quoteCur}.`,
      evidence: {
        displayCurrency: cur,
        quoteCurrency: quoteCur,
        purchasePrice: h.purchasePrice,
        quotePrice: quote.price,
      },
      autoFixable: magnitudeOk,
      fixAction: magnitudeOk ? "align_display_currency" : "none",
    });
  }

  const isLse =
    (h.exchange || "").toUpperCase() === "LSE" ||
    /\.L$/i.test(h.ticker);
  if (
    isLse &&
    cur === "GBP" &&
    h.purchasePrice > 0 &&
    h.purchasePrice < 20 &&
    quote.price > 50 &&
    (quoteCur === "GBX" || quoteCur === "GBP")
  ) {
    const quoteAsGbx = quoteCur === "GBP" && quote.price < 20 ? quote.price * 100 : quote.price;
    const purchaseAsGbx = h.purchasePrice * 100;
    const ratio = quoteAsGbx / purchaseAsGbx;
    // Soft signal for unit normalization opportunity
    if (ratio > 0.3 && ratio < 3) {
      findings.push({
        id: findingId("unit_magnitude", `${h.ticker}:gbx-norm`),
        severity: "info",
        code: "unit_magnitude",
        ticker: h.ticker,
        message: `${h.ticker}: LSE holding stored in GBP pounds — normalizing to GBX matches broker pence quotes.`,
        evidence: {
          purchasePrice: h.purchasePrice,
          quotePrice: quote.price,
          quoteCurrency: quoteCur,
        },
        autoFixable: true,
        fixAction: "normalize_gbx",
      });
    }
  }

  const ratio = priceRatio(h.purchasePrice, quote.price);
  if (
    ratio != null &&
    ratio >= MAGNITUDE_RATIO_MIN &&
    ratio <= MAGNITUDE_RATIO_MAX &&
    (cur === "GBP" || quoteCur === "GBX" || isLse)
  ) {
    findings.push({
      id: findingId("unit_magnitude", h.ticker),
      severity: "error",
      code: "unit_magnitude",
      ticker: h.ticker,
      message: `${h.ticker}: purchase price looks ~100× off vs market (possible GBX/GBP unit error).`,
      evidence: {
        purchasePrice: h.purchasePrice,
        quotePrice: quote.price,
        ratio,
      },
      autoFixable: true,
      fixAction: "normalize_gbx",
    });
  }

  if (
    quote.price > 0 &&
    hasExchangeRate(quoteCur === "GBX" ? "GBX" : quoteCur, exchangeRates) &&
    (h.valueInEUR == null || h.valueInEUR <= 0)
  ) {
    findings.push({
      id: findingId("stale_value_in_eur", h.ticker),
      severity: "warn",
      code: "stale_value_in_eur",
      ticker: h.ticker,
      message: `${h.ticker}: stored EUR value is missing — will recompute from live quote.`,
      evidence: { valueInEUR: h.valueInEUR ?? 0 },
      autoFixable: true,
      fixAction: "recompute_value_in_eur",
    });
  }

  return findings;
}

export function buildQualityReport(
  findings: ImportQualityFinding[],
  aiSummary?: string | null,
): import("./types").ImportQualityReport {
  return {
    findings,
    fixedCount: findings.filter((f) => f.fixed).length,
    needsReviewCount: findings.filter((f) => !f.fixed && (f.severity === "error" || f.severity === "warn")).length,
    aiSummary: aiSummary ?? null,
  };
}
