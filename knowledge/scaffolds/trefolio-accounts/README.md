# trefolio-accounts (scaffold)

Copy-ready scaffold for the IdP service that lives at `user.trefolio.com`. Lift the files in this directory into a new repo `kyberis/trefolio-accounts`, then add it as a submodule under `external/accounts/` in this repo per the [external repo policy](../../design-docs/etracker-clara-integration.md).

## Why this lives here

The actual service is a separate repo with separate deploys. trefolio's build never compiles it. But the canonical schema, OIDC contracts, REST shape, and entitlement logic must be reviewed by trefolio's coding agent because three product apps depend on them. This scaffold is the source of truth.

## Contents

```
README.md                              # this file (the build runbook)
.env.example                           # required env vars
package.json                           # canonical deps (versions to match Clara/Will)
prisma/schema.prisma                   # User / Entitlement / TelegramLink / Passkey / OAuthClient
src/lib/oidc/
  jwks.ts                              # RS256 keypair load + rotation hooks
  pkce.ts                              # PKCE code_verifier / code_challenge helpers
  authorization-code.ts                # short-lived code store
  id-token.ts                          # ID-token signing with entitlement claims
src/lib/entitlements/
  resolve.ts                           # resolve(plan, proUntil, source) -> claims
  apply-stripe-event.ts                # Stripe webhook -> Entitlement upsert
src/lib/idp-clients.ts                 # static client registry (trefolio / clara / will)
src/app/api/.well-known/openid-configuration/route.ts
src/app/api/oauth2/authorize/route.ts
src/app/api/oauth2/token/route.ts
src/app/api/oauth2/userinfo/route.ts
src/app/api/oauth2/jwks/route.ts
src/app/api/oauth2/revoke/route.ts
src/app/api/v1/users/me/route.ts
src/app/api/v1/entitlements/[sub]/route.ts
src/app/api/v1/telegram/link/route.ts
src/app/api/v1/telegram/by-id/[tgUserId]/route.ts
src/app/api/v1/internal/ai-model-config/route.ts  # GET/PUT ecosystem AI model map (service bearer)
src/app/api/v1/admin/users/import/route.ts
src/app/api/billing/checkout/route.ts
src/app/api/billing/portal/route.ts
src/app/api/billing/webhook/route.ts
src/app/(marketing)/upgrade/page.tsx   # branded upgrade page
```

Files marked here without a separate file in this scaffold are listed for completeness; the engineer who initialises the IdP repo creates them by porting from trefolio (`src/app/api/auth/`, `src/app/api/billing/`) and Clara (`src/lib/auth.ts`, `src/components/auth/*`).

## Build runbook

### 1. Bootstrap (one-time)

```bash
gh repo create kyberis/trefolio-accounts --private --clone
cd trefolio-accounts
npx create-next-app@latest --typescript --app --no-tailwind --no-src-dir false .
npm i prisma @prisma/client @auth/prisma-adapter next-auth@4 \
       @simplewebauthn/server @simplewebauthn/browser \
       jose stripe bcrypt zod \
       @upstash/ratelimit @upstash/redis \
       resend
npx prisma init --datasource-provider postgresql
```

Copy `prisma/schema.prisma` from this scaffold over the generated one. Run `npx prisma generate`.

### 2. Vercel + Neon

- Create Vercel project `trefolio-accounts` linked to the new repo.
- Custom domain `user.trefolio.com` (CNAME to Vercel).
- Settings → Git → **Git Submodules: OFF**.
- Provision Neon Postgres (separate from Clara's and Will's). Set `DATABASE_URL`.

### 3. Env vars

Copy `.env.example` and fill in. Critical secrets:

- `IDP_RS256_PRIVATE_KEY` and `IDP_RS256_PUBLIC_KEY` — generate with `openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048` and `openssl rsa -pubout`.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — copy from trefolio's existing Stripe (this is the same Stripe account; we are NOT creating a new one).
- `STRIPE_PRICE_PRO_MONTHLY=price_xxx` (€7.99/mo) — same price ID used by trefolio today.
- `STRIPE_PRICE_PRO_ANNUAL=price_yyy` (€59.99/yr) — same price ID used by trefolio today.
- `IDP_SERVICE_TOKEN` — long random string, shared with each product app for the `/v1/*` REST endpoints.

### 4. Static OAuth client registry

`src/lib/idp-clients.ts` seeds three clients on boot:

```ts
export const STATIC_CLIENTS = [
  {
    clientId: "trefolio",
    redirectUris: ["https://trefolio.com/api/auth/oidc/callback", "http://localhost:3000/api/auth/oidc/callback"],
    name: "trefolio",
  },
  {
    clientId: "clara",
    redirectUris: ["https://clara.trefolio.com/api/auth/callback/trefolio-id", "http://localhost:3001/api/auth/callback/trefolio-id"],
    name: "Clara",
  },
  {
    clientId: "will",
    redirectUris: ["https://will.trefolio.com/api/auth/callback/trefolio-id", "http://localhost:3200/api/auth/callback/trefolio-id"],
    name: "Will",
  },
];
```

Generate a client secret per client with `openssl rand -hex 32`, store hashed in DB, the cleartext goes into each product app's env as `IDP_CLIENT_SECRET`.

### 5. Stripe webhook

Point Stripe → IdP webhook URL at `https://user.trefolio.com/api/billing/webhook`. Trefolio's existing webhook URL stays for backward compat until cutover; both may fire during migration. The trefolio webhook stops mirroring subscription events when the product IdP OAuth client is fully configured (`isIdpEnabled()` in trefolio).

### 6. SEO / safety

- `app/robots.ts`: `Disallow: /` for the IdP. This is a private auth surface; no SEO value, only attack surface.
- Every page exports `metadata = { robots: { index: false, follow: false } }`.
- HSTS, CSP, no third-party scripts.

### 7. First production deploy checklist

- [ ] DB migration runs cleanly.
- [ ] `/.well-known/openid-configuration` returns valid JSON.
- [ ] Test PKCE round-trip from a local trefolio dev instance (`http://localhost:3000`).
- [ ] Stripe webhook signature verifies on a real test event.
- [ ] `/v1/entitlements/:sub` returns 401 without service token, 200 with.
- [ ] Robots.txt blocks crawlers.
- [ ] No client secrets in any client-side bundle (run `next build` and grep the `.next/` output).

## Reference

- Design doc: [../../design-docs/unified-accounts-and-billing.md](../../design-docs/unified-accounts-and-billing.md).
- Exec plan: [../../exec-plans/active/unified-accounts.md](../../exec-plans/active/unified-accounts.md).
- Clara-side change list: [../../design-docs/clara-idp-integration.md](../../design-docs/clara-idp-integration.md).
- Will-side change list: [../../design-docs/will-idp-integration.md](../../design-docs/will-idp-integration.md).
