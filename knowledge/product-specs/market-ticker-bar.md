# market-ticker-bar

> Top-of-page market tape showing FX, crypto, commodities, S&P 500, and exchange open/closed status.

## 1. Summary

A horizontal auto-scrolling ticker at the top of the authenticated app, the interactive demo, and the public production landing. Shows EUR/USD, BTC, gold, silver, S&P 500, oil, and major exchange open/closed dots. Data comes from a dedicated cached endpoint that is public (no session) so the landing can render live quotes.

## 2. Status

- **Tier:** Free
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/ticker-bar/route.ts`](../../src/app/api/ticker-bar/route.ts) | Cached batch quotes. |
| Component | [`src/components/MarketTickerBar.tsx`](../../src/components/MarketTickerBar.tsx) | UI + scroll animation. |
| Hook | [`src/lib/hooks/use-ticker-bar.ts`](../../src/lib/hooks/use-ticker-bar.ts) | Polls `/api/ticker-bar`; `demoMode` uses static snapshots. |
| Landing | [`src/app/landing/page.tsx`](../../src/app/landing/page.tsx) | Fixed chrome above the nav. |
| Demo | [`src/app/demo/demo-shell.tsx`](../../src/app/demo/demo-shell.tsx) | `demoMode` ticker. |

## 4. Data model

- No storage; in-memory `apiCache` on the server (FX, BTC, Yahoo batch) with HTTP `Cache-Control`.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/ticker-bar` | public | Free | EUR/USD, BTC, gold, silver, S&P 500, oil snapshots. Listed in middleware `PUBLIC_API_ROUTES`. |

## 6. UI surface

- Horizontal animated ticker with CSS scroll; hover to pause.
- Big-move highlight when absolute change ≥ 4%.
- `aria-label` from `tickerMarketLabel`; animation disabled under `prefers-reduced-motion`.
- Footer on public pages retains market-data / not-advice disclaimer.

## 7. Business logic

- Client poll every 5 minutes; market open/closed status refreshed every 60s via `getTickerMarketStatuses()`.
- Server deduplicates in-flight upstream fetches per cache key.

## 8. External dependencies

- Yahoo Finance (FX + futures/index batch), CoinLore (BTC).

## 9. Currency / FX / tax implications

- Display prices as returned (USD for commodities/BTC; EUR/USD rate as FX pair). No portfolio FX conversion in this strip.

## 10. i18n

- Labels: `tickerEurUsd`, `tickerBtc`, `tickerGold`, `tickerSilver`, `tickerSp500`, `tickerOil`, `tickerMarketLabel` in [`src/locales/`](../../src/locales).

## 11. Permissions / tier gating / rate limits

- Public endpoint; server-side cache + CDN-friendly `Cache-Control` limit upstream load.
- No tier gate.

## 12. Telemetry

- None specific to the strip clicks today (display-only).

## 13. Edge cases & gotchas

- Anonymous landing visitors hit the same public API as logged-in users; do not attach user-identifiable query params.
- Loading state reserves `h-7` height so fixed landing chrome does not jump.
- The strip always duplicates content and CSS-scrolls (including on wide viewports). Animation is disabled under `prefers-reduced-motion`.

## 14. Tests

- Unit/integration coverage via ticker-bar hook and market-hours helpers; smoke by loading `/` and `/demo`.

## 15. Related skills and rules

- [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)
- [`.cursor/rules/landing-page.mdc`](../../.cursor/rules/landing-page.mdc)
- Related specs: [quotes-provider-abstraction](quotes-provider-abstraction.md).

## 16. Open questions / planned work

- User-configurable ticker symbols.
