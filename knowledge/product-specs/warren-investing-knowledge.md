# Warren — Investing knowledge base

> Curated value-investing reference library that Warren can search when the user asks educational questions ("what is margin of safety?", "explain drawdown", "p/e vs peg?").

## 1. Summary

Warren is a portfolio assistant first, but users routinely ask conceptual
questions that have nothing to do with their own holdings. The investing
knowledge base is a small in-repo corpus of ~35 short entries covering
philosophy, metrics, asset types, risks, behavioural pitfalls, and
frameworks. It's exposed to Warren as a tool (`searchInvestingKnowledge`).
The agent is instructed to call it for educational questions, paraphrase
1-2 ideas in its own voice, and never quote authors by name.

## 2. Status

- **Tier:** Free / Bifolio / Trefolio (uses the existing `ai_consult` quota — same as any Warren turn).
- **Feature flag:** _none_ (always on whenever Warren is reachable).
- **Health:** green (small surface, deterministic search, fully tested).
- **Owning skill:** [`.cursor/skills/engineer-integrations/SKILL.md`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Server module | [`src/lib/ai/warren/knowledge/index.ts`](../../src/lib/ai/warren/knowledge/index.ts) | Public API: `searchKnowledge(query, k, lang)`. |
| Server module | [`src/lib/ai/warren/knowledge/search.ts`](../../src/lib/ai/warren/knowledge/search.ts) | BM25-flavored scorer + tokenizer. |
| Data | [`src/lib/ai/warren/knowledge/corpus.ts`](../../src/lib/ai/warren/knowledge/corpus.ts) | Inlined `KnowledgeEntry[]` (no markdown loader, no I/O). |
| Tool | [`src/lib/ai/warren/tools.ts`](../../src/lib/ai/warren/tools.ts) | `searchInvestingKnowledge` registered in `buildWarrenTools`. |
| Prompt | [`src/lib/ai/warren/system-prompt.ts`](../../src/lib/ai/warren/system-prompt.ts) | Tells the model when to call the tool. |

## 4. Data model

The corpus is plain TypeScript — no DB tables, no migrations. `KnowledgeEntry`:

```ts
{
  slug: "margin-of-safety",
  title: "Margin of safety",
  titleEs?: "Margen de seguridad",
  summary: "Buy meaningfully below your estimate of intrinsic value …",
  summaryEs?: "Compra bastante por debajo de tu estimación …",
  tags: ["philosophy", "valuation", "graham"],
  body: `~150–300 words of plain language reference text`,
}
```

Categories and counts (see `corpus.ts`):

- Philosophy: 5
- Metrics: 11 (P/E, P/B, PEG, FCF, ROIC, ROE, D/E, dividend yield, payout ratio, TTWROR, XIRR, beta)
- Assets: 6 (stocks, ETFs, bonds, REITs, crypto basics, dividends)
- Risk: 6 (diversification, volatility, drawdown, correlation, currency risk, sequence risk)
- Pitfalls: 5 (FOMO, anchoring, recency bias, market timing, overtrading)
- Frameworks: 5 (business checklist, defensive screening, DCA, asset allocation, rebalancing)

## 5. API surface

No HTTP route. The tool surface is an AI-SDK `tool({ … })`:

| Tool | Args | Returns |
|------|------|---------|
| `searchInvestingKnowledge` | `query: string (2-120)`, `k?: number (1-5, default 3)` | `{ hits: KnowledgeHit[] }` or `{ hits: [], note: "…" }` |

`KnowledgeHit` returns `slug`, `title`, `summary`, `excerpt` (first paragraph,
trimmed to 500 chars), `tags`. ES-localized title/summary when the user's
language is `es` and the entry has Spanish copy.

## 6. UI surface

There is no dedicated UI. Hits flow back through the existing Warren
streaming surfaces (in-app drawer or Telegram bot). The agent paraphrases
the result in plain prose and is instructed not to expose slugs or
implementation details.

## 7. Business logic

Search algorithm (`search.ts`):

1. **Tokenize**: lowercase, strip diacritics, collapse 2-letter acronyms
   like `P/E → pe`, drop stopwords (EN + light ES) and 1-char tokens.
2. **Index** (built lazily, cached in module memory): per-document term
   frequency, total length, title token set, tag token set.
3. **Score**: BM25-flavored body score (k1=1.5, b=0.75) + +4 boost when a
   query token is in the title, +2 when in tags. Returns the top `k` hits
   with positive score.

The corpus is small (~35 entries × ~300 words ≈ 10k body tokens), so the
full O(N×Q) scan completes in under a millisecond after the first call.

## 8. External dependencies

None. The corpus is bundled into the Next.js build; no markdown loader,
no filesystem reads at runtime, no third-party calls.

## 9. Currency / FX / tax implications

None — the corpus is conceptual. Where entries reference numbers
(e.g. "15%+ ROIC" or "5% drawdown rule"), they're framed as rules of
thumb, not personalized advice.

## 10. i18n

- Title and summary fields ship `titleEs` / `summaryEs` for most entries;
  the body stays in English. When the user's language is `es`, the tool
  prefers ES title/summary; the agent paraphrases the body in the user's
  language anyway.
- Stopword list covers EN + light ES so queries in either language
  tokenize sensibly. Other languages fall back to EN.

## 11. Permissions / tier gating / rate limits

- Same `ai_consult` quota as any Warren turn — calling the tool does NOT
  consume an extra quota slot; it's part of the existing turn.
- No admin gating. The corpus is reviewed manually before merge.

## 12. Telemetry

- The tool emits a `tool_step` frame ("Looking up …") that surfaces in the
  in-app Warren drawer. The same step text is captured by AI logs as
  part of the run-turn record.
- No new metric labels. The parent `warren` flow's metrics already cover
  the AI call.

## 13. Edge cases & gotchas

- The agent is told NOT to attribute quotes to specific authors (Buffett,
  Munger, Graham). The body text was written for that constraint.
- Compact-acronym normalization (`P/E → pe`) means a query like "p/e ratio"
  matches the `pe-ratio` entry; preserve this behavior in any future
  tokenizer change (covered by `search.test.ts`).
- The corpus is intentionally small. Don't grow it past ~80 entries
  without reconsidering the search algorithm and the in-prompt instruction
  ("Quote at most 1-2 short ideas …").
- New entries must include `slug`, `title`, `summary`, `tags`, `body`.
  Spanish translations are optional but encouraged.

## 14. Tests

- Unit: [`src/lib/ai/warren/knowledge/search.test.ts`](../../src/lib/ai/warren/knowledge/search.test.ts)
  — tokenizer, slug-mapping for several canonical queries, ES preference,
  k-cap, empty-query handling, corpus-size sanity check.

## 15. Related skills and rules

- Skill: [`.cursor/skills/engineer-integrations/SKILL.md`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Skill: [`.cursor/skills/financial-calculations/SKILL.md`](../../.cursor/skills/financial-calculations/SKILL.md)
  — when adding metric entries, keep the math claims consistent with this
  skill's source of truth.
- Related specs: [`warren-telegram-bot`](warren-telegram-bot.md), [`ai-stream`](ai-stream.md), [`ai-models-registry`](ai-models-registry.md).

## 16. Open questions / planned work

- Body translation to ES (and other priority languages). Today the agent
  paraphrases the EN body in the user's language at runtime.
- Per-tag filtering on `searchInvestingKnowledge` for cross-tool
  flows ("show me only risk concepts").
- Optional embeddings layer if the corpus grows past ~80 entries or we
  start asking semantic questions where lexical scoring fails.
