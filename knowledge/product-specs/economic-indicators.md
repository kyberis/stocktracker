# economic-indicators

> Macro dashboard: rates, inflation, unemployment, PMI, etc.

## 1. Summary

Pro feature. Shows key European + US macro indicators with trend sparklines. Used alongside the portfolio to contextualize performance.

## 2. Status

- **Tier:** Trefolio
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Page | [`src/app/(app)/economic-indicators/`](../../src/app/(app)/economic-indicators) | Page. |
| API | [`src/app/api/economic-indicators/`](../../src/app/api/economic-indicators) | Data endpoint. |
| Component | [`src/components/EconomicIndicators.tsx`](../../src/components/EconomicIndicators.tsx) | Widget. |

## 4. Data model

- Cached in a generic economic-data cache table (verify: see migrations).

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/economic-indicators` | user | Pro | Returns indicator map. |

## 6. UI surface

- Page with cards per indicator; dashboard widget variant.

## 7. Business logic

- Sparklines from last 12 months.
- Source attribution per indicator.

## 8. External dependencies

- FMP or AV for macro series; ECB data when available.

## 9. Currency / FX / tax implications

- Values in native units (%, bp).

## 10. i18n

Labels localized.

## 11. Permissions / tier gating / rate limits

- `requireSubscriptionFeature('economic-indicators')`.

## 12. Telemetry

- `analytics_events`: `economic.viewed`.

## 13. Edge cases & gotchas

- Differing frequency per series (monthly vs quarterly) — UI handles gaps.

## 14. Tests

- Integration on cache read path.

## 15. Related skills and rules

- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [market-insights](market-insights.md).

## 16. Open questions / planned work

- User-configurable indicator set.
