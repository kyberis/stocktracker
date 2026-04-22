# transactions

> The ledger of buys, sells, dividends, splits, fees, and cash movements.

## 1. Summary

Transactions are the primary source of truth for portfolio history. Holdings are derived from the ledger via [`derive-holdings`](derive-holdings.md). Imports (CSV, SnapTrade, IBKR Flex, AI) all feed the `transactions` table. UI allows manual entry, bulk edits, and AI-assisted generation.

## 2. Status

- **Tier:** Free
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/transactions/route.ts`](../../src/app/api/transactions/route.ts) | List/create/update. |
| API | [`src/app/api/transactions/bulk/`](../../src/app/api/transactions/bulk) | Bulk create. |
| API | [`src/app/api/transactions/generate/`](../../src/app/api/transactions/generate) | AI-generate from description. |
| API | [`src/app/api/transactions/import-broker/`](../../src/app/api/transactions/import-broker) | CSV broker import. |
| API | [`src/app/api/transactions/backfill-rates/`](../../src/app/api/transactions/backfill-rates) | Backfill FX rates. |
| Page | [`src/app/(app)/portfolio/`](../../src/app/(app)/portfolio) | Transactions view. |
| DB | [`src/lib/db/transactions.ts`](../../src/lib/db/transactions.ts) | Access + normalization. |

## 4. Data model

- `transactions`: `id`, `user_id`, `portfolio_id`, `account_id`, `type` (buy/sell/dividend/split/fee/deposit/withdrawal), `ticker`, `exchange`, `quantity`, `price_native`, `currency`, `fx_rate_to_eur`, `fee`, `tax`, `note`, `occurred_at`, `source` (manual/csv/snaptrade/ai), `source_ref` (for idempotency).

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/transactions` | user | Free | Paginated list. |
| POST | `/api/transactions` | user | Free | Create single. |
| PATCH | `/api/transactions` | user | Free | Update fields. |
| DELETE | `/api/transactions?id=` | user | Free | Remove single. |
| POST | `/api/transactions/bulk` | user | Free | Create many. |
| POST | `/api/transactions/generate` | user | Pro | AI-generate. |
| POST | `/api/transactions/import-broker` | user | Free | CSV broker import. |
| POST | `/api/transactions/backfill-rates` | user | Free | Fix missing FX rates. |

## 6. UI surface

- Transactions table with filters (type, date, ticker).
- Bulk-edit drawer.
- "Generate transactions" modal using AI (Pro).

## 7. Business logic

- Idempotency: `source_ref` unique per `source` ensures re-imports don't duplicate.
- FX rate attached at write time from [`exchange-rates`](exchange-rates.md) (falls back to historical rate table).
- On edit/delete: `derive-holdings` re-runs for the affected ticker.

## 8. External dependencies

- Yahoo historical rates for backfill.
- OpenAI for `transactions/generate`.

## 9. Currency / FX / tax implications

- Stored native and EUR-equivalent per transaction.
- Withholding tax captured where the broker provides it (e.g., IBKR Flex).

## 10. i18n

All locales.

## 11. Permissions / tier gating / rate limits

- Bulk import: 10/hour/user.
- AI generate: Pro only, counts against AI quota.

## 12. Telemetry

- `analytics_events`: `transaction.created`, `transaction.deleted`, `transaction.imported`, `transaction.generated_with_ai`.

## 13. Edge cases & gotchas

- Splits adjust historical cost basis but not cash.
- Dividends can be in a different currency than the holding (ADRs).
- Tax-lot identification is FIFO by default; no per-lot selection yet.

## 14. Tests

- [`src/lib/db/transactions.test.ts`](../../src/lib/db/transactions.test.ts)
- [`src/lib/derive-holdings.test.ts`](../../src/lib/derive-holdings.test.ts)

## 15. Related skills and rules

- [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)
- [`financial-calculations`](../../.cursor/skills/financial-calculations/SKILL.md)
- Related specs: [derive-holdings](derive-holdings.md), [import-hub](import-hub.md).

## 16. Open questions / planned work

- HIFO / LIFO tax-lot accounting.
- Split-adjust via provider-provided splits instead of manual entries.
