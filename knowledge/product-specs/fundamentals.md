# fundamentals

> Income, balance sheet, and cash-flow data for Pro features.

## 1. Summary

Fundamentals power stock evaluation, moat reports, screener, and the stock intelligence tab. Pulled from Alpha Vantage and FMP, cached in `moat_cache` / similar, and served to UI endpoints.

## 2. Status

- **Tier:** Trefolio
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/fundamentals/`](../../src/app/api/fundamentals) | Per-ticker fundamentals. |
| Library | [`src/lib/api-providers/alphavantage.ts`](../../src/lib/api-providers/alphavantage.ts), [`fmp.ts`](../../src/lib/api-providers/fmp.ts) | Clients. |

## 4. Data model

- `moat_cache`, ad-hoc JSON cache tables — see migrations.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/fundamentals?ticker=` | user | Pro | Fundamentals JSON. |

## 6. UI surface

- Stock detail intelligence tab; moat report generator.

## 7. Business logic

- Cache-first lookup; refetch on staleness (30 days for static data).
- Missing-data handling (show "N/A" rather than 0).

## 8. External dependencies

- Alpha Vantage, FMP. Quota-sensitive — watch `AV_API_KEY` minute limit.

## 9. Currency / FX / tax implications

- Reported in the company's filing currency.

## 10. i18n

Key names English, values shown with locale-aware formatters.

## 11. Permissions / tier gating / rate limits

- `requireSubscriptionFeature('fundamentals')`.
- 60/hour/user.

## 12. Telemetry

- `fundamentals_fetch_total{provider}`.

## 13. Edge cases & gotchas

- Non-US tickers have patchy AV coverage — fallback to FMP.
- Use `asOf` timestamp to avoid stale data confusion.

## 14. Tests

- Provider tests; integration in moat tests.

## 15. Related skills and rules

- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [moat-reports](moat-reports.md), [stock-evaluation](stock-evaluation.md).

## 16. Open questions / planned work

- Alternative free-tier provider for non-US fundamentals.
