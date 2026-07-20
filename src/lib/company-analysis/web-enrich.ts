/**
 * Tavily web research for company-analysis narratives (same provider as AID).
 * Returns cited snippets only — never fabricates numbers.
 */

import { searchTavilyForTicker, type TavilySearchResult } from "@/lib/aid/tavily-search";
import { sanitizeHttpUrl } from "./urls";

export interface WebEnrichSnippet {
  title: string;
  url: string;
  content: string;
}

export interface WebEnrichBundle {
  usedWeb: boolean;
  snippets: WebEnrichSnippet[];
}

function toSnippet(r: TavilySearchResult): WebEnrichSnippet | null {
  const url = sanitizeHttpUrl(r.url);
  if (!url) return null;
  return {
    title: r.title.slice(0, 200),
    url,
    content: r.content.slice(0, 1200),
  };
}

/**
 * Run two focused searches: earnings/guidance filings + sector/competitive context.
 */
export async function gatherCompanyAnalysisWebContext(args: {
  ticker: string;
  companyName: string | null;
}): Promise<WebEnrichBundle> {
  const name = (args.companyName || args.ticker).trim();
  const ticker = args.ticker.toUpperCase();

  const [earningsHits, sectorHits] = await Promise.all([
    searchTavilyForTicker(
      `${name} ${ticker} quarterly earnings results guidance revenue EPS site:businesswire.com OR site:sec.gov OR site:investor.`,
      5,
    ),
    searchTavilyForTicker(
      `${name} ${ticker} industry sector outlook competitors risks growth`,
      4,
    ),
  ]);

  const seen = new Set<string>();
  const snippets: WebEnrichSnippet[] = [];
  for (const hit of [...earningsHits, ...sectorHits]) {
    const s = toSnippet(hit);
    if (!s || seen.has(s.url)) continue;
    seen.add(s.url);
    snippets.push(s);
    if (snippets.length >= 8) break;
  }

  return { usedWeb: snippets.length > 0, snippets };
}

/** Format snippets for the LLM prompt (citations required). */
export function formatWebContextForPrompt(bundle: WebEnrichBundle): string {
  if (!bundle.snippets.length) return "";
  return bundle.snippets
    .map(
      (s, i) =>
        `[${i + 1}] ${s.title}\nURL: ${s.url}\nExcerpt: ${s.content}`,
    )
    .join("\n\n");
}
