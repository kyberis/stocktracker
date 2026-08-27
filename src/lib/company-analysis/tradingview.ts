/**
 * Map trefolio exchange labels to TradingView exchange prefixes.
 * Company analysis v1 is US-listed; keep the map small and explicit.
 */
const EXCHANGE_TO_TV: Record<string, string> = {
  NYSE: "NYSE",
  NYS: "NYSE",
  XNYS: "NYSE",
  "NEW YORK STOCK EXCHANGE": "NYSE",
  NASDAQ: "NASDAQ",
  NMS: "NASDAQ",
  NGM: "NASDAQ",
  NCM: "NASDAQ",
  NDQ: "NASDAQ",
  XNAS: "NASDAQ",
  NasdaqGS: "NASDAQ",
  NasdaqGM: "NASDAQ",
  NasdaqCM: "NASDAQ",
  AMEX: "AMEX",
  ASE: "AMEX",
  XASE: "AMEX",
  NYSEARCA: "AMEX",
  ARCA: "AMEX",
  "NYSE ARCA": "AMEX",
  "NYSE AMERICAN": "AMEX",
  BATS: "BATS",
  BTS: "BATS",
  XET: "XETR",
  XETR: "XETR",
  GER: "XETR",
};

function normalizeExchange(exchange: string | null | undefined): string {
  return (exchange ?? "").trim().toUpperCase().replace(/\s+/g, " ");
}

/** TradingView symbol like `NYSE:NOW` or bare `NOW` when exchange is unknown. */
export function toTradingViewSymbol(
  ticker: string,
  exchange?: string | null,
): string {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return "";
  const raw = normalizeExchange(exchange);
  const compact = raw.replace(/\s+/g, "");
  const mapped =
    EXCHANGE_TO_TV[raw] ||
    EXCHANGE_TO_TV[compact] ||
    (raw.includes("NASDAQ") ? "NASDAQ" : null) ||
    (raw.includes("NYSE") && raw.includes("ARCA") ? "AMEX" : null) ||
    (raw.includes("NYSE") ? "NYSE" : null);
  return mapped ? `${mapped}:${symbol}` : symbol;
}

/** Public TradingView chart page for fallback link. */
export function toTradingViewChartUrl(
  ticker: string,
  exchange?: string | null,
): string {
  const tv = toTradingViewSymbol(ticker, exchange);
  if (!tv) return "https://www.tradingview.com/";
  if (tv.includes(":")) {
    const [ex, sym] = tv.split(":");
    return `https://www.tradingview.com/symbols/${ex}-${sym}/`;
  }
  return `https://www.tradingview.com/symbols/${tv}/`;
}

/** Locales TradingView widgetembed accepts (subset we care about). */
export function toTradingViewLocale(language: string): string {
  const base = language.toLowerCase().split("-")[0] ?? "en";
  const supported = new Set([
    "en",
    "es",
    "de",
    "fr",
    "it",
    "pt",
    "pl",
    "tr",
    "ru",
    "nl",
    "sv",
    "no",
    "da",
    "fi",
    "hu",
    "cs",
    "th",
    "zh",
    "ja",
    "ko",
    "ar",
    "he",
    "vi",
    "id",
    "ms",
  ]);
  if (base === "nb" || base === "nn") return "no";
  return supported.has(base) ? base : "en";
}
