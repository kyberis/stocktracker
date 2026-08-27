import type { AnalystTargetSnapshot, ExchangeRates } from "@/lib/types";
import {
  canConvertCurrency,
  convertCurrency,
  formatCurrency,
} from "@/lib/utils";

/**
 * Convert a cached analyst target (stored in the instrument's native currency)
 * into the caller's display currency. Returns null when FX rates are missing.
 */
export function convertAnalystTargetPrice(
  target: AnalystTargetSnapshot,
  displayCurrency: string,
  rates: ExchangeRates,
): number | null {
  if (!canConvertCurrency(target.currency, displayCurrency, rates)) return null;
  const converted = convertCurrency(
    target.price,
    target.currency,
    displayCurrency,
    rates,
  );
  if (!Number.isFinite(converted)) return null;
  return converted;
}

/**
 * Format a cached analyst target in the user's display currency.
 * Shows "--" when the required FX rate is unavailable.
 */
export function formatAnalystTargetPrice(
  target: AnalystTargetSnapshot,
  displayCurrency: string,
  rates: ExchangeRates,
): string {
  const converted = convertAnalystTargetPrice(target, displayCurrency, rates);
  if (converted == null) return "--";
  return formatCurrency(converted, displayCurrency);
}
