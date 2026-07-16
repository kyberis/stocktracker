# fundamentals

> Income, balance sheet, cash-flow, and earnings data for paid stock detail.

## 1. Summary

Fundamentals power the stock detail **Financials** and **Earnings** tabs. Data is fetched from **Yahoo Finance** by default. Optional **FMP** override when `FMP_API_KEY` and `market_data_fmp_fundamentals` are on. Responses are stored permanently in `fundamentals_cache` (write-through, no TTL). Moat evaluation uses the same fundamentals provider.

## 2. Status

- **Tier:** Bifolio / Trefolio (paid + `hasPremiumMarketData`)
- **Feature flag:** `market_data_fmp_fundamentals` (optional FMP override; default off → Yahoo)
- **Health:** B+
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/fundamentals/route.ts`](../../src/app/api/fundamentals/route.ts) | Cache-first; quota on miss only. |
| DB | [`src/lib/db/fundamentals-cache.ts`](../../src/lib/db/fundamentals-cache.ts) | Permanent cache per `(symbol, type)`. |
| Quality | [`src/lib/fundamentals/cache-quality.ts`](../../src/lib/fundamentals/cache-quality.ts) | Skips caching sparse Yahoo rows. |
| Provider | [`src/lib/api-providers/yahoo.ts`](../../src/lib/api-providers/yahoo.ts) | Primary (free). |
| Optional | [`src/lib/api-providers/fmp-market-data.ts`](../../src/lib/api-providers/fmp-market-data.ts) | When FMP override flag + key. |

## 4. Data model

- `fundamentals_cache(symbol, type, data_json, provider, created_at, updated_at)` — `type` ∈ `income|balance|cashflow|earnings`, `provider` ∈ `fmp|yahoo`.
- `moat_cache` — separate; moat scores derived from fundamentals + overview.

## 5. API surface

| Method | Route | Auth | Quota | Description |
|--------|-------|------|-------|-------------|
| GET | `/api/fundamentals?symbol=&type=` | session | `fundamentals` on cache miss | `FundamentalData` JSON + optional `_cached`, `_provider`. |

## 6. UI surface

- [`src/components/StockDetail.tsx`](../../src/components/StockDetail.tsx) — Financials sub-tabs, Earnings (default quarterly period).

## 7. Business logic

1. Resolve ticker (ISIN → symbol).
2. Read `fundamentals_cache`; on hit return immediately (no quota).
3. On miss: enforce `fundamentals` quota, fetch Yahoo (or FMP override).
4. Upsert only if `isCacheableFundamentalData` passes (avoids locking in sparse Yahoo rows).

## 8. External dependencies

- Yahoo (`quoteSummary` modules); optional FMP (`FMP_API_KEY`).

## 9. Operations

- Purge cache: `npx tsx scripts/clear-fundamentals-cache.ts --symbol AAPL` or `--all`.

## 10. Related specs

- [moat-reports](moat-reports.md), [stock-evaluation](stock-evaluation.md).
