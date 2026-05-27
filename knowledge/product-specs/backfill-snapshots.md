# backfill-snapshots

> Batch backfill of snapshots for new users, after imports, or when stored history is incomplete.

## 1. Summary

On initial import, a user has months/years of transactions but no snapshots. `backfill-snapshots` fills the gap so the portfolio-value chart is useful from day one. The dashboard also auto-triggers a rebuild when stored snapshots are missing cost basis (`total_invested_eur`) or per-asset-type breakdown.

## 2. Status

- **Tier:** automatic (dashboard + import) + admin manual
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-tools`](../../.cursor/skills/engineer-tools/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/portfolio/backfill-snapshots/`](../../src/app/api/portfolio/backfill-snapshots) | User GET check + POST rebuild. |
| API | [`src/app/api/admin/backfill-snapshots/`](../../src/app/api/admin/backfill-snapshots) | Admin run. |
| UI | [`src/components/portfolio-v2/BackfillCTA.tsx`](../../src/components/portfolio-v2/BackfillCTA.tsx) | Silent auto-POST when GET check reports incomplete data. |
| Library | [`src/lib/backfill-snapshots.ts`](../../src/lib/backfill-snapshots.ts) | Core routine. |

## 4. Data model

- Writes to `portfolio_snapshots`.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/portfolio/backfill-snapshots?check=true` | user | Free | Returns `needsBackfill` when history gaps or stale invested/asset-type columns exist. |
| POST | `/api/portfolio/backfill-snapshots` | user | Free | Full daily rebuild + intraday sync. Returns `409` if a rebuild is already in flight for the user. |
| POST | `/api/admin/backfill-snapshots` | admin | Admin | `{ userId, since }`. |

## 6. UI surface

- Dashboard / portfolio chart: [`BackfillCTA`](../../src/components/portfolio-v2/BackfillCTA.tsx) polls GET on load and POSTs silently when repair is needed (minimal progress text; retry on failure).
- Admin user panel: manual Recalculate snapshots.

## 7. Business logic

- Walks historical quotes day-by-day, derives holdings at that point, computes value.
- Batches to avoid function-timeout.
- Idempotent via upsert.
- POST acquires a per-user in-memory lock (~5 min TTL) to avoid duplicate concurrent rebuilds (e.g. multiple tabs).

### Triggers

| Event | Behavior |
|-------|----------|
| Broker / bulk / SnapTrade import | Server `runBackfillForUser` after import |
| New transaction with past date | `runIncrementalBackfill` in background |
| Dashboard load with incomplete snapshots | Client auto-POST via `BackfillCTA` |
| Admin | POST `/api/admin/backfill-snapshots` |

## 8. External dependencies

- Yahoo historical.

## 9. Currency / FX / tax implications

- Historical EUR values only.

## 10. i18n

- `updatingPortfolioHistory`, `backfillHistoryFailed`, `backfillHistoryRetry` in EN/ES.

## 11. Permissions / tier gating / rate limits

- User routes: `requireSession()`.
- Admin route: `requireAdmin()`.

## 12. Telemetry

- Metrics: `backfill_snapshots_processed_total`.

## 13. Edge cases & gotchas

- Delisted tickers: skip with a warning; leave gap.
- Currencies that changed code (e.g., legacy TRY) handled via manual overrides.
- Concurrent POST from two tabs: second request gets `409`; client polls GET until `needsBackfill` is false.

## 14. Tests

- Unit for the math; integration against a fixture user.

## 15. Related skills and rules

- [`engineer-tools`](../../.cursor/skills/engineer-tools/SKILL.md)
- Related specs: [materialize-portfolio-snapshots](materialize-portfolio-snapshots.md).

## 16. Open questions / planned work

- Nightly cron sweep for users with stale invested/asset-type snapshot rows.
- Incremental backfill on transaction PATCH/DELETE.
