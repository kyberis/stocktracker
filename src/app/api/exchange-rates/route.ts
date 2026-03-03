import { AlphaVantageProvider } from "@/lib/api-providers/alphavantage";
import { YahooProvider } from "@/lib/api-providers/yahoo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const yahoo = new YahooProvider();

async function fetchRateAV(
  av: AlphaVantageProvider,
  from: string,
  to: string
): Promise<number> {
  const rate = await av.getExchangeRate(from, to);
  if (rate > 0) return rate;
  throw new Error(`AV returned zero rate for ${from}/${to}`);
}

async function fetchRateYahoo(from: string, to: string): Promise<number> {
  return yahoo.getExchangeRate(from, to);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pairsParam = searchParams.get("pairs");

  if (!pairsParam) {
    return Response.json(
      { error: "pairs parameter required (e.g. EURUSD,EURGBP)" },
      { status: 400 }
    );
  }

  const avApiKey =
    request.headers.get("x-api-key") ||
    searchParams.get("apiKey") ||
    "";

  let av: AlphaVantageProvider | null = null;
  if (avApiKey) {
    try {
      av = new AlphaVantageProvider(avApiKey);
    } catch {
      av = null;
    }
  }

  const pairs = pairsParam
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const results: Record<string, { rate: number; provider: string }> = {};

  const tasks = pairs.map(async (pair) => {
    const from = pair.substring(0, 3).toUpperCase();
    const to = pair.substring(3).toUpperCase();
    if (from.length !== 3 || to.length !== 3) {
      results[pair] = { rate: 0, provider: "none" };
      return;
    }

    if (av) {
      try {
        const rate = await fetchRateAV(av, from, to);
        results[pair] = { rate, provider: "alphavantage" };
        return;
      } catch {
        // fall through to Yahoo
      }
    }

    try {
      const rate = await fetchRateYahoo(from, to);
      results[pair] = { rate, provider: "yahoo" };
    } catch (err) {
      console.error(
        `FX rate fetch failed for ${pair}:`,
        err instanceof Error ? err.message : err
      );
      results[pair] = { rate: 0, provider: "none" };
    }
  });

  await Promise.all(tasks);

  return Response.json(results);
}
