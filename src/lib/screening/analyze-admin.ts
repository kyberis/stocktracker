import type { IrSiteDocsProvider } from "@/lib/screening/data/ir-site-docs";
import {
  IR_EXTRACT_QUERY,
  irDiscoveryQueries,
} from "@/lib/screening/data/ir-site-docs";

export interface AnalyzeBriefMeta {
  ticker: string | null;
  companyName: string | null;
  exchange: string | null;
}

export interface AnalyzeIrDocument {
  url: string;
  title: string;
  asOf: string | null;
  role: string;
  format: string;
  excerpt: string;
}

export interface AnalyzeLlmSource {
  url: string;
  label: string;
  asOf: string;
}

export interface AnalyzeSearchHit {
  url: string;
  title: string;
}

export interface AnalyzeIrResources {
  provider: IrSiteDocsProvider | null;
  serperQueries: number;
  jinaUrls: number;
  irSiteDocsUsed: boolean;
  irPageUrl: string | null;
  documents: AnalyzeIrDocument[];
  searchQueries: string[];
  extractQueries: string[];
  extractUrls: string[];
  searchHits: AnalyzeSearchHit[];
  errors: string[];
  llmSources: AnalyzeLlmSource[];
  guidanceSummary: string | null;
  bullets: string[];
}

export const ANALYZE_IR_EXCERPT_MAX = 800;
export const ANALYZE_IR_DOCS_MAX = 4;

const PROVIDERS = new Set<IrSiteDocsProvider>([
  "serper_jina",
  "tavily",
  "mixed",
]);

const EMPTY_RESOURCES: AnalyzeIrResources = {
  provider: null,
  serperQueries: 0,
  jinaUrls: 0,
  irSiteDocsUsed: false,
  irPageUrl: null,
  documents: [],
  searchQueries: [],
  extractQueries: [],
  extractUrls: [],
  searchHits: [],
  errors: [],
  llmSources: [],
  guidanceSummary: null,
  bullets: [],
};

export function parseAnalyzeBriefMeta(briefJson: string): AnalyzeBriefMeta {
  try {
    const brief = JSON.parse(briefJson) as Record<string, unknown>;
    const ticker =
      typeof brief.focusTicker === "string" && brief.focusTicker.trim()
        ? brief.focusTicker.trim().toUpperCase().slice(0, 24)
        : null;
    const companyName =
      typeof brief.focusCompanyName === "string" && brief.focusCompanyName.trim()
        ? brief.focusCompanyName.trim().slice(0, 120)
        : null;
    const exchange =
      typeof brief.focusExchange === "string" && brief.focusExchange.trim()
        ? brief.focusExchange.trim().slice(0, 24)
        : null;
    return { ticker, companyName, exchange };
  } catch {
    return { ticker: null, companyName: null, exchange: null };
  }
}

export function compactIrDocuments(raw: unknown): AnalyzeIrDocument[] {
  if (!Array.isArray(raw)) return [];
  const out: AnalyzeIrDocument[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const url = typeof rec.url === "string" ? rec.url.trim().slice(0, 500) : "";
    if (!url) continue;
    out.push({
      url,
      title: typeof rec.title === "string" ? rec.title.trim().slice(0, 160) : "",
      asOf:
        typeof rec.asOf === "string" && rec.asOf.trim()
          ? rec.asOf.trim().slice(0, 40)
          : null,
      role: typeof rec.role === "string" ? rec.role.slice(0, 24) : "document",
      format: typeof rec.format === "string" ? rec.format.slice(0, 12) : "html",
      excerpt:
        typeof rec.excerpt === "string"
          ? rec.excerpt.trim().slice(0, ANALYZE_IR_EXCERPT_MAX)
          : "",
    });
    if (out.length >= ANALYZE_IR_DOCS_MAX) break;
  }
  return out;
}

function parseStringList(raw: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string" || !item.trim()) continue;
    out.push(item.trim().slice(0, maxLen));
    if (out.length >= maxItems) break;
  }
  return out;
}

function parseSearchHits(raw: unknown): AnalyzeSearchHit[] {
  if (!Array.isArray(raw)) return [];
  const out: AnalyzeSearchHit[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const url = typeof rec.url === "string" ? rec.url.trim().slice(0, 500) : "";
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({
      url,
      title: typeof rec.title === "string" ? rec.title.trim().slice(0, 160) : "",
    });
    if (out.length >= 12) break;
  }
  return out;
}

