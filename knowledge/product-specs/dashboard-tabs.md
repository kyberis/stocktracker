# dashboard-tabs

> The classic dashboard's top-level tabs: Portfolio, Diversification, Dividends, Metrics, Growth, Events, News.

## 1. Summary
Tabs give the user focused views of the same portfolio data. Since the April 2026 nav refactor (release 1.77.1), this tab bar only exists on the **opt-in legacy `/classic` dashboard** (`classic_home` flag, default off) — the default post-login route is Home v2 (`/`), which does not use this tab system at all and instead links out to individual views under `/tools/*` (see `tools-registry.ts`). Selection is persisted via the `?tab=` URL query param, not a DB column. Lazy-loaded to keep initial render fast.

## 2. Status
- **Tier:** Free (Portfolio, Diversification, Dividends, Events, News); Pro-gated for Metrics and Growth.
- **Feature flag:** `classic_home` gates the whole dashboard this tab bar lives in (default off). No separate flag for individual tabs.
- **Health:** green on `/classic`; not reachable from the default post-login route.
- **Owning skill:** [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Component | [`src/components/Dashboard.tsx`](../../src/components/Dashboard.tsx) | Classic dashboard root, rendered only at `/classic`. |
| Hook | [`src/lib/use-dashboard-tab-url.ts`](../../src/lib/use-dashboard-tab-url.ts) | Reads/writes the `?tab=` param, clamps invalid/gated tabs. |
| Config | [`src/lib/dashboard-tab-url.ts`](../../src/lib/dashboard-tab-url.ts) | `DASHBOARD_TAB_VALUES`, clamping rules. |
| Home v2 equivalent | [`src/components/dashboard-v2/AllocationTabs.tsx`](../../src/components/dashboard-v2/AllocationTabs.tsx) | Links out to `/tools/taxonomy`, `/tools/dividends`, etc. instead of switching a local tab. |

## 4. Data model
- None — tab selection lives only in the URL (`?tab=`), not persisted server-side.

## 5. API surface
- None. Pure client-side routing via `useSearchParams`/`router.replace`.

## 6. UI surface
- Plain `<button>` tab switcher (no ARIA `role="tab"`/`aria-selected"` on the switcher itself); each panel below it has `role="tabpanel"`.

## 7. Business logic
- `clampDashboardTab()`: a zero-holdings user requesting `diversification` is redirected to `portfolio`; free users requesting `metrics`/`growth` on mobile (`tierGate`) are redirected to `portfolio`.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- Numbers shown in preferred currency.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- Metrics/Growth clamp to `portfolio` for free users under the mobile tier-gate condition (see `clampDashboardTab`).

## 12. Telemetry
- Per-tab `analytics_events` (e.g. `events_tab_viewed`, `news_tab_viewed`), not a single generic `dashboard.tab.selected` event.

## 13. Edge cases & gotchas
- New users with zero holdings never land on `diversification` even via a direct `?tab=diversification` link — clamped back to `portfolio`.
- This tab bar is invisible to the ~100% of users on the `home_v2` default home; don't assume it's what most users see.

## 14. Tests
- `e2e/phase1-dashboard-tabs.spec.ts` covers the Home v2-era equivalents (`/tools/taxonomy`, `/tools/dividends`) plus the stealth-mode toggle; it does not exercise this tab bar directly since it isn't part of the default flow.

## 15. Related skills and rules
- [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)

## 16. Open questions / planned work
- `AllocationTabs.tsx`'s Home v2 CTAs still point at legacy `/tools/*` routes instead of adopting `?tab=`-style navigation — noted as a follow-up, not yet scheduled.
