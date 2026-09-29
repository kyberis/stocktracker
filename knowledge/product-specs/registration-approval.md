# Registration approval

> New accounts stay pending until an operator enables them.

## 1. Summary

Signup stays open (Google or email on `user.trefolio.com`). Products stay
locked until an operator clicks the signed approve link. The IdP is the
security boundary: unapproved users do not receive OIDC auth codes. One
approval unlocks trefolio, Clara, and Will.

## 2. Status

- **Tier:** all (access gate, not a paid feature)
- **Feature flag:** none. Env `REGISTRATION_REQUIRES_APPROVAL` (default true) on the IdP; trefolio mirrors it for legacy signup when OIDC is off.
- **Health:** green
- **Owning skill:** [`.cursor/skills/engineer-user-auth/SKILL.md`](../../.cursor/skills/engineer-user-auth/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Page | [`src/app/pending-approval/page.tsx`](../../src/app/pending-approval/page.tsx) | Waiting copy when local signup is pending. |
| API | [`src/app/api/auth/approve-registration/route.ts`](../../src/app/api/auth/approve-registration/route.ts) | Signed JWT capability; no admin session. |
| API | [`src/app/api/auth/oidc/callback/route.ts`](../../src/app/api/auth/oidc/callback/route.ts) | Redirects to IdP `/pending-approval` if `registration_approved === false`. |
| API | [`src/app/api/auth/signup/route.ts`](../../src/app/api/auth/signup/route.ts) | Legacy (IdP off): create pending + admin approve link. |
| Lib | [`src/lib/registration-approval.ts`](../../src/lib/registration-approval.ts) | Env gate, JWT, timestamp helper. |

## 4. Data model

- IdP: `users.registration_approved_at TIMESTAMPTZ NULL` (`external/accounts`).
- Trefolio local fallback: `users.registration_approved_at TEXT` (empty = pending). Migration v157 backfills existing rows from `created_at`.

## 5. API surface

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/auth/approve-registration?token=` | signed JWT | Stamps approval and emails the user. |
| POST | `/api/auth/signup` | public, IdP off | Creates pending user; no session cookie until approved. |

## 6. UI surface

- IdP `/pending-approval` (primary when OIDC is on).
- Trefolio `/pending-approval` for legacy local signup.

## 7. Business logic

- Default on. `REGISTRATION_REQUIRES_APPROVAL=false` auto-approves.
- E2E (`E2E=1`) auto-approves so Playwright smoke specs keep a session.
- Pending is not a ban (`deleted_at` / `isActive`).

## 8. External dependencies

- Resend (`RESEND_API_KEY`, `SIGNUP_NOTIFY_EMAIL`) for admin approve mail and the user-enabled mail.

## 9. Currency / FX / tax implications

None.

## 10. i18n

Admin mail is English. User-enabled mail is ES/EN.

## 11. Permissions / tier gating / rate limits

Operator-only via signed email link (~7 days) or IdP admin toggle. Not plan-gated.

## 12. Telemetry

Approve URLs are logged even when Resend is unset so local/dev can complete the click.

## 13. Tests

- [`src/lib/registration-approval.test.ts`](../../src/lib/registration-approval.test.ts)
- [`src/app/api/auth/oidc/callback/route.test.ts`](../../src/app/api/auth/oidc/callback/route.test.ts) pending redirect.

## 14. Related

- Design: [`knowledge/design-docs/unified-accounts-and-billing.md`](../design-docs/unified-accounts-and-billing.md)
- Spec: [`unified-accounts-idp.md`](unified-accounts-idp.md)
- Clara: `external/etracker/knowledge/product-specs/registration-approval.md`
- Will: `external/notetaker/knowledge/product-specs/registration-approval.md`
