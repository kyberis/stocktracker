# watchlist

> Track tickers without owning them.

## 1. Summary
Users add tickers to a watchlist for quick access, charts, and optional alerts. Shared with the portfolio command palette.

## 2. Status
- **Tier:** Free (10 items), Pro (unlimited).
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/watchlist/`](../../src/app/api/watchlist) | CRUD. |
| DB | [`src/lib/db/watchlist.ts`](../../src/lib/db/watchlist.ts) | Storage. |

## 4. Data model
- `watchlist_items`: user_id, ticker, added_at, sort_order.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET/POST/PATCH/DELETE | `/api/watchlist` | user | Free+ | CRUD. |

## 6. UI surface
- Drag-to-reorder list with live quotes.

## 7. Business logic
- No transactions implied; purely informational.

## 8. External dependencies
- Quote provider.

## 9. Currency / FX / tax implications
- Values in native currency.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- Free cap at 10.

## 12. Telemetry
- `watchlist_adds_total`.

## 13. Edge cases & gotchas
- Delisted ticker handling (allow removal only).

## 14. Tests
- DB tests.

## 15. Related skills and rules
- [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)
- Related specs: [alerts](alerts.md).

## 16. Open questions / planned work
- Shared public watchlists.
