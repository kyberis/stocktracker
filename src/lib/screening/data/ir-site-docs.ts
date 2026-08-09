/**
 * Discover the official Investor Relations hub and recent HTML IR documents,
 * then extract guidance-relevant excerpts via Tavily Extract.
 */

import {
  fetchTavilySearch,
  type TavilyScreeningResult,
} from "@/lib/screening/data/tavily";
import { fetchTavilyExtract } from "@/lib/screening/data/tavily-extract";

const BLOCKED_HOST_SNIPPETS = [
  "reddit.com",
  "quora.com",
  "seekingalpha.com/amp",
  "stocktwits.com",
  "youtube.com",
  "facebook.com",
  "twitter.com",
  "x.com",
];

const IR_HUB_HOST_HINTS = [
  "investor.",
  "investors.",
  "ir.",
  "/investor",
  "/investors",
  "/investor-relations",
  "shareholder",
];

const DOC_TITLE_HINTS = [
  "earning",
  "results",
  "quarter",
  "press release",
  "investor",
  "guidance",
  "presentation",
  "annual report",
  "10-q",
  "10-k",
  "form 6-k",
  "news release",
];

export interface IrSiteDocument {
  url: string;
  title: string;
  asOf: string | null;
  excerpt: string;
  role: "ir_hub" | "document";
}

export interface FetchIrSiteDocumentsOptions {
  ticker: string;
  companyName?: string | null;
  runId?: string | null;
  /** Max HTML URLs to extract (hard cap 3). */
  maxDocuments?: number;
  fetchImpl?: typeof fetch;
}

export interface FetchIrSiteDocumentsResult {
  ticker: string;
  irPageUrl: string | null;
  documents: IrSiteDocument[];
  hasUsefulContent: boolean;
  searchCredits: number;
  extractCredits: number;
  errors: string[];
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function pathFromUrl(url: string): string {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return "";
  }
}

/** True for PDF / binary links we skip in v1. */
export function isPdfOrBinaryUrl(url: string): boolean {
  const lower = url.toLowerCase().split("?")[0] ?? "";
  return (
    lower.endsWith(".pdf") ||
    lower.endsWith(".ppt") ||
    lower.endsWith(".pptx") ||
    lower.endsWith(".xls") ||
    lower.endsWith(".xlsx") ||
    lower.endsWith(".zip") ||
    lower.includes("/pdf/")
  );
}

export function isBlockedIrHost(url: string): boolean {
  const host = hostFromUrl(url);
  const full = url.toLowerCase();
  return BLOCKED_HOST_SNIPPETS.some(
    (s) => host.includes(s.replace(/\/.*/, "")) || full.includes(s),
  );
}

function looksLikeIrHub(url: string, title: string): boolean {
  const hay = `${url} ${title}`.toLowerCase();
  return IR_HUB_HOST_HINTS.some((h) => hay.includes(h));
}

function looksLikeIrDocument(url: string, title: string): boolean {
  const hay = `${url} ${title}`.toLowerCase();
  return DOC_TITLE_HINTS.some((h) => hay.includes(h)) || looksLikeIrHub(url, title);
}

/** Score candidate URLs for IR relevance (higher is better). */
export function scoreIrCandidate(opts: {
  url: string;
  title: string;
  companyName?: string | null;
  ticker?: string;
  preferHub?: boolean;
}): number {
  const { url, title, preferHub } = opts;
  if (!url || isPdfOrBinaryUrl(url) || isBlockedIrHost(url)) return -1000;

  let score = 0;
  const host = hostFromUrl(url);
  const path = pathFromUrl(url);
  const titleLower = title.toLowerCase();
  const company = (opts.companyName || "").toLowerCase().trim();
  const ticker = (opts.ticker || "").toLowerCase().trim();

  if (looksLikeIrHub(url, title)) score += preferHub ? 40 : 25;
  if (looksLikeIrDocument(url, title)) score += preferHub ? 10 : 30;
  if (host.includes("investor") || host.startsWith("ir.")) score += 20;
  if (path.includes("investor") || path.includes("earnings")) score += 12;
  if (titleLower.includes("investor relations")) score += 15;
  if (company && (titleLower.includes(company) || host.includes(company.replace(/\s+/g, "")))) {
    score += 10;
  }
  if (ticker && (titleLower.includes(ticker) || url.toLowerCase().includes(ticker))) {
    score += 8;
  }
  // Prefer official-looking hosts over aggregators.
  if (
    host.includes("sec.gov") ||
    host.includes("businesswire.com") ||
    host.includes("globenewswire.com") ||
    host.includes("prnewswire.com")
  ) {
    score += 6;
  }
  if (host.includes("yahoo.com") || host.includes("marketwatch.com")) {
    score -= 15;
  }
  return score;
}

