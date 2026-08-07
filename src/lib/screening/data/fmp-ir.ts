import { z } from "zod";
import { recordFmpIrRequest } from "@/lib/screening/metrics";

/**
 * Screening-scoped FMP client for the IR / Business agent (E4).
 * Fetches earnings transcript (latest quarter), stock news, and insider trades
 * for a single ticker. Pattern mirrors `fmp-screening.ts` (Zod + metrics).
 */

const FMP_BASE = "https://financialmodelingprep.com/stable";

const transcriptRowSchema = z
  .object({
    symbol: z.string().optional(),
    content: z.string().optional(),
    transcript: z.string().optional(),
    year: z.union([z.number(), z.string()]).optional(),
    quarter: z.union([z.number(), z.string()]).optional(),
    date: z.string().optional(),
  })
  .passthrough();

const newsRowSchema = z
  .object({
    title: z.string().optional(),
    text: z.string().optional(),
    publishedDate: z.string().optional(),
    url: z.string().optional(),
    site: z.string().optional(),
    symbol: z.string().optional(),
  })
  .passthrough();

const insiderRowSchema = z
  .object({
    reportingName: z.string().optional(),
    name: z.string().optional(),
    typeOfOwner: z.string().optional(),
    transactionDate: z.string().optional(),
    date: z.string().optional(),
    transactionType: z.string().optional(),
    securitiesTransacted: z.union([z.number(), z.string()]).optional(),
    price: z.union([z.number(), z.string()]).optional(),
  })
  .passthrough();

export interface FmpIrTranscript {
  year: number;
  quarter: number;
  date: string | null;
  /** Truncated for LLM context. */
  excerpt: string;
}

export interface FmpIrNewsItem {
  title: string;
  publishedDate: string | null;
  url: string;
  site: string | null;
}

export interface FmpIrInsiderItem {
  name: string;
  title: string;
  transactionDate: string | null;
  transactionType: string;
  shares: number | null;
  price: number | null;
}

export interface FetchFmpIrBundleResult {
  ticker: string;
  transcript: FmpIrTranscript | null;
  news: FmpIrNewsItem[];
  insiders: FmpIrInsiderItem[];
  requestCount: number;
  errors: string[];
}

function currentYearQuarter(): { year: number; quarter: number } {
  const now = new Date();
  const month = now.getUTCMonth(); // 0-11
  const quarter = Math.floor(month / 3) + 1;
  return { year: now.getUTCFullYear(), quarter };
}

function previousQuarter(year: number, quarter: number): {
  year: number;
  quarter: number;
} {
  if (quarter <= 1) return { year: year - 1, quarter: 4 };
  return { year, quarter: quarter - 1 };
}

