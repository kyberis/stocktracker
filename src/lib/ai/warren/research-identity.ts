import { overviewSymbolCandidates } from "@/lib/fundamentals/resolve-overview";

const TICKER_RE = /^[A-Za-z0-9.-]{1,20}$/;

export function sanitizeWarrenResearchTicker(raw: string): string | null {
  const t = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!TICKER_RE.test(t)) return null;
  return t;
}

export function sanitizeWarrenResearchQuery(raw: string): string {
  return raw
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

/** Official issuer names for Yahoo venue tickers that IR/FMP rarely index. */
const RESEARCH_ISSUER_NAMES: Record<string, string> = {
  "NOVO-B.CO": "Novo Nordisk",
  "NOVO-B": "Novo Nordisk",
  NVO: "Novo Nordisk",
  "W9C.DE": "Constellation Software",
  "W9C.F": "Constellation Software",
  W9C: "Constellation Software",
  "CSU.TO": "Constellation Software",
  NA9: "Nagarro",
  "NA9.DE": "Nagarro",
  "NA9.F": "Nagarro",
};

export interface WarrenResearchIdentity {
  ticker: string;
  /** Best symbol for IR / FMP / web search (US ADR when we have one). */
  searchTicker: string;
  aliases: string[];
  companyName: string;
}

function looksLikeUsListing(symbol: string): boolean {
  return /^[A-Z]{1,5}$/.test(symbol);
}

function stripVenue(symbol: string): string {
  return symbol.replace(/\.[A-Z]{1,4}$/i, "").replace(/-/g, " ");
}

function issuerNameFor(symbols: string[]): string | undefined {
  for (const symbol of symbols) {
    const name = RESEARCH_ISSUER_NAMES[symbol];
    if (name) return name;
  }
  return undefined;
}

/** Resolve aliases + issuer name so IR search does not query Yahoo venue tickers alone. */
export function resolveWarrenResearchIdentity(
  rawTicker: string,
  companyName?: string,
): WarrenResearchIdentity | null {
  const ticker = sanitizeWarrenResearchTicker(rawTicker);
  if (!ticker) return null;

  const aliases = overviewSymbolCandidates(ticker);
  const searchTicker =
    aliases.find(looksLikeUsListing) ?? aliases.find((a) => a !== ticker) ?? ticker;

  const provided = companyName ? sanitizeWarrenResearchQuery(companyName).slice(0, 80) : "";
  const fromMap = issuerNameFor([ticker, ...aliases]);
  const company =
    provided && provided.toUpperCase() !== ticker ? provided : (fromMap ?? stripVenue(ticker));

  return { ticker, searchTicker, aliases, companyName: company };
}

export function warrenResearchSearchPrefix(identity: WarrenResearchIdentity): string {
  if (identity.companyName.toUpperCase() === identity.searchTicker) {
    return identity.searchTicker;
  }
  return `${identity.companyName} ${identity.searchTicker}`;
}
