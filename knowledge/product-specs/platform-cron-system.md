# platform-cron-system

> Cron registry + runner.

## 1. Summary
Each cron job is registered in `src/lib/cron-registry.ts` with cadence and description. Vercel scheduled functions call the corresponding `/api/cron/*` routes; runs are logged in `cron_executions` via `withCronLogging`.

## 2. Status
- **Tier:** system
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Library | [`src/lib/cron-registry.ts`](../../src/lib/cron-registry.ts) | Source of truth. |
| Routes | [`src/app/api/cron/`](../../src/app/api/cron) | Per-job handlers. Archived stub: [`digest-email/route.ts`](../../src/app/api/cron/digest-email/route.ts). |
| DB | [`src/lib/cron-logging.ts`](../../src/lib/cron-logging.ts) | `cron_executions` writes. |

## 4. Data model
- `cron_executions`: job_name, started_at, finished_at, status, result, error_message, duration_ms.

## 5. API surface
- Per-job endpoints; authenticated by CRON secret.

## 6. UI surface
- Admin cron-stats.

## 7. Business logic
- Jobs are idempotent. Overlap is tolerated; domain writes use existing claim/dedupe keys.
- Lifecycle marketing is one daily `lifecycle-emails` job. `digest-email` is an archived no-op stub.
- Failure alerts when ratio > threshold.

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

## 16. Open questions / planned work
- Central retry policy.
