# metrics-tab

> Advanced portfolio metrics: Sharpe, Drawdown, Volatility, TTWROR, XIRR.

## 1. Summary
Displays risk/return metrics using the `ttwror-xirr-performance` library. Pro-only tab.

## 2. Status
- **Tier:** Bifolio+
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Component | [`src/components/MetricsTab.tsx`](../../src/components/MetricsTab.tsx) | UI. |
| API | [`src/app/api/metrics/`](../../src/app/api/metrics) | Metrics feed. |

## 4. Data model
- No storage; derived.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/metrics` | user | Pro | Metrics for the active range. |

## 6. UI surface
- Cards per metric with plain-language tooltips.

## 7. Business logic
- See [ttwror-xirr-performance](ttwror-xirr-performance.md).

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- All EUR-based; risk-free rate configurable (default 0).

## 10. i18n
- Labels localized.

## 11. Permissions / tier gating / rate limits
- `requireSubscriptionFeature('metrics')`.

## 12. Telemetry
- `analytics_events`: `metrics.viewed`.

## 13. Edge cases & gotchas
- Insufficient history shows a helpful empty state.

## 14. Tests
- Unit for calcs; E2E for tab rendering.

## 15. Related skills and rules
- [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)
- [`financial-calculations`](../../.cursor/skills/financial-calculations/SKILL.md)

## 16. Open questions / planned work
- Per-asset-class metrics.
