# dashboard-shell

> Authenticated app shell: providers, nav, outlet, and theme plumbing.

## 1. Summary

`src/app/(app)/layout.tsx` is the authenticated shell. It composes `PortfolioProvider`, `PortfolioCommandProvider`, `FeatureFlagProvider`, `AnalyticsProvider`, renders `AppNav`, `CapacitorBridge`, `CookieConsent`, `InstallPrompt`, and mounts the page outlet.

## 2. Status
- **Tier:** all
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Layout | [`src/app/(app)/layout.tsx`](../../src/app/(app)/layout.tsx) | App shell. |
| Shell | [`src/app/(app)/dashboard-shell.tsx`](../../src/app/(app)/dashboard-shell.tsx) | Dashboard wrapping. |

## 4. Data model
- No storage; composes state via contexts.

## 5. API surface
- Shell depends on `/api/auth/me`, `/api/holdings`, `/api/portfolios`, etc.

## 6. UI surface
- `AppNav`, bottom bar on mobile, global search button.

## 7. Business logic
- Any new provider must also be added to demo-shell (see [`.cursor/rules/demo-page.mdc`](../../.cursor/rules/demo-page.mdc)).
- Error boundary wrapping with per-widget fallbacks.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- Loads FX cache up-front.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- `requireUser()` enforced by middleware on `(app)` routes.

## 12. Telemetry
- `analytics_events`: `app.opened`, `app.navigated`.

## 13. Edge cases & gotchas
- Hydration mismatches on theme — use `suppressHydrationWarning` on root.
- New contexts must also update `demo-shell.tsx`.

## 14. Tests
- E2E smoke confirms shell renders and nav works.

## 15. Related skills and rules
- [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)
- [`.cursor/rules/demo-page.mdc`](../../.cursor/rules/demo-page.mdc)
- Related specs: [portfolio-context-demo-mode](portfolio-context-demo-mode.md).

## 16. Open questions / planned work
- Incremental streaming for slow initial loads.
