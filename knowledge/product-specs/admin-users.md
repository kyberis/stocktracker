# admin-users

> User admin (list, impersonate, reset, delete).

## 1. Summary
Admin tool to search and manage users: grant membership, reset data, impersonate for support, or delete.

## 2. Status
- **Tier:** admin
- **Feature flag:** _none_
- **Health:** B
- **Owning skill:** [`engineer-user-auth`](../../.cursor/skills/engineer-user-auth/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/admin/users/`](../../src/app/api/admin/users) | List/update. |
| API | [`src/app/api/admin/impersonate/`](../../src/app/api/admin/impersonate) | Impersonate. |
| API | [`src/app/api/admin/reset-data/`](../../src/app/api/admin/reset-data) | Wipe data. |

## 4. Data model
- All user tables.
- Soft-deleted accounts retain a row in `users` with `deleted_at` set and PII scrubbed (blank email, anonymized username) so admins can still list them. Deleted users are excluded from notifications, emails, digests, alerts, and broadcasts.

## 5. API surface
- Varies per sub-route.
- `GET /api/admin/users/detail` accepts `filterStatus=active|deleted|all` and returns `deletedAt` on each user.

## 6. UI surface
- Searchable table + user drawer with actions.
- Deleted users show a **Deleted** badge (and optional status filter). Detail view is read-only for tombstones.

## 7. Business logic
- Impersonation triggers a banner + audit log.
- Account deletion (self-serve, admin, or IdP webhook) purges personal data via CASCADE + non-CASCADE cleanup, then reinserts an anonymized tombstone with the same user id.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- English.

## 11. Permissions / tier gating / rate limits
- Admin.

## 12. Telemetry
- `admin_user_actions_total`.

## 13. Edge cases & gotchas
- Deleting a user must cascade safely (retention rules apply).

## 14. Tests
- Smoke.

## 15. Related skills and rules
- [`engineer-user-auth`](../../.cursor/skills/engineer-user-auth/SKILL.md)
- [`legal-advisor`](../../.cursor/skills/legal-advisor/SKILL.md)
- Related specs: [impersonation](impersonation.md), [membership-grant](membership-grant.md).

## 16. Open questions / planned work
- Bulk actions.
