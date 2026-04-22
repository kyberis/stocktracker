# benchmark-overlay

> Overlay SPX / NDX / DJI / SX5E (and others) normalized to portfolio start.

## 1. Summary
Users can toggle one or more benchmarks on the chart. Each is normalized to the range's start value so relative performance is directly visible.

## 2. Status
- **Tier:** Free (basic); Pro for custom benchmark list.
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-charts`](../../.cursor/skills/engineer-charts/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Component | `BenchmarkOverlay` inside `PortfolioValueChart`. |
| API | [`src/app/api/portfolio-history/`](../../src/app/api/portfolio-history) | Includes benchmark series. |

## 4. Data model
- `user_settings.benchmarks` (JSON array).

## 5. API surface
- Same as portfolio-history.

## 6. UI surface
- Toggle chips above the chart; legend reflects active benchmarks.

## 7. Business logic
- Normalization: `y = (benchmark_t / benchmark_t0) * portfolio_t0`.
- Missing-data fallbacks (weekends).

## 8. External dependencies
- Yahoo historical.

## 9. Currency / FX / tax implications
- Index levels are unitless after normalization.

## 10. i18n
- Benchmark names localized.

## 11. Permissions / tier gating / rate limits
- `requireSubscriptionFeature('benchmarks')` for the full catalog.

## 12. Telemetry
- `analytics_events`: `chart.benchmark.toggled`.

## 13. Edge cases & gotchas
- Pro users may save a custom list.

## 14. Tests
- Unit for normalization.

## 15. Related skills and rules
- [`engineer-charts`](../../.cursor/skills/engineer-charts/SKILL.md)

## 16. Open questions / planned work
- Currency-aware benchmarks (hedged vs unhedged).
