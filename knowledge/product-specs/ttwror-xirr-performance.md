# ttwror-xirr-performance

> Time-weighted and money-weighted performance metrics.

## 1. Summary

TTWROR (time-weighted) and XIRR (money-weighted) are the gold standards for portfolio performance. We compute both over arbitrary ranges using the transaction ledger and snapshots. Exposed on the dashboard metrics tab and tools.

## 2. Status

- **Tier:** Bifolio + (metrics tab is Pro)
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`financial-calculations`](../../.cursor/skills/financial-calculations/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Library | `src/lib/backtest.ts`, `src/lib/metrics-snapshot.ts` | Calculations. |
| API | [`src/app/api/metrics/`](../../src/app/api/metrics) | Serves metrics tab. |
| UI | [`src/components/MetricsTab.tsx`](../../src/components/MetricsTab.tsx) | Dashboard metrics. |

## 4. Data model

- Reads `transactions` + `portfolio_snapshots`.
- Produces: `{ ttwror, xirr, sharpe, volatility, maxDrawdown, sortino? }`.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/metrics` | user | Bifolio | Metrics for active portfolio/range. |

## 6. UI surface

- Metrics tab on dashboard.
- Tooltips explain each metric in plain language.

## 7. Business logic

- XIRR uses Newton's method with bracketed fallback to bisection.
- TTWROR splits the series at each cash-flow event.
- Sharpe uses a configurable risk-free rate (default 0 for now).

## 8. External dependencies

- None.

## 9. Currency / FX / tax implications

- All EUR-based; cash flows converted at transaction date.

## 10. i18n

Metric names localized.

## 11. Permissions / tier gating / rate limits

- Gated by `requireSubscriptionFeature('metrics')`.

## 12. Telemetry

- `analytics_events`: `metrics.viewed` with range.

## 13. Edge cases & gotchas

- XIRR non-convergence on weird cash-flow patterns — we return null and a UI note.
- Very short ranges → high-noise metrics; UI hints at min recommended range.

## 14. Tests

- Unit with known fixtures (industry-standard XIRR tests).

## 15. Related skills and rules

- [`financial-calculations`](../../.cursor/skills/financial-calculations/SKILL.md)
- Related specs: [metrics-tab](metrics-tab.md), [backtest-whatif](backtest-whatif.md).

## 16. Open questions / planned work

- Per-asset-class metrics.
