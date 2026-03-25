---
name: engineer-charts
description: Owns all portfolio chart components, tooltip, spike attribution, benchmark overlays, market session rendering, and data flow from snapshots to Recharts. Use when modifying PortfolioValueChart, ChartTooltip, RangeSelector, chart data processing, market hours visualization, spike detection, or any chart-related UI. Ensures demo page and tooltip stay in sync.
---

# Portfolio Chart Engineer

## Scope

Own the portfolio chart stack: data flow, rendering, tooltip, spike attribution, benchmark overlays, and market session visualization.

## Component Inventory

### Active chart stack (V2)

| File | Role |
|------|------|
| `src/components/portfolio-v2/PortfolioValueChart.tsx` | Main chart: Recharts AreaChart with snapshots, ranges, benchmarks, spike detection, session overlays |
| `src/components/portfolio-v2/ChartTooltip.tsx` | Tooltip: value/performance mode, benchmarks, events, spike contributors, market session chips |
| `src/components/portfolio-v2/RangeSelector.tsx` | Time-range pill selector (1D–1Y), Free/Pro gating |
| `src/components/portfolio-v2/PortfolioHeader.tsx` | Headline totals (value, day/total gain %), no chart logic |
| `src/components/portfolio-v2/BackfillCTA.tsx` | Snapshot backfill trigger for new users |
| `src/components/portfolio-v2/MarketAwareBreakdown.tsx` | Asset-type breakdown cards with market-aware day P/L |
| `src/components/portfolio-v2/PortfolioPage.tsx` | Standalone /portfolio page layout |

### Entry points

- **Desktop dashboard**: `src/components/dashboard-v2/DashboardPortfolioV2.tsx` renders `PortfolioValueChart` directly (no feature flag).
- **Mobile dashboard**: `src/components/mobile/MobileDashboard.tsx` renders `PortfolioValueChart` via dynamic import.
- **Demo page**: `src/app/demo/demo-shell.tsx` wraps `Dashboard` with `demoMode` — charts use static data from `data/demo-quotes.json`, `data/demo-exchange-rates.json`, `data/seed-holdings.json`.

## Data Flow

```
API /api/portfolio/history → SnapshotPoint[]
  ↓
effectivePoints (filtered by asset type)
  ↓
realPoints: ChartPoint[] (value, pct, stockValue, etfValue, cryptoValue, bench_*)
  ↓ spike detection (SPIKE_THRESHOLD = 0.3%)
  ↓ assigns spike, spikeDetail (per-type deltas from consecutive point diffs)
  ↓
masked (1D only: strips value/pct outside sessions, preserves bench_*, spike*, type values)
  ↓ padding ticks added for full-day x-axis span
  ↓
chartData → chartDataWithEvents (event markers attached)
  ↓
Recharts <AreaChart>
```

### Key types

- `SnapshotPoint`: `{ date, value, invested, stockValue, etfValue, cryptoValue }`
- `ChartPoint`: extends with `pct`, `spike`, `spikeDetail`, `events`, `bench_*` dynamic keys
- `SpikeDetail`: `{ delta, deltaPct, byType: { type, delta, pct }[] }`
- `SpikeContributor`: `{ ticker, name, contribution, dayChangePct }`

## Spike Attribution

**Detection**: In the `chartData` memo, consecutive points with ≥0.3% value change are flagged. Per-type deltas are computed by diffing `stockValue/etfValue/cryptoValue` between the two points — this is accurate snapshot data.

**Contributors**: A global `spikeContributors` memo ranks holdings by `weight × dayChangePct`. These are estimates (best signal without per-holding snapshot history), labeled "Likely movers" in the tooltip.

**Methodology note**: The tooltip renders a compact footer explaining: "Type breakdown from snapshot diff. Holdings estimated from day moves."

## Benchmark Overlays

- Benchmarks are fetched in the background regardless of mode (instant switching).
- `<Line>` elements, Y-domain inclusion, and tooltip entries only render when `mode === "performance"`.
- Normalization: first visible point = 0% baseline via `normalizeBenchmarkSeries`.
- Forward-fill ensures every chart point has a benchmark value.

## Market Sessions (1D)

- `getPortfolioMarketSessions()` from `src/lib/market-hours.ts` computes open/close windows.
- `ReferenceArea` components shade session bands and closed zones.
- `ReferenceLine` marks session open/close with labels.
- Closed zones use a hatched SVG pattern (`#pv2-closed-hatch`).
- Crypto holdings bypass closed-zone masking (24/7 markets).

## Mandatory Update Checklist

When modifying any chart component, verify ALL of the following:

### 1. ChartTooltip stays in sync

- [ ] If `ChartPoint` interface changes, `ChartTooltip` handles new fields
- [ ] If new data is passed to the chart, tooltip renders it appropriately
- [ ] Both performance and value mode branches are updated

### 2. Demo page works

- [ ] Visit `/demo` after changes — confirm no blank screen or errors
- [ ] New providers in `src/app/(app)/layout.tsx` must be mirrored in `src/app/demo/demo-shell.tsx`
- [ ] New data fields in `ChartPoint` must have sensible values from static demo data
- [ ] New effects in `PortfolioProvider` that make API calls must be gated with `if (demoMode) return;`

### 3. 1D masking preserves new fields

- [ ] Any new `ChartPoint` field needed for rendering must be preserved in the masking step (search for `const kept: ChartPoint`)
- [ ] Currently preserved: `bench_*`, `spike`, `spikeDetail`, `stockValue`, `etfValue`, `cryptoValue`

### 4. Y domain includes new data series

- [ ] If adding a new line/overlay, include its values in the `yDomain` memo

### 5. Mobile parity

- [ ] `MobileDashboard.tsx` renders `PortfolioValueChart` — verify changes work on mobile viewport (375px)

## Coordination

- If change touches financial calculations, involve `financial-calculations` skill.
- If change touches market hours logic, check `src/lib/market-hours.ts` exports.
- If change is a new feature, add to `src/lib/release-notes.ts` per release-notes rule.
- If change adds new user data or third-party calls, check `legal-compliance` rule.
