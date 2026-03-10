const COINLORE_BASE = "https://api.coinlore.net/api";

export interface CoinLoreTicker {
  id: string;
  symbol: string;
  name: string;
  price_usd: string;
  percent_change_24h: string;
  percent_change_1h: string;
  percent_change_7d: string;
  market_cap_usd: string;
  volume24: number;
  volume24a: number;
  csupply: string;
  tsupply: string;
  msupply: string;
}

export interface CoinLoreGlobal {
  coins_count: number;
  active_markets: number;
  total_mcap: number;
  total_volume: number;
  btc_d: string;
  eth_d: string;
  mcap_change: string;
  volume_change: string;
}

export interface CoinLoreTickersResponse {
  data: CoinLoreTicker[];
  info: { coins_num: number; time: number };
}

const SYMBOL_TO_ID: Record<string, string> = {
  BTC: "90",
  ETH: "80",
  SOL: "48543",
  ADA: "257",
  XRP: "58",
  DOT: "54683",
  AVAX: "44883",
  LINK: "1975",
  BNB: "2710",
  DOGE: "2",
  MATIC: "3890",
  SHIB: "45088",
};

export function getCoinLoreId(symbol: string): string | undefined {
  return SYMBOL_TO_ID[symbol.toUpperCase()];
}

export const TOP_CRYPTO_SYMBOLS = ["BTC", "ETH", "SOL", "ADA", "XRP", "DOT", "AVAX", "LINK"];

async function coinloreFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${COINLORE_BASE}${path}`, {
    next: { revalidate: 120 },
  });
  if (!res.ok) throw new Error(`CoinLore API error: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function getTopTickers(limit = 10): Promise<CoinLoreTicker[]> {
  const data = await coinloreFetch<CoinLoreTickersResponse>(
    `/tickers/?start=0&limit=${limit}`
  );
  return data.data || [];
}

export async function getTickersByIds(ids: string[]): Promise<CoinLoreTicker[]> {
  if (ids.length === 0) return [];
  const data = await coinloreFetch<CoinLoreTicker[]>(
    `/ticker/?id=${ids.join(",")}`
  );
  return Array.isArray(data) ? data : [];
}

export async function getTickerBySymbol(symbol: string): Promise<CoinLoreTicker | null> {
  const id = getCoinLoreId(symbol);
  if (!id) return null;
  const tickers = await getTickersByIds([id]);
  return tickers[0] || null;
}

export async function getTopCryptoTickers(): Promise<CoinLoreTicker[]> {
  const ids = TOP_CRYPTO_SYMBOLS.map((s) => SYMBOL_TO_ID[s]).filter(Boolean);
  return getTickersByIds(ids);
}

export async function getGlobalStats(): Promise<CoinLoreGlobal[]> {
  return coinloreFetch<CoinLoreGlobal[]>("/global/");
}

export interface NormalizedCryptoTicker {
  symbol: string;
  name: string;
  priceUsd: number;
  change24h: number;
  change1h: number;
  change7d: number;
  marketCapUsd: number;
  volume24hUsd: number;
  circulatingSupply: number;
  coinloreId: string;
}

export function normalizeTicker(t: CoinLoreTicker): NormalizedCryptoTicker {
  return {
    symbol: t.symbol,
    name: t.name,
    priceUsd: parseFloat(t.price_usd) || 0,
    change24h: parseFloat(t.percent_change_24h) || 0,
    change1h: parseFloat(t.percent_change_1h) || 0,
    change7d: parseFloat(t.percent_change_7d) || 0,
    marketCapUsd: parseFloat(t.market_cap_usd) || 0,
    volume24hUsd: t.volume24 || 0,
    circulatingSupply: parseFloat(t.csupply) || 0,
    coinloreId: t.id,
  };
}
