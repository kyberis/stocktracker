# ai-import-assist

> AI fallback that turns free-text descriptions into structured transactions.

## 1. Summary
When no parser matches the upload, the user can paste text or attach a raw document; an AI extracts rows into the shared schema for review.

## 2. Status
- **Tier:** Free (trial), Pro (regular use).
- **Feature flag:** _none_
- **Health:** C (validation is crucial).
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/import/ai/`](../../src/app/api/import/ai) | AI extraction. |

## 4. Data model
- Writes `ai_logs`; no persistent state other than the resulting transactions.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/import/ai` | user | Free (limited) | Returns candidate rows. |

## 6. UI surface
- Text/file input → preview table with user-editable fields before commit.

## 7. Business logic
- Strict output schema validation; rows with missing required fields flagged.
- Prompts explicitly disallow extrapolation.

## 8. External dependencies
- OpenAI.

## 9. Currency / FX / tax implications
- User must confirm currency per row before commit.

## 10. i18n
- All locales (input can be any language).

## 11. Permissions / tier gating / rate limits
- Monthly quota per tier.

## 12. Telemetry
- `ai_import_requests_total`, `ai_import_commits_total`.

## 13. Edge cases & gotchas
- Prompt-injection risk in uploaded text — sanitize and reject meta instructions.

## 14. Tests
- Snapshot on prompt, unit on validator.

## 15. Related skills and rules
- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [import-hub](import-hub.md).

## 16. Open questions / planned work
- Dedicated eval set.
