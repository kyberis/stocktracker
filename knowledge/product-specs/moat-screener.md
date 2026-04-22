# moat-screener

> Filter the screener universe by moat scores.

## 1. Summary
Adds moat grades as filter inputs in the screener, letting the user find "high-moat, undervalued" candidates.

## 2. Status
- **Tier:** Trefolio
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/screener/`](../../src/app/api/screener) | Screener endpoint. |
| Component | `StockScreener.tsx` with moat filter UI. |

## 4. Data model
- Joins `screener_cache` with `moat_reports`.

## 5. API surface
- Same as screener with additional `moat` filter params.

## 6. UI surface
- Moat grade selector chips.

## 7. Business logic
- Missing moat scores excluded from filter results (opt-in include).

## 8. External dependencies
- None beyond moat.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- `requireSubscriptionFeature('screener')`.

## 12. Telemetry
- `moat_screener_used`.

## 13. Edge cases & gotchas
- No-result UX encourages broadening filters.

## 14. Tests
- E2E filter flow.

## 15. Related skills and rules
- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [moat-reports](moat-reports.md), [stock-screener](stock-screener.md).

## 16. Open questions / planned work
- Preset "Wide-Moat Value" bundle.
