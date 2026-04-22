# portfolios-multi

> Up to 3 named portfolios per Trefolio user, shared holdings/transactions scoped per portfolio.

## 1. Summary

A user can own multiple portfolios (e.g., "Main," "Spouse," "Pension"). Free/Bifolio users have a single default portfolio; Trefolio users can have up to 3. Holdings, transactions, cash, alerts, and snapshots all carry a `portfolio_id`.

## 2. Status

- **Tier:** Free (1), Bifolio (1), Trefolio (up to 3).
- **Feature flag:** _none_
- **Health:** B (newer feature)
- **Owning skill:** [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/portfolios/route.ts`](../../src/app/api/portfolios/route.ts) | CRUD list + create. |
| API | [`src/app/api/portfolios/[id]/`](../../src/app/api/portfolios/[id]) | Per-portfolio actions. |
| API | [`src/app/api/portfolios/move/`](../../src/app/api/portfolios/move) | Move holdings between portfolios. |
| Component | [`src/components/GlobalPortfolioSelector.tsx`](../../src/components/GlobalPortfolioSelector.tsx) | Header selector. |
| DB | [`src/lib/db/portfolios.ts`](../../src/lib/db/portfolios.ts) | Data access. |

## 4. Data model

- `portfolios` table: `id`, `user_id`, `name`, `color`, `is_default`, `sort_order`, timestamps.
- Related tables carry `portfolio_id` FK: `holdings`, `transactions`, `cash_entries`, `price_alerts`, `portfolio_snapshots`, `accounts`.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/portfolios` | user | Free | List portfolios. |
| POST | `/api/portfolios` | user | Trefolio | Create (respecting limits). |
| PATCH | `/api/portfolios/[id]` | user | Free | Rename/recolor. |
| DELETE | `/api/portfolios/[id]` | user | Trefolio | Delete (reassigns contents). |
| POST | `/api/portfolios/move` | user | Trefolio | Move entities across portfolios. |

## 6. UI surface

- `GlobalPortfolioSelector` in app header.
- Dashboard reads are scoped to the selected portfolio; "All" view aggregates.

## 7. Business logic

- Default portfolio invariant: every user has exactly one `is_default = 1`.
- Delete reassigns entities to the default; admin audits deletes.
- Limits enforced server-side; UI greys out create button past the limit.

## 8. External dependencies

- None.

## 9. Currency / FX / tax implications

- Each portfolio may have its own base-currency preference for display, but storage remains EUR.

## 10. i18n

All locales.

## 11. Permissions / tier gating / rate limits

- Create gated by `requireSubscriptionFeature('portfolios-multi')` (Trefolio).
- Soft cap at 3; hard-fail beyond.

## 12. Telemetry

- `analytics_events`: `portfolios.created`, `portfolios.renamed`, `portfolios.deleted`, `portfolios.selected`.

## 13. Edge cases & gotchas

- Deleting the default portfolio must promote another to default first.
- `PortfolioProvider` state refetches on selection change.

## 14. Tests

- [`src/lib/db/portfolios.test.ts`](../../src/lib/db/portfolios.test.ts)

## 15. Related skills and rules

- [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)
- [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)
- Related specs: [holdings-crud](holdings-crud.md), [global-portfolio-selector](global-portfolio-selector.md), [portfolio-context-demo-mode](portfolio-context-demo-mode.md).

## 16. Open questions / planned work

- Portfolio-level benchmarks (different benchmark per portfolio).
- Pro feature: portfolio sharing per-portfolio, not per-user.
