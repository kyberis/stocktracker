# dashboard-tabs

> The dashboard's top-level tabs: Metrics, Growth, Crypto, Market & Cash.

## 1. Summary
Tabs give the user focused views of the same data. Selection is persisted to `user_settings.dashboard_tab`. Lazy-loaded to keep initial render fast.

## 2. Status
- **Tier:** Free (Metrics + Market & Cash); Pro-gated for Metrics (advanced), Growth, Crypto.
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Component | [`src/components/Dashboard.tsx`](../../src/components/Dashboard.tsx) | Dashboard root. |
| Component | `MetricsTab.tsx`, `GrowthTab.tsx`, `CryptoPortfolioTab.tsx`, `MarketAndCash.tsx` |

## 4. Data model
- `user_settings.dashboard_tab`.

## 5. API surface
- Persistence via `/api/user-settings`.

## 6. UI surface
- Tab bar with keyboard navigation.

## 7. Business logic
- Pro-gated tabs show upgrade nudge when not entitled.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- Numbers shown in preferred currency.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- Pro gating via `requireSubscriptionFeature('metrics' | 'crypto-portfolio')`.

## 12. Telemetry
- `analytics_events`: `dashboard.tab.selected`.

## 13. Edge cases & gotchas
- New users: default to Metrics.

## 14. Tests
- E2E tab navigation.

## 15. Related skills and rules
- [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)
- Related specs: [metrics-tab](metrics-tab.md), [growth-tab](growth-tab.md), [crypto-portfolio-tab](crypto-portfolio-tab.md), [market-and-cash](market-and-cash.md).

## 16. Open questions / planned work
- User-configurable tab order.
