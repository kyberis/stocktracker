# global-portfolio-selector

> Header dropdown that switches active portfolio scope app-wide.

## 1. Summary

Visible in the authenticated app header, lets the user switch the active portfolio or choose "All" (aggregate view). Persists selection to `user_settings` and updates the `PortfolioProvider` scope.

## 2. Status

- **Tier:** Free (single portfolio); behavior expands on Trefolio.
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Component | [`src/components/GlobalPortfolioSelector.tsx`](../../src/components/GlobalPortfolioSelector.tsx) | Header dropdown. |
| Context | [`src/lib/portfolio-context.tsx`](../../src/lib/portfolio-context.tsx) | `activePortfolioId` state. |

## 4. Data model

- Writes `user_settings.active_portfolio_id`.

## 5. API surface

- Uses `/api/portfolios` to populate list and `/api/user-settings` to persist.

## 6. UI surface

- Dropdown in `AppNav`.
- Mobile: modal sheet.

## 7. Business logic

- Default selection: last-used portfolio, fallback to `is_default`.
- "All" aggregates across portfolios for the summary header; table views stay per-portfolio.

## 8. External dependencies

- None.

## 9. Currency / FX / tax implications

- Aggregated views sum in EUR and display in preferred currency.

## 10. i18n

All locales.

## 11. Permissions / tier gating / rate limits

N/A.

## 12. Telemetry

- `analytics_events`: `portfolio.selected`.

## 13. Edge cases & gotchas

- On portfolio delete, the selector falls back to default.
- In demo mode, only the demo portfolio appears.

## 14. Tests

- Covered by E2E dashboard tests.

## 15. Related skills and rules

- [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)
- Related specs: [portfolios-multi](portfolios-multi.md).

## 16. Open questions / planned work

- Keyboard shortcut (cmd-K) to switch portfolios.
