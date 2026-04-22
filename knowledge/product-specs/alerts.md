# alerts

> Price-, news-, earnings-, dividend-, and AI-driven alerts.

## 1. Summary
Users create alerts bound to a ticker (or portfolio): threshold, pct-change, earnings, dividend, and AI alerts. Checked by the `alerts-scheduler` cron.

## 2. Status
- **Tier:** Free (3 alerts), Bifolio (50), Trefolio (unlimited).
- **Feature flag:** `ALERTS`
- **Health:** B
- **Owning skill:** [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/alerts/`](../../src/app/api/alerts) | CRUD. |
| API | [`src/app/api/ai-alerts/`](../../src/app/api/ai-alerts) | AI-specific alerts. |
| Cron | [`src/app/api/cron/alerts-scheduler/`](../../src/app/api/cron/alerts-scheduler) | Runs checks. |
| DB | [`src/lib/db/alerts.ts`](../../src/lib/db/alerts.ts), [`ai-alerts.ts`](../../src/lib/db/ai-alerts.ts) | Storage. |

## 4. Data model
- `alerts`: kind, threshold, state; one-shot vs recurring.
- `ai_alerts`: prompt, cadence, last fired.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET/POST/PATCH/DELETE | `/api/alerts` | user | Free+ | CRUD. |
| GET/POST/DELETE | `/api/ai-alerts` | user | Pro | CRUD AI alerts. |

## 6. UI surface
- Alert builder per type with preview; list + filters.

## 7. Business logic
- Cron queries active alerts, loads latest quote/snapshot, compares, then emits notifications.
- Dedupe within N hours.

## 8. External dependencies
- Quote provider + email + push.

## 9. Currency / FX / tax implications
- Thresholds stored in alert currency (native).

## 10. i18n
- Notification templates localized.

## 11. Permissions / tier gating / rate limits
- Per-tier alert count caps.

## 12. Telemetry
- `alerts_fired_total{kind}`, `alerts_created_total{kind}`.

## 13. Edge cases & gotchas
- Quote provider outage → alert state stays stable.

## 14. Tests
- DB tests; scheduler unit.

## 15. Related skills and rules
- [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)
- Related specs: [notifications-inapp](notifications-inapp.md), [push-notifications](push-notifications.md), [email-system](email-system.md).

## 16. Open questions / planned work
- Sound/color per alert severity; mobile quiet hours.
