import type { Holding } from "@/lib/types";

function unionTagStrings(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const trimmed = t.trim();
    if (!trimmed) continue;
    const k = trimmed.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(trimmed);
  }
  return out;
}

/** All distinct tags used on stock/ETF holdings in the portfolio (canonical spelling preserved). */
export function collectDistinctTagsFromHoldings(
  holdings: Holding[],
  opts?: { excludeHoldingId?: string },
): string[] {
  const excludeId = opts?.excludeHoldingId;
  const flat: string[] = [];
  for (const h of holdings) {
    const t = h.assetType ?? "stock";
    if (t !== "stock" && t !== "etf") continue;
    if (excludeId && h.id === excludeId) continue;
    if (h.tags?.length) flat.push(...h.tags);
  }
  return unionTagStrings(flat).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

export function filterTagSuggestions(query: string, pool: string[]): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...pool];
  return pool.filter((tag) => tag.toLowerCase().includes(q));
}
