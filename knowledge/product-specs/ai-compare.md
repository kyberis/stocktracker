# ai-compare

> Compare two stocks side-by-side with AI analysis.

## 1. Summary
User picks two tickers; we compose a prompt with both companies' fundamentals and ask the model to compare them on key axes (growth, valuation, moat, risk).

## 2. Status
- **Tier:** Trefolio
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/ai-compare/`](../../src/app/api/ai-compare) | Streaming endpoint. |
| Admin | [`src/app/api/admin/ai-compare/`](../../src/app/api/admin/ai-compare) | Prompt-sandbox for admin. |

## 4. Data model
- Writes `ai_logs`.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/ai-compare` | user | Pro | `{ a, b }` returns stream. |

## 6. UI surface
- Two-column side-by-side comparison with streaming tokens.

## 7. Business logic
- Uses `ai-stream`; prompt built from `fundamentals`.

## 8. External dependencies
- OpenAI, fundamentals provider.

## 9. Currency / FX / tax implications
- Values shown in company's filing currency.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- `requireSubscriptionFeature('ai')` + monthly quota.

## 12. Telemetry
- `ai_compare_requests_total`.

## 13. Edge cases & gotchas
- Tickers with patchy fundamentals → surface a UI note.

## 14. Tests
- Snapshot on prompt.

## 15. Related skills and rules
- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [ai-analysis](ai-analysis.md).

## 16. Open questions / planned work
- Save comparisons for later.
