# materialize-portfolio-snapshots

> Admin-triggered rebuild of historical snapshots from transactions + cache.

## 1. Summary

Rebuilds `portfolio_snapshots` for a user using historical Yahoo data and the transaction ledger. Used after corrections (bad FX rates, a fix to `derive-holdings`, a new migration that renames tables).

## 2. Status

- **Tier:** Admin / system
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-tools`](../../.cursor/skills/engineer-tools/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/admin/materialize-portfolio-snapshots/`](../../src/app/api/admin/materialize-portfolio-snapshots) | Admin trigger. |
| Script | [`scripts/materialize-portfolio-snapshots.sh`](../../scripts/materialize-portfolio-snapshots.sh) | Local run. |
| Doc | [`docs/PORTFOLIO_SNAPSHOT_MATERIALIZE.md`](../../docs/PORTFOLIO_SNAPSHOT_MATERIALIZE.md) | Operational notes. |

## 4. Data model

- Rewrites rows in `portfolio_snapshots_new` or `portfolio_snapshots` (see migration history).

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/admin/materialize-portfolio-snapshots` | admin | Admin | `{ userId?, portfolioId?, from, to }` |

## 6. UI surface

Admin "Materialize snapshots" page.

## 7. Business logic

- Pulls historical prices via `yahoo_historical_cache`; if missing, fetches and caches.
- Fills gaps hour-by-hour; idempotent (upsert).
- Uses current `derive-holdings` so latest logic applies.

## 8. External dependencies

- Yahoo historical.

## 9. Currency / FX / tax implications

- Historical FX via exchange-rates cache.

## 10. i18n

English admin UI.

## 11. Permissions / tier gating / rate limits

- `requireAdmin()`.

## 12. Telemetry

- Logged; admin can see progress via cron-stats.

## 13. Edge cases & gotchas

- Long-running; guarded by function timeout — run in batches.
- Do not run during `portfolio-snapshots-cron` window.

## 14. Tests

- Manual verification against a known user.

## 15. Related skills and rules

- [`engineer-tools`](../../.cursor/skills/engineer-tools/SKILL.md)
- Related specs: [backfill-snapshots](backfill-snapshots.md), [compact-snapshots](compact-snapshots.md), [portfolio-snapshots-cron](portfolio-snapshots-cron.md).

## 16. Open questions / planned work

- Streaming progress output to admin UI.
