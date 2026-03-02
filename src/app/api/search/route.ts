import { getProviderFromRequest } from "@/lib/api-providers";
import { jsonWithCallCount } from "@/lib/api-providers/response";
import { YahooProvider } from "@/lib/api-providers/yahoo";

export const dynamic = "force-dynamic";

function isRateLimitError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("rate limit");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 1) {
    return Response.json([]);
  }

  const provider = getProviderFromRequest(request);

  try {
    const results = await provider.search(query);
    return jsonWithCallCount(provider, results);
  } catch (err) {
    if (provider.name === "alphavantage" && isRateLimitError(err)) {
      console.warn(`Alpha Vantage rate limit hit for search, falling back to Yahoo`);
      try {
        const yahoo = new YahooProvider();
        const results = await yahoo.search(query);
        return jsonWithCallCount(provider, results);
      } catch {
        return jsonWithCallCount(provider, []);
      }
    }
    console.error("Search failed:", err instanceof Error ? err.message : err);
    return jsonWithCallCount(provider, []);
  }
}
