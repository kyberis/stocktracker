export const FMP_STABLE_BASE = "https://financialmodelingprep.com/stable";
const FMP_BASE = FMP_STABLE_BASE;

export interface FmpEarningsEvent {
  date: string;
  symbol: string;
  eps: number | null;
  epsEstimated: number | null;
  time: string;
  revenue: number | null;
  revenueEstimated: number | null;
  fiscalDateEnding: string;
  updatedFromDate: string;
}

interface FmpStableEarningsResponse {
  symbol: string;
  date: string;
  epsActual: number | null;
  epsEstimated: number | null;
  revenueActual: number | null;
  revenueEstimated: number | null;
  lastUpdated: string;
}

export interface FmpEconomicEvent {
  event: string;
  date: string;
  country: string;
  actual: number | null;
  previous: number | null;
  change: number | null;
  changePercentage: number | null;
  estimate: number | null;
  impact: string;
}

export interface FmpIpoEvent {
  date: string;
  company: string;
  symbol: string;
  exchange: string;
  actions: string;
  shares: number | null;
  priceRange: string;
  marketCap: number | null;
}

function getApiKey(): string {
  const key = process.env.FMP_API_KEY;
  if (!key) throw new Error("FMP_API_KEY environment variable is not set");
  return key;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function fmpFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${FMP_BASE}/${endpoint}`);
  url.searchParams.set("apikey", getApiKey());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (body.includes("Restricted Endpoint")) {
      throw new Error(`FMP endpoint "${endpoint}" requires a paid plan`);
    }
    throw new Error(`FMP request failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.text();
  if (data.includes("Restricted Endpoint")) {
    throw new Error(`FMP endpoint "${endpoint}" requires a paid plan`);
  }
  return JSON.parse(data);
}

export async function fetchEarningsCalendar(
  from: Date,
  to: Date
): Promise<FmpEarningsEvent[]> {
  const raw = await fmpFetch<FmpStableEarningsResponse[]>("earnings-calendar", {
    from: toISODate(from),
    to: toISODate(to),
  });
  return raw.map((e) => ({
    date: e.date,
    symbol: e.symbol,
    eps: e.epsActual,
    epsEstimated: e.epsEstimated,
    time: "--",
    revenue: e.revenueActual,
    revenueEstimated: e.revenueEstimated,
    fiscalDateEnding: "",
    updatedFromDate: e.lastUpdated || "",
  }));
}

export async function fetchEconomicCalendar(
  from: Date,
  to: Date
): Promise<FmpEconomicEvent[]> {
  return fmpFetch<FmpEconomicEvent[]>("economic-calendar", {
    from: toISODate(from),
    to: toISODate(to),
  });
}

export async function fetchIpoCalendar(
  from: Date,
  to: Date
): Promise<FmpIpoEvent[]> {
  return fmpFetch<FmpIpoEvent[]>("ipos-calendar", {
    from: toISODate(from),
    to: toISODate(to),
  });
}

export interface FmpSplitEvent {
  date: string;
  symbol: string;
  numerator: number;
  denominator: number;
  splitType?: string;
}

export async function fetchSplitsCalendar(
  from: Date,
  to: Date
): Promise<FmpSplitEvent[]> {
  return fmpFetch<FmpSplitEvent[]>("splits-calendar", {
    from: toISODate(from),
    to: toISODate(to),
  });
}
