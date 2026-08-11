# portfolios-multi (retired)

> **Status: retired.** trefolio is single-portfolio only (Free and Pro). Historical multi-portfolio data is merged into the default via `consolidateUserToSinglePortfolio`.

## 1. Summary

Each user has exactly one portfolio (`is_default = 1`). Soft cap: `SOFT_CAPS.portfolios = { free: 1, pro: 1 }`. Creating additional portfolios and moving holdings between portfolios are blocked at the API.

## 2. Status

- **Tier:** All plans — 1 portfolio
- **Feature flag:** _none_
- **Health:** retired
- **Owning skill:** [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/portfolios/route.ts`](../../src/app/api/portfolios/route.ts) | GET list; POST create blocked when count ≥ 1 |
| API | [`src/app/api/portfolios/[id]/`](../../src/app/api/portfolios/[id]) | Rename / currency / delete |
| API | [`src/app/api/portfolios/move/`](../../src/app/api/portfolios/move) | Always 403 |
| DB | [`src/lib/db/portfolios.ts`](../../src/lib/db/portfolios.ts) | `mergePortfolioInto`, `consolidateUserToSinglePortfolio` |
| Script | [`scripts/merge-to-single-portfolio.ts`](../../scripts/merge-to-single-portfolio.ts) | One-shot prod consolidation |

## 4. Migration rules

- Non-default with holdings or cash → merge into `is_default` (combine colliding tickers / cash names)
- Empty extras → delete
- Soft-delete of source portfolio row after remap

## 5. Related

- Soft caps: [`src/lib/platform-config.ts`](../../src/lib/platform-config.ts)
- UI: [`GlobalPortfolioSelector.tsx`](../../src/components/GlobalPortfolioSelector.tsx) (name badge only)
