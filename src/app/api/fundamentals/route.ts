import { NextRequest } from "next/server";
import { z } from "zod";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { resolveIsinToTicker } from "@/lib/api-providers/isin-resolver";
import { requireFeatureQuota } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";
import type { StockDataProvider } from "@/lib/api-providers/types";

export const dynamic = "force-dynamic";

const FundamentalTypeSchema = z.enum(["income", "balance", "cashflow", "earnings"]);
type FundamentalType = z.infer<typeof FundamentalTypeSchema>;

type FundamentalInvoker = (provider: StockDataProvider, ticker: string) => Promise<unknown> | null;

const FUNDAMENTAL_INVOKERS: Record<FundamentalType, FundamentalInvoker> = {
  income: (provider, ticker) => provider.getIncomeStatement?.(ticker) ?? null,
  balance: (provider, ticker) => provider.getBalanceSheet?.(ticker) ?? null,
  cashflow: (provider, ticker) => provider.getCashFlow?.(ticker) ?? null,
  earnings: (provider, ticker) => provider.getEarnings?.(ticker) ?? null,
};

const yahoo = new YahooProvider();

export const GET = withMetrics("/api/fundamentals", async (request: NextRequest) => {
  const { error } = await requireFeatureQuota(request, "fundamentals");
  if (error) return error;

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
  const ticker = await resolveIsinToTicker(yahoo, symbol);
  const invocation = FUNDAMENTAL_INVOKERS[type](yahoo, ticker);

  if (!invocation) {
    return Response.json({ error: "Failed to fetch data" }, { status: 500 });
  }

  try {
    const result = await invocation;
    if (result) return Response.json(result);
    return Response.json({ error: "Failed to fetch data" }, { status: 500 });
  } catch (err) {
    console.error(`[fundamentals] Failed for ${symbol}/${type}:`, err instanceof Error ? err.message : err);
    return Response.json({ error: "Failed to fetch data" }, { status: 500 });
  }
});
