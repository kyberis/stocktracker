import { NextRequest, NextResponse } from "next/server";
import { requireFeatureQuota } from "@/lib/auth/guards";
import { getScreenerCacheBySymbols, listHoldings, trackEvent } from "@/lib/db";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { marketDataSymbolForHolding } from "@/lib/market-symbol";
import { withMetrics } from "@/lib/with-metrics";
import {
  OVERVIEW_FETCH_CAP,
  emptyFundamentals,
  fundamentalsFromCache,
  fundamentalsFromOverview,
  holdingNeedsFundamentals,
  type HoldingsResearchApiRow,
  type HoldingsResearchFundamentals,
  type HoldingsResearchResponse,
} from "@/lib/holdings-research";

export const dynamic = "force-dynamic";

const yahoo = new YahooProvider();

async function fetchOverview(symbol: string): Promise<HoldingsResearchFundamentals | null> {
  try {
    const overview = await yahoo.getOverview?.(symbol);
    if (!overview) return null;
    return fundamentalsFromOverview(overview);
  } catch (err) {
    console.error(
      `[holdings-research] overview failed for ${symbol}:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

export const GET = withMetrics("/api/holdings-research", async (request: NextRequest) => {
  const { session, error } = await requireFeatureQuota(request, "screener");
  if (error || !session) {
    return error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const portfolioId = request.nextUrl.searchParams.get("portfolioId") || undefined;
  const holdings = await listHoldings(session.userId, portfolioId);

  const lookupSymbols = new Set<string>();
  const holdingSymbols = holdings.map((h) => {
    const yahooSym = marketDataSymbolForHolding(h);
    const ticker = h.ticker.trim();
    if (yahooSym) lookupSymbols.add(yahooSym);
    if (ticker) lookupSymbols.add(ticker);
    return { holding: h, yahooSym, ticker };
  });

  const cache = await getScreenerCacheBySymbols([...lookupSymbols]);

  function cacheHit(yahooSym: string, ticker: string): ReturnType<typeof fundamentalsFromCache> | null {
    const byYahoo = cache.get(yahooSym.trim().toUpperCase());
    if (byYahoo) return fundamentalsFromCache(byYahoo);
    const byTicker = cache.get(ticker.trim().toUpperCase());
    if (byTicker) return fundamentalsFromCache(byTicker);
    return null;
  }

  const rows: HoldingsResearchApiRow[] = [];
  const misses: { holdingId: string; symbol: string }[] = [];

  for (const { holding, yahooSym, ticker } of holdingSymbols) {
    const symbol = yahooSym || ticker;
    if (!holdingNeedsFundamentals(holding)) {
      rows.push({ holdingId: holding.id, symbol, fundamentals: emptyFundamentals() });
      continue;
    }
    const hit = cacheHit(yahooSym, ticker);
    if (hit) {
      rows.push({ holdingId: holding.id, symbol, fundamentals: hit });
    } else {
      misses.push({ holdingId: holding.id, symbol });
      rows.push({ holdingId: holding.id, symbol, fundamentals: emptyFundamentals() });
    }
  }

  const toFetch = misses.slice(0, OVERVIEW_FETCH_CAP);
  const leftover = misses.length > OVERVIEW_FETCH_CAP;

  if (toFetch.length > 0) {
    const fetched = await Promise.all(toFetch.map((m) => fetchOverview(m.symbol)));
    const byId = new Map(rows.map((r) => [r.holdingId, r]));
    for (let i = 0; i < toFetch.length; i++) {
      const fund = fetched[i];
      const miss = toFetch[i];
      if (!fund || !miss) continue;
      const row = byId.get(miss.holdingId);
      if (row) row.fundamentals = fund;
    }
  }

  const stillMissing = rows.some(
    (r) =>
      r.fundamentals.source === "none" &&
      holdings.some((h) => h.id === r.holdingId && holdingNeedsFundamentals(h)),
  );

  const staleCandidates = rows
    .map((r) => r.fundamentals.updatedAt)
    .filter((d): d is string => !!d);
  const staleAt =
    staleCandidates.length > 0
      ? staleCandidates.reduce((a, b) => (a < b ? a : b))
      : null;

  const body: HoldingsResearchResponse = {
    rows,
    metricsPartial: leftover || stillMissing,
    staleAt,
  };

  trackEvent(session.userId, "holdings_explorer_open", {
    holdings: String(holdings.length),
    partial: stillMissing || leftover ? "1" : "0",
  });

  return NextResponse.json(body);
});
