import { getProviderFromRequest } from "@/lib/api-providers";
import { jsonWithCallCount } from "@/lib/api-providers/response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return Response.json({ error: "symbol parameter required" }, { status: 400 });
  }

  const provider = await getProviderFromRequest(request);

  if (!provider.getOverview) {
    return Response.json(
      { error: "Overview not available for this provider" },
      { status: 400 }
    );
  }

  try {
    const overview = await provider.getOverview(symbol);
    if (!overview) {
      return jsonWithCallCount(provider, { error: "No overview data available" }, { status: 404 });
    }
    return jsonWithCallCount(provider, overview);
  } catch (err) {
    console.error(`Failed to fetch overview for ${symbol}:`, err instanceof Error ? err.message : err);
    return jsonWithCallCount(provider, { error: "Failed to fetch overview data" }, { status: 500 });
  }
}
