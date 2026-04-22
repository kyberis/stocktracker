# historical-prices

> Yahoo historical OHLC data, cached for performance.

## 1. Summary

Historical prices are fetched from Yahoo and cached in `yahoo_historical_cache`. Used for backfilling snapshots, charts (fallback path), and backtests.

## 2. Status

- **Tier:** Free (backbone); Bifolio/Trefolio for full-history chart.
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/historical/`](../../src/app/api/historical) | Per-ticker range fetch. |
| DB | [`src/lib/db/historical-cache.ts`](../../src/lib/db/historical-cache.ts) | Cache access. |
| Library | `src/lib/api-providers/yahoo.ts` (historical client). |

## 4. Data model

- `yahoo_historical_cache`: `ticker`, `date`, `open`, `high`, `low`, `close`, `volume`, `fetched_at`.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/historical?ticker=&from=&to=` | user | Free | Returns cache-first OHLC series. |

## 6. UI surface

- Used by chart fallback path and backtest.

## 7. Business logic

- Cache lookup first; missing dates fetched and backfilled.
- Refetch stale (e.g., > 24h for recent dates).
- Split-adjusted prices from Yahoo.

## 8. External dependencies

- Yahoo Finance (yahoo-finance2).

## 9. Currency / FX / tax implications

- Native currency preserved.

## 10. i18n

N/A.

## 11. Permissions / tier gating / rate limits

- 120/hour/user.

## 12. Telemetry

- `hist_cache_hit_rate`.

## 13. Edge cases & gotchas

- Yahoo occasionally omits dividends/splits; verify coverage.
- Ticker renames → gap; admin recovery path.

## 14. Tests

- Integration in provider tests.

## 15. Related skills and rules

- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [backfill-snapshots](backfill-snapshots.md).

## 16. Open questions / planned work

- Second provider for historical (FMP) to cover Yahoo gaps.
