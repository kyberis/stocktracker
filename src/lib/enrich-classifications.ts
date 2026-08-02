import { listHoldings, updateHolding } from "@/lib/db";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import type { Holding } from "@/lib/types";
import { ETF_NAME_PATTERNS } from "@/lib/services/etf-lookthrough";
import { normalizeClassificationFields } from "@/lib/classification-normalize";

const MAX_CONCURRENT = 10;

/** Best-effort classification from the holding's own metadata when Yahoo
 *  doesn't know the symbol at all. */
function classifyFromHolding(h: Holding): { sector: string; region: string; assetClass: string } | null {
  if (h.assetType === "crypto") {
    return { sector: "Cryptocurrency", region: "", assetClass: "Cryptocurrency" };
  }
  if (h.assetType === "etf" || ETF_NAME_PATTERNS.test(h.name)) {
    return { sector: "ETF", region: "", assetClass: "ETF" };
  }
  if (h.assetType === "stock") {
    return { sector: "", region: "", assetClass: "Equity" };
  }
  return null;
}

/**
 * Fetches sector/region/assetClass from Yahoo Finance for all holdings
 * that have empty classification fields and persists the results.
 * Only fills empty fields — never overwrites user-set values.
 * Returns the number of holdings enriched.
 */
export async function enrichHoldingClassifications(userId: string): Promise<number> {
  const holdings = await listHoldings(userId);
  const unclassified = holdings.filter(
    (h) => !h.sector || !h.region || !h.assetClass
  );

  if (unclassified.length === 0) return 0;

  const uniqueTickers = new Map<string, string[]>();
  for (const h of unclassified) {
    const key = h.ticker.toUpperCase();
    if (!uniqueTickers.has(key)) uniqueTickers.set(key, []);
    uniqueTickers.get(key)!.push(h.id);
  }

  const yahoo = new YahooProvider();
  let enriched = 0;

  const entries = Array.from(uniqueTickers.entries());
  for (let i = 0; i < entries.length; i += MAX_CONCURRENT) {
    const batch = entries.slice(i, i + MAX_CONCURRENT);
    const results = await Promise.allSettled(
      batch.map(async ([ticker, holdingIds]) => {
        const yahooData = await yahoo.getClassification(ticker);

        for (const id of holdingIds) {
          const holding = unclassified.find((h) => h.id === id);
          if (!holding) continue;

          const data = yahooData ?? classifyFromHolding(holding);
          if (!data) continue;

          const normalized = normalizeClassificationFields(data);
          const updates: Record<string, string> = {};
          if (!holding.sector && normalized.sector) updates.sector = normalized.sector;
          if (!holding.region && normalized.region) updates.region = normalized.region;
          if (!holding.assetClass && normalized.assetClass) updates.assetClass = normalized.assetClass;

          if (Object.keys(updates).length > 0) {
            await updateHolding(userId, id, updates);
            enriched++;
          }
        }
      })
    );

    for (const r of results) {
      if (r.status === "rejected") {
        console.warn("[enrich-classifications] batch item failed:", r.reason);
      }
    }
  }

  return enriched;
}

/**
 * Rewrite stored sector/region/assetClass to canonical aliases
 * (e.g. "Information Technology" → "Technology"). Returns how many holdings updated.
 */
export async function normalizeStoredHoldingClassifications(userId: string): Promise<number> {
  const holdings = await listHoldings(userId);
  let updated = 0;

  for (const h of holdings) {
    const updates = {
      ...(h.sector ? { sector: h.sector } : {}),
      ...(h.region ? { region: h.region } : {}),
      ...(h.assetClass ? { assetClass: h.assetClass } : {}),
    };
    const next = normalizeClassificationFields(updates);
    const patch: Record<string, string> = {};
    if (next.sector && next.sector !== h.sector) patch.sector = next.sector;
    if (next.region && next.region !== h.region) patch.region = next.region;
    if (next.assetClass && next.assetClass !== h.assetClass) patch.assetClass = next.assetClass;
    if (Object.keys(patch).length === 0) continue;
    await updateHolding(userId, h.id, patch);
    updated++;
  }

  return updated;
}
