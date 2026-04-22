# manual-assets

> Non-listed assets (real estate, private equity, collectibles) for net-worth tracking.

## 1. Summary

Users can record manual assets with a type, name, value, and currency. These feed into [net-worth-tracking](net-worth-tracking.md) but do not appear in market-data-driven charts.

## 2. Status

- **Tier:** Bifolio / Trefolio (net worth is a Pro feature)
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Modal | [`src/components/AddManualAssetModal.tsx`](../../src/components/AddManualAssetModal.tsx) | Create/edit UI. |
| API | [`src/app/api/holdings/route.ts`](../../src/app/api/holdings/route.ts) | Stored as holdings with `asset_type = 'manual'`. |

## 4. Data model

- `holdings.asset_type = 'manual'` with `ticker` set to a generated slug.
- `native_currency`, `shares = 1`, `avg_cost_eur` equals the current value.

## 5. API surface

Same as [holdings-crud](holdings-crud.md) with `asset_type = 'manual'`.

## 6. UI surface

- Modal in the dashboard toolbar.
- Net-worth page lists manual assets separately.

## 7. Business logic

- No live quote; value is user-set until changed.
- Valuations can be time-stamped for historical tracking (manual revaluations).

## 8. External dependencies

- None.

## 9. Currency / FX / tax implications

- Currency preserved; EUR-equivalent recomputed on display.

## 10. i18n

All locales.

## 11. Permissions / tier gating / rate limits

- Gated by `requireSubscriptionFeature('net-worth')`.

## 12. Telemetry

- `analytics_events`: `manual_asset.created`, `manual_asset.revalued`.

## 13. Edge cases & gotchas

- Excluded from chart time-series derived from market quotes.
- Included in portfolio summary total value when toggle is on.

## 14. Tests

- Covered by holdings tests.

## 15. Related skills and rules

- [`engineer-data`](../../.cursor/skills/engineer-data/SKILL.md)
- Related specs: [net-worth-tracking](net-worth-tracking.md).

## 16. Open questions / planned work

- Revaluation history table and chart.
