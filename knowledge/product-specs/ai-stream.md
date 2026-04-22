# ai-stream

> Shared helper for streaming AI responses from Next.js API routes.

## 1. Summary
Unified helper that wraps the OpenAI streaming client with retry, quota checks, and structured logging. Used by all AI features.

## 2. Status
- **Tier:** system
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Library | `src/lib/ai-stream.ts` (or `ai-*` helpers). |

## 4. Data model
- Writes `ai_logs` on completion.

## 5. API surface
- N/A (library).

## 6. UI surface
- N/A.

## 7. Business logic
- Parses chunks as they arrive; emits `Server-Sent Events`.
- On error, emits a final error chunk and closes.
- Respects `AbortSignal` from the request.

## 8. External dependencies
- OpenAI SDK (or fetch-based client).

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- N/A.

## 11. Permissions / tier gating / rate limits
- Enforces per-user AI quota at call time.

## 12. Telemetry
- `ai_stream_chunks_total`, `ai_stream_errors_total`.

## 13. Edge cases & gotchas
- OpenAI outages: return 503 with retry-after.
- Prompt injection sanitization is the caller's responsibility.

## 14. Tests
- Unit on chunk parsing + error path.

## 15. Related skills and rules
- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [ai-analysis](ai-analysis.md), [ai-compare](ai-compare.md), [portfolio-review](portfolio-review.md).

## 16. Open questions / planned work
- Migrate to Vercel AI Gateway for provider routing.
