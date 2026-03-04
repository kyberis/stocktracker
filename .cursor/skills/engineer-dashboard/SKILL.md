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

## Delivery Checklist

```md
Dashboard Change Checklist
- [ ] Works in light and dark theme
- [ ] Works on mobile and desktop breakpoints
- [ ] Uses existing chart and card patterns
- [ ] Empty/loading/error states are handled
- [ ] Uses shared formatting helpers
```

## Coordination

- If change touches performance math, involve `engineer-tools`.
- If change adds tracked UI behavior, involve `analytics-instrumentation`.
- If change is user-facing feature work, include `qa-tester` for coverage.
