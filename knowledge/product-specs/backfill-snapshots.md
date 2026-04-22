# backfill-snapshots

> One-off batch backfill of snapshots for new users or after imports.

## 1. Summary

On initial import, a user has months/years of transactions but no snapshots. `backfill-snapshots` fills the gap so the portfolio-value chart is useful from day one.

## 2. Status

- **Tier:** user-triggered (on import) + admin
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-tools`](../../.cursor/skills/engineer-tools/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/admin/backfill-snapshots/`](../../src/app/api/admin/backfill-snapshots) | Admin run. |
| Library | [`src/lib/backfill-snapshots.ts`](../../src/lib/backfill-snapshots.ts) | Core routine. |

## 4. Data model

- Writes to `portfolio_snapshots`.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/admin/backfill-snapshots` | admin | Admin | `{ userId, since }`. |

## 6. UI surface

Admin only.

## 7. Business logic

- Walks historical quotes day-by-day, derives holdings at that point, computes value.
- Batches to avoid function-timeout.
- Idempotent via upsert.

## 8. External dependencies

- Yahoo historical.

## 9. Currency / FX / tax implications

- Historical EUR values only.

## 10. i18n

N/A.

## 11. Permissions / tier gating / rate limits

- `requireAdmin()`.

## 12. Telemetry

- Metrics: `backfill_snapshots_processed_total`.

## 13. Edge cases & gotchas

- Delisted tickers: skip with a warning; leave gap.
- Currencies that changed code (e.g., legacy TRY) handled via manual overrides.

## 14. Tests

- Unit for the math; integration against a fixture user.

## 15. Related skills and rules

- [`engineer-tools`](../../.cursor/skills/engineer-tools/SKILL.md)
- Related specs: [materialize-portfolio-snapshots](materialize-portfolio-snapshots.md).

## 16. Open questions / planned work

- Auto-trigger on import when the user has ≥ 10 transactions.
