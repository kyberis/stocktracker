# quotes-provider-abstraction

> Unified quote fetch across Yahoo, Alpha Vantage, FMP, and CoinLore.

## 1. Summary

A single `getQuote(ticker, exchange)` abstraction chooses the right provider and returns a normalized shape. Yahoo is the free-tier default; Alpha Vantage and FMP unlock as fallbacks or Pro-only features. CoinLore serves crypto.

## 2. Status

- **Tier:** Free (Yahoo); Pro (Alpha Vantage, FMP)
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/quote/route.ts`](../../src/app/api/quote/route.ts) | User-facing quote endpoint. |
| Library | [`src/lib/api-providers/index.ts`](../../src/lib/api-providers/index.ts) | Dispatcher. |
| Library | [`src/lib/api-providers/yahoo.ts`](../../src/lib/api-providers/yahoo.ts), [`alphavantage.ts`](../../src/lib/api-providers/alphavantage.ts), [`fmp.ts`](../../src/lib/api-providers/fmp.ts), [`coinlore.ts`](../../src/lib/api-providers/coinlore.ts) | Per-provider clients. |
| Response normalizer | [`src/lib/api-providers/response.ts`](../../src/lib/api-providers/response.ts) | Zod schemas. |

## 4. Data model

- No DB storage for live quotes (Redis TTL cache, 90s for quotes and FX so overlapping crons share one Yahoo pass, plus in-memory coalescing).
- `QuoteData` / `ProviderQuoteResult` include optional `regularMarketTime` (epoch ms, last trade / session).
- Historical quotes cached in `yahoo_historical_cache`.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/quote?ticker=&exchange=` | user | Free | Single quote. |

## 6. UI surface

- Consumed by `PortfolioProvider`, `MarketTickerBar`, `ExploreAssetSearch`.
- Dashboard daily G/L (`DayMoveAsOf` in `PortfolioHeroCard` / `HomePortfolioTotalCard`) uses `regularMarketTime` (fallback: last fetch) so Monday still shows Friday's session.

## 7. Business logic

- Provider selection: Yahoo > AV > FMP based on availability and tier.
- Exponential backoff retry on 429/5xx.
- Response normalization into `QuoteData` with `price`, `currency`, `change`, `changePct`, optional `regularMarketTime`.
- Yahoo maps `regularMarketTime`; Alpha Vantage uses `07. latest trading day`; FMP uses `timestamp` / `updatedAt`.

## 8. External dependencies

- `yahoo-finance2`, direct HTTP for AV/FMP/CoinLore.
- Env: `ALPHAVANTAGE_API_KEY`, `FMP_API_KEY`.

## 9. Currency / FX / tax implications

- Native currency preserved.
- GBX converted to GBP at the provider layer.

## 10. i18n

- Dashboard as-of label: `todayLabel`, `dayMoveAsOfTitle` in `src/locales/en.ts` / `es.ts`.

## 11. Permissions / tier gating / rate limits

- Free users: Yahoo only.
- Alpha Vantage quota enforced per route.
- 600/hour/user.

## 12. Telemetry

- Counters: `quote_fetch_total{provider,status}`.

## 13. Edge cases & gotchas

- Yahoo rate-limits intermittent; we retry with jitter.
- Delisted tickers: provider returns null; UI falls back to last-known.

## 14. Tests

- [`src/lib/api-providers/index.test.ts`](../../src/lib/api-providers/index.test.ts)
- [`src/lib/api-providers/coinlore.test.ts`](../../src/lib/api-providers/coinlore.test.ts)
- [`src/lib/quote-time.test.ts`](../../src/lib/quote-time.test.ts)
- [`e2e/day-move-as-of.spec.ts`](../../e2e/day-move-as-of.spec.ts)

## 15. Related skills and rules

- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [exchange-rates](exchange-rates.md), [historical-prices](historical-prices.md).

## 16. Open questions / planned work

- Global circuit breaker per provider.
- Fallback matrix documented per market.
