# demo-page

> Interactive `/demo` page rendering the real dashboard with static data.

## 1. Summary
Renders the production `Dashboard` component with seeded holdings/cash and `demoMode` flag. No API calls, mutations are no-ops, localStorage skipped.

## 2. Status
- **Tier:** public
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Page | [`src/app/demo/page.tsx`](../../src/app/demo/page.tsx) | Server component. |
| Shell | [`src/app/demo/demo-shell.tsx`](../../src/app/demo/demo-shell.tsx) | Providers wrapper. |
| Data | [`data/seed-holdings.json`](../../data/seed-holdings.json), [`data/seed-cash.json`](../../data/seed-cash.json), [`data/demo-quotes.json`](../../data/demo-quotes.json), [`data/demo-exchange-rates.json`](../../data/demo-exchange-rates.json) | Fixtures. |

## 4. Data model
- Static JSON seed.

## 5. API surface
- None.

## 6. UI surface
- Full dashboard + demo banner + [agent-dock](agent-dock.md) (Warren/Clara → `/signup`; no Feedback/Support).

## 7. Business logic
- `demoMode={true}` on `PortfolioProvider` disables fetches, auto-refresh, localStorage, and mutations.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- Fixed FX.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- Public.

## 12. Telemetry
- `demo_view_total`.

## 13. Edge cases & gotchas
- New context fields in the dashboard must have defaults in demo mode (see rule).

## 14. Tests
- E2E smoke.

## 15. Related skills and rules
- [`.cursor/rules/demo-page.mdc`](../../.cursor/rules/demo-page.mdc)
- Related specs: [dashboard-shell](dashboard-shell.md), [portfolio-context-demo-mode](portfolio-context-demo-mode.md).

## 16. Open questions / planned work
- Add crypto tab to demo data.
