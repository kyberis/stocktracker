import { listHoldings as dbListHoldings, listCalendarEvents } from "@/lib/db";
import type { PortfolioSnapshot } from "./tools";

/** User asks why a named stock/company moved (up or down). */
const PRICE_MOVE_CUE =
  /(?:por\s*qu[eé]|why|qu[eé]\s*pas[oó]|what\s*happened|c[oó]mo\s*es\s*que).{0,80}(?:baj[oó]|sub[ií][oó]|ca[ií]d|drop|fell|down|up|rise|rose|rally|mov|con\s+[A-Za-z])/i;

const PRICE_MOVE_CUE_REVERSED =
  /(?:baj[oó]|sub[ií][oó]|ca[ií]d|drop|fell|down|up|rise|rose).{0,40}(?:por\s*qu[eé]|why)/i;

const WHAT_HAPPENED_WITH =
  /(?:qu[eé]\s*pas[oó]\s*con|what\s*happened\s*(?:to|with)|por\s*qu[eé]\s+(?:baj[oó]|sub[ií][oó]))/i;

export function wantsPriceMoveIntent(message: string): boolean {
  return (
    PRICE_MOVE_CUE.test(message) ||
    PRICE_MOVE_CUE_REVERSED.test(message) ||
    WHAT_HAPPENED_WITH.test(message)
  );
}

/**
 * Pull a company/ticker phrase from a price-move question.
 * Examples: "Porque Sarabi gold bajo?" → "Sarabi gold"; "why did UBER drop?" → "UBER"
 */
export function extractPriceMoveQuery(message: string): string | null {
  const patterns = [
    /(?:por\s*qu[eé]|why(?:\s+did|\s+is|\s+has)?|qu[eé]\s*pas[oó]\s*con|what\s*happened\s*(?:to|with)?|c[oó]mo\s*es\s*que)\s+(.+?)\s+(?:baj[oó]|sub[ií][oó]|ca[ií]d[oa]?|drop(?:ped)?|fell|down|up|rise|rose|rally|mov(?:ed|i[oó])?)\b/i,
    /(?:por\s*qu[eé]|why)\s+(.+?)\s*\??\s*$/i,
  ];
  for (const re of patterns) {
    const m = message.match(re);
    const raw = m?.[1]?.trim();
    if (!raw || raw.length < 2 || raw.length > 60) continue;
    // Drop leading articles / filler
    const cleaned = raw
      .replace(/^(?:la|el|las|los|the|mi|my|a|an)\s+/i, "")
      .replace(/[?¿!¡.,;:]+$/g, "")
      .trim();
    if (cleaned.length >= 2) return cleaned;
  }
  return null;
}

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "");
}

function tokenize(s: string): string[] {
  return stripDiacritics(s.toLowerCase())
    .replace(/[^a-z0-9.\-]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOP.has(t));
}

const STOP = new Set([
  "the",
  "and",
  "plc",
  "inc",
  "ltd",
  "sa",
  "corp",
  "stock",
  "share",
  "shares",
  "accion",
  "acciones",
]);

/** Levenshtein distance capped for short tokens (typo tolerance). */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + cost);
      diag = tmp;
    }
  }
  return prev[b.length]!;
}

function tokensFuzzyMatch(queryTokens: string[], nameTokens: string[]): boolean {
  if (queryTokens.length === 0) return false;
  let hits = 0;
  for (const qt of queryTokens) {
    const ok = nameTokens.some((nt) => {
      if (nt === qt || nt.includes(qt) || qt.includes(nt)) return true;
      const maxDist = qt.length <= 4 ? 1 : 2;
      return editDistance(qt, nt) <= maxDist;
    });
    if (ok) hits += 1;
  }
  // Require majority of meaningful query tokens (handles "sarabi gold" → Serabi Gold)
  return hits >= Math.ceil(queryTokens.length / 2) && hits >= 1;
}

export function matchHoldingsToQuery(
  holdings: Array<{ ticker: string; name?: string }>,
  query: string,
): Array<{ ticker: string; name: string }> {
  const q = query.trim();
  if (!q) return [];
  const qUpper = q.toUpperCase();
  const qTokens = tokenize(q);

  const matches: Array<{ ticker: string; name: string; score: number }> = [];
  for (const h of holdings) {
    const ticker = h.ticker;
    const name = h.name || "";
    const tUpper = ticker.toUpperCase();
    const base = tUpper.replace(/\.[A-Z]{1,4}$/, "");
    let score = 0;
    if (tUpper === qUpper || base === qUpper) score = 100;
    else if (tUpper.startsWith(qUpper + ".") || base.startsWith(qUpper)) score = 90;
    else if (name.toLowerCase() === q.toLowerCase()) score = 80;
    else if (tokensFuzzyMatch(qTokens, tokenize(`${name} ${ticker}`))) {
      score = 50;
    }
    if (score > 0) {
      matches.push({ ticker, name: name || ticker, score });
    }
  }
  matches.sort((a, b) => b.score - a.score);
  return matches.map(({ ticker, name }) => ({ ticker, name }));
}

