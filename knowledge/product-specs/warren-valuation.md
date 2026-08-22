# Warren — valuation via shared fundamentals

> Warren fetches share-level fundamentals (FMP or Yahoo), caches them for all users, and returns a cheap/fair/expensive label for the main LLM to explain.

## 1. Summary

When a user asks whether a stock looks expensive or cheap, or requests fundamentals for a ticker or the whole portfolio, Warren calls the `analyzeValuation` tool. The tool reads/writes `fundamentals_cache` (including a new `overview` type), refreshes stale rows after 7 days, and returns structured metrics plus a quantitative valuation label. Warren's main turn (same `ai_consult` quota) explains the verdict in the user's language — no nested LLM inside the tool.

## 2. Status

- **Tier:** Free / Bifolio / Trefolio (`fundamentals` quota on cache miss; cache hit free for everyone).
- **Feature flag:** `market_data_fmp_fundamentals` (FMP when configured; Yahoo fallback always).
- **Health:** green (new surface, unit-tested).
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Tool | [`src/lib/ai/warren/tools.ts`](../../src/lib/ai/warren/tools.ts) | `analyzeValuation` |
| Service | [`src/lib/services/share-fundamentals.ts`](../../src/lib/services/share-fundamentals.ts) | Cache + fetch |
| Service | [`src/lib/services/warren-valuation.ts`](../../src/lib/services/warren-valuation.ts) | Metrics + label |
| Prompt | [`src/lib/ai/warren/system-prompt.ts`](../../src/lib/ai/warren/system-prompt.ts) | Routes valuation questions |

## 4. Data model

- `fundamentals_cache(symbol, type)` — `type` now includes `overview` plus income/balance/cashflow/earnings.
- Warren reads with **7-day staleness**; `/api/fundamentals` remains permanent on hit (unchanged).

## 5. Business logic

1. User asks valuation question → Warren calls `analyzeValuation`.
2. `ensureShareFundamentals` loads fresh cache or fetches via `resolveFundamentalsProvider`.
3. When the primary backend is FMP and the overview lacks P/E (or forward/PEG), `fetchResolvedOverview` calls `YahooProvider` explicitly — never `resolveFundamentalsProvider(null)`, which can still resolve to FMP when the global FMP flag is on.
4. Valuation-scope cache hits that lack valuation multiples are treated as misses so the Yahoo enrichment path can run.
5. `scoreValuation` applies [`scoreCheap`](../../src/lib/screening/scoring/categories.ts) on P/E multiples.
6. Warren cites `valuationLabel`, `metrics`, `fetchedAt`, and `provider`; adds disclaimer when discussing a specific ticker.

## 6. Related specs

- [fundamentals](fundamentals.md), [stock-evaluation](stock-evaluation.md), [warren-investing-knowledge](warren-investing-knowledge.md)
