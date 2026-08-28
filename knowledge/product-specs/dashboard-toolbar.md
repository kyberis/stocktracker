# dashboard-toolbar

> Actions row: add holding, import, refresh, switch portfolio.

## 1. Summary
A sticky toolbar on the dashboard surfaces the most common actions. Emits commands through `PortfolioCommandProvider`.

## 2. Status
- **Tier:** Free
- **Feature flag:** `jobs_nav` (optional overlay; see [jobs-nav](jobs-nav.md)) or _none_
- **Health:** green
- **Owning skill:** [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Component | [`src/components/DashboardToolbar.tsx`](../../src/components/DashboardToolbar.tsx) | UI. |
| Context | [`src/contexts/portfolio-command-context.tsx`](../../src/contexts/portfolio-command-context.tsx) | Command bus. |

## 4. Data model
- None.

## 5. API surface
- Uses existing endpoints (add holding, import, refresh).

## 6. UI surface
- Primary actions on the toolbar; overflow menu for secondary.

## 7. Business logic
- Disabled states when Pro gating applies.
- Keyboard shortcuts (cmd-N, cmd-I, cmd-R).

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- Rate-limited actions show a toast on limit exceeded.

## 12. Telemetry
- `analytics_events`: `toolbar.action.*`.

## 13. Edge cases & gotchas
- Mobile: collapsed to a FAB.

## 14. Tests
- E2E toolbar interactions.

## 15. Related skills and rules
- [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)
- Related specs: [global-portfolio-selector](global-portfolio-selector.md).

## 16. Open questions / planned work
- User-configurable pinned actions.
