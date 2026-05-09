# Unified Accounts (trefolio IdP)

> One account at `user.trefolio.com`, one Pro subscription, three agents (Warren, Clara, Will).

## 1. Summary

The trefolio Identity Provider (`trefolio-accounts`, hosted at
`user.trefolio.com`) is the single source of truth for users, sessions,
Stripe billing and entitlements across trefolio, Clara
(`clara.trefolio.com`) and Will (`will.trefolio.com`). Each product app is an
OIDC client that reads entitlements via JWT claims and a small REST API.

## 2. Status

- **Tier:** Free / Pro
- **Feature flag / gates:** `FREEZE_LOCAL_USER_WRITES` (migration window). Login/signup are OIDC when `isIdpEnabled()` (`IDP_BASE_URL` + `IDP_CLIENT_ID` + `IDP_CLIENT_SECRET`). (`BILLING_REDIRECT_TO_IDP` is deprecated and unused — upgrade/portal URLs come from `IDP_ISSUER` / `IDP_BASE_URL`.)
- **Health:** green (Phase 0–6 shipped; Phase 7 hardening in progress)
- **Owning skill:** [`.cursor/skills/engineer-user-auth/SKILL.md`](../../.cursor/skills/engineer-user-auth/SKILL.md), [`.cursor/skills/engineer-payments-subscriptions/SKILL.md`](../../.cursor/skills/engineer-payments-subscriptions/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/auth/oidc/start/route.ts`](../../src/app/api/auth/oidc/start/route.ts) | Begins the OIDC Authorization Code + PKCE flow. |
| API | [`src/app/api/auth/oidc/callback/route.ts`](../../src/app/api/auth/oidc/callback/route.ts) | Receives the IdP redirect, mints `trefolio_session`. |
| API | [`src/app/api/auth/me/route.ts`](../../src/app/api/auth/me/route.ts) | Fires `syncEntitlementsForUser` on every refresh. |
| Lib | [`src/lib/idp/`](../../src/lib/idp) | OIDC helpers, REST client, entitlements bridge. |
| Script | [`scripts/migrate-users-to-idp.ts`](../../scripts/migrate-users-to-idp.ts) | One-shot user migration. |
| Script | [`scripts/migrate-trefolio-subscriptions-to-idp.ts`](../../scripts/migrate-trefolio-subscriptions-to-idp.ts) | Copy trefolio Stripe `customer` / `subscription` ids into the IdP after `idp_sub` exists. |
| Script | [`scripts/send-unified-accounts-email.ts`](../../scripts/send-unified-accounts-email.ts) | Cutover transactional email. |
| Runbook | [`knowledge/runbooks/unified-accounts-cutover.md`](../runbooks/unified-accounts-cutover.md) | Operator playbook for Phase 6. |
| Design doc | [`knowledge/design-docs/unified-accounts-and-billing.md`](../design-docs/unified-accounts-and-billing.md) | Architecture, security review, observability. |

## 4. Data model

Trefolio stores only a thin pointer to the IdP identity:

- `users.idp_sub TEXT NOT NULL DEFAULT ''` — IdP `sub`. Indexed (migration v111).
- `users.plan` and `users.plan_expires_at` are now a **read-through cache** of
  `entitlements.trefolio_pro` from the IdP.

The IdP-side schema (User, Entitlement, StripeCustomer, TelegramLink) lives in
the `kyberis/trefolio-accounts` repo and is documented in the design doc.

## 5. API surface

Trefolio side:

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/auth/oidc/start?redirect=/path` | none | Redirects to the IdP authorize endpoint with PKCE. |
| GET | `/api/auth/oidc/callback?code=&state=` | state cookie | Exchanges code for tokens, links user, sets `trefolio_session`. |

IdP side (called server-to-server from trefolio with `Authorization: Bearer $IDP_SERVICE_TOKEN`):

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/v1/entitlements/:sub` | Returns `{ entitlements, proUntil }`. |
| POST | `/v1/users/import` | Used by the migration script to upsert by email. |
| POST | `/v1/telegram/link` | Used by Clara and Will Telegram bots. |
| GET | `/v1/telegram/by-id/:tgUserId` | Resolves a Telegram user to an IdP `sub`. |

## 6. UI surface

- Pages on the IdP: `/login`, `/signup`, `/account`, `/upgrade?from=...`.
- Trefolio `/login` and `/signup`: **`IdpRedirectBridge`** (countdown, copy, `?error=` handling, “Continue now”) → `/api/auth/oidc/start` or signup-start when `isIdpEnabled()`; dev hint when the IdP client is not configured.
- Trefolio's `/profile?section=subscription` "Upgrade" button uses
  `resolveIdpUpgradeHref()` → `https://user.trefolio.com/upgrade?from=trefolio`
  when `IDP_ISSUER` / `IDP_BASE_URL` resolve (production defaults include the IdP).

## 7. Business logic

- [`src/lib/idp/oidc.ts`](../../src/lib/idp/oidc.ts) — PKCE generation,
  authorization-URL building, token exchange, ID-token verification (JWKS).
- [`src/lib/idp/entitlements.ts`](../../src/lib/idp/entitlements.ts) — sync
  helper that updates the local `users.plan` cache on session refresh.
- [`src/lib/idp/client.ts`](../../src/lib/idp/client.ts) — REST client for the
  IdP `/v1/*` API.
- [`src/lib/idp/config.ts`](../../src/lib/idp/config.ts) — env-var gates for
  OIDC and helpers: `freezeLocalUserWrites()`,
  `resolveIdpUpgradeHref()`, `resolveBillingPortalHref()`, `isIdpEnabled()`.

## 8. External dependencies

- The IdP at `user.trefolio.com` (separate Vercel project, separate Neon Postgres).
- Stripe (single account, lives behind the IdP).
- Env vars on trefolio:
  - `IDP_BASE_URL`, `IDP_CLIENT_ID`, `IDP_CLIENT_SECRET`, `IDP_SERVICE_TOKEN`.
  - `FREEZE_LOCAL_USER_WRITES` (cutover migration window).

## 9. Currency / FX / tax implications

None on the trefolio side. The IdP holds the Stripe account; prices are
EUR-denominated (€7.99/mo, €59.99/yr).

## 10. i18n

- The IdP UI is Spanish/English at launch (matches trefolio's defaults).
- The Phase 6 transactional email is en/es per
  `user_settings.preferred_language`.
- Landing-page copy for the agents-team section lives in
  [`src/locales/en.ts`](../../src/locales/en.ts) and
  [`src/locales/es.ts`](../../src/locales/es.ts) under the `landingAgents*` keys.

## 11. Permissions / tier gating / rate limits

- Trefolio's `effectivePlan(plan, planExpiresAt)` keeps working unchanged.
  The plan column is a cache, so all existing tier-gating code (alerts,
  brokerage connections, AI tokens) is untouched.
- Clara/Will read `entitlements.{clara,will}_daily_limit` from the JWT to set
  `dailyAgentMessageLimit` (Free=30, Pro=200).

## 12. Telemetry

Cross-app log key: `idpSub`.

- `trefolio.entitlements.synced` — single line per plan change in
  [`src/lib/idp/entitlements.ts`](../../src/lib/idp/entitlements.ts).
- `etracker.telegram.link_lookup` (Clara) and `notetaker.telegram.link_lookup`
  (Will) include the same `idpSub` after their respective Phase 3/4 patches.
- IdP-side logs (Stripe events, OAuth `authorize`/`token` calls) tag the same
  `idpSub`.

## 13. Edge cases & gotchas

- **Capacitor mobile app**: the OIDC callback writes the same
  `trefolio_session` cookie shape, so the iOS/Android shells keep working
  without a rebuild.
- **Email match with different auth_provider**: when the IdP returns a `sub`
  for an email that already exists locally with a different `auth_provider`,
  the callback links explicitly via `linkLocalUserToIdpSub` — never silent
  takeover.
- **Demo mode**: the demo dashboard does not call any IdP code path. The new
  landing-page agents-team section does not affect the demo.
- **Cutover safety**: `freezeLocalUserWrites()` blocks new local user
  creation during the migration window; the OIDC callback is exempt so first
  IdP logins still create local rows.

## 14. Tests

- E2E: [`e2e/oidc-roundtrip.spec.ts`](../../e2e/oidc-roundtrip.spec.ts) covers
  the start-route invariants (PKCE always present, verifier never in URL,
  open-redirect protection, legacy-auth gate).
- Full happy path (authorize → callback → session) lives in the IdP repo's
  own E2E suite.

## 15. Related skills and rules

- Skills: `.cursor/skills/engineer-user-auth/SKILL.md`,
  `.cursor/skills/engineer-payments-subscriptions/SKILL.md`,
  `.cursor/skills/legal-advisor/SKILL.md`.
- Rules: `.cursor/rules/release-notes.mdc`, `.cursor/rules/landing-page.mdc`.
- Related specs: [`auth-login-signup`](auth-login-signup.md),
  [`stripe-checkout`](stripe-checkout.md),
  [`stripe-webhook`](stripe-webhook.md),
  [`billing-portal`](billing-portal.md),
  [`subscription-tiers`](subscription-tiers.md).

## 16. Open questions / planned work

- 7-day soak after cutover, then PR to delete legacy auth code (Step 5 of the
  cutover runbook).
- Cross-app log search dashboard in Grafana keyed by `idpSub`.
- Consider PAR / DPoP for the iOS Capacitor app (open question in the
  design doc).
