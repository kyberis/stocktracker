# analytics-events

> Custom analytics event pipeline.

## 1. Summary
Events tracked via a single helper (`track(name, payload)`) and stored in `analytics_events`. Consumed by admin-analytics and internal dashboards.

## 2. Status
- **Tier:** system
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`analytics-instrumentation`](../../.cursor/skills/analytics-instrumentation/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Library | [`src/lib/analytics.ts`](../../src/lib/analytics.ts) | Helper. |
| DB | [`src/lib/db/analytics-events.ts`](../../src/lib/db/analytics-events.ts) | Storage. |

## 4. Data model
- `analytics_events`: name, user_id, session_id, payload, created_at.

## 5. API surface
- POST `/api/analytics` with event batch.

## 6. UI surface
- N/A.

## 7. Business logic
- Client batches events; server dedupes by `idempotency_key`.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- N/A.

## 11. Permissions / tier gating / rate limits
- Auth optional; no PII.

## 12. Telemetry
- `agent_dock_open`, `agent_dock_warren`, `agent_dock_clara`, `agent_dock_feedback`, `agent_dock_alerts`, `agent_dock_support` (GA via `useTrack`; see [agent-dock](agent-dock.md)).
- `onboarding_clara_step_viewed`, `onboarding_clara_activate_clicked` (client allow-list; see [onboarding](onboarding.md)).
- `onboarding_clara_linked`, `onboarding_clara_skipped` (server; see [onboarding](onboarding.md)).
- `analytics_events_ingested_total`.

## 13. Edge cases & gotchas
- Respect Do-Not-Track; no PII in payload.

## 14. Tests
- Unit on batcher.

## 15. Related skills and rules
- [`analytics-instrumentation`](../../.cursor/skills/analytics-instrumentation/SKILL.md)
- Related specs: [admin-analytics](admin-analytics.md), [display-invariants](display-invariants.md).

## 16. Open questions / planned work
- Sampling on high-volume events.
