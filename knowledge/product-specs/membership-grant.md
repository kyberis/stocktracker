# membership-grant

> Admin-issued Pro access grants with optional expiry.

## 1. Summary

Admins can grant Pro (Bifolio/Trefolio) access to a user without Stripe. Useful for comp'd accounts, influencer deals, and support recoveries. Grants can be time-boxed; the `trial-expiration` cron / billing-reconcile path respects the expiry.

## 2. Status

- **Tier:** Admin
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-payments-subscriptions`](../../.cursor/skills/engineer-payments-subscriptions/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/membership-grant/`](../../src/app/api/membership-grant) | User-facing grant claim. |
| API | [`src/app/api/admin/users/`](../../src/app/api/admin/users) | Admin-issue grant. |
| Library | [`src/lib/db/membership-grant.test.ts`](../../src/lib/db/membership-grant.test.ts) | Test + helpers. |
| Page | [`src/app/membership-grant/`](../../src/app/membership-grant) | Claim landing page. |

## 4. Data model

- `users.plan`, `users.trial_ends_at`, `users.granted_until` (see migrations).
- Grant tokens stored via `unsubscribe_tokens` pattern or a dedicated table.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/admin/users` | admin | Admin | `grantMembership(userId, tier, until)`. |
| GET | `/api/membership-grant` | token | Free | Claim a grant via token link. |

## 6. UI surface

- Admin users page has "Grant Pro" action.
- User-facing landing page celebrates the grant and logs them in if needed.

## 7. Business logic

- Grants respect tier downgrades on expiry.
- Stripe subscriptions take precedence over grants.

## 8. External dependencies

- Resend (email notifying the user of the grant).

## 9. Currency / FX / tax implications

None.

## 10. i18n

User-facing landing localized.

## 11. Permissions / tier gating / rate limits

- Admin-only write path.
- 60/hour/admin.

## 12. Telemetry

- `analytics_events`: `membership.grant.issued`, `membership.grant.claimed`.

## 13. Edge cases & gotchas

- Grants should not extend a paid Stripe subscription's date; they stack conceptually but Stripe wins.
- Handle re-grants (extending an existing grant) vs new grants.

## 14. Tests

- [`src/lib/db/membership-grant.test.ts`](../../src/lib/db/membership-grant.test.ts)

## 15. Related skills and rules

- [`engineer-payments-subscriptions`](../../.cursor/skills/engineer-payments-subscriptions/SKILL.md)

## 16. Open questions / planned work

- Audit log surface for all grants.
