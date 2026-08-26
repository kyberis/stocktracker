/** ISIN format: 2 letters + 9 alphanumeric + 1 check digit */
const ISIN_PATTERN = /^[A-Z]{2}[A-Z0-9]{9}\d$/;

export function looksLikeIsin(symbol: string): boolean {
  return ISIN_PATTERN.test(symbol.trim().toUpperCase());
}

/** True for a valid ISIN whose country code is not the United States. */
export function isNonUsIsin(isin: string): boolean {
  const upper = isin.trim().toUpperCase();
  return looksLikeIsin(upper) && !upper.startsWith("US");
}

/** ISIN embedded in a Yahoo symbol (`GB00BLD4ZL17.SG` → `GB00BLD4ZL17`). */
export function isinFromYahooSymbol(symbol: string): string {
  const base = symbol.trim().split(".")[0] ?? "";
  return isNonUsIsin(base) ? base.toUpperCase() : "";
}

/**
 * Pull an ISIN from broker/provider payloads. Prefers keys named `isin`/`ISIN`
 * at any depth (SnapTrade often nests it under `figi_instrument`).
 */
export function extractIsinFromUnknown(value: unknown, depth = 0): string {
  if (depth > 4 || value == null) return "";
  if (typeof value !== "object") return "";
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractIsinFromUnknown(item, depth + 1);
      if (found) return found;
    }
    return "";
  }
  const rec = value as Record<string, unknown>;
  for (const key of ["isin", "ISIN"]) {
    const raw = rec[key];
    if (typeof raw === "string" && looksLikeIsin(raw)) return raw.trim().toUpperCase();
  }
  for (const nested of Object.values(rec)) {
    if (nested && typeof nested === "object") {
      const found = extractIsinFromUnknown(nested, depth + 1);
      if (found) return found;
    }
  }
  return "";
}
