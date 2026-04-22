# moat-auto-tickers

> Queued universe of tickers scheduled for moat evaluation.

## 1. Summary
Maintains the list of tickers that should be evaluated by the moat system and when. Fed by user demand (on-view) and the screener universe.

## 2. Status
- **Tier:** system
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| DB | [`src/lib/db/moat-auto-tickers.ts`](../../src/lib/db/moat-auto-tickers.ts) | Queue model. |
| Cron | [`src/app/api/cron/moat-sync/`](../../src/app/api/cron/moat-sync) | 4-hourly sync. |

## 4. Data model
- `moat_auto_tickers`: `ticker`, `priority`, `last_evaluated_at`, `next_due_at`.

## 5. API surface
- Internal only.

## 6. UI surface
- None.

## 7. Business logic
- Admin can bump priority; user view can trigger enqueue.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- N/A.

## 11. Permissions / tier gating / rate limits
- N/A.

## 12. Telemetry
- `moat_queue_size`.

## 13. Edge cases & gotchas
- Do not evaluate delisted tickers; skip.

## 14. Tests
- Unit on priority logic.

## 15. Related skills and rules
- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [moat-reports](moat-reports.md).

## 16. Open questions / planned work
- Smart backoff on persistent provider failures.
