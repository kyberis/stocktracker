# chart-tooltip

> Hover breakdown, attribution, and benchmark comparison on the chart.

## 1. Summary
Rich tooltip showing portfolio value, daily change vs benchmarks, holdings breakdown, and any attributed spike at the hover point.

## 2. Status
- **Tier:** Free
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-charts`](../../.cursor/skills/engineer-charts/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Component | [`src/components/ChartTooltip.tsx`](../../src/components/ChartTooltip.tsx) | UI. |

## 4. Data model
- Receives `ChartPoint[]` with benchmark values + spike info.

## 5. API surface
- None (client-side).

## 6. UI surface
- Floating card near cursor; sticky on touch.

## 7. Business logic
- Formats amounts in user's preferred currency.
- Surfaces the most informative one-line attribution.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- Display-only conversion.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- N/A.

## 12. Telemetry
- `analytics_events`: `tooltip.attribution.shown`.

## 13. Edge cases & gotchas
- Do not show benchmark diff if benchmark data is missing at that timestamp.

## 14. Tests
- Snapshot + unit tests on formatter.

## 15. Related skills and rules
- [`engineer-charts`](../../.cursor/skills/engineer-charts/SKILL.md)
- Related specs: [portfolio-value-chart](portfolio-value-chart.md), [spike-attribution](spike-attribution.md).

## 16. Open questions / planned work
- Tooltip in the demo stays in sync (enforced by `engineer-charts` skill).
