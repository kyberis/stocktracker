import { NextRequest } from "next/server";
import { YahooProvider } from "@/lib/api-providers/yahoo";
import { requireFeatureAccess } from "@/lib/auth/guards";
import { withMetrics } from "@/lib/with-metrics";

export const dynamic = "force-dynamic";

const VALID_TYPES = new Set(["income", "balance", "cashflow", "earnings"]);

const METHOD_MAP: Record<string, string> = {
  income: "getIncomeStatement",
  balance: "getBalanceSheet",
  cashflow: "getCashFlow",
  earnings: "getEarnings",
};

const yahoo = new YahooProvider();

export const GET = withMetrics("/api/fundamentals", async (request: NextRequest) => {
  const { error } = await requireFeatureAccess(request, "fundamentals");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const type = searchParams.get("type");

  if (!symbol || !type || !VALID_TYPES.has(type)) {
    return Response.json(
      { error: "symbol and type (income|balance|cashflow|earnings) parameters required" },
      { status: 400 }
    );
  }

  const methodName = METHOD_MAP[type];

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const method = (yahoo as any)[methodName];
    if (typeof method === "function") {
      const result = await (method as (s: string) => Promise<unknown>).call(yahoo, symbol);
      if (result) return Response.json(result);
    }
    return Response.json({ error: "Failed to fetch data" }, { status: 500 });
  } catch (err) {
    console.error(`[fundamentals] Failed for ${symbol}/${type}:`, err instanceof Error ? err.message : err);
    return Response.json({ error: "Failed to fetch data" }, { status: 500 });
  }
});
