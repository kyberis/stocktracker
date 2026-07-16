const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

/** CoinGecko coin IDs for Pro crypto page symbols. */
const SYMBOL_TO_ID: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  ADA: "cardano",
  XRP: "ripple",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  BNB: "binancecoin",
  DOGE: "dogecoin",
  MATIC: "matic-network",
  SHIB: "shiba-inu",
};

export type CryptoOhlcPoint = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  marketCap: number;
};

function getCoinId(symbol: string): string | undefined {
  return SYMBOL_TO_ID[symbol.toUpperCase()];
}

function parseFloat0(val: unknown): number {
  const n = parseFloat(String(val ?? 0));
  return Number.isNaN(n) ? 0 : n;
}

async function cgFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${COINGECKO_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const headers: Record<string, string> = { Accept: "application/json" };
  const demoKey = process.env.COINGECKO_API_KEY?.trim();
  if (demoKey) headers["x-cg-demo-api-key"] = demoKey;

  const res = await fetch(url.toString(), { headers, next: { revalidate: 300 } });
  if (!res.ok) {
    throw new Error(`CoinGecko ${path}: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** Days of daily OHLC history for a symbol vs fiat market. */
export async function getCoinGeckoDaily(
  symbol: string,
  market = "EUR",
): Promise<{ meta: Record<string, string>; timeSeries: CryptoOhlcPoint[] }> {
  const id = getCoinId(symbol);
  if (!id) {
    return { meta: {}, timeSeries: [] };
  }
  const vs = market.toLowerCase();
  // market_chart returns prices as [timestamp_ms, price]
  const data = await cgFetch<{
    prices: [number, number][];
    total_volumes?: [number, number][];
    market_caps?: [number, number][];
  }>(`/coins/${id}/market_chart`, {
    vs_currency: vs,
    days: "365",
    interval: "daily",
  });

  const volumes = new Map((data.total_volumes ?? []).map(([t, v]) => [t, v]));
  const caps = new Map((data.market_caps ?? []).map(([t, v]) => [t, v]));

  const timeSeries: CryptoOhlcPoint[] = (data.prices ?? []).map(([ts, price]) => {
    const date = new Date(ts).toISOString().slice(0, 10);
    const p = parseFloat0(price);
    return {
      date,
      open: p,
      high: p,
      low: p,
      close: p,
      volume: parseFloat0(volumes.get(ts)),
      marketCap: parseFloat0(caps.get(ts)),
    };
  });

  return { meta: { provider: "coingecko", id }, timeSeries };
}

export async function getCoinGeckoMonthly(
  symbol: string,
  market = "EUR",
): Promise<Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }>> {
  const { timeSeries } = await getCoinGeckoDaily(symbol, market);
  // Request max history for "all" via days=max
  const id = getCoinId(symbol);
  if (!id) return timeSeries;

  try {
    const data = await cgFetch<{
      prices: [number, number][];
      total_volumes?: [number, number][];
    }>(`/coins/${id}/market_chart`, {
      vs_currency: market.toLowerCase(),
      days: "max",
    });
    const volumes = new Map((data.total_volumes ?? []).map(([t, v]) => [t, v]));
    const byMonth = new Map<
      string,
      { date: string; open: number; high: number; low: number; close: number; volume: number }
    >();
    for (const [ts, price] of data.prices ?? []) {
      const date = new Date(ts).toISOString().slice(0, 10);
      const key = date.slice(0, 7);
      const p = parseFloat0(price);
      byMonth.set(key, {
        date,
        open: p,
        high: p,
        low: p,
        close: p,
        volume: parseFloat0(volumes.get(ts)),
      });
    }
    return [...byMonth.values()].sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    const byMonth = new Map<string, (typeof timeSeries)[0]>();
    for (const row of timeSeries) {
      byMonth.set(row.date.slice(0, 7), row);
    }
    return [...byMonth.values()].sort((a, b) => a.date.localeCompare(b.date));
  }
}

export async function getCoinGeckoExchangeRate(
  fromCurrency: string,
  toCurrency: string,
): Promise<{ rate: number; bid: number; ask: number; lastRefreshed: string }> {
  const id = getCoinId(fromCurrency);
  if (!id) return { rate: 0, bid: 0, ask: 0, lastRefreshed: "" };

  const vs = toCurrency.toLowerCase();
  const data = await cgFetch<Record<string, Record<string, number>>>(`/simple/price`, {
    ids: id,
    vs_currencies: vs,
  });
  const rate = parseFloat0(data[id]?.[vs]);
  return {
    rate,
    bid: rate,
    ask: rate,
    lastRefreshed: new Date().toISOString(),
  };
}
