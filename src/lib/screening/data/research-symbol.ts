/**
 * Map a user-facing listing (often a German regional quote) to the FMP
 * symbol that actually has transcripts, news, and fundamentals.
 *
 * Display ticker stays on the card; researchTicker is for FMP / IR search.
 */

const FMP_BASE = "https://financialmodelingprep.com/stable";

/** German regional / floor suffixes that are almost never the FMP primary. */
const SECONDARY_SUFFIXES = new Set([
  "MU", // Munich
  "SG", // Stuttgart
  "DU", // Dusseldorf
  "HM", // Hamburg
  "HA", // Hanover
  "BE", // Berlin
  "F", // Frankfurt floor (XETRA uses .DE)
]);

const PRIMARY_EXCHANGE_RANK: Record<string, number> = {
  NYSE: 100,
  NASDAQ: 100,
  NASDAQGS: 100,
  NASDAQGM: 95,
  AMEX: 90,
  NYSEARCA: 80,
  TSX: 95,
  TSE: 95,
  TORONTO: 95,
  LSE: 90,
  LON: 90,
  XLON: 90,
  XETRA: 85,
  GER: 80,
  ETR: 85,
  FRA: 40,
  AMS: 80,
  EPA: 80,
  PAR: 80,
  BRU: 75,
  ASX: 80,
  HKSE: 75,
  HKEX: 75,
  OTC: 15,
  PNK: 10,
  PINK: 10,
  OTCQX: 18,
  OTCQB: 16,
  MUN: 5,
  STU: 5,
  DUS: 5,
  HAM: 5,
  BER: 5,
};

const NAME_STOP = new Set([
  "inc",
  "ltd",
  "llc",
  "corp",
  "corporation",
  "ag",
  "sa",
  "nv",
  "plc",
  "co",
  "the",
  "and",
  "se",
  "spa",
  "gmbh",
]);

export interface FmpNameSearchHit {
  symbol: string;
  name: string;
  exchange: string;
}

export interface ResolveResearchSymbolOptions {
  ticker: string;
  companyName?: string | null;
  fetchImpl?: typeof fetch;
}

export interface ResolveResearchSymbolResult {
  listedTicker: string;
  symbol: string;
  mapped: boolean;
}

function fmpKey(): string | undefined {
  return (
    process.env.FMP_API_KEY?.trim() ||
    process.env.FINANCIAL_MODELING_PREP_API_KEY?.trim() ||
    undefined
  );
}

export function listingSuffix(ticker: string): string | null {
  const t = ticker.toUpperCase().trim();
  const i = t.lastIndexOf(".");
  if (i <= 0 || i === t.length - 1) return null;
  return t.slice(i + 1);
}

export function isSecondaryListingTicker(ticker: string): boolean {
  const suffix = listingSuffix(ticker);
  return suffix != null && SECONDARY_SUFFIXES.has(suffix);
}

export function cleanCompanyNameForSearch(name: string): string {
  return name
    .replace(/\s+/g, " ")
    .replace(/\s+R$/i, "")
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .trim();
}

