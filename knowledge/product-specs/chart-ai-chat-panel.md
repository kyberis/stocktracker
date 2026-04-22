# chart-ai-chat-panel

> Contextual AI chat about what the chart shows.

## 1. Summary
A side panel opened from the chart that lets the user ask questions like "what drove the drop on April 5?" — answered using the spike-attribution context + AI.

## 2. Status
- **Tier:** Bifolio+ (counts toward AI quota).
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-charts`](../../.cursor/skills/engineer-charts/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Component | [`src/components/ChartAiChatPanel.tsx`](../../src/components/ChartAiChatPanel.tsx) | UI panel. |
| API | [`src/app/api/ai-analysis/`](../../src/app/api/ai-analysis) | Streaming endpoint. |
| Library | [`src/lib/chart-chat-context.ts`](../../src/lib/chart-chat-context.ts) | Context builder. |

## 4. Data model
- Consumes existing chart context and spike attribution.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/ai-analysis` | user | Pro | Stream answer. |

## 6. UI surface
- Side panel with message history (session-scoped).
- Quick-ask chips.

## 7. Business logic
- Context window built from user's holdings + chart data; PII redacted.
- Conversation rate-limited per minute.

## 8. External dependencies
- OpenAI.

## 9. Currency / FX / tax implications
- Numbers mentioned in preferred currency.

## 10. i18n
- Streams in the user's locale (by instruction).

## 11. Permissions / tier gating / rate limits
- `requireSubscriptionFeature('ai')` + AI monthly quota.

## 12. Telemetry
- `ai_chat_messages_total`, `ai_chat_errors_total`.

## 13. Edge cases & gotchas
- Quota exhausted → UI shows an upgrade nudge.

## 14. Tests
- Unit on context builder.

## 15. Related skills and rules
- [`engineer-charts`](../../.cursor/skills/engineer-charts/SKILL.md)
- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [ai-analysis](ai-analysis.md), [spike-attribution](spike-attribution.md).

## 16. Open questions / planned work
- Multi-turn memory persisted per chart session.