/**
 * Prefer a portfolio holding ticker when the model (or user) passes a bare
 * symbol that matches a venue-suffixed holding (SRB → SRB.L).
 */
export function resolveTickerAgainstHoldings(
  raw: string,
  holdings: Array<{ ticker: string }>,
): string {
  const t = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!t) return raw.trim();
  const exact = holdings.find((h) => h.ticker.toUpperCase() === t);
  if (exact) return exact.ticker;
  const baseMatch = holdings.find((h) => {
    const ht = h.ticker.toUpperCase();
    const base = ht.replace(/\.[A-Z]{1,4}$/, "");
    return base === t || ht.startsWith(`${t}.`);
  });
  if (baseMatch) return baseMatch.ticker;
  return t;
}

function isoDateOffset(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function buildPriceMovePrefetchAppendix(
  message: string,
  opts: { userId: string; portfolioId?: string; snapshot?: PortfolioSnapshot },
): Promise<string | null> {
  if (!wantsPriceMoveIntent(message)) return null;

  const query = extractPriceMoveQuery(message);
  const holdings =
    opts.snapshot?.topHoldings?.map((h) => ({
      ticker: h.ticker,
      name: h.name,
    })) ??
    (await dbListHoldings(opts.userId, opts.portfolioId)).map((h) => ({
      ticker: h.ticker,
      name: h.name,
    }));

  const matched = query ? matchHoldingsToQuery(holdings, query) : [];
  const primary = matched[0];
  const tickers = matched.map((m) => m.ticker);
  const today = isoDateOffset(0);

  let earningsLines: string[] = [];
  if (tickers.length > 0) {
    const events = await listCalendarEvents({
      types: ["earnings"],
      from: isoDateOffset(-3),
      to: isoDateOffset(7),
      symbols: tickers.map((t) => t.toUpperCase()),
    });
    earningsLines = events.map((e) => {
      const when = e.event_date === today ? "TODAY" : e.event_date;
      const time = e.event_time ? ` (${e.event_time})` : "";
      return `${e.symbol ?? "?"} earnings ${when}${time} — ${e.name}`;
    });
  }

  const snapLine = primary
    ? (() => {
        const snap = opts.snapshot?.topHoldings.find(
          (h) => h.ticker.toUpperCase() === primary.ticker.toUpperCase(),
        );
        if (!snap) return null;
        const parts = [`Portfolio match: ${primary.ticker} (${primary.name})`];
        if (snap.currentPrice != null && snap.currentPrice > 0) {
          parts.push(
            `last price ${snap.currentPrice} ${snap.currency || opts.snapshot?.baseCurrency || ""}`.trim(),
          );
        }
        if (snap.dayChangePct != null) {
          parts.push(`day ${snap.dayChangePct >= 0 ? "+" : ""}${snap.dayChangePct.toFixed(2)}%`);
        }
        return parts.join(" · ");
      })()
    : null;

  const lines = [
    "TASK OVERRIDE — Price-move / catalyst question detected:",
    query
      ? `User asked why "${query}" moved. Resolve to the correct listing ticker before quoting a price.`
      : "User asked why a stock moved. Resolve the ticker from holdings or getQuote before answering.",
    primary
      ? `Likely holding: ${primary.ticker} (${primary.name}). Prefer this venue ticker over a bare symbol (e.g. SRB.L not SRB).`
      : query
        ? `No holding matched "${query}" — call getQuote / getTickerNews with the best Yahoo symbol; if price is missing, say so.`
        : null,
    snapLine,
    earningsLines.length > 0
      ? `Calendar earnings (use as a likely catalyst; do not invent): ${earningsLines.join("; ")}`
      : "Call `getMarketCatalysts` for these tickers (earnings today / this week) in the same turn.",
    "You MUST call `getQuote` + `getTickerNews` + `getMarketCatalysts` for the resolved ticker(s) before answering.",
    "Never state a price of 0 or invent catalysts. If quote/news/calendar are empty, say so plainly.",
  ].filter(Boolean);

  return lines.join("\n");
}
