# financial-planning

> Long-term planning tool (retirement, FIRE, savings goal).

## 1. Summary
Combines projected returns, contributions, inflation, and tax assumptions to estimate years-to-goal.

## 2. Status
- **Tier:** Trefolio
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-tools`](../../.cursor/skills/engineer-tools/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Page | [`src/app/(app)/tools/planning/`](../../src/app/(app)/tools/planning) | Page. |
| API | [`src/app/api/planning/`](../../src/app/api/planning) | Compute endpoint. |

## 4. Data model
- No storage; client-side compute with server assist for long horizons.

## 5. API surface
- Optional endpoint; computation can also be client-side for simple cases.

## 6. UI surface
- Sliders + projection chart.

## 7. Business logic
- Real vs nominal toggle; inflation assumption.
- Tax drag applied annually where enabled.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- Preferred currency; EUR-based math underlying.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- `requireSubscriptionFeature('planning')`.

## 12. Telemetry
- `planning_runs_total`.

## 13. Edge cases & gotchas
- Negative real returns covered (user choice).

## 14. Tests
- Unit on the compounding + inflation math.

## 15. Related skills and rules
- [`engineer-tools`](../../.cursor/skills/engineer-tools/SKILL.md)
- Related specs: [growth-tab](growth-tab.md).

## 16. Open questions / planned work
- Save scenarios and compare later.
