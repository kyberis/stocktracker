# auth-verify-email

> Single-use token-based email verification.

## 1. Summary

New accounts receive a verification email with a time-limited token. Clicking it marks `users.email_verified = 1` and dismisses the in-app banner. Unverified users can use the product with soft nudges but receive a verification banner.

## 2. Status

- **Tier:** Free
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-user-auth`](../../.cursor/skills/engineer-user-auth/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Page | [`src/app/verify-email/`](../../src/app/verify-email) | Verification landing page. |
| API | [`src/app/api/auth/verify-email/`](../../src/app/api/auth/verify-email) | Verify + resend endpoints. |
| Component | [`src/components/EmailVerificationBanner.tsx`](../../src/components/EmailVerificationBanner.tsx) | Banner in app nav. |

## 4. Data model

- `users.email_verified` (int, 0/1).
- `users.email_verification_token`, `users.email_verification_expires_at` (or the `unsubscribe_tokens` convention — confirm). See [`src/lib/db/users.ts`](../../src/lib/db/users.ts).

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/auth/verify-email` | none | Free | Consumes the token. |
| POST | `/api/auth/verify-email/resend` | user | Free | Resend the verification email. |

## 6. UI surface

- Verification landing page at `src/app/verify-email/`.
- `EmailVerificationBanner` rendered in the authenticated shell until verified.

## 7. Business logic

- Token generation: cryptographically random, stored with expiry.
- Idempotent consumption — if already verified, show a friendly message.
- Resend has a cooldown of 60s + rate limit of 3/hour/email.

## 8. External dependencies

- Resend ([`src/lib/email.ts`](../../src/lib/email.ts)).
- Localized template in [`src/lib/email-i18n/`](../../src/lib/email-i18n).

## 9. Currency / FX / tax implications

None.

## 10. i18n

All locales covered.

## 11. Permissions / tier gating / rate limits

- Resend: 3/hour/email.
- No tier gating — Free.

## 12. Telemetry

- `analytics_events`: `auth.verify_email.sent`, `auth.verify_email.clicked`.

## 13. Edge cases & gotchas

- Token expiry (commonly 24h) → landing page offers a resend button.
- OAuth users are auto-verified; they should not see the banner.

## 14. Tests

- Unit: token hash + expiry logic in `src/lib/auth/*.test.ts`.
- Integration: `src/lib/db/users.test.ts`.

## 15. Related skills and rules

- [`.cursor/skills/engineer-user-auth/SKILL.md`](../../.cursor/skills/engineer-user-auth/SKILL.md)
- [`.cursor/skills/automated-user-comms/SKILL.md`](../../.cursor/skills/automated-user-comms/SKILL.md)

## 16. Open questions / planned work

- Consider consolidating tokens with `unsubscribe_tokens` pattern.
