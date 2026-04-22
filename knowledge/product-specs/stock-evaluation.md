# stock-evaluation

> Standalone stock-evaluation tool (valuation, growth, risk).

## 1. Summary
Independent from AI analysis: a rule-based + AI-augmented evaluation at a single ticker granularity (valuation multiples, growth rate, debt, ROIC).

## 2. Status
- **Tier:** Trefolio
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/stock-evaluation/`](../../src/app/api/stock-evaluation) | Endpoint. |
| Page | `src/app/(app)/stock/` | Stock detail page with evaluation tab. |

## 4. Data model
- Cached in `moat_cache` (fundamentals reuse).

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/stock-evaluation?ticker=` | user | Pro | Evaluation summary. |

## 6. UI surface
- Card list with colored badges (cheap, fair, expensive).

## 7. Business logic
- Ratios: P/E vs industry, P/FCF, debt/equity, ROIC; AI adds narrative.

## 8. External dependencies
- Fundamentals.

## 9. Currency / FX / tax implications
- Values in filing currency.

## 10. i18n
- Labels localized.

## 11. Permissions / tier gating / rate limits
- `requireSubscriptionFeature('stock-evaluation')`.

## 12. Telemetry
- `stock_evaluation_viewed_total`.

## 13. Edge cases & gotchas
- Banks / REITs have different ratio sets — separate template.

## 14. Tests
- Unit on ratio evaluation.

## 15. Related skills and rules
- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [moat-reports](moat-reports.md), [fundamentals](fundamentals.md).

## 16. Open questions / planned work
- Per-sector rubric variants.
