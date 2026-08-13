/**
 * Discover the official Investor Relations hub and recent IR documents
 * (HTML + PDF), then extract guidance-relevant excerpts.
 * Prototype path: Serper Search + Jina EU Reader, with Tavily Search/Extract fallback.
 */

import {
  fetchTavilySearch,
  type TavilyScreeningResult,
} from "@/lib/screening/data/tavily";
import { fetchTavilyExtract } from "@/lib/screening/data/tavily-extract";
import {
  fetchSerperSearch,
  serperKeysPresent,
} from "@/lib/screening/data/serper-search";
import {
  fetchJinaExtract,
  jinaKeysPresent,
} from "@/lib/screening/data/jina-extract";

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
  "shareholder report",
  "md&a",
  "mda",
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
  format: "pdf" | "html";
}

export type IrSiteDocsProvider = "serper_jina" | "tavily" | "mixed";

export interface FetchIrSiteDocumentsOptions {
  ticker: string;
  companyName?: string | null;
  runId?: string | null;
  /** Max URLs to extract (hard cap 3). */
  maxDocuments?: number;
  /** Try Serper + Jina first when keys are present. */
  preferSerperJina?: boolean;
  /**
   * Analyze-only: never fall back to Tavily Search/Extract. Still extracts
   * Serper hits that fail the usual IR score filter (blocked hosts skipped).
   */
  forceSerperJina?: boolean;
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
  provider: IrSiteDocsProvider | null;
  serperQueries: number;
  jinaUrls: number;
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

export function isPdfUrl(url: string): boolean {
  const lower = url.toLowerCase().split("?")[0] ?? "";
  return lower.endsWith(".pdf") || lower.includes("/pdf/");
}

/** Office / archive links we still skip (Tavily Extract is unreliable). */
export function isUnsupportedBinaryUrl(url: string): boolean {
  const lower = url.toLowerCase().split("?")[0] ?? "";
  return (
    lower.endsWith(".ppt") ||
    lower.endsWith(".pptx") ||
    lower.endsWith(".xls") ||
    lower.endsWith(".xlsx") ||
    lower.endsWith(".zip")
  );
}

/** @deprecated Use isPdfUrl / isUnsupportedBinaryUrl. Kept for callers. */
export function isPdfOrBinaryUrl(url: string): boolean {
  return isPdfUrl(url) || isUnsupportedBinaryUrl(url);
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

function isRejectedIrUrl(url: string): boolean {
  return !url || isUnsupportedBinaryUrl(url) || isBlockedIrHost(url);
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
  if (isRejectedIrUrl(url)) return -1000;

  let score = 0;
  const host = hostFromUrl(url);
  const path = pathFromUrl(url);
  const titleLower = title.toLowerCase();
  const company = (opts.companyName || "").toLowerCase().trim();
  const ticker = (opts.ticker || "").toLowerCase().trim();
  const pdf = isPdfUrl(url);

  if (preferHub && pdf) score -= 25;
  if (!preferHub && pdf && looksLikeIrDocument(url, title)) score += 28;

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
  /** Inclusive floor. Default keeps current `score > 0` filter. */
  minScore?: number;
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
  const minScore = opts.minScore ?? 0;
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
    .filter((r) => r.score > minScore)
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
    if (isRejectedIrUrl(r.url)) return;
    seen.add(key);
    candidates.push({
      url: r.url,
      title: r.title.slice(0, 240),
      asOf: r.publishedDate,
      role,
    });
  };

  if (hubRanked[0] && !isPdfUrl(hubRanked[0].url)) {
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
    .filter((r) => r.score > minScore)
    .sort((a, b) => b.score - a.score);

  for (const r of docRanked) {
    if (candidates.length >= maxDocuments) break;
    push(r, "document");
  }

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

const HTML_EXCERPT_MAX = 4000;
const PDF_EXCERPT_MAX = 12_000;

type IrCandidate = {
  url: string;
  title: string;
  asOf: string | null;
  role: "ir_hub" | "document";
};

function fallbackSerperCandidates(
  hubResults: TavilyScreeningResult[],
  docResults: TavilyScreeningResult[],
  maxDocuments: number,
): IrCandidate[] {
  const seen = new Set<string>();
  const candidates: IrCandidate[] = [];
  for (const r of [...hubResults, ...docResults]) {
    const key = r.url.split("#")[0]?.toLowerCase() ?? r.url;
    if (seen.has(key) || isRejectedIrUrl(r.url)) continue;
    seen.add(key);
    candidates.push({
      url: r.url,
      title: r.title.slice(0, 240),
      asOf: r.publishedDate,
      role: looksLikeIrHub(r.url, r.title) ? "ir_hub" : "document",
    });
    if (candidates.length >= maxDocuments) break;
  }
  return candidates;
}

function tavilyKeysPresent(): boolean {
  return Boolean(process.env.TAVILY_API_KEY?.trim());
}

function documentsFromContent(
  candidates: IrCandidate[],
  contentByUrl: Map<string, string>,
): IrSiteDocument[] {
  const documents: IrSiteDocument[] = [];
  for (const c of candidates) {
    const excerpt = contentByUrl.get(c.url)?.trim() ?? "";
    if (excerpt.length < 40) continue;
    const pdf = isPdfUrl(c.url);
    documents.push({
      url: c.url,
      title: c.title,
      asOf: c.asOf,
      excerpt: excerpt.slice(0, pdf ? PDF_EXCERPT_MAX : HTML_EXCERPT_MAX),
      role: c.role,
      format: pdf ? "pdf" : "html",
    });
  }
  return documents;
}

async function extractWithTavily(opts: {
  candidates: IrCandidate[];
  runId?: string | null;
  fetchImpl: typeof fetch;
}): Promise<{
  contentByUrl: Map<string, string>;
  extractCredits: number;
  errors: string[];
}> {
  const contentByUrl = new Map<string, string>();
  const errors: string[] = [];
  let extractCredits = 0;
  const htmlCandidates = opts.candidates.filter((c) => !isPdfUrl(c.url));
  const pdfCandidates = opts.candidates.filter((c) => isPdfUrl(c.url));

  if (htmlCandidates.length > 0) {
    let htmlExtract = await fetchTavilyExtract({
      urls: htmlCandidates.map((c) => c.url),
      query: EXTRACT_QUERY,
      chunksPerSource: 4,
      extractDepth: "basic",
      runId: opts.runId,
      fetchImpl: opts.fetchImpl,
    });
    extractCredits += htmlExtract.creditsUsed;
    errors.push(...htmlExtract.errors);

    const hubCandidate = htmlCandidates.find((c) => c.role === "ir_hub");
    const hubExtracted = htmlExtract.results.some(
      (r) => hubCandidate && r.url === hubCandidate.url && r.content.length > 80,
    );
    if (hubCandidate && !hubExtracted) {
      const retry = await fetchTavilyExtract({
        urls: [hubCandidate.url],
        query: EXTRACT_QUERY,
        chunksPerSource: 4,
        extractDepth: "advanced",
        runId: opts.runId,
        fetchImpl: opts.fetchImpl,
      });
      extractCredits += retry.creditsUsed;
      errors.push(...retry.errors);
      if (retry.results.length > 0) {
        const byUrl = new Map(htmlExtract.results.map((r) => [r.url, r]));
        for (const r of retry.results) byUrl.set(r.url, r);
        htmlExtract = {
          ...htmlExtract,
          results: [...byUrl.values()],
          failedUrls: [...htmlExtract.failedUrls, ...retry.failedUrls],
        };
      }
    }
    for (const r of htmlExtract.results) contentByUrl.set(r.url, r.content);
  }

  if (pdfCandidates.length > 0) {
    const pdfExtract = await fetchTavilyExtract({
      urls: pdfCandidates.map((c) => c.url),
      extractDepth: "advanced",
      maxContentChars: PDF_EXCERPT_MAX,
      runId: opts.runId,
      fetchImpl: opts.fetchImpl,
    });
    extractCredits += pdfExtract.creditsUsed;
    errors.push(...pdfExtract.errors);
    for (const r of pdfExtract.results) contentByUrl.set(r.url, r.content);
  }

  return { contentByUrl, extractCredits, errors };
}

export async function fetchIrSiteDocuments(
  opts: FetchIrSiteDocumentsOptions,
): Promise<FetchIrSiteDocumentsResult> {
  const ticker = opts.ticker.toUpperCase().trim();
  const name = (opts.companyName || ticker).trim();
  const errors: string[] = [];
  let searchCredits = 0;
  let extractCredits = 0;
  let serperQueries = 0;
  let jinaUrls = 0;
  let usedSerper = false;
  let usedJina = false;
  let usedTavilySearch = false;
  let usedTavilyExtract = false;

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
    provider: null,
    serperQueries,
    jinaUrls,
  });

  const forceSerperJina = Boolean(opts.forceSerperJina);
  const wantSerperJina =
    Boolean(opts.preferSerperJina) || forceSerperJina;
  const useSerperJina =
    wantSerperJina && serperKeysPresent() && jinaKeysPresent();
  const hasTavily = tavilyKeysPresent();

  if (forceSerperJina && !useSerperJina) {
    return empty(["missing_serper_jina_keys"]);
  }
  if (!useSerperJina && !hasTavily) {
    return empty(["missing_api_key"]);
  }

  const fetchImpl = opts.fetchImpl ?? fetch;
  const maxDocuments = Math.min(3, Math.max(1, opts.maxDocuments ?? 3));
  const hubQuery = `${name} ${ticker} investor relations`;
  const docQuery = `${name} ${ticker} latest earnings OR quarterly results OR shareholder report OR MD&A`;

  let hubResults: TavilyScreeningResult[] = [];
  let docResults: TavilyScreeningResult[] = [];

  if (useSerperJina) {
    const [hubSearch, docSearch] = await Promise.all([
      fetchSerperSearch({
        query: hubQuery,
        maxResults: 5,
        fetchImpl,
      }),
      fetchSerperSearch({
        query: docQuery,
        maxResults: 8,
        daysBack: 180,
        fetchImpl,
      }),
    ]);
    serperQueries = 2;
    errors.push(...hubSearch.errors, ...docSearch.errors);
    hubResults = hubSearch.results;
    docResults = docSearch.results;
  }

  let { irPageUrl, candidates } = pickIrUrls({
    hubResults,
    docResults,
    companyName: opts.companyName,
    ticker,
    maxDocuments,
    minScore: forceSerperJina ? -999 : 0,
  });
  if (
    forceSerperJina &&
    candidates.length === 0 &&
    (hubResults.length > 0 || docResults.length > 0)
  ) {
    candidates = fallbackSerperCandidates(hubResults, docResults, maxDocuments);
    irPageUrl = candidates.find((c) => c.role === "ir_hub")?.url ?? irPageUrl;
  }
  if (candidates.length > 0 && useSerperJina) {
    usedSerper = true;
  }

  if (candidates.length === 0 && hasTavily && !forceSerperJina) {
    const [hubSearch, docSearch] = await Promise.all([
      fetchTavilySearch({
        query: hubQuery,
        maxResults: 5,
        searchDepth: "basic",
        runId: opts.runId,
        fetchImpl,
      }),
      fetchTavilySearch({
        query: docQuery,
        maxResults: 8,
        daysBack: 180,
        searchDepth: "basic",
        runId: opts.runId,
        fetchImpl,
      }),
    ]);
    searchCredits += 2;
    usedTavilySearch = true;
    usedSerper = false;
    errors.push(...hubSearch.errors, ...docSearch.errors);
    const picked = pickIrUrls({
      hubResults: hubSearch.results,
      docResults: docSearch.results,
      companyName: opts.companyName,
      ticker,
      maxDocuments,
    });
    irPageUrl = picked.irPageUrl;
    candidates = picked.candidates;
  }

  if (candidates.length === 0) {
    return {
      ...empty(["no_ir_candidates"]),
      irPageUrl,
      provider: usedTavilySearch ? "tavily" : null,
    };
  }

  const contentByUrl = new Map<string, string>();

  if (usedSerper && jinaKeysPresent()) {
    const htmlCandidates = candidates.filter((c) => !isPdfUrl(c.url));
    const pdfCandidates = candidates.filter((c) => isPdfUrl(c.url));
    if (htmlCandidates.length > 0) {
      const htmlExtract = await fetchJinaExtract({
        urls: htmlCandidates.map((c) => c.url),
        maxContentChars: HTML_EXCERPT_MAX,
        fetchImpl,
      });
      jinaUrls += htmlCandidates.length;
      usedJina = usedJina || htmlExtract.results.length > 0;
      errors.push(...htmlExtract.errors);
      for (const r of htmlExtract.results) contentByUrl.set(r.url, r.content);
    }
    if (pdfCandidates.length > 0) {
      const pdfExtract = await fetchJinaExtract({
        urls: pdfCandidates.map((c) => c.url),
        maxContentChars: PDF_EXCERPT_MAX,
        pdf: true,
        fetchImpl,
      });
      jinaUrls += pdfCandidates.length;
      usedJina = usedJina || pdfExtract.results.length > 0;
      errors.push(...pdfExtract.errors);
      for (const r of pdfExtract.results) contentByUrl.set(r.url, r.content);
    }
  }

  const missing = candidates.filter((c) => {
    const excerpt = contentByUrl.get(c.url)?.trim() ?? "";
    return excerpt.length < 40;
  });
  if (missing.length > 0 && hasTavily && !forceSerperJina) {
    const tavily = await extractWithTavily({
      candidates: missing,
      runId: opts.runId,
      fetchImpl,
    });
    extractCredits += tavily.extractCredits;
    errors.push(...tavily.errors);
    for (const [url, content] of tavily.contentByUrl) {
      if (content.trim().length >= 40) contentByUrl.set(url, content);
    }
    usedTavilyExtract = tavily.contentByUrl.size > 0 || tavily.extractCredits > 0;
  }

  const documents = documentsFromContent(candidates, contentByUrl);
  const hasUsefulContent = documents.some((d) => d.excerpt.length >= 120);

  let provider: IrSiteDocsProvider | null = null;
  if (usedSerper || usedJina) {
    provider =
      usedTavilySearch || usedTavilyExtract ? "mixed" : "serper_jina";
  } else if (usedTavilySearch || usedTavilyExtract) {
    provider = "tavily";
  }

  return {
    ticker,
    irPageUrl,
    documents,
    hasUsefulContent,
    searchCredits,
    extractCredits,
    errors: errors.filter(Boolean),
    provider,
    serperQueries,
    jinaUrls,
  };
}
