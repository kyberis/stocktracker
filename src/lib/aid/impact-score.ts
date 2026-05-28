import type {
  AidDigestItem,
  AidFinPulseItem,
  AidFeedItem,
  AidFeedSource,
  AidImpactScore,
  AidNewsFilterTag,
  AidNewsImpact,
} from "@/lib/types";

export type { AidImpactScore, AidFeedSource, AidFeedItem } from "@/lib/types";

const IMPACT_BASE: Record<AidNewsImpact, number> = {
  low: 2,
  medium: 3,
  high: 4,
};

function clampScore(n: number): AidImpactScore {
  return Math.min(5, Math.max(1, Math.round(n))) as AidImpactScore;
}

export function computeDigestImpactScore(input: {
  impact: AidNewsImpact;
  movePct: number | null;
  filterTags: AidNewsFilterTag[];
}): AidImpactScore {
  let score = IMPACT_BASE[input.impact] ?? 3;
  if (input.filterTags.includes("earnings")) score += 1;
  if (input.movePct != null && Math.abs(input.movePct) >= 5) score += 1;
  else if (input.movePct != null && Math.abs(input.movePct) >= 3) score += 0.5;
  return clampScore(score);
}

export function computeFinPulseImpactScore(input: {
  impact: AidNewsImpact;
  portfolioRelevant: boolean;
  tickers: string[];
}): AidImpactScore {
  let score = IMPACT_BASE[input.impact] ?? 3;
  if (input.portfolioRelevant) score += 1;
  if (input.tickers.length >= 2) score += 0.5;
  return clampScore(score);
}

export function withDigestImpactScore(item: Omit<AidDigestItem, "impactScore">): AidDigestItem {
  return {
    ...item,
    impactScore: computeDigestImpactScore({
      impact: item.impact,
      movePct: item.movePct,
      filterTags: item.filterTags,
    }),
  };
}

export function withFinPulseImpactScore(item: Omit<AidFinPulseItem, "impactScore">): AidFinPulseItem {
  return {
    ...item,
    impactScore: computeFinPulseImpactScore({
      impact: item.impact,
      portfolioRelevant: item.portfolioRelevant,
      tickers: item.tickers,
    }),
  };
}

export function sortByImpactScore<T extends { impactScore: AidImpactScore; cachedAt?: string; publishedAt?: string }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    if (b.impactScore !== a.impactScore) return b.impactScore - a.impactScore;
    const dateA = a.cachedAt ?? a.publishedAt ?? "";
    const dateB = b.cachedAt ?? b.publishedAt ?? "";
    return dateB.localeCompare(dateA);
  });
}

export function digestToFeedItem(item: AidDigestItem, source: AidFeedSource = "digest"): AidFeedItem {
  return {
    id: `${source}:${item.id}`,
    source,
    impactScore: item.impactScore,
    headline: item.headline,
    sortDate: item.cachedAt,
    anchorId: source === "earnings" ? "aid-earnings" : "aid-news",
    label: item.ticker,
  };
}

export function finPulseToFeedItem(item: AidFinPulseItem): AidFeedItem {
  return {
    id: `finpulse:${item.id}`,
    source: "finpulse",
    impactScore: item.impactScore,
    headline: item.headline,
    sortDate: item.publishedAt || item.cachedAt,
    anchorId: "aid-finpulse",
    label: item.handle,
  };
}

export function mergePriorityFeed(args: {
  digest: AidDigestItem[];
  finPulse: AidFinPulseItem[];
  earnings: AidDigestItem[];
  limit?: number;
}): AidFeedItem[] {
  const merged = [
    ...args.digest.map((i) => digestToFeedItem(i, "digest")),
    ...args.finPulse.map(finPulseToFeedItem),
    ...args.earnings.map((i) => digestToFeedItem(i, "earnings")),
  ];
  return merged
    .sort((a, b) => b.impactScore - a.impactScore || b.sortDate.localeCompare(a.sortDate))
    .slice(0, args.limit ?? 5);
}

export function impactScoreClass(score: AidImpactScore): string {
  if (score >= 5) return "bg-red-500/15 text-red-600 dark:text-red-400";
  if (score >= 4) return "bg-orange-500/15 text-orange-700 dark:text-orange-300";
  if (score >= 3) return "bg-amber-500/15 text-amber-800 dark:text-amber-200";
  return "bg-[color:var(--surface-highlight)] text-[color:var(--muted)]";
}

export function impactScoreLabel(score: AidImpactScore, t: (k: string) => string): string {
  return t("aidImpactScore").replace("{n}", String(score));
}

/** Legacy 3-level badge (unchanged for rows that only show high/medium/low). */
export function impactClass(impact: AidNewsImpact): string {
  if (impact === "high") return "bg-red-500/15 text-red-600 dark:text-red-400";
  if (impact === "low") return "bg-[color:var(--surface-highlight)] text-[color:var(--muted)]";
  return "bg-amber-500/15 text-amber-800 dark:text-amber-200";
}

export function impactLabel(impact: AidNewsImpact, t: (k: string) => string): string {
  if (impact === "high") return t("aidImpactHigh");
  if (impact === "low") return t("aidImpactLow");
  return t("aidImpactMedium");
}
