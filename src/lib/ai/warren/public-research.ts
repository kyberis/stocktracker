import { fetchTavilySearch } from "@/lib/screening/data/tavily";
import { fetchIrSiteDocuments } from "@/lib/screening/data/ir-site-docs";
import { fetchFmpIrBundle } from "@/lib/screening/data/fmp-ir";
import {
  resolveWarrenResearchIdentity,
  sanitizeWarrenResearchQuery,
  sanitizeWarrenResearchTicker,
  warrenResearchSearchPrefix,
} from "./research-identity";

export { sanitizeWarrenResearchQuery, sanitizeWarrenResearchTicker };

const MIN_IR_EXCERPT = 80;

export async function warrenSearchPublicWeb(opts: {
  query: string;
  ticker?: string;
}): Promise<{
  results: Array<{ title: string; url: string; snippet: string; source: string; publishedDate: string | null }>;
  errors: string[];
}> {
  const identity = opts.ticker ? resolveWarrenResearchIdentity(opts.ticker) : null;
  const q = sanitizeWarrenResearchQuery(opts.query);
  if (q.length < 3) return { results: [], errors: ["query_too_short"] };

  const query = identity ? `${warrenResearchSearchPrefix(identity)} ${q}` : q;
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
  searchTicker: string;
  companyName: string;
  irPageUrl: string | null;
  documents: Array<{ title: string; url: string; excerpt: string; format: string }>;
  web: Array<{ title: string; url: string; snippet: string; source: string; publishedDate: string | null }>;
  transcript: { year: number; quarter: number; date: string | null; excerpt: string } | null;
  fallback: "none" | "web_earnings";
  errors: string[];
}> {
  const identity = resolveWarrenResearchIdentity(opts.ticker, opts.companyName);
  if (!identity) {
    return {
      ticker: "",
      searchTicker: "",
      companyName: "",
      irPageUrl: null,
      documents: [],
      web: [],
      transcript: null,
      fallback: "none",
      errors: ["invalid_ticker"],
    };
  }

  const ir = await fetchIrSiteDocuments({
    ticker: identity.searchTicker,
    companyName: identity.companyName,
    maxDocuments: 2,
    preferSerperJina: true,
  });

  const documents = ir.documents
    .filter((d) => d.excerpt.trim().length >= MIN_IR_EXCERPT)
    .slice(0, 3)
    .map((d) => ({
      title: d.title.slice(0, 160),
      url: d.url,
      excerpt: d.excerpt.slice(0, 900),
      format: d.format,
    }));

  if (documents.length > 0) {
    return {
      ticker: identity.ticker,
      searchTicker: identity.searchTicker,
      companyName: identity.companyName,
      irPageUrl: ir.irPageUrl,
      documents,
      web: [],
      transcript: null,
      fallback: "none",
      errors: ir.errors.slice(0, 5),
    };
  }

  const [web, bundle] = await Promise.all([
    warrenSearchPublicWeb({
      query: "latest earnings results investor relations",
      ticker: identity.searchTicker,
    }),
    fetchFmpIrBundle({ ticker: identity.searchTicker }),
  ]);

  return {
    ticker: identity.ticker,
    searchTicker: identity.searchTicker,
    companyName: identity.companyName,
    irPageUrl: ir.irPageUrl,
    documents: [],
    web: web.results,
    transcript: bundle.transcript
      ? {
          year: bundle.transcript.year,
          quarter: bundle.transcript.quarter,
          date: bundle.transcript.date,
          excerpt: bundle.transcript.excerpt.slice(0, 1200),
        }
      : null,
    fallback: "web_earnings",
    errors: [...ir.errors, ...web.errors, ...bundle.errors, "ir_empty_used_web_fallback"].slice(0, 8),
  };
}

export async function warrenFetchEarningsContext(opts: {
  ticker: string;
}): Promise<{
  ticker: string;
  searchTicker: string;
  transcript: { year: number; quarter: number; date: string | null; excerpt: string } | null;
  web: Array<{ title: string; url: string; snippet: string }>;
  errors: string[];
}> {
  const identity = resolveWarrenResearchIdentity(opts.ticker);
  if (!identity) {
    return { ticker: "", searchTicker: "", transcript: null, web: [], errors: ["invalid_ticker"] };
  }

  const prefix = warrenResearchSearchPrefix(identity);
  const [bundle, web] = await Promise.all([
    fetchFmpIrBundle({ ticker: identity.searchTicker }),
    fetchTavilySearch({
      query: `${prefix} latest earnings call transcript results`,
      maxResults: 4,
      daysBack: 400,
      searchDepth: "basic",
    }),
  ]);

  return {
    ticker: identity.ticker,
    searchTicker: identity.searchTicker,
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
