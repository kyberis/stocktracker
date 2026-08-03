import type { ExchangeRates } from "./types";

export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

const CURRENCY_SYMBOLS: Record<string, { prefix: string; suffix: string }> = {
  USD: { prefix: "$", suffix: "" },
  EUR: { prefix: "€", suffix: "" },
  GBP: { prefix: "£", suffix: "" },
  GBX: { prefix: "", suffix: "p" },
  GBp: { prefix: "", suffix: "p" },
  DKK: { prefix: "", suffix: " DKK" },
  CAD: { prefix: "CA$", suffix: "" },
  CHF: { prefix: "CHF ", suffix: "" },
  JPY: { prefix: "¥", suffix: "" },
  SEK: { prefix: "", suffix: " SEK" },
  NOK: { prefix: "", suffix: " NOK" },
  AUD: { prefix: "A$", suffix: "" },
  NZD: { prefix: "NZ$", suffix: "" },
  PLN: { prefix: "", suffix: " zł" },
  CZK: { prefix: "", suffix: " Kč" },
  HUF: { prefix: "", suffix: " Ft" },
  RON: { prefix: "", suffix: " lei" },
  SGD: { prefix: "S$", suffix: "" },
  HKD: { prefix: "HK$", suffix: "" },
  ZAR: { prefix: "R", suffix: "" },
  TRY: { prefix: "₺", suffix: "" },
  BRL: { prefix: "R$", suffix: "" },
  MXN: { prefix: "MX$", suffix: "" },
};

export function formatCurrency(value: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency];

  if (sym) {
    const formatted = Math.abs(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const sign = value < 0 ? "-" : "";
    return `${sign}${sym.prefix}${formatted}${sym.suffix}`;
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Format a currency value, replacing it with "•••••" when stealth mode is on.
 * The underlying calculation must be complete before calling this helper;
 * stealth wraps display only, never the computation.
 */
export function formatStealthCurrency(value: number, currency: string, stealthMode: boolean): string {
  if (stealthMode) return "•••••";
  return formatCurrency(value, currency);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

export function normalizeCurrency(currency: string): string {
  if (currency === "GBp") return "GBX";
  return currency;
}

/**
 * Resolve the actual quote currency, guarding against GBP/GBX confusion.
 *
 * LSE is a multi-currency exchange — some instruments trade in GBX (pence),
 * others in USD, EUR, or GBP.  We only force GBX when the holding says GBX
 * AND the provider returned a GBP-family label (GBP / GBp / GBX), which is
 * the known mislabel case.  If the provider says USD or EUR we trust it,
 * since those are clearly distinct currencies (e.g. IB01.L trades in USD).
 */
export function resolveQuoteCurrency(
  holdingDisplayCurrency: string,
  quoteCurrency: string
): string {
  const holdingNorm = normalizeCurrency(holdingDisplayCurrency);
  const quoteNorm = normalizeCurrency(quoteCurrency);
  if (
    holdingNorm === "GBX" &&
    (quoteNorm === "GBP" || quoteNorm === "GBX")
  ) {
    return "GBX";
  }
  return quoteNorm;
}

/**
 * Convert an amount from one currency to EUR using exchange rates.
 * Exchange rates are stored as "1 EUR = X units of foreign currency"
 * (e.g., EURUSD=1.17 means 1 EUR = 1.17 USD).
 *
 * Returns NaN when the required rate is missing — never treat foreign
 * amounts as EUR (that silently overstated portfolio totals).
 */
export function convertToEUR(
  amount: number,
  fromCurrency: string,
  rates: ExchangeRates
): number {
  const normalized = normalizeCurrency(fromCurrency);
  if (normalized === "EUR") return amount;

  if (normalized === "GBX") {
    const gbpRate = rates["EURGBP"];
    if (!gbpRate) return Number.NaN;
    return (amount / 100) / gbpRate;
  }

  const rateKey = `EUR${normalized}`;
  const rate = rates[rateKey];
  if (!rate) return Number.NaN;
  return amount / rate;
}

/**
 * True when convertCurrency(from → to) can run without a missing-rate gap.
 */
export function canConvertCurrency(
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRates,
): boolean {
  const fromNorm = normalizeCurrency(fromCurrency);
  const toNorm = normalizeCurrency(toCurrency);
  if (fromNorm === toNorm) return true;
  if (fromNorm !== "EUR" && !hasExchangeRate(fromNorm, rates)) return false;
  if (toNorm !== "EUR" && !hasExchangeRate(toNorm, rates)) return false;
  return true;
}

/**
 * Convert an amount from one currency to another.
 * Returns NaN when a required EUR-anchored rate is missing.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRates
): number {
  const fromNorm = normalizeCurrency(fromCurrency);
  const toNorm = normalizeCurrency(toCurrency);
  if (fromNorm === toNorm) return amount;

  if (!canConvertCurrency(fromNorm, toNorm, rates)) return Number.NaN;

  const amountInEUR = convertToEUR(amount, fromCurrency, rates);
  if (!Number.isFinite(amountInEUR)) return Number.NaN;

  if (toNorm === "EUR") return amountInEUR;

  if (toNorm === "GBX") {
    const gbpRate = rates["EURGBP"];
    if (!gbpRate) return Number.NaN;
    return amountInEUR * gbpRate * 100;
  }

  const targetKey = `EUR${toNorm}`;
  const targetRate = rates[targetKey];
  if (!targetRate) return Number.NaN;
  return amountInEUR * targetRate;
}

/**
 * Check if a usable exchange rate exists for converting a currency to EUR.
 * Returns true for EUR itself, and for any currency with a non-zero rate key.
 */
export function hasExchangeRate(currency: string, rates: ExchangeRates): boolean {
  const norm = normalizeCurrency(currency);
  if (norm === "EUR") return true;
  if (norm === "GBX") return !!rates["EURGBP"];
  return !!rates[`EUR${norm}`];
}

/**
 * Format a currency value, returning "--" when the required exchange rate is missing.
 * Use this when the display value depends on a conversion from a different currency.
 */
export function formatCurrencyWithGuard(
  value: number,
  displayCurrency: string,
  sourceCurrency: string,
  rates: ExchangeRates,
): string {
  if (displayCurrency !== sourceCurrency && !hasExchangeRate(sourceCurrency, rates)) {
    return "--";
  }
  return formatCurrency(value, displayCurrency);
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
