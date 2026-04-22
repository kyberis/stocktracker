# compact-snapshots

> Keep snapshot storage bounded by compacting old hourly rows to daily, then weekly.

## 1. Summary

Hourly resolution for the recent N days; daily for the rest of year 1; weekly for anything older. Keeps the `portfolio_snapshots` table lean and reads cheap.

## 2. Status

- **Tier:** system
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-tools`](../../.cursor/skills/engineer-tools/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/admin/compact-snapshots/`](../../src/app/api/admin/compact-snapshots) | Admin trigger. |
| Cron | [`src/app/api/cron/compact-snapshots/`](../../src/app/api/cron/compact-snapshots) | Scheduled (if registered). |
| Library | [`src/lib/compact-snapshots.ts`](../../src/lib/compact-snapshots.ts) | Work function. |

## 4. Data model

- Rewrites rows in `portfolio_snapshots` replacing groups of hourly rows with an average-or-last daily row.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/admin/compact-snapshots` | admin | Admin | `{ olderThanDays }`. |

## 6. UI surface

Admin only.

## 7. Business logic

- Collapsing uses end-of-day value for daily rows.
- Never compacts the most recent N days (default 30).

## 8. External dependencies

- Turso writes.

## 9. Currency / FX / tax implications

N/A.

## 10. i18n

N/A.

## 11. Permissions / tier gating / rate limits

- `requireAdmin()`.

## 12. Telemetry

- Metrics on compaction rate and freed rows.

## 13. Edge cases & gotchas

- Must be idempotent; re-run picks up where it left off.
- Do not compact ranges currently being charted by a user (hard to detect; best-effort).

## 14. Tests

- Unit on bucketing logic.

## 15. Related skills and rules

- [`engineer-tools`](../../.cursor/skills/engineer-tools/SKILL.md)
- Related specs: [portfolio-snapshots-cron](portfolio-snapshots-cron.md).

## 16. Open questions / planned work

- Register as a regular cron (currently admin-triggered).
