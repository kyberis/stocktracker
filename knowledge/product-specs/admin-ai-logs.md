# admin-ai-logs

> Inspect AI usage logs and costs.

## 1. Summary
Table of AI requests: user, model, tokens, latency, and computed cost. Filter by date, user, route.

## 2. Status
- **Tier:** admin
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/admin/ai-logs/`](../../src/app/api/admin/ai-logs) | List. |
| DB | [`src/lib/db/ai-logs.ts`](../../src/lib/db/ai-logs.ts) | Storage. |

## 4. Data model
- `ai_logs`.

## 5. API surface
- GET filtering endpoints.

## 6. UI surface
- Table with exports.

## 7. Business logic
- Cost computed from `ai-models-registry`.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- Cost shown in USD (provider currency).

## 10. i18n
- English.

## 11. Permissions / tier gating / rate limits
- Admin.

## 12. Telemetry
- N/A.

## 13. Edge cases & gotchas
- Token counts missing on provider errors.

## 14. Tests
- DB tests.

## 15. Related skills and rules
- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [ai-models-registry](ai-models-registry.md).

## 16. Open questions / planned work
- Per-feature ROI dashboards.
