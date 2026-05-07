---
name: integration-trefolio-accounts
description: >-
  Explains how this repo (trefolio / Warren) integrates with the unified identity
  service at user.trefolio.com (OIDC + PKCE, local user provisioning, entitlements).
  Use when touching IdP env vars, /api/auth/oidc/*, src/lib/idp/*, unified login/signup,
  FREEZE_LOCAL_USER_WRITES, or cross-app identity.
---

# Trefolio ↔ trefolio-accounts (IdP)

This **monorepo root** app is an **OIDC relying party**. The Identity Provider lives in [`external/accounts/`](../../../external/accounts/) (deployed as `user.trefolio.com`). Clara and Will are separate NextAuth clients in their own submodule trees.

## Knowledge base (system of record)

Read in this order for context:

| Doc | Purpose |
|-----|---------|
| [`knowledge/design-docs/unified-accounts-and-billing.md`](../../../knowledge/design-docs/unified-accounts-and-billing.md) | Architecture, claims, Stripe, Telegram |
| [`knowledge/runbooks/unified-accounts-cutover.md`](../../../knowledge/runbooks/unified-accounts-cutover.md) | Operational cutover |
| [`knowledge/exec-plans/active/unified-accounts.md`](../../../knowledge/exec-plans/active/unified-accounts.md) | Multi-step plan |
| [`dev/README.md`](../../../dev/README.md) | Local HTTPS stack, `IDP_BASE_URL`, Node TLS |

Clara / Will specifics (for behaviour you mirror or debug):

- [`knowledge/design-docs/clara-idp-integration.md`](../../../knowledge/design-docs/clara-idp-integration.md)
- [`knowledge/design-docs/will-idp-integration.md`](../../../knowledge/design-docs/will-idp-integration.md)

## Code map (this repo)

| Area | Role |
|------|------|
| [`src/lib/idp/config.ts`](../../../src/lib/idp/config.ts) | `getIdpBaseUrl`, `getIdpIssuer`, `isIdpEnabled`, `useLegacyAuth`, `freezeLocalUserWrites` |
| [`src/lib/idp/oidc.ts`](../../../src/lib/idp/oidc.ts) | PKCE, `buildAuthorizationUrl`, token exchange, JWT verify |
| [`src/lib/idp/entitlements.ts`](../../../src/lib/idp/entitlements.ts) | Link `idp_sub`, sync plan from IdP |
| [`src/app/api/auth/oidc/start/route.ts`](../../../src/app/api/auth/oidc/start/route.ts) | Begin login flow |
| [`src/app/api/auth/oidc/signup-start/route.ts`](../../../src/app/api/auth/oidc/signup-start/route.ts) | Begin signup-first (`screen_hint=signup`) |
| [`src/app/api/auth/oidc/callback/route.ts`](../../../src/app/api/auth/oidc/callback/route.ts) | Exchange code, create/link local user, session cookie |
| [`src/app/signup/page.tsx`](../../../src/app/signup/page.tsx) | Server redirect to signup-start when IdP-only |
| [`src/middleware.ts`](../../../src/middleware.ts) | Allow public OIDC routes; onboarding gates |

## Environment (typical)

- `IDP_BASE_URL` — Server-side IdP origin for token exchange + JWKS (`http://localhost:3300` in Caddy+loopback dev — see [`dev/README.md`](../../../dev/README.md)).
- `IDP_ISSUER` — OIDC issuer + browser-facing authorize/logout/upgrade URLs; set to `https://user.trefolio-dev.com` when `IDP_BASE_URL` stays loopback behind Caddy.
- `IDP_CLIENT_ID` — Default client id `trefolio` unless overridden.
- `IDP_CLIENT_SECRET` — Server-only.
- `USE_LEGACY_AUTH=false` — IdP-only login/signup paths active.
- `FREEZE_LOCAL_USER_WRITES` — Blocks **new** local users on legacy OAuth/signup; OIDC callback exempt.

On the **IdP** (`external/accounts`), matching Caddy dev uses `IDP_ISSUER` and optional `IDP_SERVER_ORIGIN` so discovery lists HTTPS authorize + loopback token/jwks.

## Standalone workspace

If Cursor opened **only** a submodule repo (no `knowledge/` here), use the personal hub copy at **`~/.cursor/skills/integration-trefolio-accounts/SKILL.md`** for the same skill name and high-level pointers.

## Agent discipline

- Submodule [`external/accounts/`](../../../external/accounts/) is edited **in that tree**; bump pins when shipping cross-repo changes.
- Consult [`engineer-user-auth`](../engineer-user-auth/SKILL.md) for session shapes and guards alongside this skill.
