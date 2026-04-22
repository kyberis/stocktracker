# SECURITY.md — security posture

## Data classification

| Class | Examples | Where stored | Encryption |
|-------|----------|--------------|------------|
| **Secret** | Stripe keys, Resend key, OpenAI key, session secret | Vercel env only | n/a (never persisted in repo) |
| **User secret** | Passwords, passkey private material, SnapTrade user secret | DB `users.password_hash`, `passkeys.*`, `snaptrade_connections.user_secret` | bcrypt (passwords), AES-256-GCM at rest for user_secret |
| **PII** | Email, locale, display name | `users` | TLS in transit, at-rest via Turso |
| **Portfolio data** | Holdings, transactions, cash, goals | `holdings`, `transactions`, `cash_entries`, `goals` | TLS in transit, at-rest via Turso |
| **Behavioral** | `analytics_events`, `landing_events` | DB | consent-gated; purged by `push-gauges` cron |

## Authentication

- Passwords: bcrypt, 12 rounds.
  [`src/lib/auth/password.ts`](../src/lib/auth/password.ts).
- Sessions: JWT signed with `APP_SESSION_SECRET` using `jose`;
  cookie `httpOnly`, `SameSite=Lax`, `Secure` in prod.
  [`src/lib/auth/session.ts`](../src/lib/auth/session.ts).
- Passkeys (WebAuthn): `@simplewebauthn/server` + `@simplewebauthn/browser`.
  [`src/lib/auth/webauthn.ts`](../src/lib/auth/webauthn.ts).
- OAuth: Google/Apple — scoped to sign-in only.
- Impersonation: admin-only, audited in `analytics_events`.

## Authorization

- Single entry point: [`src/lib/auth/guards.ts`](../src/lib/auth/guards.ts).
- Every API route calls `requireUser()`, `requireAdmin()`, or
  `requireSubscriptionFeature(...)` at the top.
- Middleware rejects unauthenticated requests to `/(app)/*`, `/admin/*`,
  and most `/api/*` routes.
  [`src/middleware.ts`](../src/middleware.ts).

## Transport security

- HTTPS enforced by Vercel.
- HSTS with preload on production hostnames.
- CSP configured per environment (strict for
  `/p/*` public pages and widget).
- Cookies: `httpOnly`, `Secure`, `SameSite=Lax`.

## Input validation

- Every body and query parsed with Zod.
  [`src/lib/api-response.ts`](../src/lib/api-response.ts).
- CSV uploads size-limited and MIME-sniffed.
- AI inputs redacted of obvious PII before sending to OpenAI; prompts are
  reviewed in [`src/lib/ai-*`](../src/lib).

## Output encoding

- React escapes by default.
- `AiMarkdown` uses `sanitize-html` with an allow-list (no inline scripts, no
  `on*` attributes, no raw HTML from AI).
- Open Graph / JSON-LD built server-side only.

## Secrets

- Only Vercel env and `.env.local` (git-ignored) hold secrets.
- Scripts use `process.env.*` directly; never `import` secrets from code.
- Never log full tokens; truncate to last 4 chars.

## GDPR / privacy

- EU-hosted Turso + Vercel EU regions.
- Account deletion cascades to `holdings`, `transactions`, `cash_entries`,
  `portfolio_snapshots`, `price_alerts`, `notifications`,
  `push_subscriptions`, `social_posts`, `user_connections`, etc.
- Data export: CSV export of holdings + transactions (Pro).
- Cookie consent: Consent Mode v2 via `CookieConsent`.
- DPA available on request; listed in
  [`docs/COMMERCIALIZATION_PLAN.md`](../docs/COMMERCIALIZATION_PLAN.md).

## Legal

- Privacy Policy: [`src/app/privacy/page.tsx`](../src/app/privacy/page.tsx).
- Terms of Service: [`src/app/terms/page.tsx`](../src/app/terms/page.tsx).
- Financial disclaimer on every page that displays market/investment data.
- See [`.cursor/rules/legal-compliance.mdc`](../.cursor/rules/legal-compliance.mdc)
  and the [`legal-advisor`](../.cursor/skills/legal-advisor/SKILL.md) skill.

## Admin controls

- Admin panel at [`/admin`](../src/app/(app)/admin) restricted to
  `users.is_admin = 1`.
- Admin-only routes protected by `requireAdmin()`.
- Admin actions are logged to `analytics_events` (category: `admin`).

## Rate limiting (security lens)

See [`RELIABILITY.md`](RELIABILITY.md) for the full list; security-relevant
limits:

- Login: 5/min/IP (brute force).
- Password reset: 3/hour/email (enumeration).
- Signup: 3/hour/IP (spam).
- API key generation: 3/hour/user.
- Passkey registration: 10/hour/user.

## Known risks & mitigations

| Risk | Mitigation |
|------|------------|
| Stripe webhook replay | `svix`-style signature verification + `stripe_event_id` idempotency. |
| SnapTrade secret leakage | Stored encrypted; never logged; rotated via their SDK. |
| AI prompt injection | AI output sanitized; never executed; markdown-only render. |
| CSV upload with huge files | Size cap; streaming parse for large CSVs. |
| Public share pages exposing too much | Only current totals, no PII, no account IDs. |
| Session theft | Short TTL + rotation on password change + device passkeys. |

## What to do on a suspected incident

1. Pause the relevant cron via feature flag.
2. Invalidate sessions in-scope.
3. Revoke the leaked credential in the relevant console (Stripe, Resend, etc.).
4. Rotate `APP_SESSION_SECRET` if session material is compromised (forces
   everyone to re-login).
5. Record in [`exec-plans/completed/`](exec-plans/completed) after the fact.
