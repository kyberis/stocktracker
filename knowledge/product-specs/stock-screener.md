# stock-screener

> 600-stock screener with 6 filter dimensions + 5 preset strategies.

## 1. Summary
Query a cached stock universe by market cap, dividend yield, growth, valuation, moat, and sector. Presets jumpstart common strategies. Refreshed nightly by `screener-sync`.

## 2. Status
- **Tier:** Trefolio
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Page | [`src/app/(app)/screener/`](../../src/app/(app)/screener) | Page. |
| API | [`src/app/api/screener/`](../../src/app/api/screener) | Filtering endpoint. |
| Cron | [`src/app/api/cron/screener-sync/`](../../src/app/api/cron/screener-sync) | Daily refresh. |
| DB | [`src/lib/db/screener.ts`](../../src/lib/db/screener.ts) | Storage. |

## 4. Data model
- `screener_cache`: per ticker snapshot of metrics used for filtering.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/screener` | user | Pro | Filtered list. |

## 6. UI surface
- Filter sidebar + results table with pagination.

## 7. Business logic
- Server-side filtering; results paginated.
- Presets: "Dividend Aristocrats EU," "Growth 25%," etc.

## 8. External dependencies
- Yahoo (sync), moat data.

## 9. Currency / FX / tax implications
- Metrics like dividend yield currency-agnostic (percent).

## 10. i18n
- Labels localized.

## 11. Permissions / tier gating / rate limits
- `requireSubscriptionFeature('screener')`.

## 12. Telemetry
- `screener.queries_total`.

## 13. Edge cases & gotchas
- Stale cache warning when `screener-sync` is overdue.

## 14. Tests
- DB tests.

## 15. Related skills and rules
- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [moat-screener](moat-screener.md).

## 16. Open questions / planned work
- Expand universe beyond 600; custom user-added lists.
