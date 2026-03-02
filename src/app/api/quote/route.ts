import { getProviderFromRequest } from "@/lib/api-providers";
import { jsonWithCallCount } from "@/lib/api-providers/response";
import { YahooProvider } from "@/lib/api-providers/yahoo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get("symbols");

  if (!symbols) {
    return Response.json({ error: "symbols parameter required" }, { status: 400 });
  }

  const provider = getProviderFromRequest(request);
  const isAV = provider.name === "alphavantage";
  const tickerList = symbols.split(",").map((s) => s.trim()).filter(Boolean);
  const results: Record<string, unknown> = {};

  const fxSymbols = tickerList.filter((s) => s.includes("=X"));
  const stockSymbols = tickerList.filter((s) => !s.includes("=X"));

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
          results[symbol] = { ...quote, providerUsed: "yahoo" };
        } catch (err) {
          console.error(`Yahoo fallback failed for ${symbol}:`, err instanceof Error ? err.message : err);
          results[symbol] = { ...errorQuote(symbol), providerUsed: "yahoo" };
        }
        continue;
      }

      try {
        const quote = await provider.getQuote(symbol);
        results[symbol] = { ...quote, providerUsed: "alphavantage" };
      } catch (err) {
        if (isRateLimitError(err)) {
          rateLimitHit = true;
          console.warn(`Alpha Vantage rate limit hit at ${symbol}, falling back to Yahoo`);
          try {
            const quote = await getYahoo().getQuote(symbol);
            results[symbol] = { ...quote, providerUsed: "yahoo" };
          } catch (fallbackErr) {
            console.error(`Yahoo fallback failed for ${symbol}:`, fallbackErr instanceof Error ? fallbackErr.message : fallbackErr);
            results[symbol] = { ...errorQuote(symbol), providerUsed: "yahoo" };
          }
        } else {
          console.error(`Failed to fetch quote for ${symbol}:`, err instanceof Error ? err.message : err);
          results[symbol] = errorQuote(symbol);
        }
      }
    }

    // FX pairs: if rate limit hit, batch with Yahoo in parallel; otherwise sequential via AV
    if (rateLimitHit) {
      await Promise.all(fxSymbols.map(async (symbol) => {
        try {
          const quote = await getYahoo().getQuote(symbol);
          results[symbol] = {
            symbol,
            shortName: symbol,
            regularMarketPrice: quote.regularMarketPrice,
            regularMarketChange: 0,
            regularMarketChangePercent: 0,
            currency: quote.currency,
            regularMarketPreviousClose: quote.regularMarketPrice,
            fiftyTwoWeekHigh: 0,
            fiftyTwoWeekLow: 0,
            marketCap: 0,
          };
        } catch {
          results[symbol] = { ...errorQuote(symbol), error: true };
        }
      }));
    } else {
      for (const symbol of fxSymbols) {
        try {
          const pair = symbol.replace("=X", "");
          const from = pair.substring(0, 3);
          const to = pair.substring(3);
          const rate = await provider.getExchangeRate(from, to);
          results[symbol] = {
            symbol,
            shortName: symbol,
            regularMarketPrice: rate,
            regularMarketChange: 0,
            regularMarketChangePercent: 0,
            currency: to,
            regularMarketPreviousClose: rate,
            fiftyTwoWeekHigh: 0,
            fiftyTwoWeekLow: 0,
            marketCap: 0,
          };
        } catch (err) {
          if (isRateLimitError(err)) {
            rateLimitHit = true;
            try {
              const quote = await getYahoo().getQuote(symbol);
              results[symbol] = {
                symbol,
                shortName: symbol,
                regularMarketPrice: quote.regularMarketPrice,
                regularMarketChange: 0,
                regularMarketChangePercent: 0,
                currency: quote.currency,
                regularMarketPreviousClose: quote.regularMarketPrice,
                fiftyTwoWeekHigh: 0,
                fiftyTwoWeekLow: 0,
                marketCap: 0,
              };
            } catch {
              results[symbol] = { ...errorQuote(symbol), error: true };
            }
          } else {
            results[symbol] = { ...errorQuote(symbol), error: true };
          }
        }
      }
    }
  } else {
    // Yahoo or other — parallel as before
    const stockPromises = stockSymbols.map(async (symbol) => {
      try {
        const quote = await provider.getQuote(symbol);
        results[symbol] = { ...quote, providerUsed: provider.name };
      } catch (err) {
        console.error(`Failed to fetch quote for ${symbol}:`, err instanceof Error ? err.message : err);
        results[symbol] = errorQuote(symbol);
      }
    });

    const fxPromises = fxSymbols.map(async (symbol) => {
      try {
        const pair = symbol.replace("=X", "");
        const from = pair.substring(0, 3);
        const to = pair.substring(3);
        const rate = await provider.getExchangeRate(from, to);
        results[symbol] = {
          symbol,
          shortName: symbol,
          regularMarketPrice: rate,
          regularMarketChange: 0,
          regularMarketChangePercent: 0,
          currency: to,
          regularMarketPreviousClose: rate,
          fiftyTwoWeekHigh: 0,
          fiftyTwoWeekLow: 0,
          marketCap: 0,
        };
      } catch (err) {
        console.error(`Failed to fetch FX rate for ${symbol}:`, err instanceof Error ? err.message : err);
        results[symbol] = { ...errorQuote(symbol), error: true };
      }
    });

    await Promise.all([...stockPromises, ...fxPromises]);
  }

  return jsonWithCallCount(provider, results);
}
