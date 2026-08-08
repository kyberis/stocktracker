/**
 * Tavily web research for company-analysis narratives (same provider as AID).
 * Prefers shared screening research cache when present; otherwise Search.
 * Returns cited snippets only — never fabricates numbers.
 */

import { searchTavilyForTicker, type TavilySearchResult } from "@/lib/aid/tavily-search";
import { getOrFetchCompanyResearch } from "@/lib/screening/data/company-research";
import { sanitizeHttpUrl } from "./urls";

export interface WebEnrichSnippet {
  title: string;
  url: string;
  content: string;
}

export interface WebEnrichBundle {
  usedWeb: boolean;
  snippets: WebEnrichSnippet[];
  /** True when snippets came from screening_research_cache / Research. */
  usedResearchCache?: boolean;
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
 * When a fresh shared company-research cache exists, use it first (P6).
 */
export async function gatherCompanyAnalysisWebContext(args: {
  ticker: string;
  companyName: string | null;
}): Promise<WebEnrichBundle> {
  const name = (args.companyName || args.ticker).trim();
  const ticker = args.ticker.toUpperCase();

  try {
    const cached = await getOrFetchCompanyResearch({
      ticker,
      companyName: name,
      cacheOnly: true,
    });
    if (
      !cached.errors.includes("cache_miss") &&
      (cached.businessOneLiner ||
        cached.rawContent ||
        cached.sources.length > 0)
    ) {
      const snippets: WebEnrichSnippet[] = [];
      if (cached.businessOneLiner || cached.guidanceSummary) {
        snippets.push({
          title: `${ticker} company research`,
          url: cached.sources[0]?.url || `https://finance.yahoo.com/quote/${ticker}`,
          content: [
            cached.businessOneLiner,
            cached.guidanceSummary,
            cached.segments.length
              ? `Segments: ${cached.segments.join(", ")}`
              : "",
            cached.competitors.length
              ? `Competitors: ${cached.competitors.join(", ")}`
              : "",
            cached.catalysts.slice(0, 3).join("; "),
          ]
            .filter(Boolean)
            .join("\n")
            .slice(0, 1200),
        });
      }
      for (const s of cached.sources.slice(0, 6)) {
        const url = sanitizeHttpUrl(s.url);
        if (!url) continue;
        snippets.push({
          title: s.title.slice(0, 200),
          url,
          content: (cached.rawContent || s.title).slice(0, 800),
        });
        if (snippets.length >= 8) break;
      }
      if (snippets.length > 0) {
        return { usedWeb: true, snippets, usedResearchCache: true };
      }
    }
  } catch {
    // fall through to Search
  }

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

  return { usedWeb: snippets.length > 0, snippets, usedResearchCache: false };
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
