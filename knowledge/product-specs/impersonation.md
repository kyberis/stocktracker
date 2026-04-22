# impersonation

> Admin user-impersonation with a visible banner and audit trail.

## 1. Summary

Admins can impersonate a user to debug issues from their vantage point. A red `ImpersonationBanner` is shown at all times. Exiting impersonation restores the admin session.

## 2. Status

- **Tier:** Admin only
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-user-auth`](../../.cursor/skills/engineer-user-auth/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/admin/impersonate/`](../../src/app/api/admin/impersonate) | Start impersonation. |
| API | [`src/app/api/auth/exit-impersonation/`](../../src/app/api/auth/exit-impersonation) | Return to admin session. |
| Component | [`src/components/ImpersonationBanner.tsx`](../../src/components/ImpersonationBanner.tsx) | Always visible during impersonation. |

## 4. Data model

- Session JWT contains both `user_id` (target) and `impersonator_id` (admin).
- Audited via `analytics_events` with category `admin`.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/admin/impersonate` | admin | Admin | Start impersonation of `{ userId }`. |
| POST | `/api/auth/exit-impersonation` | impersonator | Admin | Return to admin session. |

## 6. UI surface

- Admin users list has "Impersonate" action.
- Banner persists across pages with "Exit" CTA.

## 7. Business logic

- Impersonation session has shorter TTL (e.g., 30 min).
- Audit event: `admin.impersonate.start` / `admin.impersonate.end` with admin id + target id.
- Reads behave as the target user. Writes are allowed but flagged in audit.

## 8. External dependencies

- None (uses session infrastructure).

## 9. Currency / FX / tax implications

None.

## 10. i18n

English only for admin-facing UI.

## 11. Permissions / tier gating / rate limits

- `requireAdmin()` guard.
- 30/hour/admin rate limit.

## 12. Telemetry

- `analytics_events`: `admin.impersonate.start`, `admin.impersonate.end`.

## 13. Edge cases & gotchas

- Never impersonate another admin silently — require re-auth for that case.
- Exit restores the admin's original session without re-login.

## 14. Tests

- Unit: session shape with `impersonator_id` in `src/lib/auth/session.test.ts`.

## 15. Related skills and rules

- [`engineer-user-auth`](../../.cursor/skills/engineer-user-auth/SKILL.md)
- [`knowledge/SECURITY.md`](../SECURITY.md)

## 16. Open questions / planned work

- Surface a diff of writes made during impersonation in admin UI.
