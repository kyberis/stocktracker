/**
 * Lightweight lexical search over Warren's curated investing-concepts
 * corpus. Implements a small BM25-flavored scorer:
 *   - tokenize on word boundaries (Unicode-aware, lowercased)
 *   - drop stopwords (EN + ES) and very short tokens
 *   - score = sum_t (tf(t,d) / (tf(t,d) + k1)) * idf(t) plus tag/title boosts
 *
 * The corpus is small (~35 entries), so a full O(N*Q) scan is fine. We
 * pre-build the index once at module load and cache it.
 */

import type { KnowledgeEntry } from "./corpus";

export interface KnowledgeHit {
  slug: string;
  title: string;
  summary: string;
  excerpt: string;
  tags: string[];
  score: number;
}

const STOPWORDS = new Set<string>([
  // EN
  "a", "an", "the", "and", "or", "but", "if", "of", "on", "in", "at", "by",
  "to", "for", "with", "is", "are", "was", "were", "be", "been", "being",
  "do", "does", "did", "doing", "have", "has", "had", "having", "i", "you",
  "he", "she", "it", "we", "they", "this", "that", "these", "those", "as",
  "from", "into", "out", "up", "down", "so", "than", "then", "what", "which",
  "who", "how", "why", "when", "where", "about", "can", "could", "would",
  "should", "will", "may", "might", "must", "shall", "not", "no", "yes",
  "my", "your", "his", "her", "its", "our", "their", "me", "him", "us",
  "them", "all", "any", "some", "more", "most", "less", "few", "many",
  // ES (light)
  "el", "la", "los", "las", "un", "una", "unos", "unas", "y", "o", "pero",
  "si", "de", "del", "al", "en", "con", "por", "para", "es", "son", "era",
  "soy", "ser", "estar", "está", "fue", "que", "qué", "cómo", "cuándo",
  "dónde", "quién", "cuál", "cuáles", "como", "ese", "esa", "eso", "este",
  "esta", "esto", "mi", "tu", "su", "sus", "nos", "les", "le", "lo", "se",
  "más", "menos", "muy", "poco", "todo", "nada", "alguno", "ninguno",
]);

const WORD_RE = /[\p{L}\p{N}]+/gu;
/**
 * Acronyms written with separators (P/E, P.E, P-E, P&E, D/E) collapse into
 * a single compound token so 2-letter financial acronyms survive the
 * min-length filter below.
 */
const COMPACT_ACRONYM_RE = /\b([A-Za-z])\s*[\/.\-&]\s*([A-Za-z])\b/g;

/**
 * Tokenize and normalize: lowercase, strip diacritics, collapse short
 * acronyms (P/E → pe), drop stopwords + single-char tokens. Keeps numbers
 * (so "P/E", "52w", "401k" all stay searchable).
 */
export function tokenize(input: string): string[] {
  if (!input) return [];
  const lowered = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(COMPACT_ACRONYM_RE, "$1$2");
  const out: string[] = [];
  for (const match of lowered.matchAll(WORD_RE)) {
    const tok = match[0];
    if (tok.length < 2) continue;
    if (STOPWORDS.has(tok)) continue;
    out.push(tok);
  }
  return out;
}

interface IndexedEntry {
  entry: KnowledgeEntry;
  /** Token frequency in the body. */
  termFreq: Map<string, number>;
  /** Total tokens in the body (used for length normalization). */
  length: number;
  /** Token set for the title (EN + ES) — boosts title matches. */
  titleTokens: Set<string>;
  /** Token set built from tags — boosts tag matches. */
  tagTokens: Set<string>;
}

interface KnowledgeIndex {
  entries: IndexedEntry[];
  /** Document frequency by token (over body tokens). */
  docFreq: Map<string, number>;
  avgDocLength: number;
}

let CACHED_INDEX: KnowledgeIndex | null = null;

export function buildIndex(corpus: KnowledgeEntry[]): KnowledgeIndex {
  const entries: IndexedEntry[] = [];
  const docFreq = new Map<string, number>();
  let totalLength = 0;

  for (const entry of corpus) {
    const bodyTokens = tokenize(`${entry.summary} ${entry.summaryEs ?? ""} ${entry.body}`);
    const termFreq = new Map<string, number>();
    for (const tok of bodyTokens) {
      termFreq.set(tok, (termFreq.get(tok) ?? 0) + 1);
    }
    for (const tok of new Set(bodyTokens)) {
      docFreq.set(tok, (docFreq.get(tok) ?? 0) + 1);
    }
    totalLength += bodyTokens.length;

    const titleTokens = new Set([
      ...tokenize(entry.title),
      ...tokenize(entry.titleEs ?? ""),
    ]);
    const tagTokens = new Set(tokenize(entry.tags.join(" ")));

    entries.push({
      entry,
      termFreq,
      length: bodyTokens.length,
      titleTokens,
      tagTokens,
    });
  }

  return {
    entries,
    docFreq,
    avgDocLength: entries.length > 0 ? totalLength / entries.length : 0,
  };
}

function getCachedIndex(corpus: KnowledgeEntry[]): KnowledgeIndex {
  if (!CACHED_INDEX) CACHED_INDEX = buildIndex(corpus);
  return CACHED_INDEX;
}

/** Test-only escape hatch so the index can be rebuilt with a new corpus. */
export function _resetKnowledgeIndexForTests(): void {
  CACHED_INDEX = null;
}

const K1 = 1.5;
const B = 0.75;
const TITLE_BOOST = 4;
const TAG_BOOST = 2;

/** Trim the body to a single paragraph excerpt. */
function buildExcerpt(body: string): string {
  const trimmed = body.trim();
  const paragraph = trimmed.split(/\n\s*\n/, 1)[0] ?? trimmed;
  return paragraph.length > 500 ? `${paragraph.slice(0, 497)}…` : paragraph;
}

export function searchCorpus(
  corpus: KnowledgeEntry[],
  query: string,
  k = 3,
  lang?: string,
): KnowledgeHit[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const index = getCachedIndex(corpus);
  if (index.entries.length === 0) return [];

  const N = index.entries.length;
  const langHead = (lang || "").slice(0, 2).toLowerCase();
  const preferEs = langHead === "es";

  const scored = index.entries.map((doc) => {
    let score = 0;
    for (const tok of tokens) {
      const tf = doc.termFreq.get(tok) ?? 0;
      const df = index.docFreq.get(tok) ?? 0;
      // BM25 idf — adds +1 to keep it positive for very common tokens.
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      const lengthNorm = doc.length === 0
        ? 1
        : 1 - B + B * (doc.length / Math.max(index.avgDocLength, 1));
      const bodyScore = idf * ((tf * (K1 + 1)) / (tf + K1 * lengthNorm));
      score += bodyScore;
      if (doc.titleTokens.has(tok)) score += TITLE_BOOST;
      if (doc.tagTokens.has(tok)) score += TAG_BOOST;
    }
    return { doc, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored
    .filter((s) => s.score > 0)
    .slice(0, k)
    .map(({ doc, score }) => {
      const e = doc.entry;
      const useEs = preferEs && (e.titleEs || e.summaryEs);
      return {
        slug: e.slug,
        title: useEs && e.titleEs ? e.titleEs : e.title,
        summary: useEs && e.summaryEs ? e.summaryEs : e.summary,
        excerpt: buildExcerpt(e.body),
        tags: e.tags,
        score,
      };
    });
}
