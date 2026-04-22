# market-session-rendering

> Distinct visual treatment for pre-market, RTH, and after-hours.

## 1. Summary
On short-range charts (1D, 5D) we shade pre-market and after-hours regions to contextualize price movement. Logic derives session from NYSE/NASDAQ/XETRA/LSE schedules.

## 2. Status
- **Tier:** Free
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-charts`](../../.cursor/skills/engineer-charts/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Library | `src/lib/market-hours.ts` (or similar) | Session helpers. |
| Component | `MarketSessionBands` inside chart. |

## 4. Data model
- Static schedule table keyed by exchange code.

## 5. API surface
- N/A.

## 6. UI surface
- Subtle background bands + icons in tooltip.

## 7. Business logic
- Timezone-aware; uses exchange timezone, not user's.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- Session labels localized.

## 11. Permissions / tier gating / rate limits
- N/A.

## 12. Telemetry
- None.

## 13. Edge cases & gotchas
- Daylight saving transitions — verify against fixture dates.

## 14. Tests
- Unit on schedule helper.

## 15. Related skills and rules
- [`engineer-charts`](../../.cursor/skills/engineer-charts/SKILL.md)

## 16. Open questions / planned work
- Crypto: 24/7 with no shading.
