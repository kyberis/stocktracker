# portfolio-review

> AI-generated review of the user's entire portfolio.

## 1. Summary
Produces a concise review highlighting concentration, currency exposure, sector tilt, and suggestions. Used on-demand and embedded in the weekly digest.

## 2. Status
- **Tier:** Trefolio
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/portfolio-review/`](../../src/app/api/portfolio-review) | On-demand review. |
| Library | [`src/lib/digest-generation.ts`](../../src/lib/digest-generation.ts) | Reused by digests. |

## 4. Data model
- Writes `ai_logs`.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/portfolio-review` | user | Pro | Stream review. |

## 6. UI surface
- Inline review card on dashboard + digest email.

## 7. Business logic
- Prompt includes top holdings, sector shares, currency exposure; no PII.
- Respects the user's experience level (beginner vs professional).

## 8. External dependencies
- OpenAI.

## 9. Currency / FX / tax implications
- Figures in preferred currency.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- `requireSubscriptionFeature('ai')`.

## 12. Telemetry
- `portfolio_review_requests_total`.

## 13. Edge cases & gotchas
- Single-holding portfolios: surface a helpful note instead of forcing diversification advice.

## 14. Tests
- Unit on prompt composition.

## 15. Related skills and rules
- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [weekly-digest](weekly-digest.md), [ai-analysis](ai-analysis.md).

## 16. Open questions / planned work
- Historical-trend comparison across weekly runs.
