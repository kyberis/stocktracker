# ai-analysis

> Per-holding AI analysis panel.

## 1. Summary
User opens a holding → clicks "AI analysis" → a streaming GPT response summarizes the company, recent news, and relevance to the portfolio.

## 2. Status
- **Tier:** Free (5/month), Bifolio (20/month), Trefolio (unlimited).
- **Feature flag:** _none_
- **Health:** C (prompts duplicated; no eval harness).
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/ai-analysis/`](../../src/app/api/ai-analysis) | Streaming endpoint. |
| Component | `AiAnalysisPanel.tsx` (if present) / inline on stock detail. |
| Library | [`src/lib/ai-models.ts`](../../src/lib/ai-models.ts) | Model registry. |

## 4. Data model
- `ai_logs` (request, response, tokens, model, user_id, latency_ms).

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/ai-analysis` | user | Free+ | Streams analysis. |

## 6. UI surface
- Markdown rendered via `AiMarkdown` (sanitized).

## 7. Business logic
- Prompt composition includes user's preferred locale and experience level.
- Streaming via `ai-stream` helper.

## 8. External dependencies
- OpenAI.

## 9. Currency / FX / tax implications
- Amounts shown in preferred currency.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- Monthly quota per tier; enforced server-side.

## 12. Telemetry
- `ai_analysis_requests_total`, latency histogram.

## 13. Edge cases & gotchas
- Sanitize markdown from AI; no raw HTML.
- Redact obvious PII before sending to OpenAI.

## 14. Tests
- Unit on prompt composition; snapshot on output rendering.

## 15. Related skills and rules
- [`.cursor/rules/legal-compliance.mdc`](../../.cursor/rules/legal-compliance.mdc)
- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [ai-stream](ai-stream.md), [ai-models-registry](ai-models-registry.md).

## 16. Open questions / planned work
- Centralize prompt library; eval harness.
