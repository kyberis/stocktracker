import { z } from "zod";
import {
  accrueScreeningTavilyExtractCost,
  tavilyExtractCreditsForUrls,
} from "@/lib/screening/cost";
import { recordTavilyExtractRequest } from "@/lib/screening/metrics";
import { noteScreeningProviderQuota } from "@/lib/screening/provider-circuit";

/**
 * Screening-scoped Tavily Extract client for IR document processing.
 * POST /extract — fail-open when the key is missing.
 */

const TAVILY_EXTRACT_URL = "https://api.tavily.com/extract";

const extractResultSchema = z.object({
  url: z.string().max(800).default(""),
  raw_content: z.string().max(80_000).optional(),
  rawContent: z.string().max(80_000).optional(),
});

export type TavilyExtractDepth = "basic" | "advanced";

export interface TavilyExtractedPage {
  url: string;
  content: string;
}

export interface FetchTavilyExtractOptions {
  urls: string[];
  /** Rerank chunks by relevance (keeps context small). */
  query?: string;
  chunksPerSource?: number;
  extractDepth?: TavilyExtractDepth;
  /** Truncate raw_content (default 12_000). PDFs pass a higher cap. */
  maxContentChars?: number;
  /** Accrue variable Extract cost on this screening run. */
  runId?: string | null;
  fetchImpl?: typeof fetch;
}

export interface FetchTavilyExtractResult {
  results: TavilyExtractedPage[];
  failedUrls: Array<{ url: string; error: string }>;
  creditsUsed: number;
  errors: string[];
}

function normalizeUrl(url: string): string {
  return url.trim().slice(0, 800);
}

export async function fetchTavilyExtract(
  opts: FetchTavilyExtractOptions,
): Promise<FetchTavilyExtractResult> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    recordTavilyExtractRequest("missing_key");
    return {
      results: [],
      failedUrls: [],
      creditsUsed: 0,
      errors: ["missing_api_key"],
    };
  }

  const urls = [...new Set(opts.urls.map(normalizeUrl).filter(Boolean))].slice(
    0,
    20,
  );
  if (urls.length === 0) {
    return {
      results: [],
      failedUrls: [],
      creditsUsed: 0,
      errors: ["no_urls"],
    };
  }

  const fetchImpl = opts.fetchImpl ?? fetch;
  const extractDepth: TavilyExtractDepth = opts.extractDepth ?? "basic";
  const maxContentChars = Math.min(
    80_000,
    Math.max(1_000, opts.maxContentChars ?? 12_000),
  );
  const body: Record<string, unknown> = {
    urls,
    extract_depth: extractDepth,
    format: "markdown",
    include_images: false,
  };
  if (opts.query?.trim()) {
    body.query = opts.query.trim().slice(0, 400);
    body.chunks_per_source = Math.min(
      5,
      Math.max(1, opts.chunksPerSource ?? 3),
    );
  }

  try {
    const res = await fetchImpl(TAVILY_EXTRACT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const status =
        res.status === 429
          ? "rate_limited"
          : res.status === 401
            ? "unauthorized"
            : "error";
      recordTavilyExtractRequest(status);
      const errBody = (await res.text().catch(() => "")).slice(0, 300);
      if (res.status === 429) {
        noteScreeningProviderQuota({
          provider: "tavily",
          statusCode: 429,
          detail: errBody,
        });
      }
      return {
        results: [],
        failedUrls: [],
        creditsUsed: 0,
        errors: [`tavily_extract_${res.status}:${errBody}`],
      };
    }

    const json = (await res.json().catch(() => null)) as {
      results?: unknown[];
      failed_results?: Array<{ url?: string; error?: string }>;
      failedResults?: Array<{ url?: string; error?: string }>;
    } | null;
    if (!json || !Array.isArray(json.results)) {
      recordTavilyExtractRequest("bad_shape");
      return {
        results: [],
        failedUrls: [],
        creditsUsed: 0,
        errors: ["tavily_extract_bad_shape"],
      };
    }

    const results: TavilyExtractedPage[] = [];
    for (const raw of json.results) {
      const parsed = extractResultSchema.safeParse(raw);
      if (!parsed.success) continue;
      const url = parsed.data.url.trim();
      const content = (
        parsed.data.raw_content ??
        parsed.data.rawContent ??
        ""
      ).trim();
      if (!url || !content) continue;
      results.push({
        url: url.slice(0, 800),
        content: content.slice(0, maxContentChars),
      });
    }

    const failedRaw = json.failed_results ?? json.failedResults ?? [];
    const failedUrls = failedRaw
      .filter((f) => f && typeof f.url === "string")
      .map((f) => ({
        url: String(f.url).slice(0, 800),
        error: String(f.error ?? "extract_failed").slice(0, 200),
      }));

    const creditsUsed = tavilyExtractCreditsForUrls(
      results.length,
      extractDepth,
    );
    recordTavilyExtractRequest(results.length > 0 ? "ok" : "empty");
    await accrueScreeningTavilyExtractCost({
      runId: opts.runId,
      credits: creditsUsed,
    });

    return { results, failedUrls, creditsUsed, errors: [] };
  } catch (err) {
    recordTavilyExtractRequest("error");
    return {
      results: [],
      failedUrls: [],
      creditsUsed: 0,
      errors: [err instanceof Error ? err.message : "tavily_extract_error"],
    };
  }
}
