import { ensureInitialized } from "@/lib/db/client";
import { num, str } from "@/lib/db/helpers";
import {
  fmpScreenerCandidateSchema,
  type FetchFmpScreenerOptions,
  type FetchFmpScreenerResult,
  type FmpScreenerCandidate,
} from "@/lib/screening/data/fmp-screening";

function normaliseSector(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/**
 * Discovery universe from `screener_cache` (Yahoo-synced names).
 * Country is not stored on that cache, so region filters are ignored.
 */
export async function fetchCachedScreenerUniverse(
  opts: FetchFmpScreenerOptions,
): Promise<FetchFmpScreenerResult> {
  const limit = Math.min(500, Math.max(20, opts.limit ?? 120));
  const client = await ensureInitialized();
  const conditions: string[] = ["symbol != ''"];
  const args: Array<string | number> = [];

  if (opts.marketCapMin != null && Number.isFinite(opts.marketCapMin)) {
    conditions.push("market_cap >= ?");
    args.push(opts.marketCapMin);
  }
  if (opts.marketCapMax != null && Number.isFinite(opts.marketCapMax)) {
    conditions.push("market_cap <= ?");
    args.push(opts.marketCapMax);
  }

  const result = await client.execute({
    sql: `SELECT symbol, short_name, sector, industry, country, exchange, market_cap, regular_market_price
          FROM screener_cache
          WHERE ${conditions.join(" AND ")}
          ORDER BY market_cap DESC NULLS LAST
          LIMIT ?`,
    args: [...args, limit],
  });

  const includeSet = new Set(opts.includeSectors?.map(normaliseSector).filter(Boolean));
  const excludeSet = new Set(opts.excludeSectors?.map(normaliseSector).filter(Boolean));
  const candidates: FmpScreenerCandidate[] = [];

  for (const row of result.rows) {
    const sector = str(row.sector) || null;
    const sectorLc = normaliseSector(sector);
    if (excludeSet.size > 0 && sectorLc && excludeSet.has(sectorLc)) continue;
    if (includeSet.size > 0 && (!sectorLc || !includeSet.has(sectorLc))) continue;
    const parsed = fmpScreenerCandidateSchema.safeParse({
      ticker: str(row.symbol).toUpperCase(),
      name: str(row.short_name) || str(row.symbol),
      sector,
      industry: str(row.industry) || null,
      country: str(row.country) || null,
      exchange: str(row.exchange) || null,
      marketCapUsd: row.market_cap != null ? num(row.market_cap) : null,
      price: row.regular_market_price != null ? num(row.regular_market_price) : null,
    });
    if (parsed.success) candidates.push(parsed.data);
  }

  return { candidates, requestCount: 0, errors: [] };
}
