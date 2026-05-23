import { listHoldings as dbListHoldings } from "@/lib/db";
import type { PortfolioSnapshot } from "./tools";

/** User wants to see their own position in a specific stock/company — NOT missions or Clara. */
export function wantsPortfolioHoldingIntent(message: string): boolean {
  return (
    /(?:mostrar|muestr|show|see|ver|cu[aá]nto tengo|c[oó]mo va|how is|what(?:'s| is) my).*(?:inversi[oó]n|position|holding|stock|acciones?|participaci[oó]n)/i.test(
      message,
    ) ||
    /(?:mi|my)\s+(?:inversi[oó]n|position|holding|stock|acciones?).*(?:en|in|de|of)\s+[A-Za-z]/i.test(
      message,
    ) ||
    /(?:tengo|do i (?:own|have)|own any|tengo acciones).*(?:en|in|de|of)\s+[A-Za-z]/i.test(message)
  );
}

/** Extract company name or ticker from a holding lookup prompt. */
export function extractHoldingQueryFromMessage(message: string): string | null {
  const patterns = [
    /(?:inversi[oó]n|position|holding|stock|acciones?|participaci[oó]n).*(?:en|in|de|of)\s+([A-Za-z0-9.-]{2,20})/i,
    /(?:mostrar|muestr|show|see|ver)\s+(?:mi|my)\s+(?:inversi[oó]n|position|holding|stock).*(?:en|in|de|of)\s+([A-Za-z0-9.-]{2,20})/i,
    /(?:cu[aá]nto tengo|c[oó]mo va|how is).*(?:en|in|de|of)\s+([A-Za-z0-9.-]{2,20})/i,
  ];
  for (const re of patterns) {
    const m = message.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function matchesHoldingQuery(h: { ticker: string; name?: string }, query: string): boolean {
  const q = query.toLowerCase();
  const ticker = h.ticker.toLowerCase();
  const name = (h.name || "").toLowerCase();
  if (ticker === q || name === q) return true;
  if (ticker.includes(q) || name.includes(q)) return true;
  if (h.ticker.toUpperCase() === query.toUpperCase()) return true;
  return false;
}

export async function buildPortfolioHoldingPrefetchAppendix(
  message: string,
  opts: { userId: string; portfolioId?: string; snapshot?: PortfolioSnapshot },
): Promise<string | null> {
  if (!wantsPortfolioHoldingIntent(message)) return null;

  const query = extractHoldingQueryFromMessage(message);
  if (!query) {
    return [
      "TASK OVERRIDE — Portfolio holding lookup detected:",
      "The user asked about a specific investment in their portfolio.",
      "Call `listHoldings`, identify the matching ticker, then `renderHoldingCard` with real data.",
      "Do NOT call `listOfficeMissions`, `consultClaraSavings`, or `searchWillNotes`.",
    ].join("\n");
  }

  const holdings = await dbListHoldings(opts.userId, opts.portfolioId);
  const matches = holdings.filter((h) => matchesHoldingQuery(h, query));

  const enrich = (ticker: string) =>
    opts.snapshot?.topHoldings.find((h) => h.ticker.toLowerCase() === ticker.toLowerCase());

  const lines =
    matches.length === 0
      ? [`No holding matching "${query}" in the active portfolio.`]
      : matches.map((h) => {
          const snap = enrich(h.ticker);
          const price = snap?.currentPrice;
          const gain = snap?.totalGainPct;
          const value = snap?.value;
          const parts = [
            `${h.ticker} (${h.name})`,
            `${h.shares} shares`,
            `avg ${h.purchasePrice} ${h.displayCurrency}`,
          ];
          if (price != null) parts.push(`last ${price} ${snap?.currency || h.displayCurrency}`);
          if (gain != null) parts.push(`return ${gain.toFixed(1)}%`);
          if (value != null) parts.push(`value ~${value.toFixed(0)} ${opts.snapshot?.baseCurrency || "EUR"}`);
          return parts.join(" · ");
        });

  return [
    "TASK OVERRIDE — Portfolio holding lookup detected:",
    `User asked about their investment in "${query}".`,
    "You MUST call `listHoldings` (or use prefetch below), then `renderHoldingCard` with the matching position's real numbers.",
    "Do NOT call `listOfficeMissions`, `consultClaraSavings`, or `searchWillNotes` — unrelated to showing a held position.",
    lines.join("\n"),
  ].join("\n");
}
