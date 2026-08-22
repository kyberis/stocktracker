import { fetchTavilySearch } from "@/lib/screening/data/tavily";
import { fetchIrSiteDocuments } from "@/lib/screening/data/ir-site-docs";
import { fetchFmpIrBundle } from "@/lib/screening/data/fmp-ir";

const TICKER_RE = /^[A-Za-z0-9.-]{1,20}$/;

export function sanitizeWarrenResearchTicker(raw: string): string | null {
  const t = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!TICKER_RE.test(t)) return null;
  return t;
}

export function sanitizeWarrenResearchQuery(raw: string): string {
  return raw
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

export async function warrenSearchPublicWeb(opts: {
  query: string;
  ticker?: string;
}): Promise<{
  results: Array<{ title: string; url: string; snippet: string; source: string; publishedDate: string | null }>;
  errors: string[];
}> {
  const ticker = opts.ticker ? sanitizeWarrenResearchTicker(opts.ticker) : null;
  const q = sanitizeWarrenResearchQuery(opts.query);
  if (q.length < 3) return { results: [], errors: ["query_too_short"] };

  const query = ticker ? `${ticker} ${q}` : q;
  const { results, errors } = await fetchTavilySearch({
    query,
    maxResults: 5,
    daysBack: 365,
    searchDepth: "basic",
  });
  return {
    results: results.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content.slice(0, 500),
      source: r.source,
      publishedDate: r.publishedDate,
    })),
    errors,
  };
}

export async function warrenFetchInvestorRelations(opts: {
  ticker: string;
  companyName?: string;
}): Promise<{
  ticker: string;
  irPageUrl: string | null;
  documents: Array<{ title: string; url: string; excerpt: string; format: string }>;
  errors: string[];
}> {
  const ticker = sanitizeWarrenResearchTicker(opts.ticker);
  if (!ticker) return { ticker: "", irPageUrl: null, documents: [], errors: ["invalid_ticker"] };

  const name = sanitizeWarrenResearchQuery(opts.companyName || ticker).slice(0, 80);
  const ir = await fetchIrSiteDocuments({
    ticker,
    companyName: name,
    maxDocuments: 2,
    preferSerperJina: true,
  });
  return {
    ticker,
    irPageUrl: ir.irPageUrl,
    documents: ir.documents.slice(0, 3).map((d) => ({
      title: d.title.slice(0, 160),
      url: d.url,
      excerpt: d.excerpt.slice(0, 900),
      format: d.format,
    })),
    errors: ir.errors.slice(0, 5),
  };
}

export async function warrenFetchEarningsContext(opts: {
  ticker: string;
}): Promise<{
  ticker: string;
  transcript: { year: number; quarter: number; date: string | null; excerpt: string } | null;
  web: Array<{ title: string; url: string; snippet: string }>;
  errors: string[];
}> {
  const ticker = sanitizeWarrenResearchTicker(opts.ticker);
  if (!ticker) {
    return { ticker: "", transcript: null, web: [], errors: ["invalid_ticker"] };
  }

  const [bundle, web] = await Promise.all([
    fetchFmpIrBundle({ ticker }),
    fetchTavilySearch({
      query: `${ticker} latest earnings call transcript results`,
      maxResults: 4,
      daysBack: 400,
      searchDepth: "basic",
    }),
  ]);

  return {
    ticker,
    transcript: bundle.transcript
      ? {
          year: bundle.transcript.year,
          quarter: bundle.transcript.quarter,
          date: bundle.transcript.date,
          excerpt: bundle.transcript.excerpt.slice(0, 1200),
        }
      : null,
    web: web.results.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content.slice(0, 400),
    })),
    errors: [...bundle.errors, ...web.errors].slice(0, 6),
  };
}
