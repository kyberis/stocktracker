# holdings-crud

> Add, edit, tag, classify, and remove holdings.

## 1. Summary

A "holding" is a position in a single ticker at a given exchange. Holdings are derived from transactions for users who import/sync, but can also be added manually. UI surfaces edit (shares, cost basis, tags) and removal; classifications (asset type including **fund**, country, sector) are autofilled where possible.

## 2. Status

- **Tier:** Free (50 cap on Bifolio, unlimited on Trefolio)
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/holdings/route.ts`](../../src/app/api/holdings/route.ts) | CRUD list + mutations. |
| API | [`src/app/api/holdings/autofill-classification/`](../../src/app/api/holdings/autofill-classification) | Auto-set asset type/country via Yahoo / heuristics. |
| API | [`src/app/api/holdings/ai-classify/`](../../src/app/api/holdings/ai-classify) | Per-holding LLM Auto-fix (sector / region / asset class). |
| Modal | [`src/components/AddStockModal.tsx`](../../src/components/AddStockModal.tsx) | Add holding. |
| Modal | [`src/components/AddManualAssetModal.tsx`](../../src/components/AddManualAssetModal.tsx) | Manual (non-listed) asset. |
| Modal | [`src/components/AssetTypeReviewModal.tsx`](../../src/components/AssetTypeReviewModal.tsx) | Resolve ambiguous classification. |
| Component | [`src/components/HoldingTagsField.tsx`](../../src/components/HoldingTagsField.tsx) | Tag editor. |
| DB | [`src/lib/db/holdings.ts`](../../src/lib/db/holdings.ts) | Access. |

## 4. Data model

- `holdings`: `id`, `user_id`, `portfolio_id`, `ticker`, `exchange`, `shares`, `avg_cost_eur`, `native_currency`, `name`, `asset_type`, `country`, `sector`, `tags`, `account_id`, timestamps.
- `transactions` is the ledger; `derive-holdings` reconstructs `holdings` for imported users.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/holdings` | user | Free | List for current portfolio. |
| POST | `/api/holdings` | user | Free | Add manual holding. |
| PATCH | `/api/holdings` | user | Free | Update shares/tags/cost basis. |
| DELETE | `/api/holdings?id=` | user | Free | Remove. |
| POST | `/api/holdings/autofill-classification` | user | Free | Classify via ISIN/Yahoo lookup. |
| POST | `/api/holdings/ai-classify` | user | Free (uses `ai_consult` quota) | LLM Auto-fix for one holding. |
| POST | `/api/holdings/normalize-classifications` | user | Free | Rewrite aliases to canonical sector/region/asset class labels. |

## 6. UI surface

- Dashboard table lists holdings with current value, P/L, change.
- Right-click / tap-actions for edit/remove.
- `HoldingHealthBadge` signals data quality.
- Exchange field on Add Stock/Fund and edit uses [`ExchangeSuggestInput`](../../src/components/ExchangeSuggestInput.tsx) with curated codes from [`known-exchanges.ts`](../../src/lib/known-exchanges.ts) (plus any exchanges already on the portfolio). Custom codes remain allowed.

## 7. Business logic

- Cost basis stored in EUR via exchange-rates at the time of the transaction.
- `avg_cost_eur` recomputed on transaction changes via [`derive-holdings.ts`](../../src/lib/derive-holdings.ts).
- Tags are free-form, used by screener and filters.

## 8. External dependencies

- Yahoo / OpenFIGI / ISIN resolver for autofill.
- AI Gateway (OpenAI) for per-holding Auto-fix on Tools → Classification.

## 9. Currency / FX / tax implications

- Native currency preserved for display.
- Cost basis EUR is the source of truth for gain/loss.
- GBX (London pence) handled in `src/lib/exchange-rates.ts`.

## 10. i18n

All locales.

## 11. Permissions / tier gating / rate limits

- 50 holdings cap for Bifolio via `requireSubscriptionFeature`.
- 120/min/user writes.

## 12. Telemetry

- `analytics_events`: `holding.added`, `holding.removed`, `holding.tag.changed`.
- Import commit: `portfolio_import_committed` (from `/api/transactions/bulk` on finalize).
- Reset: `portfolio_reset` (from `/api/reset-portfolio`).

## 13. Edge cases & gotchas

- Duplicate holdings (same ticker/exchange) — merged by `holdings.ts` helpers.
- Stock splits are handled in transactions (action `split`) and re-derive holdings.
- Deleting a holding with transactions: warn, then delete both.
- **Blank `portfolio_id`:** rows with `portfolio_id = ''` are invisible when the UI/API filters by the default portfolio UUID. `listHoldings` heals orphans via `healEmptyPortfolioIds`; migration v141 backfills existing rows. Reset Portfolio on the default portfolio also deletes blank-id orphans.

## 14. Tests

- [`src/lib/db/holdings.test.ts`](../../src/lib/db/holdings.test.ts)
- [`src/lib/derive-holdings.test.ts`](../../src/lib/derive-holdings.test.ts)
- [`src/lib/db/portfolios.test.ts`](../../src/lib/db/portfolios.test.ts) (`healEmptyPortfolioIds`)

## 15. Related skills and rules

- [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)
- Related specs: [transactions](transactions.md), [derive-holdings](derive-holdings.md), [manual-assets](manual-assets.md).

## 16. Open questions / planned work

- Inline edit in table (no modal).
- Bulk tag operations.
- Consider asserting non-empty `portfolio_id` at insert time (DB CHECK or hard fail) once orphans are fully cleared.
