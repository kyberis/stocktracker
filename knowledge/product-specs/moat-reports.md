# moat-reports

> Long-form AI-graded "economic moat" reports per stock.

## 1. Summary
For each covered ticker, we produce a detailed moat report (grades across intangibles, switching costs, network effect, cost advantages, efficient scale). Results cached in `moat_reports` and refreshed periodically by the `moat-sync` cron.

## 2. Status
- **Tier:** Trefolio
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/moat-reports/`](../../src/app/api/moat-reports) | Report endpoints. |
| Cron | [`src/app/api/cron/moat-sync/`](../../src/app/api/cron/moat-sync) | 4-hourly sync. |
| DB | [`src/lib/db/moat-reports.ts`](../../src/lib/db/moat-reports.ts), [`moat-cache.ts`](../../src/lib/db/moat-cache.ts), [`moat-auto-tickers.ts`](../../src/lib/db/moat-auto-tickers.ts) | Storage. |

## 4. Data model
- `moat_reports` (final grades + narrative), `moat_cache` (raw fundamentals), `moat_auto_tickers` (queued universe).

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/moat-reports?ticker=` | user | Pro | Return cached report. |
| POST | `/api/moat-reports` | user | Pro | Request regeneration. |

## 6. UI surface
- Report page with grade cards + narrative sections.
- `MoatEvaluationPicker` lets the user adjust weights.

## 7. Business logic
- Quantitative engine: [`src/lib/moat-evaluator.ts`](../../src/lib/moat-evaluator.ts)
  scores eight criteria. Returns use **ROIC** (NOPAT / invested capital), not
  ROE — buybacks shrink equity and can push ROE above 100% without improving
  the operating engine. Declining retained earnings under buybacks is scored
  as FCF-funded capital return, not a second quality failure.
- Screening thesis wraps the cached moat score as `calc:moat_score_pct`
  (input pillar, not a verdict). Do not reimplement the evaluator there.
- Narrative grades produced by the model against a rubric; cached per ticker;
  TTL ≈ 30 days with staleness-based refresh.

## 8. External dependencies
- Alpha Vantage / FMP fundamentals, OpenAI.

## 9. Currency / FX / tax implications
- Underlying fundamentals in filing currency.

## 10. i18n
- Narrative generated in user's locale.

## 11. Permissions / tier gating / rate limits
- `requireSubscriptionFeature('ai')` + tier.

## 12. Telemetry
- `moat_reports_generated_total`.

## 13. Edge cases & gotchas
- Fundamentals coverage gaps → partial grades with explanation.

## 14. Tests
- [`src/lib/db/moat-reports.test.ts`](../../src/lib/db/moat-reports.test.ts)

## 15. Related skills and rules
- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [moat-screener](moat-screener.md), [moat-auto-tickers](moat-auto-tickers.md).

## 16. Open questions / planned work
- Explainability for each grade (why, what changed).