export function pickIrUrls(opts: {
  hubResults: TavilyScreeningResult[];
  docResults: TavilyScreeningResult[];
  companyName?: string | null;
  ticker: string;
  maxDocuments?: number;
}): {
  irPageUrl: string | null;
  candidates: Array<{
    url: string;
    title: string;
    asOf: string | null;
    role: "ir_hub" | "document";
  }>;
} {
  const maxDocuments = Math.min(3, Math.max(1, opts.maxDocuments ?? 3));
  const ticker = opts.ticker.toUpperCase();

  const hubRanked = [...opts.hubResults]
    .map((r) => ({
      ...r,
      score: scoreIrCandidate({
        url: r.url,
        title: r.title,
        companyName: opts.companyName,
        ticker,
        preferHub: true,
      }),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  const irPageUrl = hubRanked[0]?.url ?? null;

  const seen = new Set<string>();
  const candidates: Array<{
    url: string;
    title: string;
    asOf: string | null;
    role: "ir_hub" | "document";
  }> = [];

  const push = (
    r: { url: string; title: string; publishedDate: string | null },
    role: "ir_hub" | "document",
  ) => {
    const key = r.url.split("#")[0]?.toLowerCase() ?? r.url;
    if (seen.has(key)) return;
    if (isPdfOrBinaryUrl(r.url) || isBlockedIrHost(r.url)) return;
    seen.add(key);
    candidates.push({
      url: r.url,
      title: r.title.slice(0, 240),
      asOf: r.publishedDate,
      role,
    });
  };

  if (hubRanked[0]) {
    push(hubRanked[0], "ir_hub");
  }

  const docRanked = [...opts.docResults]
    .map((r) => ({
      ...r,
      score: scoreIrCandidate({
        url: r.url,
        title: r.title,
        companyName: opts.companyName,
        ticker,
        preferHub: false,
      }),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  for (const r of docRanked) {
    if (candidates.length >= maxDocuments) break;
    push(r, "document");
  }

  // If docs search was empty, allow more hub results as documents.
  if (candidates.length < maxDocuments) {
    for (const r of hubRanked.slice(1)) {
      if (candidates.length >= maxDocuments) break;
      push(r, "document");
    }
  }

  return { irPageUrl, candidates: candidates.slice(0, maxDocuments) };
}

const EXTRACT_QUERY =
  "management guidance outlook catalysts business segments quarterly results earnings";

export async function fetchIrSiteDocuments(
  opts: FetchIrSiteDocumentsOptions,
): Promise<FetchIrSiteDocumentsResult> {
  const ticker = opts.ticker.toUpperCase().trim();
  const name = (opts.companyName || ticker).trim();
  const errors: string[] = [];
  let searchCredits = 0;
  let extractCredits = 0;

  const empty = (
    extraErrors: string[] = [],
  ): FetchIrSiteDocumentsResult => ({
    ticker,
    irPageUrl: null,
    documents: [],
    hasUsefulContent: false,
    searchCredits,
    extractCredits,
    errors: [...errors, ...extraErrors],
  });

  if (!process.env.TAVILY_API_KEY?.trim()) {
    return empty(["missing_api_key"]);
  }

  const fetchImpl = opts.fetchImpl ?? fetch;
  const maxDocuments = Math.min(3, Math.max(1, opts.maxDocuments ?? 3));

  const [hubSearch, docSearch] = await Promise.all([
    fetchTavilySearch({
      query: `${name} ${ticker} investor relations`,
      maxResults: 5,
      searchDepth: "basic",
      runId: opts.runId,
      fetchImpl,
    }),
    fetchTavilySearch({
      query: `${name} ${ticker} latest earnings release OR quarterly results investor relations`,
      maxResults: 5,
      daysBack: 120,
      searchDepth: "basic",
      runId: opts.runId,
      fetchImpl,
    }),
  ]);

  searchCredits += 2; // two basic searches
  errors.push(...hubSearch.errors, ...docSearch.errors);

  const { irPageUrl, candidates } = pickIrUrls({
    hubResults: hubSearch.results,
    docResults: docSearch.results,
    companyName: opts.companyName,
    ticker,
    maxDocuments,
  });

  if (candidates.length === 0) {
    return {
      ...empty(["no_ir_candidates"]),
      irPageUrl,
    };
  }

  let extract = await fetchTavilyExtract({
    urls: candidates.map((c) => c.url),
    query: EXTRACT_QUERY,
    chunksPerSource: 4,
    extractDepth: "basic",
    runId: opts.runId,
    fetchImpl,
  });
  extractCredits += extract.creditsUsed;
  errors.push(...extract.errors);

  // Retry hub with advanced depth once if basic returned nothing for it.
  const hubCandidate = candidates.find((c) => c.role === "ir_hub");
  const hubExtracted = extract.results.some(
    (r) => hubCandidate && r.url === hubCandidate.url && r.content.length > 80,
  );
  if (hubCandidate && !hubExtracted) {
    const retry = await fetchTavilyExtract({
      urls: [hubCandidate.url],
      query: EXTRACT_QUERY,
      chunksPerSource: 4,
      extractDepth: "advanced",
      runId: opts.runId,
      fetchImpl,
    });
    extractCredits += retry.creditsUsed;
    errors.push(...retry.errors);
    if (retry.results.length > 0) {
      const byUrl = new Map(extract.results.map((r) => [r.url, r]));
      for (const r of retry.results) byUrl.set(r.url, r);
      extract = {
        ...extract,
        results: [...byUrl.values()],
        failedUrls: [...extract.failedUrls, ...retry.failedUrls],
      };
    }
  }

  const contentByUrl = new Map(
    extract.results.map((r) => [r.url, r.content] as const),
  );
  const documents: IrSiteDocument[] = [];
  for (const c of candidates) {
    const excerpt = contentByUrl.get(c.url)?.trim() ?? "";
    if (excerpt.length < 40) continue;
    documents.push({
      url: c.url,
      title: c.title,
      asOf: c.asOf,
      excerpt: excerpt.slice(0, 4000),
      role: c.role,
    });
  }

  const hasUsefulContent = documents.some((d) => d.excerpt.length >= 120);

  return {
    ticker,
    irPageUrl,
    documents,
    hasUsefulContent,
    searchCredits,
    extractCredits,
    errors: errors.filter(Boolean),
  };
}
