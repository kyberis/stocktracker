# growth-tab

> Projected portfolio growth under various assumptions.

## 1. Summary
User enters expected annual return and recurring contributions; we project the portfolio value over years.

## 2. Status
- **Tier:** Free (basic); Pro for recurring-contribution chart.
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-tools`](../../.cursor/skills/engineer-tools/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Component | [`src/components/GrowthTab.tsx`](../../src/components/GrowthTab.tsx) | UI. |

## 4. Data model
- No storage; client-side calc.

## 5. API surface
- None unique; uses dashboard data.

## 6. UI surface
- Recharts line showing compounding vs contributions.

## 7. Business logic
- Compound interest formula with monthly contributions.
- Respects user's preferred currency.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- User-controlled return assumptions; figures in preferred currency.

## 10. i18n
- Labels localized.

## 11. Permissions / tier gating / rate limits
- Some controls Pro-gated.

## 12. Telemetry
- `analytics_events`: `growth.simulated` with inputs.

## 13. Edge cases & gotchas
- Reasonable-input validation (max horizon 50 years, max contribution cap).

## 14. Tests
- Unit for compounding formula.

## 15. Related skills and rules
- [`engineer-tools`](../../.cursor/skills/engineer-tools/SKILL.md)
- Related specs: [financial-planning](financial-planning.md).

## 16. Open questions / planned work
- Monte-Carlo uncertainty bands.
