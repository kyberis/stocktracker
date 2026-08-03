/**
 * Locale-tolerant number parse/normalize (TRF-012).
 * Accepts both "," and "." as decimal separators; normalizes to a finite number.
 */

export function parseLocaleNumber(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, "");
  if (!s) return null;

  // Both separators present: last one is decimal (e.g. 1.234,56 or 1,234.56)
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let normalized = s;
  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      normalized = s.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = s.replace(/,/g, "");
    }
  } else if (lastComma >= 0) {
    normalized = s.replace(",", ".");
  }

  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Format for display using a fixed decimal separator (default locale-aware via toLocaleString). */
export function formatLocaleNumber(
  value: number,
  locale: string,
  maxFractionDigits = 2,
): string {
  return value.toLocaleString(locale, {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0,
  });
}
