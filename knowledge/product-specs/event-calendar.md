# event-calendar

> Earnings, economic events, IPOs, and splits calendar.

## 1. Summary

Aggregates market events (earnings, econ, IPO, stock splits) into one calendar surface. Populated by the daily `event-sync` cron.

## 2. Status

- **Tier:** Free (user holdings); Bifolio (full market events); Trefolio (includes IPO calendar).
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/events/`](../../src/app/api/events) | Unified events feed. |
| Component | [`src/components/EventCalendar.tsx`](../../src/components/EventCalendar.tsx) | UI calendar. |
| Cron | [`src/app/api/cron/event-sync/`](../../src/app/api/cron/event-sync) | Daily sync at 06:00. |
| DB | [`src/lib/db/calendar-events.ts`](../../src/lib/db/calendar-events.ts) | Storage. |

## 4. Data model

- `calendar_events`: `id`, `type` (`earnings`/`economic`/`ipo`/`split`), `ticker`, `date`, `payload` (JSON), `source`, `fetched_at`.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/events` | user | Free | Filtered by type + date range. |

## 6. UI surface

- `EventCalendar` mounted in dashboard and events page.
- Color-coded by type.

## 7. Business logic

- `event-sync` pulls from AV or FMP per feature flag (`event-sync-prefer-fmp`).
- User's holdings filter by default; Pro can see all.

## 8. External dependencies

- Alpha Vantage, FMP.

## 9. Currency / FX / tax implications

- Earnings amounts in reporting currency.

## 10. i18n

Type labels localized.

## 11. Permissions / tier gating / rate limits

- Pro for full-market view.

## 12. Telemetry

- `events_ingested_total{type,source}`.

## 13. Edge cases & gotchas

- Duplicate events across providers — dedupe on `(ticker, type, date)`.

## 14. Tests

- DB tests.

## 15. Related skills and rules

- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [ex-dividend-calendar](ex-dividend-calendar.md).

## 16. Open questions / planned work

- Earnings-call transcripts link.
