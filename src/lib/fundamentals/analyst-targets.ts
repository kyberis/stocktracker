import type { CompanyOverview } from "@/lib/api-providers/types";
import { getFundamentalsCacheBySymbols } from "@/lib/db/fundamentals-cache";
import { isCacheableOverview } from "@/lib/fundamentals/cache-quality";
import {
  OVERVIEW_FETCH_CAP,
  holdingNeedsFundamentals,
} from "@/lib/holdings-research";
import { marketDataSymbolForHolding } from "@/lib/market-symbol";
import {
  ensureShareFundamentalsBatch,
  isFundamentalsFresh,
} from "@/lib/services/share-fundamentals";
import type { AnalystTargetSnapshot, Holding } from "@/lib/types";

export type { AnalystTargetSnapshot };

export type ResolveAnalystTargetsResult = {
  targets: Record<string, AnalystTargetSnapshot>;
  partial: boolean;
};

type HoldingSymbolEntry = {
  holding: Holding;
  marketSymbol: string;
  lookupKeys: string[];
};

function snapshotFromOverview(
  overview: CompanyOverview,
  updatedAt: string,
): AnalystTargetSnapshot | null {
  const price = overview.analystTargetPrice;
  if (price == null || !Number.isFinite(price) || price <= 0) return null;
  return {
    price,
    currency: overview.currency?.trim() || "USD",
    updatedAt,
  };
}

function readSnapshotFromCacheRow(
  dataJson: string,
  updatedAt: string,
): AnalystTargetSnapshot | null {
  if (!isFundamentalsFresh(updatedAt)) return null;
  try {
    const overview = JSON.parse(dataJson) as CompanyOverview;
    if (!isCacheableOverview(overview)) return null;
    return snapshotFromOverview(overview, updatedAt);
  } catch {
    return null;
  }
}

function buildHoldingSymbolEntries(holdings: Holding[]): HoldingSymbolEntry[] {
  return holdings
    .filter(holdingNeedsFundamentals)
    .map((holding) => {
      const marketSymbol = marketDataSymbolForHolding(holding);
      const ticker = holding.ticker.trim().toUpperCase();
      const lookupKeys = [...new Set([marketSymbol, ticker].map((s) => s.trim().toUpperCase()).filter(Boolean))];
      return { holding, marketSymbol: marketSymbol || ticker, lookupKeys };
    });
}

function resolveSnapshotForEntry(
  entry: HoldingSymbolEntry,
  cache: Map<string, { dataJson: string; updatedAt: string }>,
): AnalystTargetSnapshot | null {
  for (const key of entry.lookupKeys) {
    const row = cache.get(key);
    if (!row) continue;
    const snapshot = readSnapshotFromCacheRow(row.dataJson, row.updatedAt);
    if (snapshot) return snapshot;
  }
  return null;
}

export async function readAnalystTargetsFromCache(
  symbols: readonly string[],
): Promise<Map<string, AnalystTargetSnapshot>> {
  const out = new Map<string, AnalystTargetSnapshot>();
  const rows = await getFundamentalsCacheBySymbols(symbols, "overview");
  for (const [symbol, row] of rows) {
    const snapshot = readSnapshotFromCacheRow(row.dataJson, row.updatedAt);
    if (snapshot) out.set(symbol, snapshot);
  }
  return out;
}

/**
 * Resolve analyst consensus targets for portfolio holdings.
 * Reads shared fundamentals_cache first; backfills up to OVERVIEW_FETCH_CAP misses.
 */
export async function resolveAnalystTargetsForHoldings(
  userId: string,
  holdings: Holding[],
): Promise<ResolveAnalystTargetsResult> {
  const entries = buildHoldingSymbolEntries(holdings);
  if (entries.length === 0) {
    return { targets: {}, partial: false };
  }

  const lookupSymbols = [...new Set(entries.flatMap((e) => e.lookupKeys))];
  const cacheRows = await getFundamentalsCacheBySymbols(lookupSymbols, "overview");
  const cacheBySymbol = new Map<string, { dataJson: string; updatedAt: string }>();
  for (const [symbol, row] of cacheRows) {
    cacheBySymbol.set(symbol, { dataJson: row.dataJson, updatedAt: row.updatedAt });
  }

  const targets: Record<string, AnalystTargetSnapshot> = {};
  const misses: HoldingSymbolEntry[] = [];

  for (const entry of entries) {
    const snapshot = resolveSnapshotForEntry(entry, cacheBySymbol);
    if (snapshot) {
      targets[entry.holding.ticker] = snapshot;
    } else {
      misses.push(entry);
    }
  }

  const partial = misses.length > OVERVIEW_FETCH_CAP;
  const toBackfill = misses.slice(0, OVERVIEW_FETCH_CAP);
  if (toBackfill.length === 0) {
    return { targets, partial };
  }

  const symbolsToFetch = [...new Set(toBackfill.map((e) => e.marketSymbol))];
  const batch = await ensureShareFundamentalsBatch(userId, symbolsToFetch, {
    scope: "valuation",
    concurrency: 6,
  });

  const fetchedBySymbol = new Map<string, AnalystTargetSnapshot>();
  for (const result of batch) {
    if (!result.ok || !result.data.overview) continue;
    const snapshot = snapshotFromOverview(result.data.overview, result.data.fetchedAt);
    if (snapshot) fetchedBySymbol.set(result.data.symbol.toUpperCase(), snapshot);
  }

  for (const entry of toBackfill) {
    if (targets[entry.holding.ticker]) continue;
    for (const key of entry.lookupKeys) {
      const snapshot = fetchedBySymbol.get(key);
      if (snapshot) {
        targets[entry.holding.ticker] = snapshot;
        break;
      }
    }
  }

  return { targets, partial };
}