function normalizeName(name: string): string {
  return cleanCompanyNameForSearch(name)
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function namesLikelySame(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const tokens = (s: string) =>
    s.split(" ").filter((t) => t.length > 2 && !NAME_STOP.has(t));
  const aTok = new Set(tokens(na));
  const bTok = tokens(nb);
  if (aTok.size === 0 || bTok.length === 0) return false;
  const overlap = bTok.filter((t) => aTok.has(t)).length;
  return overlap >= Math.min(2, aTok.size, bTok.length);
}

function exchangeRank(exchange: string): number {
  const key = exchange.toUpperCase().replace(/[^A-Z]/g, "");
  if (PRIMARY_EXCHANGE_RANK[key] != null) return PRIMARY_EXCHANGE_RANK[key];
  for (const [k, v] of Object.entries(PRIMARY_EXCHANGE_RANK)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return 30;
}

export function scoreNameSearchHit(opts: {
  listedTicker: string;
  companyName: string;
  hit: FmpNameSearchHit;
}): number {
  const listed = opts.listedTicker.toUpperCase().trim();
  const symbol = opts.hit.symbol.toUpperCase().trim();
  if (!symbol) return -1000;
  if (!namesLikelySame(opts.companyName, opts.hit.name)) return -1000;

  let score = exchangeRank(opts.hit.exchange);
  if (symbol === listed) score += 5;
  if (isSecondaryListingTicker(symbol) && symbol !== listed) score -= 40;
  return score;
}

export function pickResearchSymbol(opts: {
  listedTicker: string;
  companyName: string;
  hits: FmpNameSearchHit[];
}): string {
  const listed = opts.listedTicker.toUpperCase().trim();
  const ranked = opts.hits
    .map((hit) => ({
      hit,
      score: scoreNameSearchHit({
        listedTicker: listed,
        companyName: opts.companyName,
        hit,
      }),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best) return listed;
  const symbol = best.hit.symbol.toUpperCase().trim();
  if (symbol === listed) return listed;
  // Only remap when the winner is clearly a better primary listing.
  if (best.score < 70) return listed;
  return symbol;
}

function parseNameHits(json: unknown): FmpNameSearchHit[] {
  if (!Array.isArray(json)) return [];
  const out: FmpNameSearchHit[] = [];
  for (const raw of json.slice(0, 12)) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const symbol = String(row.symbol ?? "").trim();
    const name = String(row.name ?? row.companyName ?? "").trim();
    if (!symbol || !name) continue;
    const exchange = String(
      row.exchangeShortName ??
        row.exchange ??
        row.stockExchange ??
        row.exchangeFullName ??
        "",
    ).trim();
    out.push({
      symbol: symbol.slice(0, 20),
      name: name.slice(0, 200),
      exchange: exchange.slice(0, 40),
    });
  }
  return out;
}

/**
 * Resolve the FMP symbol to use for transcripts / news / fundamentals.
 * Keeps the listed ticker when it already looks primary or search is empty.
 */
export async function resolveResearchSymbol(
  opts: ResolveResearchSymbolOptions,
): Promise<ResolveResearchSymbolResult> {
  const listedTicker = opts.ticker.toUpperCase().trim();
  const companyName = cleanCompanyNameForSearch(opts.companyName || "");
  const unchanged = (): ResolveResearchSymbolResult => ({
    listedTicker,
    symbol: listedTicker,
    mapped: false,
  });

  if (!listedTicker) return unchanged();
  if (!isSecondaryListingTicker(listedTicker) || !companyName) {
    return unchanged();
  }

  const key = fmpKey();
  if (!key) return unchanged();

  const fetchImpl = opts.fetchImpl ?? fetch;
  const url = new URL(`${FMP_BASE}/search-name`);
  url.searchParams.set("query", companyName.slice(0, 80));
  url.searchParams.set("apikey", key);

  try {
    const res = await fetchImpl(url.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return unchanged();
    const hits = parseNameHits(await res.json());
    const symbol = pickResearchSymbol({
      listedTicker,
      companyName,
      hits,
    });
    return {
      listedTicker,
      symbol,
      mapped: symbol !== listedTicker,
    };
  } catch {
    return unchanged();
  }
}

export function fmpSymbolForCandidate(c: {
  ticker: string;
  researchTicker?: string | null;
}): string {
  const mapped = c.researchTicker?.trim().toUpperCase();
  if (mapped) return mapped;
  return c.ticker.toUpperCase().trim();
}

/** Prefer a persisted researchTicker; otherwise resolve secondary listings. */
export async function researchSymbolForListed(opts: {
  ticker: string;
  companyName?: string | null;
  researchTicker?: string | null;
  fetchImpl?: typeof fetch;
}): Promise<string> {
  const listed = opts.ticker.toUpperCase().trim();
  const persisted = opts.researchTicker?.trim().toUpperCase();
  if (persisted) return persisted;
  const resolved = await resolveResearchSymbol({
    ticker: listed,
    companyName: opts.companyName,
    fetchImpl: opts.fetchImpl,
  });
  return resolved.symbol;
}
