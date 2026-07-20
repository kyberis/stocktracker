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
  /** Stable API uses `event`; some responses may use `eventName` or `name`. */
  event?: string;
  eventName?: string;
  name?: string;
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

/** FMP calendar endpoints return a JSON array; some error payloads parse as objects with `Error Message`. */
function parseFmpJsonArray<T>(endpoint: string, parsed: unknown): T[] {
  if (parsed === null || parsed === undefined) return [];
  if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
    const o = parsed as Record<string, unknown>;
    if (typeof o["Error Message"] === "string") {
      throw new Error(`FMP ${endpoint}: ${o["Error Message"]}`);
    }
    if (Array.isArray(o.data)) return o.data as T[];
    if (Array.isArray(o.historical)) return o.historical as T[];
  }
  if (Array.isArray(parsed)) return parsed as T[];
  throw new Error(`FMP endpoint "${endpoint}" returned unexpected JSON (expected an array)`);
}

async function fmpFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T[]> {
  const url = new URL(`${FMP_BASE}/${endpoint}`);
  url.searchParams.set("apikey", getApiKey());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString());
  const data = await res.text();
  if (!res.ok) {
    if (data.includes("Restricted Endpoint")) {
      throw new Error(`FMP endpoint "${endpoint}" requires a paid plan`);
    }
    throw new Error(`FMP request failed: ${res.status} ${res.statusText}`);
  }
  if (data.includes("Restricted Endpoint")) {
    throw new Error(`FMP endpoint "${endpoint}" requires a paid plan`);
  }
  const parsed: unknown = JSON.parse(data);
  return parseFmpJsonArray<T>(endpoint, parsed);
}

export async function fetchEarningsCalendar(
  from: Date,
  to: Date
): Promise<FmpEarningsEvent[]> {
  const raw = await fmpFetch<FmpStableEarningsResponse>("earnings-calendar", {
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

/** Per-symbol earnings history + upcoming consensus (stable `/earnings`). */
export async function fetchEarningsBySymbol(
  symbol: string,
  limit = 12,
): Promise<FmpEarningsEvent[]> {
  const raw = await fmpFetch<FmpStableEarningsResponse>("earnings", {
    symbol: symbol.toUpperCase(),
    limit: String(limit),
  });
  return raw.map((e) => ({
    date: e.date,
    symbol: e.symbol || symbol.toUpperCase(),
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
  return fmpFetch<FmpEconomicEvent>("economic-calendar", {
    from: toISODate(from),
    to: toISODate(to),
  });
}

export async function fetchIpoCalendar(
  from: Date,
  to: Date
): Promise<FmpIpoEvent[]> {
  return fmpFetch<FmpIpoEvent>("ipos-calendar", {
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
  return fmpFetch<FmpSplitEvent>("splits-calendar", {
    from: toISODate(from),
    to: toISODate(to),
  });
}

/** Raw FMP senate/house trade row (field names vary slightly by endpoint). */
export interface FmpCongressTradeRaw {
  symbol?: string;
  firstName?: string;
  lastName?: string;
  office?: string;
  district?: string;
  senateOwner?: string;
  houseOwner?: string;
  disclosureDate?: string;
  transactionDate?: string;
  transactionType?: string;
  owner?: string;
  assetDescription?: string;
  assetType?: string;
  type?: string;
  amount?: string;
  link?: string;
  url?: string;
  ptrLink?: string;
}

export interface FmpCongressTrade {
  chamber: "senate" | "house";
  name: string;
  officeOrDistrict: string;
  transactionDate: string;
  disclosureDate: string | null;
  transactionType: string;
  amountRange: string | null;
  assetDescription: string | null;
  url: string | null;
  symbol: string;
}

function mapCongressRow(row: FmpCongressTradeRaw, chamber: "senate" | "house"): FmpCongressTrade {
  const first = (row.firstName ?? "").trim();
  const last = (row.lastName ?? "").trim();
  const name = [first, last].filter(Boolean).join(" ") || (row.office ?? "Unknown");
  const officeOrDistrict =
    chamber === "senate"
      ? String(row.office ?? row.senateOwner ?? "").trim()
      : String(row.district ?? row.office ?? row.houseOwner ?? "").trim();
  const link = row.link ?? row.url ?? row.ptrLink ?? null;
  return {
    chamber,
    name,
    officeOrDistrict,
    transactionDate: String(row.transactionDate ?? row.disclosureDate ?? ""),
    disclosureDate: row.disclosureDate ? String(row.disclosureDate) : null,
    transactionType: String(row.type ?? row.transactionType ?? ""),
    amountRange: row.amount ? String(row.amount) : null,
    assetDescription: row.assetDescription ? String(row.assetDescription) : null,
    url: link ? String(link) : null,
    symbol: String(row.symbol ?? "").toUpperCase(),
  };
}

export async function fetchSenateTradesBySymbol(symbol: string): Promise<FmpCongressTrade[]> {
  const raw = await fmpFetch<FmpCongressTradeRaw>("senate-trades", { symbol: symbol.toUpperCase() });
  return raw.map((r) => mapCongressRow(r, "senate"));
}

export async function fetchHouseTradesBySymbol(symbol: string): Promise<FmpCongressTrade[]> {
  const raw = await fmpFetch<FmpCongressTradeRaw>("house-trades", { symbol: symbol.toUpperCase() });
  return raw.map((r) => mapCongressRow(r, "house"));
}

/** Peer tickers for a symbol (FMP stock-peers). Returns empty array if unavailable. */
export async function fetchStockPeers(symbol: string): Promise<string[]> {
  const url = new URL(`${FMP_BASE}/stock-peers`);
  url.searchParams.set("apikey", getApiKey());
  url.searchParams.set("symbol", symbol.toUpperCase());
  const res = await fetch(url.toString());
  const text = await res.text();
  if (!res.ok || text.includes("Restricted Endpoint")) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  if (Array.isArray(parsed)) {
    const first = parsed[0] as { peersList?: string[]; symbol?: string } | string | undefined;
    if (first && typeof first === "object" && Array.isArray(first.peersList)) {
      return first.peersList.map((p) => String(p).toUpperCase()).filter(Boolean);
    }
    return parsed
      .map((p) => (typeof p === "string" ? p : (p as { symbol?: string }).symbol))
      .filter((p): p is string => typeof p === "string" && p.length > 0)
      .map((p) => p.toUpperCase());
  }
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { peersList?: string[] }).peersList)) {
    return ((parsed as { peersList: string[] }).peersList).map((p) => p.toUpperCase());
  }
  return [];
}
