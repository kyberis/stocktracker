# ex-dividend-calendar

> Upcoming ex-dividend dates for user's holdings + broader market.

## 1. Summary

Shows when users' holdings go ex-dividend and the estimated amount. Pulled from provider calendars; aggregated in `calendar_events`.

## 2. Status

- **Tier:** Free (own holdings); Pro (full market calendar)
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/ex-dividend/`](../../src/app/api/ex-dividend) | User-scoped calendar. |
| Component | [`src/components/ExDividendCalendar.tsx`](../../src/components/ExDividendCalendar.tsx) | UI. |
| DB | [`src/lib/db/calendar-events.ts`](../../src/lib/db/calendar-events.ts) | Storage. |

## 4. Data model

- `calendar_events` rows with `type = 'ex_dividend'`.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/ex-dividend` | user | Free | Upcoming ex-div for user's holdings. |

## 6. UI surface

- Calendar widget on dashboard / dedicated events page.

## 7. Business logic

- Populated by `event-sync` cron.
- Filter to holdings unless Pro.

## 8. External dependencies

- FMP / AV calendar endpoints.

## 9. Currency / FX / tax implications

- Dividend amount in native currency; EUR estimate computed on render.

## 10. i18n

All locales.

## 11. Permissions / tier gating / rate limits

- Pro needed for full-market view.

## 12. Telemetry

- `analytics_events`: `calendar.ex_dividend.viewed`.

## 13. Edge cases & gotchas

- Cancelled dividends — mark `cancelled_at` and hide.

## 14. Tests

- DB tests for calendar-events.

## 15. Related skills and rules

- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [event-calendar](event-calendar.md).

## 16. Open questions / planned work

- Dividend reinvestment tooling.
