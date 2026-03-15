---
name: engineer-dashboard
description: Implements dashboard and visualization features for StockTracker using existing UI patterns, recharts conventions, and theme rules. Use when working on portfolio views, charts, tables, summaries, and dashboard UX.
---

# Dashboard and Visualization Engineer

## Scope

Own dashboard UI and charting behavior across portfolio screens.

## Primary Files

- `src/components/Dashboard.tsx`
- `src/components/PortfolioSummary.tsx`
- `src/components/PortfolioBenchmarkChart.tsx`
- `src/components/StockChart.tsx`
- `src/components/PortfolioProjection.tsx`
- `src/components/PortfolioTable.tsx`
- `src/components/PerformanceMetrics.tsx`
- `src/components/EconomicIndicators.tsx`
- `src/components/TaxonomyView.tsx`
- `src/components/RebalancingView.tsx`
- `src/components/DividendSummary.tsx`
- `src/components/MarketAndCash.tsx`
- `src/components/StockRow.tsx`

## Core Implementation Rules

- Use `recharts` components already present in the codebase.
- Respect design tokens and dark-mode rules in `.cursor/rules/ui-design-system.mdc`.
- Keep dashboard cards and controls consistent with existing Tailwind utility patterns.
- Prefer composition over large monolithic components.
- Keep loading and empty states explicit and user-friendly.

## Chart Conventions

- Read theme with `useTheme()` where dynamic chart colors are needed.
- Axis tick color: `isDark ? "#94a3b8" : "#9ca3af"`
- Axis line color: `isDark ? "#334155" : "#e5e7eb"`
- Keep tooltip containers readable in both themes.
- Preserve benchmark/series color consistency across screens.

## Data Formatting

- Use `formatCurrency` and `formatPercent` from `src/lib/utils.ts`.
- Avoid duplicate formatting helpers in components.
- Keep percent signs, rounding, and locale behavior consistent.

## Quality Gates (Mandatory)

Every dashboard change MUST pass all gates below before delivery.

### Gate 1: E2E Tests (Playwright)

- **Add or update** an E2E spec in `e2e/` for every user-visible change.
- Reuse helpers from `e2e/helpers.ts` (`createTestUser`, `loginViaUI`, `dismissOverlays`, etc.).
- Cover the happy path, empty state, and at least one error/edge case.
- If the feature is tier-gated, test both free and pro user paths.
- Run `npx playwright test <spec>` locally before marking done.

### Gate 2: All Themes

Verify rendering in **all four themes** (Default, Canvas, Terminal, Studio):

- Invoke the `theme-parity` skill checklist for any new or modified component.
- Use CSS custom properties only — never hard-code colors, fonts, or radii.
- Verify forced dark (Terminal, Studio) and forced light (Canvas) modes.
- Sidebar layout (Studio) vs top-nav layout (Default, Canvas, Terminal) must both work.
- E2E theme spec (`e2e/dashboard-themes.spec.ts`) must pass after the change.

### Gate 3: Responsive Design

Test at **three breakpoints** minimum:

| Breakpoint | Width | What to verify |
|---|---|---|
| Mobile | 375px | Touch targets ≥44px, single-column layout, no horizontal scroll, MobileTabBar visible |
| Tablet | 768px | Cards reflow correctly, modals fit, no clipped content |
| Desktop | 1280px | Full layout, sidebar (Studio), multi-column grids |

- Use Playwright `page.setViewportSize()` in E2E specs to test mobile and desktop paths.
- Verify `MobileTabBar` appears on mobile and hides on desktop.
- Test drawer vs page navigation (StockDetailDrawer on desktop, `/stock/[ticker]` on mobile).

### Gate 4: Mobile Native (Capacitor)

For changes that affect layout, navigation, overlays, or input handling:

- Verify safe area insets are respected (`env(safe-area-inset-*)`) — content not obscured by notch or home indicator.
- Confirm keyboard behavior — input fields scroll into view, keyboard doesn't obscure content.
- Ensure no `window` or `localStorage` access that breaks in Capacitor WebView context.
- Gate Capacitor-specific code with `isNativePlatform()` from `src/lib/capacitor.ts`.
- If introducing new overlays/modals, verify they work with Android hardware back button (`CapacitorBridge`).

### Gate 5: Code Coverage ≥ 80%

- New and modified files must maintain **≥ 80% line coverage** (unit + E2E combined).
- Run `npx vitest run --coverage` and check the report for touched files.
- If coverage for a changed file drops below 80%, add unit tests before delivery.
- Pure UI components may use E2E coverage to satisfy the threshold; pure logic files must have Vitest unit tests.
- Never reduce existing coverage — if a file was above 80%, keep it there.

## Delivery Checklist

```md
Dashboard Change Checklist
- [ ] E2E spec added/updated in e2e/ (happy path + edge cases)
- [ ] Works in all 4 themes (Default, Canvas, Terminal, Studio)
- [ ] Works at mobile (375px), tablet (768px), and desktop (1280px)
- [ ] Capacitor/native: safe areas, keyboard, back button verified
- [ ] Code coverage ≥ 80% on new/modified files (`npx vitest run --coverage`)
- [ ] Uses existing chart and card patterns
- [ ] Empty/loading/error states are handled
- [ ] Uses shared formatting helpers
- [ ] E2E suite passes locally (`npx playwright test`)
```

## Coordination

- If change touches performance math, involve `engineer-tools`.
- If change adds tracked UI behavior, involve `analytics-instrumentation`.
- If change is user-facing feature work, include `qa-tester` for coverage.
- If change affects theme rendering, invoke `theme-parity` skill.
- If change affects native mobile behavior, involve `engineer-mobile`.
