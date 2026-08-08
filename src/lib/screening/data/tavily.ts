import { z } from "zod";
import { recordTavilyScreeningRequest } from "@/lib/screening/metrics";
import { accrueScreeningTavilySearchCost } from "@/lib/screening/cost";

/**
 * Screening-scoped Tavily search. Reuses the same TAVILY_API_KEY as AID /
 * company analysis. When the key is missing, returns empty results so the
 * Web & Sentiment agent can fall back to FMP-only evidence.
 */

const TAVILY_URL = "https://api.tavily.com/search";

const tavilyResultSchema = z.object({
  title: z.string().max(300).default(""),
  url: z.string().max(500).default(""),
  content: z.string().max(2000).default(""),
  published_date: z.string().max(40).optional(),
  publishedDate: z.string().max(40).optional(),
});

export interface TavilyScreeningResult {
  title: string;
  url: string;
  content: string;
  publishedDate: string | null;
  source: string;
}

export interface FetchTavilySearchOptions {
  query: string;
  maxResults?: number;
  /** Prefer recent results (Tavily `days` when supported). */
  daysBack?: number;
  /** basic=1 credit, advanced=2 credits. */
  searchDepth?: "basic" | "advanced";
  /** Accrue variable Search cost on this screening run. */
  runId?: string | null;
  fetchImpl?: typeof fetch;
}

export interface FetchTavilySearchResult {
  results: TavilyScreeningResult[];
  errors: string[];
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export async function fetchTavilySearch(
  opts: FetchTavilySearchOptions,
): Promise<FetchTavilySearchResult> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    return { results: [], errors: ["missing_api_key"] };
  }

  const fetchImpl = opts.fetchImpl ?? fetch;
  const maxResults = Math.min(Math.max(1, opts.maxResults ?? 5), 10);
  const searchDepth = opts.searchDepth ?? "basic";
  const body: Record<string, unknown> = {
    api_key: apiKey,
    query: opts.query.slice(0, 400),
    search_depth: searchDepth,
    max_results: maxResults,
    include_answer: false,
  };
  if (opts.daysBack != null && opts.daysBack > 0) {
    body.days = Math.min(365, Math.round(opts.daysBack));
  }

  try {
    const res = await fetchImpl(TAVILY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const status = res.status === 429 ? "rate_limited" : "error";
      recordTavilyScreeningRequest(status);
      const errBody = (await res.text().catch(() => "")).slice(0, 300);
      return {
        results: [],
        errors: [`tavily_${res.status}:${errBody}`],
      };
    }
    const json = (await res.json().catch(() => null)) as {
      results?: unknown[];
    } | null;
    if (!json || !Array.isArray(json.results)) {
      recordTavilyScreeningRequest("empty");
      return { results: [], errors: ["tavily_bad_shape"] };
    }

    const results: TavilyScreeningResult[] = [];
    for (const raw of json.results.slice(0, maxResults)) {
      const parsed = tavilyResultSchema.safeParse(raw);
      if (!parsed.success) continue;
      const url = parsed.data.url.trim();
      const title = parsed.data.title.trim();
      if (!url || !title) continue;
      results.push({
        title: title.slice(0, 240),
        url: url.slice(0, 500),
        content: parsed.data.content.slice(0, 1200),
        publishedDate:
          parsed.data.published_date ?? parsed.data.publishedDate ?? null,
        source: hostFromUrl(url) || "tavily",
      });
    }
    recordTavilyScreeningRequest(results.length > 0 ? "ok" : "empty");
    await accrueScreeningTavilySearchCost({
      runId: opts.runId,
      credits: searchDepth === "advanced" ? 2 : 1,
    });
    return { results, errors: [] };
  } catch (err) {
    recordTavilyScreeningRequest("error");
    return {
      results: [],
      errors: [err instanceof Error ? err.message : "tavily_fetch_error"],
    };
  }
}
