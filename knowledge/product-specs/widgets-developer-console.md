# widgets-developer-console

> Developer-facing widgets and an embeddable console for third-party integrations.

## 1. Summary
Allows external developers or admin users to embed trefolio portfolio widgets (e.g., value badge) on external sites, and offers an API key console.

## 2. Status
- **Tier:** Trefolio
- **Feature flag:** `DEVELOPER_CONSOLE`
- **Health:** C
- **Owning skill:** [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Page | `src/app/(app)/developer/` (if present) | Console UI. |
| API | `/api/admin/api-key` | Key issuance. |

## 4. Data model
- `api_keys`: scopes, per-user.

## 5. API surface
- Scoped read endpoints with bearer token.

## 6. UI surface
- Copy-paste embed snippets + usage charts.

## 7. Business logic
- Rate-limit per key; scopes per product.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- English.

## 11. Permissions / tier gating / rate limits
- Pro + feature flag.

## 12. Telemetry
- `api_key_requests_total{key_id}`.

## 13. Edge cases & gotchas
- Widget preview respects CSP.

## 14. Tests
- Smoke.

## 15. Related skills and rules
- [`engineer-integrations`](../../.cursor/skills/engineer-integrations/SKILL.md)
- Related specs: [feature-flags](feature-flags.md).

## 16. Open questions / planned work
- OAuth instead of bearer keys.
