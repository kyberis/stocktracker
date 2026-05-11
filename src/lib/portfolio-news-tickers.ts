/**
 * Symbols used for portfolio news ranking / DB joins — matches `/api/portfolio-news`.
 */
export function derivePortfolioNewsTickersFromHoldings(
  holdings: { ticker: string; valueInEUR?: number | null }[],
): string[] {
  const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
  const VALID_TICKER = /^[A-Za-z0-9:_-]+$/;

  return holdings
    .sort((a, b) => (b.valueInEUR ?? 0) - (a.valueInEUR ?? 0))
    .map((h) => (h.ticker.includes(".") ? h.ticker.split(".")[0]! : h.ticker))
    .filter((t) => t.length > 0 && t.length <= 10 && !ISIN_RE.test(t) && VALID_TICKER.test(t))
    .filter((t, i, arr) => arr.indexOf(t) === i)
    .slice(0, 10);
}
