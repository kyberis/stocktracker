# market-and-cash

> Consolidated view of current prices and cash balances.

## 1. Summary
A focused tab that pairs cash-by-currency with the holdings table sorted by daily change. Aimed at morning check-in usage.

## 2. Status
- **Tier:** Free
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Component | [`src/components/MarketAndCash.tsx`](../../src/components/MarketAndCash.tsx) | UI. |

## 4. Data model
- Holdings + cash.

## 5. API surface
- Uses existing holdings/cash/quotes endpoints.

## 6. UI surface
- Two-column layout on desktop; stacked on mobile.

## 7. Business logic
- Cash sorted by EUR-equivalent.
- Holdings sorted by daily change.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- EUR-equivalent tooltips.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- N/A.

## 12. Telemetry
- `analytics_events`: `market_cash.viewed`.

## 13. Edge cases & gotchas
- When no cash entries, show a helpful CTA to add one.

## 14. Tests
- Visual + E2E.

## 15. Related skills and rules
- [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)
- Related specs: [cash-balances](cash-balances.md).

## 16. Open questions / planned work
- Multi-currency cash allocation donut.
