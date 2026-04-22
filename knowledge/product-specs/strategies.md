# strategies

> Saved investment ideas with target and stop-loss prices.

## 1. Summary
User saves a "strategy" on a ticker: reference purchase price, target, stop-loss. Linked to alerts so the user is notified when thresholds hit.

## 2. Status
- **Tier:** Bifolio+
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/strategies/`](../../src/app/api/strategies) | CRUD. |
| DB | [`src/lib/db/investment-strategies.ts`](../../src/lib/db/investment-strategies.ts) | Storage. |

## 4. Data model
- `investment_strategies`: purchase, target, stop; linked `target_alert_id`, `stop_alert_id`.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET/POST/PATCH/DELETE | `/api/strategies` | user | Pro | CRUD. |

## 6. UI surface
- Table with inline edits; quick CTA to create alerts.

## 7. Business logic
- Creating a strategy auto-creates threshold alerts if enabled.

## 8. External dependencies
- Alert system.

## 9. Currency / FX / tax implications
- Prices in native currency.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- `requireSubscriptionFeature('alerts-*')` for auto-alerts.

## 12. Telemetry
- `strategies.created_total`.

## 13. Edge cases & gotchas
- Orphaned linked alerts on strategy deletion (cascade clean).

## 14. Tests
- DB tests.

## 15. Related skills and rules
- [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)
- Related specs: [alerts](alerts.md).

## 16. Open questions / planned work
- Strategy templates (value, momentum).
