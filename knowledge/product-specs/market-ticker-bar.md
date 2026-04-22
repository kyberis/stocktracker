# market-ticker-bar

> Top-of-app market tape showing major indices and user's top holdings.

## 1. Summary

A horizontal auto-scrolling ticker at the top of the app. Shows indices (SPX, NDX, DJI, SX5E, DAX, CAC40), currencies, and top user holdings. Pulled through a dedicated endpoint that respects tier caps.

## 2. Status

- **Tier:** Free (basic indices); Bifolio+ for holdings
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/ticker-bar/`](../../src/app/api/ticker-bar) | Data endpoint. |
| Component | [`src/components/MarketTickerBar.tsx`](../../src/components/MarketTickerBar.tsx) | UI. |

## 4. Data model

- No storage; SWR-cached quotes.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/ticker-bar` | user | Free | Returns list of quote snapshots. |

## 6. UI surface

- Horizontal animated ticker with CSS scroll; hover to pause.

## 7. Business logic

- Coalesces quote fetches across multiple tickers.
- Respects `prefers-reduced-motion` (pauses animation).

## 8. External dependencies

- Quote provider abstraction.

## 9. Currency / FX / tax implications

- Prices in native currency; hover shows EUR equivalent.

## 10. i18n

N/A.

## 11. Permissions / tier gating / rate limits

- 60/hour/user.

## 12. Telemetry

- `analytics_events`: `ticker.clicked` (on symbol click).

## 13. Edge cases & gotchas

- When the user has many holdings, only top 10 by value are in the ticker to avoid noise.

## 14. Tests

- E2E: ticker renders on dashboard load.

## 15. Related skills and rules

- [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)
- Related specs: [quotes-provider-abstraction](quotes-provider-abstraction.md).

## 16. Open questions / planned work

- User-configurable ticker symbols.
