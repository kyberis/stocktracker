# market-move-toast

> In-app toast surfacing large intraday moves on user's holdings.

## 1. Summary

When a user's holding moves beyond a configurable threshold intraday, a non-blocking toast appears. Complements the alert system for explicit rules.

## 2. Status

- **Tier:** Bifolio+
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Component | [`src/components/MarketMoveToast.tsx`](../../src/components/MarketMoveToast.tsx) | UI. |

## 4. Data model

- Client-side only; detects threshold crossings from `PortfolioProvider` quote updates.

## 5. API surface

- Consumes live quotes via provider.

## 6. UI surface

- Toast in the lower-right.
- Tap to open the asset.

## 7. Business logic

- Threshold (default ±3% intraday) user-configurable.
- Dedupes: one toast per ticker per session.

## 8. External dependencies

- None additional.

## 9. Currency / FX / tax implications

- Move computed on native price change.

## 10. i18n

All locales.

## 11. Permissions / tier gating / rate limits

- Disabled in demo mode.

## 12. Telemetry

- `analytics_events`: `market_move.shown`, `market_move.clicked`.

## 13. Edge cases & gotchas

- Avoid during market-close hours to prevent stale-move toasts.

## 14. Tests

- Unit on threshold logic.

## 15. Related skills and rules

- [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)
- Related specs: [alerts](alerts.md).

## 16. Open questions / planned work

- Per-ticker thresholds.
