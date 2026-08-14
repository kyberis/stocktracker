import type { IrSiteDocument } from "@/lib/screening/data/ir-site-docs";
import type { TavilyScreeningResult } from "@/lib/screening/data/tavily";
import { sourceRefSchema, type SourceRef } from "@/lib/screening/schemas";

/** Vendor / internal hosts that must never appear on the user-facing report. */
const PRIVATE_HOST_SNIPPETS = [
  "tavily.com",
  "serper.dev",
  "jina.ai",
  "financialmodelingprep.com",
  "fmpcloud.io",
  "openai.com",
  "openai.azure.com",
];

const MAX_EXCERPT = 400;
const MAX_LABEL = 120;
const MAX_PERSISTED_REFS = 16;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function asOfOrToday(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed || trimmed.toLowerCase() === "undated") return todayIsoDate();
  return trimmed.slice(0, 40);
}

export function clipExcerpt(
  value: string | null | undefined,
  max = MAX_EXCERPT,
): string | undefined {
  const trimmed = (value ?? "").replace(/\s+/g, " ").trim();
  if (!trimmed) return undefined;
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

/** Jina Reader wraps the original URL in the path; unwrap so the user sees the source. */
export function unwrapReaderUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (!host.endsWith("jina.ai")) return url;
    const rest = `${parsed.pathname}${parsed.search}`.replace(/^\//, "");
    if (rest.startsWith("http://") || rest.startsWith("https://")) {
      return decodeURIComponent(rest);
    }
  } catch {
    // keep original
  }
  return url;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function isPublicReferenceUrl(url: string): boolean {
  const unwrapped = unwrapReaderUrl(url.trim());
  let parsed: URL;
  try {
    parsed = new URL(unwrapped);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".local")) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  if (host.startsWith("api.")) return false;
  return !PRIVATE_HOST_SNIPPETS.some(
    (snippet) => host === snippet || host.endsWith(`.${snippet}`),
  );
}

export function normalizeReferenceUrl(url: string): string {
  const unwrapped = unwrapReaderUrl(url.trim());
  try {
    const parsed = new URL(unwrapped);
    parsed.hash = "";
    let href = parsed.href;
    if (href.endsWith("/")) href = href.slice(0, -1);
    return href;
  } catch {
    return unwrapped;
  }
}

export function toPublicSourceRef(input: {
  url: string;
  asOf?: string | null;
  field: string;
  label?: string | null;
  excerpt?: string | null;
}): SourceRef | null {
  const url = unwrapReaderUrl(input.url.trim());
  if (!isPublicReferenceUrl(url)) return null;
  const label = clipExcerpt(input.label, MAX_LABEL);
  const excerpt = clipExcerpt(input.excerpt);
  const parsed = sourceRefSchema.safeParse({
    url,
    asOf: asOfOrToday(input.asOf),
    field: (input.field.trim() || "source").slice(0, 40),
    ...(label ? { label } : {}),
    ...(excerpt ? { excerpt } : {}),
  });
  return parsed.success ? parsed.data : null;
}

export function mergePublicSourceRefs(
  items: Array<SourceRef | null | undefined>,
  max = 20,
): SourceRef[] {
  const seen = new Set<string>();
  const out: SourceRef[] = [];
  for (const item of items) {
    if (!item) continue;
    const ref = toPublicSourceRef(item);
    if (!ref) continue;
    const key = normalizeReferenceUrl(ref.url).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ref);
    if (out.length >= max) break;
  }
  return out;
}

export function buildIrPublicReferences(input: {
  irPageUrl?: string | null;
  documents?: Array<
    Pick<IrSiteDocument, "url" | "title" | "asOf" | "excerpt" | "role">
  >;
  searchHits?: Array<{ url: string; title?: string }>;
}): SourceRef[] {
  const refs: Array<SourceRef | null> = [];
  if (input.irPageUrl) {
    refs.push(
      toPublicSourceRef({
        url: input.irPageUrl,
        field: "ir_page",
        asOf: todayIsoDate(),
      }),
    );
  }
  for (const doc of input.documents ?? []) {
    refs.push(
      toPublicSourceRef({
        url: doc.url,
        asOf: doc.asOf,
        field: doc.role === "ir_hub" ? "ir_page" : "document",
        label: doc.title,
        excerpt: doc.excerpt,
      }),
    );
  }
  for (const hit of input.searchHits ?? []) {
    refs.push(
      toPublicSourceRef({
        url: hit.url,
        field: "source",
        label: hit.title,
      }),
    );
  }
  return mergePublicSourceRefs(refs, MAX_PERSISTED_REFS);
}

export function buildWebPublicReferences(input: {
  news?: TavilyScreeningResult[];
  analyst?: TavilyScreeningResult[];
}): SourceRef[] {
  const refs: Array<SourceRef | null> = [];
  for (const row of [...(input.news ?? []), ...(input.analyst ?? [])]) {
    refs.push(
      toPublicSourceRef({
        url: row.url,
        asOf: row.publishedDate,
        field: "news",
        label: row.title,
        excerpt: row.content,
      }),
    );
  }
  return mergePublicSourceRefs(refs, MAX_PERSISTED_REFS);
}

/** Fallback link text when a reference has no title — never the internal field name. */
export function hostnameLabel(url: string): string {
  return hostnameOf(url) || url;
}
