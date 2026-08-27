# admin-analytics

> In-house analytics dashboard (events, DAU, retention, funnel).

## 1. Summary
Internal dashboards built on `analytics_events`. Shows counts and trends; complements Grafana for ops metrics.

## 2. Status
- **Tier:** admin
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`analytics-instrumentation`](../../.cursor/skills/analytics-instrumentation/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/admin/analytics/`](../../src/app/api/admin/analytics) | Aggregations. |
| DB | [`src/lib/db/analytics-events.ts`](../../src/lib/db/analytics-events.ts) | Storage. |

## 4. Data model
- `analytics_events`.

## 5. API surface
- GET aggregates per metric/period.

## 6. UI surface
- Panels with charts.

## 7. Business logic
- Aggregations computed on demand (no materialized views).

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- English.

## 11. Permissions / tier gating / rate limits
- Admin.

## 12. Telemetry
- N/A.

## 13. Edge cases & gotchas
- Large ranges paginated.

## 14. Tests
- Unit on aggregators.

## 15. Related skills and rules
- [`analytics-instrumentation`](../../.cursor/skills/analytics-instrumentation/SKILL.md)
- Related specs: [admin-ai-logs](admin-ai-logs.md), [warren-first-stock](warren-first-stock.md).

## 16. Open questions / planned work
- Cohort retention charts.
