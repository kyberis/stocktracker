/**
 * Symbols used for portfolio news ranking / DB joins — matches `/api/portfolio-news`.
 */
const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/i;
const VALID_TICKER = /^[A-Za-z0-9:_-]+$/;

function baseSymbol(ticker: string): string {
  const trimmed = ticker.trim();
  if (!trimmed) return "";
  return trimmed.includes(".") ? (trimmed.split(".")[0] ?? trimmed) : trimmed;
}

function isUsableNewsSymbol(symbol: string, strict: boolean): boolean {
  if (!symbol || ISIN_RE.test(symbol)) return false;
  if (!VALID_TICKER.test(symbol)) return false;
  if (strict && symbol.length > 12) return false;
  return symbol.length <= 24;
}

export function derivePortfolioNewsTickersFromHoldings(
  holdings: { ticker: string; valueInEUR?: number | null }[],
): string[] {
  const sorted = [...holdings].sort((a, b) => (b.valueInEUR ?? 0) - (a.valueInEUR ?? 0));
  const strict: string[] = [];
  const loose: string[] = [];

  for (const h of sorted) {
    const symbol = baseSymbol(h.ticker);
    if (!symbol) continue;
    if (isUsableNewsSymbol(symbol, true)) strict.push(symbol);
    else if (isUsableNewsSymbol(symbol, false)) loose.push(symbol);
  }

  const pick = strict.length > 0 ? strict : loose;
  return pick
    .filter((t, i, arr) => arr.findIndex((x) => x.toUpperCase() === t.toUpperCase()) === i)
    .slice(0, 15);
}
