# portfolio-performance-matrix

> Performance-by-period table in the portfolio hero card.

## 1. Summary

Replaces the default inline Recharts hero with a scannable matrix: rows per asset class (All / Stocks / ETFs / Crypto), columns for Today through 10Y. Toggle between % and currency delta (flow-adjusted period P/L). Each non-empty cell has a `?` that opens a deterministic breakdown (current, past snapshot, net cash flows, attributed buys/sells, contrast vs purchase cost) plus an optional AI plain-language narrative. The full interactive evolution chart lives on `/portfolio#chart`.

## 2. Status

- **Tier:** Free (universal access; long horizons included); cell AI narrative uses `ai_consult` quota
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Component | [`src/components/portfolio-v2/PortfolioHeroCard.tsx`](../../src/components/portfolio-v2/PortfolioHeroCard.tsx) | Hero shell: header, pills, matrix, footer |
| Component | [`src/components/portfolio-v2/PortfolioPerformanceMatrix.tsx`](../../src/components/portfolio-v2/PortfolioPerformanceMatrix.tsx) | Table UI + cell `?` |
| Component | [`src/components/portfolio-v2/MatrixCellExplainSheet.tsx`](../../src/components/portfolio-v2/MatrixCellExplainSheet.tsx) | Per-cell formula / txs / AI narrative |
| Hook | [`src/hooks/use-portfolio-performance-matrix.ts`](../../src/hooks/use-portfolio-performance-matrix.ts) | Data fetch + matrix build |
| Lib | [`src/lib/portfolio-performance-matrix.ts`](../../src/lib/portfolio-performance-matrix.ts) | Pure calculation |
| Lib | [`src/lib/matrix-cell-breakdown.ts`](../../src/lib/matrix-cell-breakdown.ts) | Deterministic cell breakdown |
| API | [`src/app/api/portfolio/matrix-cell-explain/route.ts`](../../src/app/api/portfolio/matrix-cell-explain/route.ts) | LLM narrative for a breakdown |
| Chart (secondary) | [`src/components/portfolio-v2/PortfolioEvolutionChart.tsx`](../../src/components/portfolio-v2/PortfolioEvolutionChart.tsx) | Full chart on `/portfolio` only |

## 4. Data model

- **Single portfolio:** `GET /api/portfolio/history?range=all` snapshots with `stockValue`, `etfValue`, `cryptoValue`.
- **All portfolios:** Yahoo `/api/historical?period=all` per ticker + `calculatePortfolioValueOnDate`.
- **Today:** live quotes (same rules as hero day change).
- **Currency period cells:** `current − past − netCashFlow` (not vs purchase price).
- **Demo:** [`data/demo-performance-matrix.json`](../../data/demo-performance-matrix.json).

## 5. Related specs

- [portfolio-value-chart](portfolio-value-chart.md) — interactive chart (secondary surface)
