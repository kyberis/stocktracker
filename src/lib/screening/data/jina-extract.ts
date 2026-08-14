/**
 * Screening-scoped Jina Reader (EU) for IR HTML + PDF extraction.
 * Fail-open when the key is missing.
 */

import { noteScreeningProviderQuota } from "@/lib/screening/provider-circuit";

const JINA_EU_URL = "https://eu.r.jina.ai/";

export interface JinaExtractedPage {
  url: string;
  content: string;
}

export interface FetchJinaExtractOptions {
  urls: string[];
  maxContentChars?: number;
  /** PDF extracts get a longer timeout. */
  pdf?: boolean;
  fetchImpl?: typeof fetch;
}

export interface FetchJinaExtractResult {
  results: JinaExtractedPage[];
  failedUrls: Array<{ url: string; error: string }>;
  errors: string[];
}

export function jinaKeysPresent(): boolean {
  return Boolean(process.env.JINA_API_KEY?.trim());
}

function normalizeUrl(url: string): string {
  return url.trim().slice(0, 800);
}

function contentFromJson(json: unknown): string {
  if (!json || typeof json !== "object") return "";
  const row = json as Record<string, unknown>;
  const data =
    row.data && typeof row.data === "object"
      ? (row.data as Record<string, unknown>)
      : row;
  const content = data.content ?? data.text ?? row.content ?? "";
  return typeof content === "string" ? content : "";
}

export async function fetchJinaExtract(
  opts: FetchJinaExtractOptions,
): Promise<FetchJinaExtractResult> {
  const apiKey = process.env.JINA_API_KEY?.trim();
  if (!apiKey) {
    return {
      results: [],
      failedUrls: [],
      errors: ["missing_api_key"],
    };
  }

  const urls = [...new Set(opts.urls.map(normalizeUrl).filter(Boolean))].slice(
    0,
    10,
  );
  if (urls.length === 0) {
    return { results: [], failedUrls: [], errors: ["no_urls"] };
  }

  const fetchImpl = opts.fetchImpl ?? fetch;
  const maxContentChars = Math.min(
    80_000,
    Math.max(1_000, opts.maxContentChars ?? 12_000),
  );
  const timeoutMs = opts.pdf ? 45_000 : 20_000;

  const results: JinaExtractedPage[] = [];
  const failedUrls: Array<{ url: string; error: string }> = [];
  const errors: string[] = [];

  for (const url of urls) {
    try {
      const res = await fetchImpl(JINA_EU_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        const errBody = (await res.text().catch(() => "")).slice(0, 200);
        if (res.status === 429) {
          noteScreeningProviderQuota({
            provider: "jina",
            statusCode: 429,
            detail: errBody,
          });
        }
        failedUrls.push({
          url,
          error: `jina_${res.status}:${errBody}`.slice(0, 200),
        });
        continue;
      }
      const json = await res.json().catch(() => null);
      const content = contentFromJson(json).trim();
      if (!content) {
        failedUrls.push({ url, error: "jina_empty" });
        continue;
      }
      results.push({
        url: url.slice(0, 800),
        content: content.slice(0, maxContentChars),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "jina_fetch_error";
      failedUrls.push({ url, error: msg.slice(0, 200) });
      errors.push(msg);
    }
  }

  return { results, failedUrls, errors };
}
