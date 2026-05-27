# portfolio-performance-matrix

> Performance-by-period table in the portfolio hero card.

## 1. Summary

Replaces the default inline Recharts hero with a scannable matrix: rows per asset class (All / Stocks / ETFs / Crypto), columns for Today through All-time. Toggle between % and currency delta. The full interactive evolution chart lives on `/portfolio#chart`.

## 2. Status

- **Tier:** Free (short horizons); Pro (3Y, 5Y, 10Y, All)
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-dashboard`](../../.cursor/skills/engineer-dashboard/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Component | [`src/components/portfolio-v2/PortfolioHeroCard.tsx`](../../src/components/portfolio-v2/PortfolioHeroCard.tsx) | Hero shell: header, pills, matrix, footer |
| Component | [`src/components/portfolio-v2/PortfolioPerformanceMatrix.tsx`](../../src/components/portfolio-v2/PortfolioPerformanceMatrix.tsx) | Table UI |
| Hook | [`src/hooks/use-portfolio-performance-matrix.ts`](../../src/hooks/use-portfolio-performance-matrix.ts) | Data fetch + matrix build |
| Lib | [`src/lib/portfolio-performance-matrix.ts`](../../src/lib/portfolio-performance-matrix.ts) | Pure calculation |
| Chart (secondary) | [`src/components/portfolio-v2/PortfolioEvolutionChart.tsx`](../../src/components/portfolio-v2/PortfolioEvolutionChart.tsx) | Full chart on `/portfolio` only |

## 4. Data model

- **Single portfolio:** `GET /api/portfolio/history?range=all` snapshots with `stockValue`, `etfValue`, `cryptoValue`.
- **All portfolios:** Yahoo `/api/historical?period=all` per ticker + `calculatePortfolioValueOnDate`.
- **Today:** live quotes + market-hours rules (same as `MarketAwareBreakdown`).
- **Demo:** [`data/demo-performance-matrix.json`](../../data/demo-performance-matrix.json).

## 5. Related specs

- [portfolio-value-chart](portfolio-value-chart.md) — interactive chart (secondary surface)
