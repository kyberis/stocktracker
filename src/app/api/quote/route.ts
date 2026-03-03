import { getProviderFromRequest } from "@/lib/api-providers";
import { jsonWithCallCount } from "@/lib/api-providers/response";
import { YahooProvider } from "@/lib/api-providers/yahoo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DE_FALLBACK_SUFFIXES = [".F", ".DU", ".MU"];

function isRateLimitError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("rate limit");
}

function errorQuote(symbol: string) {
  return {
    symbol,
    shortName: symbol,
    regularMarketPrice: 0,
    regularMarketChange: 0,
    regularMarketChangePercent: 0,
    currency: "USD",
    regularMarketPreviousClose: 0,
    fiftyTwoWeekHigh: 0,
    fiftyTwoWeekLow: 0,
    marketCap: 0,
    error: true,
  };
}

async function tryGermanFallback(
  yahoo: YahooProvider,
  symbol: string
): Promise<{ quote: Awaited<ReturnType<YahooProvider["getQuote"]>>; usedSymbol: string } | null> {
  if (!symbol.toUpperCase().endsWith(".DE")) return null;
  const base = symbol.slice(0, -3);
  for (const suffix of DE_FALLBACK_SUFFIXES) {
    try {
      const q = await yahoo.getQuote(`${base}${suffix}`);
      if (q.regularMarketPrice > 0) {
        return { quote: q, usedSymbol: `${base}${suffix}` };
      }
    } catch {
      // try next
    }
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get("symbols");

  if (!symbols) {
    return Response.json({ error: "symbols parameter required" }, { status: 400 });
  }

  const provider = getProviderFromRequest(request);
  const isAV = provider.name === "alphavantage";
  const stockSymbols = symbols.split(",").map((s) => s.trim()).filter(Boolean);
  const results: Record<string, unknown> = {};

  let rateLimitHit = false;
  let yahoo: YahooProvider | null = null;
  function getYahoo() {
    if (!yahoo) yahoo = new YahooProvider();
    return yahoo;
  }

  // For AV, process sequentially so we detect rate limit early and switch remaining to Yahoo
  if (isAV) {
    for (const symbol of stockSymbols) {
      if (rateLimitHit) {
        try {
          const quote = await getYahoo().getQuote(symbol);
          if (quote.regularMarketPrice > 0) {
            results[symbol] = { ...quote, providerUsed: "yahoo" };
          } else {
            const fb = await tryGermanFallback(getYahoo(), symbol);
            results[symbol] = fb
              ? { ...fb.quote, symbol, providerUsed: "yahoo" }
              : { ...quote, providerUsed: "yahoo" };
          }
        } catch (err) {
          const fb = await tryGermanFallback(getYahoo(), symbol).catch(() => null);
          if (fb) {
            results[symbol] = { ...fb.quote, symbol, providerUsed: "yahoo" };
          } else {
            console.error(`Yahoo fallback failed for ${symbol}:`, err instanceof Error ? err.message : err);
            results[symbol] = { ...errorQuote(symbol), providerUsed: "yahoo" };
          }
        }
        continue;
      }

      try {
        // LSE is multi-currency (GBX, GBP, USD, EUR) and AV doesn't return
        // currency info, so always use Yahoo for .L tickers to get an accurate
        // currency label alongside the price.
        if (symbol.toUpperCase().endsWith(".L")) {
          const yahooQuote = await getYahoo().getQuote(symbol);
          results[symbol] = { ...yahooQuote, providerUsed: "yahoo" };
          continue;
        }

        const quote = await provider.getQuote(symbol);
        if (quote.error || quote.regularMarketPrice === 0) {
          let resolved = false;
          try {
            const yahooQuote = await getYahoo().getQuote(symbol);
            if (yahooQuote.regularMarketPrice > 0) {
              results[symbol] = { ...yahooQuote, providerUsed: "yahoo" };
              resolved = true;
            }
          } catch { /* try German fallback below */ }
          if (!resolved) {
            const fb = await tryGermanFallback(getYahoo(), symbol);
            results[symbol] = fb
              ? { ...fb.quote, symbol, providerUsed: "yahoo" }
              : { ...errorQuote(symbol), providerUsed: "yahoo" };
          }
        } else {
          results[symbol] = { ...quote, providerUsed: "alphavantage" };
        }
      } catch (err) {
        if (isRateLimitError(err)) {
          rateLimitHit = true;
          console.warn(`Alpha Vantage rate limit hit at ${symbol}, falling back to Yahoo`);
        }
        try {
          const quote = await getYahoo().getQuote(symbol);
          if (quote.regularMarketPrice > 0) {
            results[symbol] = { ...quote, providerUsed: "yahoo" };
          } else {
            const fb = await tryGermanFallback(getYahoo(), symbol);
            results[symbol] = fb
              ? { ...fb.quote, symbol, providerUsed: "yahoo" }
              : { ...quote, providerUsed: "yahoo" };
          }
        } catch (fallbackErr) {
          const fb = await tryGermanFallback(getYahoo(), symbol).catch(() => null);
          if (fb) {
            results[symbol] = { ...fb.quote, symbol, providerUsed: "yahoo" };
          } else {
            console.error(`Yahoo fallback failed for ${symbol}:`, fallbackErr instanceof Error ? fallbackErr.message : fallbackErr);
            results[symbol] = { ...errorQuote(symbol), providerUsed: "yahoo" };
          }
        }
      }
    }

  } else {
    // Yahoo or other — parallel as before
    const stockPromises = stockSymbols.map(async (symbol) => {
      try {
        const quote = await provider.getQuote(symbol);
        if (quote.regularMarketPrice > 0) {
          results[symbol] = { ...quote, providerUsed: provider.name };
        } else {
          const fb = await tryGermanFallback(getYahoo(), symbol);
          results[symbol] = fb
            ? { ...fb.quote, symbol, providerUsed: provider.name }
            : { ...quote, providerUsed: provider.name };
        }
      } catch (err) {
        const fb = await tryGermanFallback(getYahoo(), symbol).catch(() => null);
        if (fb) {
          results[symbol] = { ...fb.quote, symbol, providerUsed: provider.name };
        } else {
          console.error(`Failed to fetch quote for ${symbol}:`, err instanceof Error ? err.message : err);
          results[symbol] = errorQuote(symbol);
        }
      }
    });

    await Promise.all(stockPromises);
  }

  return jsonWithCallCount(provider, results);
}
