# mutual-funds

> First-class mutual fund (fondos) asset type across search, holdings, import, and portfolio analytics.

## 1. Summary

Users can track mutual funds and SICAVs as `assetType: "fund"` — distinct from ETFs and stocks. Yahoo search returns `MUTUALFUND` quote types; add/import flows infer fund from quote type, name heuristics (SICAV, fondo, FI), and broker metadata. Portfolio snapshots store `fund_value_eur`; dashboard filters and performance matrix include a Funds bucket.

## 2. Status

- **Tier:** Free
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Library | [`src/lib/infer-asset-type.ts`](../../src/lib/infer-asset-type.ts) | `inferAssetType`, `assetTypeFromQuoteType`. |
| Library | [`src/lib/isin.ts`](../../src/lib/isin.ts) | `looksLikeIsin` for ISIN detection. |
| Modal | [`src/components/AddStockModal.tsx`](../../src/components/AddStockModal.tsx) | Fund type + MUTUALFUND auto-select; `initialAssetType="fund"` from menus. |
| UI | [`DashboardToolbar`](../../src/components/DashboardToolbar.tsx), [`PortfolioTable`](../../src/components/PortfolioTable.tsx), mobile add sheet | Explicit **Add Fund** entries in + Add and Add Transaction. |
| Import | [`src/hooks/useImportBrokerCSV.ts`](../../src/hooks/useImportBrokerCSV.ts), [`useImportAI.ts`](../../src/hooks/useImportAI.ts) | Preview type column + bulk import. |
| API | [`src/app/api/search/`](../../src/app/api/search) | Yahoo allowlist includes MUTUALFUND. |
| DB migration | v122 `fund_value_eur` on `portfolio_snapshots` | Per-type snapshot breakdown. |

## 4. Data model

- `holdings.asset_type`: `"stock" | "etf" | "crypto" | "fund"`
- `portfolio_snapshots.fund_value_eur`: EUR value of fund holdings on snapshot date

## 5. Business logic

- `MUTUALFUND` Yahoo quote type → fund
- ETF/UCITS/INDEX FUND in name → etf (not fund)
- mutual fund / SICAV / fondo / FI label → fund
- ISIN persisted on manual add when query or ticker looks like ISIN

## 6. Related specs

- [holdings-crud](holdings-crud.md)
- [explore-asset-search](explore-asset-search.md)
- [portfolio-snapshots-cron](portfolio-snapshots-cron.md)
