import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { requireSession } from "@/lib/auth/guards";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import type { ETFSectorWeight } from "@/lib/types";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

const MAX_TICKERS = 40;

const fetchCachedSectorWeights = unstable_cache(
  async (ticker: string): Promise<ETFSectorWeight[] | null> => {
    const yahoo = new YahooProvider();
    const data = await yahoo.getETFHoldings(ticker);
    if (!data?.sectorWeightings?.length) return null;
    return data.sectorWeightings;
  },
  ["etf-sector-weights"],
  { revalidate: 3600 },
);

export const POST = withMetrics("/api/etf/sector-weights", async (req: NextRequest) => {
  const { error } = await requireSession(req);
  if (error) return error;

  let body: { tickers?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = Array.isArray(body.tickers) ? body.tickers : [];
  const tickers = [...new Set(raw.map((t) => String(t).trim().toUpperCase()).filter(Boolean))].slice(
    0,
    MAX_TICKERS,
  );

  if (tickers.length === 0) {
    return NextResponse.json({ byTicker: {} as Record<string, ETFSectorWeight[] | null> });
  }

  const results = await Promise.all(
    tickers.map(async (ticker) => {
      try {
        const w = await fetchCachedSectorWeights(ticker);
        return [ticker, w] as const;
      } catch {
        return [ticker, null] as const;
      }
    }),
  );

  const byTicker: Record<string, ETFSectorWeight[] | null> = {};
  for (const [ticker, weights] of results) {
    byTicker[ticker] = weights;
  }

  return NextResponse.json({ byTicker });
});
