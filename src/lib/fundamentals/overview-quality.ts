import type { CompanyOverview } from "@/lib/api-providers/types";

/** Overview has at least one multiple usable for cheap/expensive scoring. */
export function hasValuationMetrics(overview: CompanyOverview | null | undefined): boolean {
  if (!overview) return false;
  return (
    overview.peRatio != null ||
    overview.forwardPE != null ||
    overview.pegRatio != null
  );
}

/** Richer overviews rank higher when resolving cross-listings / sparse Yahoo rows. */
export function overviewQualityScore(overview: CompanyOverview | null | undefined): number {
  if (!overview) return 0;
  let score = 0;
  if (overview.peRatio != null) score += 4;
  if (overview.forwardPE != null) score += 3;
  if (overview.pegRatio != null) score += 2;
  if (overview.returnOnEquity != null) score += 1;
  if (overview.profitMargin != null) score += 1;
  if (overview.revenueTTM != null) score += 1;
  if (overview.name && overview.name !== overview.symbol) score += 1;
  return score;
}

const MERGE_FIELDS: (keyof CompanyOverview)[] = [
  "name",
  "description",
  "exchange",
  "currency",
  "sector",
  "industry",
  "peRatio",
  "pegRatio",
  "eps",
  "dividendPerShare",
  "dividendYield",
  "beta",
  "profitMargin",
  "returnOnEquity",
  "revenueTTM",
  "analystTargetPrice",
  "analystRatings",
  "fiftyDayMA",
  "twoHundredDayMA",
  "sharesOutstanding",
  "forwardPE",
];

/** Fill null fields from secondary overviews (e.g. Yahoo + FMP merge). */
function isMissingOverviewField(
  key: keyof CompanyOverview,
  value: unknown,
  symbol: string,
): boolean {
  if (value == null) return true;
  if (key === "name" && typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length === 0 || trimmed.toUpperCase() === symbol.toUpperCase();
  }
  return false;
}

export function mergeOverviews(
  base: CompanyOverview,
  ...others: Array<CompanyOverview | null | undefined>
): CompanyOverview {
  const merged: CompanyOverview = { ...base, symbol: base.symbol };
  for (const other of others) {
    if (!other) continue;
    for (const key of MERGE_FIELDS) {
      const current = merged[key];
      const incoming = other[key];
      if (isMissingOverviewField(key, current, merged.symbol) && incoming != null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (merged as any)[key] = incoming;
      }
    }
  }
  return merged;
}
