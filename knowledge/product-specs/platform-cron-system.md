# platform-cron-system

> Cron registry + runner.

## 1. Summary
Each cron job is registered in `src/lib/cron-registry.ts` with cadence, timeout, and SLA. Vercel scheduled functions call the corresponding `/api/cron/*` routes; runs are logged in `cron_run_logs`.

## 2. Status
- **Tier:** system
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Library | [`src/lib/cron-registry.ts`](../../src/lib/cron-registry.ts) | Source of truth. |
| Routes | [`src/app/api/cron/`](../../src/app/api/cron) | Per-job handlers. |
| DB | [`src/lib/db/cron-runs.ts`](../../src/lib/db/cron-runs.ts) | Logs. |

## 4. Data model
- `cron_run_logs`: name, started_at, ended_at, status, details.

## 5. API surface
- Per-job endpoints; authenticated by CRON secret.

## 6. UI surface
- Admin cron-stats.

## 7. Business logic
- Jobs are idempotent; `lockName` prevents overlap.
- Failure alerts when ratio > threshold.
- Quote crons (`portfolio-snapshots`, `refresh-holdings`, `check-alerts`) share Redis via `fetchSharedQuotesAndRates` and skip Yahoo when no relevant market is open.
- Queue crons (`prodops-dispatch`, `feedback-pipeline`) are hourly backups; primary drain is kick-on-write.

## 8. External dependencies
- Vercel Cron.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- N/A.

## 11. Permissions / tier gating / rate limits
- Signed secret header.

## 12. Telemetry
- `cron_runs_total{name,ok|fail}`.

## 13. Edge cases & gotchas
- Long-running jobs must chunk; respect function time limits.

## 14. Tests
- Unit per job.

## 15. Related skills and rules
- [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)
- Related specs: [admin-cron-stats](admin-cron-stats.md), [portfolio-snapshots-cron](portfolio-snapshots-cron.md), [quotes-provider-abstraction](quotes-provider-abstraction.md).
- Exec plan: [`../exec-plans/active/cron-cost-reduction.md`](../exec-plans/active/cron-cost-reduction.md).

## 16. Open questions / planned work
- Central retry policy.