async function fmpGet(
  path: string,
  params: Record<string, string>,
  fetchImpl: typeof fetch,
): Promise<{ ok: true; json: unknown } | { ok: false; status: number; body: string }> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return { ok: false, status: 0, body: "missing_api_key" };
  }
  const url = new URL(`${FMP_BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  url.searchParams.set("apikey", apiKey);
  try {
    const res = await fetchImpl(url.toString(), {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      const body = (await res.text().catch(() => "")).slice(0, 300);
      return { ok: false, status: res.status, body };
    }
    const json = (await res.json().catch(() => null)) as unknown;
    return { ok: true, json };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      body: err instanceof Error ? err.message : "fetch_error",
    };
  }
}

async function fetchLatestTranscript(
  ticker: string,
  fetchImpl: typeof fetch,
): Promise<{ transcript: FmpIrTranscript | null; requests: number; errors: string[] }> {
  const errors: string[] = [];
  let requests = 0;
  let { year, quarter } = currentYearQuarter();
  // Try current + previous 3 quarters.
  for (let i = 0; i < 4; i++) {
    requests++;
    const result = await fmpGet(
      "earning-call-transcript",
      {
        symbol: ticker,
        year: String(year),
        quarter: String(quarter),
      },
      fetchImpl,
    );
    if (!result.ok) {
      const rateLimited = result.status === 429;
      recordFmpIrRequest(
        "earning-call-transcript",
        rateLimited ? "rate_limited" : "error",
      );
      errors.push(`transcript_${result.status}:${result.body}`);
      if (rateLimited) break;
      ({ year, quarter } = previousQuarter(year, quarter));
      continue;
    }
    const raw = Array.isArray(result.json) ? result.json[0] : result.json;
    const parsed = transcriptRowSchema.safeParse(raw);
    if (!parsed.success) {
      recordFmpIrRequest("earning-call-transcript", "empty");
      ({ year, quarter } = previousQuarter(year, quarter));
      continue;
    }
    const content = String(
      parsed.data.content ?? parsed.data.transcript ?? "",
    ).trim();
    if (!content) {
      recordFmpIrRequest("earning-call-transcript", "empty");
      ({ year, quarter } = previousQuarter(year, quarter));
      continue;
    }
    recordFmpIrRequest("earning-call-transcript", "ok");
    return {
      transcript: {
        year,
        quarter,
        date: parsed.data.date ?? null,
        excerpt: content.slice(0, 6000),
      },
      requests,
      errors,
    };
  }
  return { transcript: null, requests, errors };
}

async function fetchNews(
  ticker: string,
  fetchImpl: typeof fetch,
): Promise<{ news: FmpIrNewsItem[]; requests: number; errors: string[] }> {
  const errors: string[] = [];
  const result = await fmpGet(
    "news/stock",
    { symbols: ticker, limit: "20" },
    fetchImpl,
  );
  if (!result.ok) {
    recordFmpIrRequest(
      "news/stock",
      result.status === 429 ? "rate_limited" : "error",
    );
    return {
      news: [],
      requests: 1,
      errors: [`news_${result.status}:${result.body}`],
    };
  }
  if (!Array.isArray(result.json)) {
    recordFmpIrRequest("news/stock", "empty");
    return { news: [], requests: 1, errors: ["news_bad_shape"] };
  }
  const news: FmpIrNewsItem[] = [];
  for (const raw of result.json.slice(0, 20)) {
    const parsed = newsRowSchema.safeParse(raw);
    if (!parsed.success) continue;
    const title = String(parsed.data.title ?? "").trim();
    if (!title) continue;
    news.push({
      title: title.slice(0, 240),
      publishedDate: parsed.data.publishedDate ?? null,
      url: String(parsed.data.url ?? "").slice(0, 500),
      site: parsed.data.site ? String(parsed.data.site).slice(0, 80) : null,
    });
  }
  recordFmpIrRequest("news/stock", news.length > 0 ? "ok" : "empty");
  return { news, requests: 1, errors };
}

async function fetchInsiders(
  ticker: string,
  fetchImpl: typeof fetch,
): Promise<{
  insiders: FmpIrInsiderItem[];
  requests: number;
  errors: string[];
}> {
  const result = await fmpGet(
    "insider-trading/search",
    { symbol: ticker, page: "0", limit: "20" },
    fetchImpl,
  );
  if (!result.ok) {
    recordFmpIrRequest(
      "insider-trading/search",
      result.status === 429 ? "rate_limited" : "error",
    );
    return {
      insiders: [],
      requests: 1,
      errors: [`insider_${result.status}:${result.body}`],
    };
  }
  if (!Array.isArray(result.json)) {
    recordFmpIrRequest("insider-trading/search", "empty");
    return { insiders: [], requests: 1, errors: ["insider_bad_shape"] };
  }
  const insiders: FmpIrInsiderItem[] = [];
  for (const raw of result.json.slice(0, 20)) {
    const parsed = insiderRowSchema.safeParse(raw);
    if (!parsed.success) continue;
    const name = String(
      parsed.data.reportingName ?? parsed.data.name ?? "",
    ).trim();
    if (!name) continue;
    const sharesRaw = parsed.data.securitiesTransacted;
    const priceRaw = parsed.data.price;
    insiders.push({
      name: name.slice(0, 120),
      title: String(parsed.data.typeOfOwner ?? "").slice(0, 80),
      transactionDate:
        parsed.data.transactionDate ?? parsed.data.date ?? null,
      transactionType: String(parsed.data.transactionType ?? "").slice(0, 80),
      shares:
        sharesRaw == null || sharesRaw === ""
          ? null
          : Number.isFinite(Number(sharesRaw))
            ? Number(sharesRaw)
            : null,
      price:
        priceRaw == null || priceRaw === ""
          ? null
          : Number.isFinite(Number(priceRaw))
            ? Number(priceRaw)
            : null,
    });
  }
  recordFmpIrRequest(
    "insider-trading/search",
    insiders.length > 0 ? "ok" : "empty",
  );
  return { insiders, requests: 1, errors: [] };
}

export interface FetchFmpIrBundleOptions {
  ticker: string;
  fetchImpl?: typeof fetch;
}

/** Fetch transcript + news + insider bundle for one ticker. */
export async function fetchFmpIrBundle(
  opts: FetchFmpIrBundleOptions,
): Promise<FetchFmpIrBundleResult> {
  const ticker = opts.ticker.toUpperCase().trim();
  const fetchImpl = opts.fetchImpl ?? fetch;
  const errors: string[] = [];
  let requestCount = 0;

  if (!process.env.FMP_API_KEY) {
    return {
      ticker,
      transcript: null,
      news: [],
      insiders: [],
      requestCount: 0,
      errors: ["missing_api_key"],
    };
  }

  const [transcriptRes, newsRes, insiderRes] = await Promise.all([
    fetchLatestTranscript(ticker, fetchImpl),
    fetchNews(ticker, fetchImpl),
    fetchInsiders(ticker, fetchImpl),
  ]);

  requestCount +=
    transcriptRes.requests + newsRes.requests + insiderRes.requests;
  errors.push(
    ...transcriptRes.errors,
    ...newsRes.errors,
    ...insiderRes.errors,
  );

  return {
    ticker,
    transcript: transcriptRes.transcript,
    news: newsRes.news,
    insiders: insiderRes.insiders,
    requestCount,
    errors,
  };
}

/** Compact JSON payload for the IR LLM user message. */
export function summariseIrBundleForLlm(
  bundle: FetchFmpIrBundleResult,
): Record<string, unknown> {
  return {
    ticker: bundle.ticker,
    transcript: bundle.transcript
      ? {
          year: bundle.transcript.year,
          quarter: bundle.transcript.quarter,
          date: bundle.transcript.date,
          excerpt: bundle.transcript.excerpt,
        }
      : null,
    news: bundle.news.slice(0, 12).map((n) => ({
      title: n.title,
      publishedDate: n.publishedDate,
      url: n.url,
      site: n.site,
    })),
    insiders: bundle.insiders.slice(0, 10).map((i) => ({
      name: i.name,
      title: i.title,
      transactionDate: i.transactionDate,
      transactionType: i.transactionType,
      shares: i.shares,
    })),
  };
}
