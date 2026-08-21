# tools-index

> `/tools` — index of power-user tools (rebalance, tax, backtest, planning, net worth, screener, strategies).

## 1. Summary
Single entry point to the tool suite, with favorites and tier gating.

## 2. Status
- **Tier:** Free (limited); Pro for most tools.
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-tools`](../../.cursor/skills/engineer-tools/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Page | [`src/app/(app)/tools/`](../../src/app/(app)/tools) | Index page. |
| Component | `FavoriteToolsBar.tsx` (if present) | Pinned tools. |

## 4. Data model
- Favorites stored in `user_settings`.

## 5. API surface
- N/A; navigational.

## 6. UI surface
- Grid of cards with tier badges.

## 7. Business logic
- Respects subscription features for CTA text.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A at index level.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- N/A.

## 12. Telemetry
- `analytics_events`: `tools.index.viewed`.

## 13. Edge cases & gotchas
- New tool additions require release note + SEO update.

## 14. Tests
- E2E smoke.

## 15. Related skills and rules
- [`engineer-tools`](../../.cursor/skills/engineer-tools/SKILL.md)
- Related specs: [rebalance-targets](rebalance-targets.md), [tax-reports](tax-reports.md), [backtest-whatif](backtest-whatif.md), [financial-planning](financial-planning.md), [net-worth-tracking](net-worth-tracking.md), [strategies](strategies.md), [favorite-tools](favorite-tools.md), [holdings-explorer](holdings-explorer.md), [stock-screener](stock-screener.md).

## 16. Open questions / planned work
- Search within tools.
