# auth-login-signup

> Password + OAuth (Google/Apple) authentication with JWT sessions.

## 1. Summary

Primary sign-in surface. Accepts email + password, Google OAuth, or Apple OAuth. Issues a JWT session cookie on success. The signup flow creates the user, hashes the password with bcrypt, seeds defaults (locale, currency, theme), optionally consumes a referral code, and sends a verification email.

## 2. Status

- **Tier:** Free
- **Feature flag:** _none_ (core)
- **Health:** green
- **Owning skill:** [`engineer-user-auth`](../../.cursor/skills/engineer-user-auth/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Page | [`src/app/login/`](../../src/app/login) | Login page, per-locale copy. |
| Page | [`src/app/signup/`](../../src/app/signup) | Signup page. |
| API | [`src/app/api/auth/login/route.ts`](../../src/app/api/auth/login/route.ts) | Password login. |
| API | [`src/app/api/auth/signup/route.ts`](../../src/app/api/auth/signup/route.ts) | Signup. |
| API | [`src/app/api/auth/logout/route.ts`](../../src/app/api/auth/logout/route.ts) | Clears cookie. |
| API | [`src/app/api/auth/me/route.ts`](../../src/app/api/auth/me/route.ts) | Current-user summary. |
| API | [`src/app/api/auth/google/`](../../src/app/api/auth/google) | Google OAuth callback. |
| API | [`src/app/api/auth/apple/`](../../src/app/api/auth/apple) | Apple OAuth callback. |

## 4. Data model

- `users` table ([`src/lib/db/users.ts`](../../src/lib/db/users.ts)): `id`, `email`, `password_hash`, `display_name`, `locale`, `preferred_currency`, `theme`, `is_admin`, `email_verified`, `trial_ends_at`, `plan`, `stripe_customer_id`, timestamps.
- `referrals` ([`src/lib/db/referrals.ts`](../../src/lib/db/referrals.ts)) — consumed on signup if a code is present.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/auth/login` | none | Free | Returns session cookie. |
| POST | `/api/auth/signup` | none | Free | Creates user + sends verify email. |
| POST | `/api/auth/logout` | user | Free | Clears session cookie. |
| GET | `/api/auth/me` | user | Free | Returns the current user shape. |
| GET/POST | `/api/auth/google` | none | Free | OAuth start + callback. |
| GET/POST | `/api/auth/apple` | none | Free | OAuth start + callback. |

## 6. UI surface

- Login page copy in [`src/locales/`](../../src/locales). Component composition in `src/app/login/`.
- Signup page at `src/app/signup/`.
- `EmailVerificationBanner` across authenticated pages until verified.

## 7. Business logic

- Password hashing: [`src/lib/auth/password.ts`](../../src/lib/auth/password.ts) (bcrypt, 12 rounds).
- Session creation: [`src/lib/auth/session.ts`](../../src/lib/auth/session.ts) + [`session-secret.ts`](../../src/lib/auth/session-secret.ts) (JOSE).
- Server-side session read: [`src/lib/auth/server-session.ts`](../../src/lib/auth/server-session.ts).
- Middleware: [`src/middleware.ts`](../../src/middleware.ts) redirects unauthenticated users on protected routes.
- After a successful password, passkey, OIDC, Google, or Apple login, [`maybeExpireTrialOnLogin`](../../src/lib/trial-expiration.ts) persists a due Pro-trial downgrade so the session cookie is free without waiting for the daily `trial-expiration` cron. No new user data is collected.

## 8. External dependencies

- Google OAuth — `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`.
- Apple OAuth — `APPLE_*` env vars.
- Resend — verification email.
- Required env: `APP_SESSION_SECRET` (64-char hex).

## 9. Currency / FX / tax implications

None (auth). Currency defaults are set at signup from browser locale.

## 10. i18n

All login/signup copy in [`src/locales/`](../../src/locales). Verification email localized in [`src/lib/email-i18n/`](../../src/lib/email-i18n).

## 11. Permissions / tier gating / rate limits

- Login: 5/min/IP.
- Signup: 3/hour/IP.
- Password reset: 3/hour/email.
- Rate-limit bookkeeping: [`src/lib/db/rate-limits.ts`](../../src/lib/db/rate-limits.ts) + Upstash.

## 12. Telemetry

- `analytics_events`: `auth.signup.success`, `auth.login.success`, `auth.login.failure`, `auth.oauth.google.success`, etc.
- Conversion events: see [`analytics-events`](analytics-events.md).

## 13. Edge cases & gotchas

- Case-insensitive email matching on login.
- Trim + lowercase email at write time.
- If user exists with a different auth method, signup surfaces a helpful error instead of generic "account exists."
- Do not leak which emails exist (uniform "check your inbox" response).

## 14. Tests

- [`src/lib/auth/session.test.ts`](../../src/lib/auth/session.test.ts)
- [`src/lib/auth/password.test.ts`](../../src/lib/auth/password.test.ts)
- [`src/lib/auth/server-session.test.ts`](../../src/lib/auth/server-session.test.ts)
- [`src/lib/db/users.test.ts`](../../src/lib/db/users.test.ts)
- E2E: [`e2e/`](../../e2e) signup + login flows.

## 15. Related skills and rules

- [`.cursor/skills/engineer-user-auth/SKILL.md`](../../.cursor/skills/engineer-user-auth/SKILL.md)
- [`.cursor/rules/legal-compliance.mdc`](../../.cursor/rules/legal-compliance.mdc)
- [auth-verify-email](auth-verify-email.md), [auth-passkeys](auth-passkeys.md), [referral](referral.md)

## 16. Open questions / planned work

- Magic-link sign-in (no-password option) — not started.
- Apple OAuth revocation flow — to verify.
