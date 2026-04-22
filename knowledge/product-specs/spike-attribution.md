# spike-attribution

> Explain sudden moves on the value chart ("dividend received," "cash in," "AAPL +7%").

## 1. Summary
Analyzes value deltas against transactions, dividends, cash flows, and top-ticker moves to produce a human-readable reason for a spike.

## 2. Status
- **Tier:** Free
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-charts`](../../.cursor/skills/engineer-charts/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Library | [`src/lib/chart-chat-context.ts`](../../src/lib/chart-chat-context.ts) | Attribution logic. |

## 4. Data model
- Reads transactions + holdings + quotes around the spike.

## 5. API surface
- Used by `/api/portfolio-history` in the response payload.

## 6. UI surface
- Inline on the tooltip; full detail in the AI chat panel.

## 7. Business logic
- Rules: cash flow > +3% drives "contribution"; single-ticker move > 5% drives "X moved Y%"; dividend windows → "dividend received."

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- EUR-based detection.

## 10. i18n
- Explanations localized from a catalog of templated strings.

## 11. Permissions / tier gating / rate limits
- N/A.

## 12. Telemetry
- `analytics_events`: `spike.attribution.generated`.

## 13. Edge cases & gotchas
- Don't surface weekend FX noise as a spike.

## 14. Tests
- Unit on classifier.

## 15. Related skills and rules
- [`engineer-charts`](../../.cursor/skills/engineer-charts/SKILL.md)
- Related specs: [chart-ai-chat-panel](chart-ai-chat-panel.md).

## 16. Open questions / planned work
- AI-enhanced rewriter for narrative summaries.
