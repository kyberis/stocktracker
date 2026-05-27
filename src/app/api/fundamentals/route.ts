import { NextRequest } from "next/server";
import { z } from "zod";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { resolveIsinToTicker } from "@/lib/api-providers/isin-resolver";
import type { StockDataProvider } from "@/lib/api-providers/types";
import { requireFeatureQuota, requireRateLimit } from "@/lib/auth/guards";
import { getSessionFromRequest } from "@/lib/auth/session";
import {
  getFundamentalsCache,
  upsertFundamentalsCache,
  type FundamentalsCacheType,
  type FundamentalsCacheProvider,
} from "@/lib/db/fundamentals-cache";
import { isCacheableFundamentalData } from "@/lib/fundamentals/cache-quality";
import {
  resolveFundamentalsProvider,
  type FundamentalsDataBackend,
} from "@/lib/market-data/resolve-provider";
import { recordMarketDataUsageAsync } from "@/lib/market-data/record-usage";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

const FundamentalTypeSchema = z.enum(["income", "balance", "cashflow", "earnings"]);
type FundamentalType = z.infer<typeof FundamentalTypeSchema>;

type FundamentalInvoker = (
  provider: StockDataProvider,
  ticker: string
) => Promise<unknown> | null;

const FUNDAMENTAL_INVOKERS: Record<FundamentalType, FundamentalInvoker> = {
  income: (provider, ticker) => provider.getIncomeStatement?.(ticker) ?? null,
  balance: (provider, ticker) => provider.getBalanceSheet?.(ticker) ?? null,
  cashflow: (provider, ticker) => provider.getCashFlow?.(ticker) ?? null,
  earnings: (provider, ticker) => provider.getEarnings?.(ticker) ?? null,
};

const yahooFallback = new YahooProvider();

async function fetchFromProvider(
  provider: StockDataProvider,
  type: FundamentalType,
  ticker: string
): Promise<unknown | null> {
  try {
    const invocation = FUNDAMENTAL_INVOKERS[type](provider, ticker);
    if (!invocation) return null;
    return await invocation;
  } catch (err) {
    console.error(
      `[fundamentals] Provider fetch failed for ${ticker}/${type}:`,
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

async function fetchFundamentalData(
  userId: string | null,
  type: FundamentalType,
  ticker: string
): Promise<{ data: unknown; backend: FundamentalsDataBackend; fmpCallCount: number } | null> {
  const { provider: primary, backend: primaryBackend } =
    await resolveFundamentalsProvider(userId);

  let data = await fetchFromProvider(primary, type, ticker);
  let backend = primaryBackend;
  let fmpCallCount =
    primaryBackend === "fmp" &&
    "callCount" in primary &&
    typeof primary.callCount === "number"
      ? primary.callCount
      : 0;

  if (!data && primaryBackend === "fmp") {
    data = await fetchFromProvider(yahooFallback, type, ticker);
    backend = "yahoo";
    fmpCallCount = 0;
  }

  if (!data) return null;
  return { data, backend, fmpCallCount };
}

export const GET = withMetrics("/api/fundamentals", async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const rawType = searchParams.get("type");
  const typeParse = FundamentalTypeSchema.safeParse(rawType);

  if (!symbol || !typeParse.success) {
    return Response.json(
      { error: "symbol and type (income|balance|cashflow|earnings) parameters required" },
      { status: 400 }
    );
  }

  const type = typeParse.data;
  const cacheType = type as FundamentalsCacheType;
  const session = await getSessionFromRequest(request);
  const userId = session?.userId ?? null;

  const ticker = await resolveIsinToTicker(yahooFallback, symbol);
  const normalizedTicker = ticker.trim().toUpperCase();

  const cached = await getFundamentalsCache(normalizedTicker, cacheType);
  if (cached) {
    try {
      const parsed = JSON.parse(cached.dataJson) as unknown;
      return Response.json({
        ...(typeof parsed === "object" && parsed !== null ? parsed : {}),
        _cached: true,
        _provider: cached.provider,
      });
    } catch {
      console.error(`[fundamentals] Corrupt cache for ${normalizedTicker}/${type}`);
    }
  }

  const { error: quotaError } = await requireFeatureQuota(request, "fundamentals");
  if (quotaError) return quotaError;

  const fetched = await fetchFundamentalData(userId, type, normalizedTicker);
  if (!fetched) {
    return Response.json({ error: "Failed to fetch data" }, { status: 500 });
  }

  const { data, backend, fmpCallCount } = fetched;

  if (fmpCallCount > 0 && userId) {
    const rl = await requireRateLimit(request, "fmp");
    if (rl.error) return rl.error;
    await recordMarketDataUsageAsync(userId, "fmp", fmpCallCount);
  }

  const providerTag = backend as FundamentalsCacheProvider;
  if (isCacheableFundamentalData(cacheType, data as never, providerTag)) {
    await upsertFundamentalsCache(normalizedTicker, cacheType, data, providerTag);
  }

  return Response.json({
    ...(typeof data === "object" && data !== null ? data : {}),
    _cached: false,
    _provider: backend,
  });
});
