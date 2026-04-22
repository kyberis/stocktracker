# admin-panel

> `/admin` super-user interface.

## 1. Summary
Role-gated admin panel with sub-tools for users, analytics, AI logs, refunds, banners, cron stats, email sends, support chat, and more. Protected by `requireAdmin()`.

## 2. Status
- **Tier:** admin
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-user-auth`](../../.cursor/skills/engineer-user-auth/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| Page | `src/app/(app)/admin/page.tsx` | Index. |
| Library | [`src/lib/auth/requireAdmin.ts`](../../src/lib/auth/requireAdmin.ts) | Guard. |

## 4. Data model
- Reads across the system.

## 5. API surface
- Many `/api/admin/*` endpoints — see sub-specs.

## 6. UI surface
- Tabbed page with all sub-tools.

## 7. Business logic
- Every admin action audit-logged.

## 8. External dependencies
- None directly.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- English.

## 11. Permissions / tier gating / rate limits
- Admin role required.

## 12. Telemetry
- `admin_actions_total{action}`.

## 13. Edge cases & gotchas
- Sensitive actions require re-auth.

## 14. Tests
- Smoke per tool.

## 15. Related skills and rules
- [`engineer-user-auth`](../../.cursor/skills/engineer-user-auth/SKILL.md)
- Related specs: admin sub-tools (below).

## 16. Open questions / planned work
- Fine-grained admin scopes.
