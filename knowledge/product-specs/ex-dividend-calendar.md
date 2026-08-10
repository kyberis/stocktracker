# ex-dividend-calendar

> Upcoming ex-dividend dates for the caller's own holdings, fetched live (not a stored/cron-populated calendar).

## 1. Summary

Shows when a user's holdings go ex-dividend and the estimated amount. Live-fetched per request from Yahoo (dates) and FMP/Alpha Vantage (amounts via `adjDividend`) for the tickers the caller passes in — there is no server-side "full market calendar" and nothing is persisted to a `calendar_events` table for this feature. Rendered inside `DividendSummary` (the Dividends view), which — since the April 2026 nav refactor — is reached either via the classic dashboard's `?tab=dividends` (opt-in `classic_home` flag) or via `/tools/dividends` on the default Home v2 route.

## 2. Status

- **Tier:** Universal access under the quota model (2.0.0, 2026-04-30) — reachable by Free and Pro alike; no per-tier gating in this route. The previous "Pro only for full market calendar" claim describes a feature that isn't implemented here.
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/ex-dividend/route.ts`](../../src/app/api/ex-dividend/route.ts) | `GET`, requires `?tickers=`, live provider fetch — not DB-backed. |
| Component | [`src/components/ExDividendCalendar.tsx`](../../src/components/ExDividendCalendar.tsx) | UI, rendered from [`DividendSummary.tsx`](../../src/components/DividendSummary.tsx). |

## 4. Data model

- None. No rows are read from or written to `calendar_events` for ex-dividend data — that table/type pairing isn't used by this feature.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/ex-dividend?tickers=...` | session required | Universal | Ex-div dates/amounts for the given tickers, scoped to the caller's own holdings by the client. ISINs are resolved to tickers via Yahoo search before fetching. |

## 6. UI surface

- Calendar widget inside the Dividends view (`ExDividendCalendar` inside `DividendSummary`).

## 7. Business logic

- No cron populates this — each request fetches live. Yahoo supplies dates; FMP/AV supply amounts, since Yahoo's dates aren't reliably paired with amounts.

## 8. External dependencies

- Yahoo Finance (dates, ISIN resolution), FMP / Alpha Vantage (amounts).

## 9. Currency / FX / tax implications

- Dividend amount in native currency; EUR estimate computed on render.

## 10. i18n

All locales.

## 11. Permissions / tier gating / rate limits

- Session required; no plan-based gating found in the route.

## 12. Telemetry

- None found in `ExDividendCalendar.tsx` — no `track()` call. The previously-documented `calendar.ex_dividend.viewed` event does not exist in code.

## 13. Edge cases & gotchas

- Yahoo failures are caught and logged, not surfaced as an error — the route falls through to FMP/AV-only results.

## 14. Tests

- `src/app/api/ex-dividend/parse-tickers.test.ts` covers ticker-param parsing.

## 15. Related skills and rules

- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 16. Open questions / planned work

- Dividend reinvestment tooling.
