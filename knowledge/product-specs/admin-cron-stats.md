# admin-cron-stats

> Cron job observability.

## 1. Summary
Per-cron last-run, next-run, duration, status. Drives an alerting banner in admin when jobs drift beyond SLA.

## 2. Status
- **Tier:** admin
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/admin/cron-stats/`](../../src/app/api/admin/cron-stats) | Endpoint. |
| Library | [`src/lib/cron-registry.ts`](../../src/lib/cron-registry.ts) | Registry. |

## 4. Data model
- `cron_run_logs`.

## 5. API surface
- GET aggregated stats.

## 6. UI surface
- Table, ok/warn/fail chips.

## 7. Business logic
- Warn threshold per cron defined in registry.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- English.

## 11. Permissions / tier gating / rate limits
- Admin.

## 12. Telemetry
- `cron_runs_total{name,ok|fail}`.

## 13. Edge cases & gotchas
- Skipped runs due to market closed → expected.

## 14. Tests
- Smoke.

## 15. Related skills and rules
- [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)
- Related specs: [platform-cron-system](platform-cron-system.md).

## 16. Open questions / planned work
- Paging integrations (Slack/Telegram).
