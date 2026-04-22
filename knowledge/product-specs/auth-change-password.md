# auth-change-password

> Change password (authenticated) + future reset path.

## 1. Summary

Authenticated users can change their password from `/change-password`. Requires the current password, verifies with bcrypt, then rotates `password_hash` and invalidates existing sessions by rotating the session secret or issuing a new JWT (depending on current implementation).

## 2. Status

- **Tier:** Free
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-user-auth`](../../.cursor/skills/engineer-user-auth/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Page | [`src/app/(app)/change-password/`](../../src/app/(app)/change-password) | In-app page. |
| API | [`src/app/api/auth/change-password/route.ts`](../../src/app/api/auth/change-password/route.ts) | Change endpoint. |

## 4. Data model

- Reads/writes `users.password_hash`.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/auth/change-password` | user | Free | `{ current, next }` payload. |

## 6. UI surface

- Page form with current/new/confirm fields.
- Success toast + soft redirect.

## 7. Business logic

- Validate strength (length, common-password check).
- Rehash with bcrypt 12 rounds.
- Optionally clear other sessions.

## 8. External dependencies

- bcrypt via `bcryptjs`.

## 9. Currency / FX / tax implications

None.

## 10. i18n

All locales covered.

## 11. Permissions / tier gating / rate limits

- 10/hour/user.
- Must be authenticated.

## 12. Telemetry

- `analytics_events`: `auth.change_password.success`, `auth.change_password.failure`.

## 13. Edge cases & gotchas

- OAuth-only accounts have no `password_hash` — show "set password" flow instead.

## 14. Tests

- Unit: password strength + rotation in `src/lib/auth/password.test.ts`.

## 15. Related skills and rules

- [`.cursor/skills/engineer-user-auth/SKILL.md`](../../.cursor/skills/engineer-user-auth/SKILL.md)

## 16. Open questions / planned work

- Password reset (forgot-password) flow: add a public endpoint + rate-limited tokenized email.
