# exchange-rates

> EUR-anchored FX cache used app-wide.

## 1. Summary

FX rates are fetched from Yahoo and cached. EUR is always the base currency. The cache is an in-memory Map refreshed periodically by `refresh-holdings` and served via `/api/exchange-rates`. Historical rates live alongside historical quotes in caches.

## 2. Status

- **Tier:** Free
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/exchange-rates/route.ts`](../../src/app/api/exchange-rates/route.ts) | Cached rates. |
| Library | [`src/lib/exchange-rates.ts`](../../src/lib/exchange-rates.ts) | Fetch + cache + conversion helpers. |

## 4. Data model

- In-memory cache + historical rate columns on `transactions.fx_rate_to_eur`.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/exchange-rates` | user | Free | Current rates map. |

## 6. UI surface

- Consumed by `PortfolioProvider` for display conversion.

## 7. Business logic

- 21 currencies supported (see `src/lib/countries.ts`).
- GBX → GBP: divide by 100.
- Pseudo-rate for stablecoins (USDT, USDC, EUR_T) = native minus/plus small spread.

## 8. External dependencies

- Yahoo FX pair endpoints.

## 9. Currency / FX / tax implications

- The canonical source of truth for display conversion.
- Stored amounts never mutated when rates move.

## 10. i18n

N/A.

## 11. Permissions / tier gating / rate limits

- Cache served, so per-user limits are loose.

## 12. Telemetry

- `fx_cache_hit_total`, `fx_fetch_failures_total`.

## 13. Edge cases & gotchas

- Provider outage: serve last-known; stamp the age in the API response.
- Currencies added in the future must appear in seed data and countries list.

## 14. Tests

- Unit in `src/lib/*.test.ts`.

## 15. Related skills and rules

- [`financial-calculations`](../../.cursor/skills/financial-calculations/SKILL.md)
- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related: [`design-docs/eur-base-fx.md`](../design-docs/eur-base-fx.md).

## 16. Open questions / planned work

- Persisted daily FX table for backfills at scale.