function parseLlmSources(raw: unknown): AnalyzeLlmSource[] {
  if (!Array.isArray(raw)) return [];
  const out: AnalyzeLlmSource[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const url = typeof rec.url === "string" ? rec.url.trim().slice(0, 500) : "";
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({
      url,
      label: typeof rec.label === "string" ? rec.label.trim().slice(0, 120) : "",
      asOf: typeof rec.asOf === "string" ? rec.asOf.trim().slice(0, 40) : "",
    });
    if (out.length >= 12) break;
  }
  return out;
}

export function parseIrStepCompletedPayload(
  payloadJson: string,
): AnalyzeIrResources {
  try {
    const p = JSON.parse(payloadJson) as Record<string, unknown>;
    const rawProvider = typeof p.provider === "string" ? p.provider : null;
    return {
      provider:
        rawProvider && PROVIDERS.has(rawProvider as IrSiteDocsProvider)
          ? (rawProvider as IrSiteDocsProvider)
          : null,
      serperQueries: Math.max(0, Number(p.serperQueries) || 0),
      jinaUrls: Math.max(0, Number(p.jinaUrls) || 0),
      irSiteDocsUsed: Boolean(p.irSiteDocsUsed),
      irPageUrl:
        typeof p.irPageUrl === "string" && p.irPageUrl.trim()
          ? p.irPageUrl.trim().slice(0, 500)
          : null,
      documents: compactIrDocuments(p.documents),
      searchQueries: parseStringList(p.searchQueries, 6, 200),
      extractQueries: parseStringList(p.extractQueries, 4, 200),
      extractUrls: parseStringList(p.extractUrls, 12, 500),
      searchHits: parseSearchHits(p.searchHits),
      errors: parseStringList(p.errors, 8, 160),
      llmSources: parseLlmSources(p.llmSources),
      guidanceSummary:
        typeof p.guidanceSummary === "string" && p.guidanceSummary.trim()
          ? p.guidanceSummary.trim().slice(0, 500)
          : null,
      bullets: parseStringList(p.bullets, 5, 280),
    };
  } catch {
    return { ...EMPTY_RESOURCES };
  }
}

/** Recover cited URLs / summary from persisted IR agent output (older runs). */
export function parseIrAgentOutputJson(outputJson: string): AnalyzeIrResources {
  const empty = { ...EMPTY_RESOURCES, documents: [], searchQueries: [], errors: [], llmSources: [], bullets: [] };
  try {
    const p = JSON.parse(outputJson) as Record<string, unknown>;
    const sources: unknown[] = [];
    if (p.guidance && typeof p.guidance === "object") {
      const g = p.guidance as Record<string, unknown>;
      if (Array.isArray(g.sources)) sources.push(...g.sources);
    }
    if (Array.isArray(p.catalysts)) {
      for (const c of p.catalysts) {
        if (c && typeof c === "object" && Array.isArray((c as { sources?: unknown }).sources)) {
          sources.push(...((c as { sources: unknown[] }).sources));
        }
      }
    }
    const guidance =
      p.guidance && typeof p.guidance === "object"
        ? (p.guidance as Record<string, unknown>)
        : null;
    return {
      ...empty,
      llmSources: parseLlmSources(sources),
      guidanceSummary:
        typeof guidance?.summary === "string" && guidance.summary.trim()
          ? guidance.summary.trim().slice(0, 500)
          : null,
      bullets: parseStringList(p.bullets, 5, 280),
    };
  } catch {
    return empty;
  }
}

function dedupeDocuments(docs: AnalyzeIrDocument[]): AnalyzeIrDocument[] {
  const byUrl = new Map<string, AnalyzeIrDocument>();
  for (const doc of docs) {
    const prev = byUrl.get(doc.url);
    if (!prev || doc.excerpt.length > prev.excerpt.length) byUrl.set(doc.url, doc);
  }
  return [...byUrl.values()].slice(0, ANALYZE_IR_DOCS_MAX);
}

function dedupeSources(sources: AnalyzeLlmSource[]): AnalyzeLlmSource[] {
  const seen = new Set<string>();
  const out: AnalyzeLlmSource[] = [];
  for (const s of sources) {
    if (seen.has(s.url)) continue;
    seen.add(s.url);
    out.push(s);
    if (out.length >= 12) break;
  }
  return out;
}

