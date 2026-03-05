import { listHoldings, updateHolding } from "@/lib/db";
import { YahooProvider } from "@/lib/api-providers/yahoo";

const MAX_CONCURRENT = 10;

/**
 * Fetches sector/region/assetClass from Yahoo Finance for all holdings
 * that have empty classification fields and persists the results.
 * Only fills empty fields — never overwrites user-set values.
 * Returns the number of holdings enriched.
 */
export async function enrichHoldingClassifications(userId: string): Promise<number> {
  const holdings = await listHoldings(userId);
  const unclassified = holdings.filter(
    (h) => !h.sector && !h.region && !h.assetClass
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
        const data = await yahoo.getClassification(ticker);
        if (!data) return;

        for (const id of holdingIds) {
          const holding = unclassified.find((h) => h.id === id);
          if (!holding) continue;

          const updates: Record<string, string> = {};
          if (!holding.sector && data.sector) updates.sector = data.sector;
          if (!holding.region && data.region) updates.region = data.region;
          if (!holding.assetClass && data.assetClass) updates.assetClass = data.assetClass;

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
