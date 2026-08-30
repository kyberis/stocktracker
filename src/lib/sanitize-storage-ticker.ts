import { looksLikeIsin } from "@/lib/isin";
import { KNOWN_ISINS } from "@/lib/known-isins";

/**
 * Normalize a ticker before persisting holdings/transactions.
 * Never returns an ISIN (or ISIN.venue) as the ticker — those go into `isin`.
 */
export function sanitizeStorageTicker(
  ticker: string,
  isinHint = "",
): { ticker: string; isin: string } {
  const raw = String(ticker || "").trim().toUpperCase();
  let isin = String(isinHint || "").trim().toUpperCase();
  if (isin && !looksLikeIsin(isin)) isin = "";

  if (!raw) return { ticker: "", isin };

  const dotted = raw.match(/^([A-Z]{2}[A-Z0-9]{9}\d)\.([A-Z]{1,4})$/);
  const base = dotted ? dotted[1] : raw;

  if (looksLikeIsin(base)) {
    if (!isin) isin = base;
    const known = KNOWN_ISINS[base];
    if (known) return { ticker: known, isin };
    // Unresolved ISIN must not be stored as the tradeable ticker.
    return { ticker: "", isin };
  }

  return { ticker: raw, isin };
}

/** True when a symbol is an ISIN or `ISIN.VENUE` (not a normal Yahoo equity ticker). */
export function isIsinAsTicker(symbol: string): boolean {
  const raw = String(symbol || "").trim().toUpperCase();
  if (!raw) return false;
  if (looksLikeIsin(raw)) return true;
  const dotted = raw.match(/^([A-Z]{2}[A-Z0-9]{9}\d)\.([A-Z]{1,4})$/);
  return !!(dotted && looksLikeIsin(dotted[1]));
}
