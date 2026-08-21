/**
 * Picks home-screen widget movers: always prefer 2 gainers + 1 loser,
 * ranked by absolute day % change. Fills from leftover absolute movers
 * when one side of the book is thin.
 */

export interface MoverCandidate {
  ticker: string;
  dayChange: number;
}

export function pickTopMovers<T extends MoverCandidate>(
  holdings: T[],
  opts: { gainers?: number; losers?: number; total?: number } = {},
): T[] {
  const gainersWanted = opts.gainers ?? 2;
  const losersWanted = opts.losers ?? 1;
  const totalWanted = opts.total ?? gainersWanted + losersWanted;

  const withChange = holdings.filter(
    (h) => typeof h.dayChange === "number" && Number.isFinite(h.dayChange),
  );

  const byAbsDesc = (a: T, b: T) =>
    Math.abs(b.dayChange) - Math.abs(a.dayChange) || a.ticker.localeCompare(b.ticker);

  const gainers = withChange
    .filter((h) => h.dayChange > 0)
    .sort((a, b) => b.dayChange - a.dayChange || a.ticker.localeCompare(b.ticker));

  const losers = withChange
    .filter((h) => h.dayChange < 0)
    .sort((a, b) => a.dayChange - b.dayChange || a.ticker.localeCompare(b.ticker));

  const selected: T[] = [];
  const seen = new Set<string>();

  for (const h of gainers.slice(0, gainersWanted)) {
    selected.push(h);
    seen.add(h.ticker);
  }
  for (const h of losers.slice(0, losersWanted)) {
    if (selected.length >= totalWanted) break;
    selected.push(h);
    seen.add(h.ticker);
  }

  if (selected.length < totalWanted) {
    const rest = withChange.filter((h) => !seen.has(h.ticker)).sort(byAbsDesc);
    for (const h of rest) {
      if (selected.length >= totalWanted) break;
      selected.push(h);
      seen.add(h.ticker);
    }
  }

  return selected.sort(byAbsDesc);
}
