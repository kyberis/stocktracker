/**
 * Public API for Warren's investing-concepts knowledge base.
 *
 * The corpus is small and curated by hand (see `corpus.ts`); search is a
 * lightweight BM25-flavored scorer over titles/tags/body. We do NOT do
 * vector search — for a 30-50 entry corpus, lexical scoring is faster,
 * cheaper, and more deterministic.
 */

import { INVESTING_KNOWLEDGE, type KnowledgeEntry } from "./corpus";
import { searchCorpus, type KnowledgeHit } from "./search";

export type { KnowledgeEntry, KnowledgeHit };

/**
 * Return up to `k` knowledge entries that best match the user's query.
 *
 * @param query  natural-language query (any language; tokens normalized).
 * @param k      maximum results (default 3, max 5).
 * @param lang   ISO 639-1 hint — when "es" we prefer Spanish title/summary
 *               if the entry has them.
 */
export function searchKnowledge(
  query: string,
  k = 3,
  lang?: string,
): KnowledgeHit[] {
  const cap = Math.max(1, Math.min(5, Math.floor(k)));
  return searchCorpus(INVESTING_KNOWLEDGE, query, cap, lang);
}

/** Total number of entries — handy for spec docs and tests. */
export function knowledgeCorpusSize(): number {
  return INVESTING_KNOWLEDGE.length;
}
