# range-selector

> 1D / 5D / 1M / 3M / 6M / YTD / 1Y / ALL range controls.

## 1. Summary
Controls the chart range. Gated ranges show an upgrade nudge for Free users on ranges > 1M.

## 2. Status
- **Tier:** Free (up to 1M); Pro for longer.
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-charts`](../../.cursor/skills/engineer-charts/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Component | [`src/components/RangeSelector.tsx`](../../src/components/RangeSelector.tsx) | UI. |

## 4. Data model
- Preferred range stored in `user_settings`.

## 5. API surface
- Via `/api/portfolio-history?range=`.

## 6. UI surface
- Segmented control.

## 7. Business logic
- On mobile, collapse to a dropdown to preserve space.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- Range labels localized where applicable.

## 11. Permissions / tier gating / rate limits
- Gated for Pro on longer ranges.

## 12. Telemetry
- `analytics_events`: `chart.range.selected`.

## 13. Edge cases & gotchas
- "ALL" range uses compacted snapshots; may show weekly resolution.

## 14. Tests
- E2E range switching.

## 15. Related skills and rules
- [`engineer-charts`](../../.cursor/skills/engineer-charts/SKILL.md)
- Related specs: [portfolio-value-chart](portfolio-value-chart.md).

## 16. Open questions / planned work
- Custom range picker (date-to-date).
