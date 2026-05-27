# portfolio-value-chart

> Interactive portfolio evolution chart (Recharts). **Default surface moved to `/portfolio#chart`**; the dashboard hero uses [portfolio-performance-matrix](portfolio-performance-matrix.md).

## 1. Summary
Recharts line chart backed by `portfolio_snapshots` + a live quote overlay for the current tail. Supports benchmarks, range switching, market-session shading, and spike attribution.

## 2. Status
- **Tier:** Free (1M history); Pro for full history.
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-charts`](../../.cursor/skills/engineer-charts/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Component | [`src/components/portfolio-v2/PortfolioEvolutionChart.tsx`](../../src/components/portfolio-v2/PortfolioEvolutionChart.tsx) | Root chart ( `/portfolio` ). |
| Component | `ChartTooltip`, `RangeSelector`, `BenchmarkOverlay`, `SpikeMarker`. |
| API | [`src/app/api/portfolio-history/`](../../src/app/api/portfolio-history) | Returns snapshots + benchmarks. |

## 4. Data model
- Reads `portfolio_snapshots` and live quotes.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/portfolio-history?range=&benchmarks=` | user | Free | Series + overlays. |

## 6. UI surface
- Chart canvas, range selector, legend, benchmark toggles.

## 7. Business logic
- Live tail stitches current quote onto the last snapshot.
- Spike attribution runs on the series to surface events (dividend, cash-in).
- Benchmarks shown as normalized percentage overlays.

## 8. External dependencies
- Recharts.

## 9. Currency / FX / tax implications
- Series in EUR; display conversion at render.

## 10. i18n
- Axis/label formatters honor locale.

## 11. Permissions / tier gating / rate limits
- `portfolio-history-full` gates long ranges.

## 12. Telemetry
- `analytics_events`: `chart.range.selected`, `chart.benchmark.toggled`.

## 13. Edge cases & gotchas
- Weekends/holidays — hold last-known value (no flat drops).
- Large ranges virtualized to keep the tooltip fast.

## 14. Tests
- Unit for series builder; E2E for interactions.

## 15. Related skills and rules
- [`engineer-charts`](../../.cursor/skills/engineer-charts/SKILL.md)
- Related specs: [chart-tooltip](chart-tooltip.md), [range-selector](range-selector.md), [spike-attribution](spike-attribution.md), [benchmark-overlay](benchmark-overlay.md), [market-session-rendering](market-session-rendering.md).

## 16. Open questions / planned work
- Touch-first tooltip on mobile.
