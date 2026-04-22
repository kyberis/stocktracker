# ai-models-registry

> Central list of AI models and their pricing/capabilities.

## 1. Summary
`src/lib/ai-models.ts` is the registry of models we use. Admin UI exposes which model is active for each route; costs/tokens per model drive the AI logs' price calculation.

## 2. Status
- **Tier:** Admin-configurable; user impact is tier-gated.
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Library | [`src/lib/ai-models.ts`](../../src/lib/ai-models.ts) | Registry. |
| API | [`src/app/api/admin/ai-models/`](../../src/app/api/admin/ai-models) | Admin list + set. |

## 4. Data model
- `platform_settings` holds current model selection per route.

## 5. API surface
| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET/POST | `/api/admin/ai-models` | admin | Admin | List + set. |

## 6. UI surface
- Admin page with per-route dropdown.

## 7. Business logic
- Route resolves active model at request time (1 DB read, cached).

## 8. External dependencies
- OpenAI.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- Admin only (English).

## 11. Permissions / tier gating / rate limits
- `requireAdmin()`.

## 12. Telemetry
- `ai_model_changes_total`.

## 13. Edge cases & gotchas
- Changes apply to subsequent requests only.

## 14. Tests
- Unit on registry shape.

## 15. Related skills and rules
- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [admin-ai-logs](admin-ai-logs.md), [ai-compare](ai-compare.md).

## 16. Open questions / planned work
- Per-user model overrides.
