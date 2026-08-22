# Warren — valuation via shared fundamentals

> Warren fetches share-level fundamentals (FMP or Yahoo), caches them for all users, and returns a cheap/fair/expensive label for the main LLM to explain.

## 1. Summary

When a user asks whether a stock looks expensive or cheap, or requests fundamentals for a ticker or the whole portfolio, Warren calls the `analyzeValuation` tool. The tool reads/writes `fundamentals_cache` (including a new `overview` type), refreshes stale rows after 7 days, and returns structured metrics plus a quantitative valuation label. After fundamentals load, the tool also fetches live quotes and attaches `currentPrice`, `upsideToTargetPct` (analyst target vs last price), and `hasLimitedUpside` (upside below 5%). Warren's main turn (same `ai_consult` quota) explains the verdict in the user's language — no nested LLM inside the tool.

On follow-ups that accept a prior offer ("sí", "yes") or ask to rank / sell / pick the name with least upside, prefetch injects a conversation-progress override so Warren does **not** re-call `analyzeValuation` or re-group expensive/fair/cheap. It ranks by `upsideToTargetPct` and adds a new decision lens. Analysis only — never an instruction to buy or sell a specific ticker.

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
| Prompt | [`src/lib/ai/warren/system-prompt.ts`](../../src/lib/ai/warren/system-prompt.ts) | Routes valuation questions; conversation progression |
| Prefetch | [`src/lib/ai/warren/conversation-progress-intent.ts`](../../src/lib/ai/warren/conversation-progress-intent.ts) | Follow-up / "yes" accepted-offer override |

## 4. Data model

- `fundamentals_cache(symbol, type)` — `type` now includes `overview` plus income/balance/cashflow/earnings.
- Warren reads with **7-day staleness**; `/api/fundamentals` remains permanent on hit (unchanged).

## 5. Business logic

1. User asks valuation question → Warren calls `analyzeValuation`.
2. `ensureShareFundamentals` loads fresh cache or fetches via `resolveFundamentalsProvider`.
3. Overview multiples are sanitized (drop absurd forward P/E vs trailing, especially LSE GBp). `scoreValuation` applies [`scoreCheap`](../../src/lib/screening/scoring/categories.ts): forward vs FMP multi-year annual average when available; trailing-only or absolute bands when history is missing.
4. Tool attaches quote upside: `currentPrice`, `upsideToTargetPct = (target − price) / price`, `hasLimitedUpside` when upside is below 5%. This is independent of `valuationLabel`.
5. Warren cites `valuationLabel`, `metrics` (including `peRatio`, `forwardPE`, `histPeAvg`), `currentPrice`, `upsideToTargetPct`, `fetchedAt`, and `provider`; explains when multiples and analyst upside diverge; adds disclaimer when discussing a specific ticker.
6. Follow-up turns that accept a prior offer reuse thread numbers and rank instead of re-fetching fundamentals.

## 6. Related specs

- [fundamentals](fundamentals.md), [stock-evaluation](stock-evaluation.md), [warren-investing-knowledge](warren-investing-knowledge.md)