export function mergeIrResources(
  parts: AnalyzeIrResources[],
): AnalyzeIrResources {
  if (parts.length === 0) return { ...EMPTY_RESOURCES };
  const providers = new Set(
    parts.map((p) => p.provider).filter((p): p is IrSiteDocsProvider => p != null),
  );
  let provider: IrSiteDocsProvider | null = null;
  if (providers.size === 1) provider = [...providers][0] ?? null;
  else if (providers.size > 1) provider = "mixed";
  const irPageUrl = parts.map((p) => p.irPageUrl).find((u) => u) ?? null;
  const guidanceSummary =
    parts.map((p) => p.guidanceSummary).find((s) => s) ?? null;
  return {
    provider,
    serperQueries: parts.reduce((s, p) => s + p.serperQueries, 0),
    jinaUrls: parts.reduce((s, p) => s + p.jinaUrls, 0),
    irSiteDocsUsed: parts.some((p) => p.irSiteDocsUsed),
    irPageUrl,
    documents: dedupeDocuments(parts.flatMap((p) => p.documents)),
    searchQueries: [...new Set(parts.flatMap((p) => p.searchQueries))].slice(0, 6),
    extractQueries: [...new Set(parts.flatMap((p) => p.extractQueries))].slice(0, 4),
    extractUrls: [...new Set(parts.flatMap((p) => p.extractUrls))].slice(0, 12),
    searchHits: parseSearchHits(parts.flatMap((p) => p.searchHits)),
    errors: [...new Set(parts.flatMap((p) => p.errors))].slice(0, 8),
    llmSources: dedupeSources(parts.flatMap((p) => p.llmSources)),
    guidanceSummary,
    bullets: [...new Set(parts.flatMap((p) => p.bullets))].slice(0, 5),
  };
}

/** Web agent output: cited URLs (older runs without extract payload). */
export function parseWebAgentOutputJson(outputJson: string): AnalyzeIrResources {
  const empty = { ...EMPTY_RESOURCES };
  try {
    const p = JSON.parse(outputJson) as Record<string, unknown>;
    const sources: unknown[] = [];
    if (Array.isArray(p.signals)) {
      for (const s of p.signals) {
        if (s && typeof s === "object" && Array.isArray((s as { sources?: unknown }).sources)) {
          sources.push(...((s as { sources: unknown[] }).sources));
        }
      }
    }
    if (p.insiderSummary && typeof p.insiderSummary === "object") {
      const ins = p.insiderSummary as { sources?: unknown };
      if (Array.isArray(ins.sources)) sources.push(...ins.sources);
    }
    return {
      ...empty,
      llmSources: parseLlmSources(sources),
      searchHits: parseSearchHits(
        parseLlmSources(sources).map((s) => ({ url: s.url, title: s.label })),
      ),
    };
  } catch {
    return empty;
  }
}

/**
 * Older Analyze runs only stored credit counts. Reconstruct the IR/Web search
 * and extract queries from the ticker so admin always sees search / extract / docs.
 */
export function fillAnalyzeResourceGaps(
  resources: AnalyzeIrResources,
  meta: AnalyzeBriefMeta,
  usage: { tavilySearchCredits?: number; tavilyExtractCredits?: number } = {},
): AnalyzeIrResources {
  const ticker = meta.ticker;
  const name = meta.companyName || ticker || "";
  let searchQueries = [...resources.searchQueries];
  let extractQueries = [...resources.extractQueries];
  let extractUrls = [...resources.extractUrls];
  let documents = [...resources.documents];
  let searchHits = [...resources.searchHits];

  if (searchQueries.length === 0 && ticker) {
    searchQueries = [
      ...irDiscoveryQueries(name, ticker),
      `${name} (${ticker}) news`,
      `${ticker} analyst rating`,
    ];
  }

  const usedExtract =
    (usage.tavilyExtractCredits ?? 0) > 0 ||
    resources.jinaUrls > 0 ||
    resources.irSiteDocsUsed ||
    documents.length > 0;
  if (extractQueries.length === 0 && usedExtract) {
    extractQueries = [IR_EXTRACT_QUERY];
  }

  if (extractUrls.length === 0) {
    extractUrls = [
      ...new Set([
        ...documents.map((d) => d.url),
        ...resources.llmSources.map((s) => s.url),
        ...searchHits.map((h) => h.url),
      ]),
    ].slice(0, 12);
  }

  if (searchHits.length === 0 && extractUrls.length > 0) {
    searchHits = extractUrls.map((url) => ({ url, title: "" }));
  }

  if (documents.length === 0 && resources.llmSources.length > 0) {
    documents = compactIrDocuments(
      resources.llmSources.map((s) => ({
        url: s.url,
        title: s.label || s.url,
        asOf: s.asOf || null,
        role: "cited",
        format: "html",
        excerpt: "",
      })),
    );
  }

  return {
    ...resources,
    searchQueries,
    extractQueries,
    extractUrls,
    searchHits,
    documents,
  };
}
