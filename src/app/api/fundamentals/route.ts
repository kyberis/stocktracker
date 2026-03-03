import { getProviderFromRequest } from "@/lib/api-providers";
import { jsonWithCallCount } from "@/lib/api-providers/response";

export const dynamic = "force-dynamic";

const VALID_TYPES = new Set(["income", "balance", "cashflow", "earnings"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const type = searchParams.get("type");

  if (!symbol || !type || !VALID_TYPES.has(type)) {
    return Response.json(
      { error: "symbol and type (income|balance|cashflow|earnings) parameters required" },
      { status: 400 }
    );
  }

  const provider = getProviderFromRequest(request);

  const methodMap: Record<string, string> = {
    income: "getIncomeStatement",
    balance: "getBalanceSheet",
    cashflow: "getCashFlow",
    earnings: "getEarnings",
  };

  const methodName = methodMap[type];
  const method = (provider as Record<string, unknown>)[methodName];

  if (typeof method !== "function") {
    return Response.json(
      { error: `${type} data not available for this provider` },
      { status: 400 }
    );
  }

  try {
    const result = await (method as (s: string) => Promise<unknown>).call(provider, symbol);
    if (!result) {
      return jsonWithCallCount(provider, { error: "No data available" }, { status: 404 });
    }
    return jsonWithCallCount(provider, result);
  } catch (err) {
    console.error(
      `Failed to fetch ${type} for ${symbol}:`,
      err instanceof Error ? err.message : err
    );
    return jsonWithCallCount(provider, { error: "Failed to fetch data" }, { status: 500 });
  }
}
