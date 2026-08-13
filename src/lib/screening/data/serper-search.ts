/**
 * Screening-scoped Serper Google Search. Same result shape as Tavily Search
 * so pickIrUrls can stay provider-agnostic. Fail-open when the key is missing.
 */

import type {
  FetchTavilySearchOptions,
  FetchTavilySearchResult,
  TavilyScreeningResult,
} from "@/lib/screening/data/tavily";

const SERPER_URL = "https://google.serper.dev/search";

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function tbsForDaysBack(daysBack: number | undefined): string | undefined {
  if (daysBack == null || daysBack <= 0) return undefined;
  if (daysBack <= 7) return "qdr:w";
  if (daysBack <= 31) return "qdr:m";
  if (daysBack <= 180) return "qdr:m6";
  return "qdr:y";
}

export function serperKeysPresent(): boolean {
  return Boolean(process.env.SERPER_API_KEY?.trim());
}

export async function fetchSerperSearch(
  opts: FetchTavilySearchOptions,
): Promise<FetchTavilySearchResult> {
  const apiKey = process.env.SERPER_API_KEY?.trim();
  if (!apiKey) {
    return { results: [], errors: ["missing_api_key"] };
  }

  const fetchImpl = opts.fetchImpl ?? fetch;
  const maxResults = Math.min(Math.max(1, opts.maxResults ?? 5), 10);
  const body: Record<string, unknown> = {
    q: opts.query.slice(0, 400),
    num: maxResults,
  };
  const tbs = tbsForDaysBack(opts.daysBack);
  if (tbs) body.tbs = tbs;

  try {
    const res = await fetchImpl(SERPER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const errBody = (await res.text().catch(() => "")).slice(0, 300);
      return {
        results: [],
        errors: [`serper_${res.status}:${errBody}`],
      };
    }
    const json = (await res.json().catch(() => null)) as {
      organic?: Array<{
        title?: string;
        link?: string;
        snippet?: string;
        date?: string;
      }>;
    } | null;
    const organic = json?.organic;
    if (!Array.isArray(organic)) {
      return { results: [], errors: ["serper_bad_shape"] };
    }

    const results: TavilyScreeningResult[] = [];
    for (const raw of organic.slice(0, maxResults)) {
      const url = String(raw.link ?? "").trim();
      const title = String(raw.title ?? "").trim();
      if (!url || !title) continue;
      results.push({
        title: title.slice(0, 240),
        url: url.slice(0, 500),
        content: String(raw.snippet ?? "").slice(0, 1200),
        publishedDate: raw.date ? String(raw.date).slice(0, 40) : null,
        source: hostFromUrl(url) || "serper",
      });
    }
    return { results, errors: [] };
  } catch (err) {
    return {
      results: [],
      errors: [err instanceof Error ? err.message : "serper_fetch_error"],
    };
  }
}
