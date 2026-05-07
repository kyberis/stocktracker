# Exec plan: Unified accounts and pro subscription

- **Status:** active
- **Owner:** trefolio core
- **Started:** 2026-05-05
- **Target:** 2026-07-15

## Goal

One identity, one Pro subscription across **trefolio**, **Clara**, and **Will**. A new IdP service at `user.trefolio.com` owns auth + Stripe + entitlements. The three product apps become OIDC clients and stop owning auth/billing. Free tier in Clara and Will = 30 queries/day, Pro = 200/day, with a consistent paywall in web and Telegram.

Design source of truth: [`../../design-docs/unified-accounts-and-billing.md`](../../design-docs/unified-accounts-and-billing.md).

## Acceptance criteria

- [ ] A user can sign up at `user.trefolio.com` and immediately log in to `trefolio.com`, `clara.trefolio.com`, and `will.trefolio.com` with the same credentials.
- [ ] A user who upgrades to Pro on any of the three apps unlocks Pro on all three within one session refresh (≤15 min).
- [ ] Hitting 31 queries on Clara web shows the upgrade dialog with a working "Upgrade for €7.99/mo" CTA that lands on `user.trefolio.com/upgrade?from=clara`.
- [ ] Hitting 31 queries on Will Telegram replies with a localized "limit reached" message and a clickable upgrade URL.
- [ ] Trefolio's landing page at `/landing` shows a "Tu equipo de agentes" section featuring Warren, Clara, and Will with one shared Pro subscription.
- [ ] Trefolio Pro pricing remains €7.99/mo and €59.99/yr (no change).
- [ ] All existing trefolio paid subscribers retain Pro after cutover with no Stripe re-checkout.
- [ ] All Clara Supporter subscribers (<10) are migrated to Pro and refunded any partial period.

## Phased plan

### Phase 0 — Spec, repo, infra (1–2 days)

1. Land [`unified-accounts-and-billing.md`](../../design-docs/unified-accounts-and-billing.md) design doc.
2. Land this exec plan.
3. Update [`etracker-clara-integration.md`](../../design-docs/etracker-clara-integration.md) and [`notetaker-will-integration.md`](../../design-docs/notetaker-will-integration.md) with a "Phase 2: IdP integration" section.
4. Create new repo `kyberis/trefolio-accounts` (manual, GitHub UI). Initialise with Next.js 16 + Prisma + Postgres template (clone Clara's stack).
5. Add as submodule: `git submodule add git@github.com:kyberis/trefolio-accounts.git external/accounts`.
6. Create Vercel project `trefolio-accounts` linked to that repo, custom domain `user.trefolio.com`. **Disable Git Submodules** in Settings → Git (same rule as Clara/Will).
7. Provision Neon Postgres for IdP (separate database from Clara's and Will's).
8. Trigger [`legal-advisor` skill](../../../.cursor/skills/legal-advisor/SKILL.md) review for cross-product data sharing, unified ToS, and Privacy Policy updates.

### Phase 1 — Build the IdP service (~1 week)

In `trefolio-accounts`:

1. **Schema** (`prisma/schema.prisma`):
   - `User`: `id`, `email` (unique), `passwordHash?`, `googleId?`, `appleId?`, `name`, `locale`, `emailVerifiedAt?`, `createdAt`.
   - `Entitlement`: `userId` (FK), `plan: 'free'|'pro'`, `proUntil?`, `source: 'stripe'|'grant'|'trial'`, `updatedAt`.
   - `StripeCustomer`: `userId` (1:1), `stripeCustomerId` (unique), `stripeSubscriptionId?`, `currentPeriodEnd?`.
   - `TelegramLink`: `telegramUserId` (BigInt unique), `userId` (FK), `appHint?` (`trefolio|clara|will` last bot used), `verifiedAt`.
   - `Passkey`: WebAuthn credential storage.
   - `OAuthClient` (static seed table): `clientId`, `clientSecretHash`, `redirectUris[]`, `name`.
2. **Auth providers** (port + simplify):
   - Email + password (bcrypt) — port from [`src/app/api/auth/signup/route.ts`](../../../src/app/api/auth/signup/route.ts) and [`login/route.ts`](../../../src/app/api/auth/login/route.ts).
   - Google OAuth — port from [`src/app/api/auth/google/`](../../../src/app/api/auth/google/route.ts).
   - Apple Sign In — port from [`src/app/api/auth/apple/`](../../../src/app/api/auth/apple/route.ts).
   - Passkeys — port from [`src/lib/auth/webauthn.ts`](../../../src/lib/auth/webauthn.ts).
3. **OIDC endpoints** (use `oidc-provider` library or hand-rolled):
   - `GET /.well-known/openid-configuration`
   - `GET /oauth2/authorize` — Authorization Code flow with PKCE (mandatory).
   - `POST /oauth2/token` — code exchange + refresh-token rotation.
   - `GET /oauth2/userinfo` — Bearer-auth, returns claims.
   - `GET /oauth2/jwks` — RS256 keys, rotated quarterly.
   - `POST /oauth2/revoke` — refresh-token revocation.
4. **Stripe** (lift from [`src/app/api/billing/`](../../../src/app/api/billing/)):
   - Checkout: `POST /api/billing/checkout` — subscription mode, prices `pro_monthly` (€7.99), `pro_annual` (€59.99).
   - Webhook: `POST /api/billing/webhook` — `checkout.session.completed`, `customer.subscription.created/updated/deleted` → upsert `Entitlement`.
   - Portal: `POST /api/billing/portal` → Stripe Billing Portal.
   - Env: `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_ANNUAL`, `STRIPE_WEBHOOK_SECRET` (same names as trefolio so secrets transfer cleanly).
5. **App-facing REST API** (Bearer-auth via service token or signed JWT):
   - `GET /v1/users/me` — current user from session.
   - `GET /v1/entitlements/:sub` — full entitlement payload.
   - `POST /v1/telegram/link` — body `{ telegramUserId, code, appHint }`, returns `{ sub, linkedAt }`.
   - `GET /v1/telegram/by-id/:tgUserId` — returns `{ sub, email }` or 404.
   - `GET /v1/quota/usage/:sub` — optional, lets the IdP show a unified usage chart.
6. **Branded UI**:
   - `/login`, `/signup` — same look and feel as trefolio.
   - `/account` — profile, change password, manage 2FA / passkeys.
   - `/upgrade?from={trefolio|clara|will}` — shared Trefolio Pro pricing; copy and benefit order emphasize the app the user arrived from (see `external/accounts/src/lib/upgrade-from-copy.ts`).
   - `/billing` — Stripe portal redirect.

### Phase 2 — Trefolio integrates IdP (~3–5 days, this repo)

Most of Phase 2 ships in this repo, gated by `IDP_BASE_URL` and `USE_LEGACY_AUTH` env vars.

1. Migrations: add `idp_sub TEXT NOT NULL DEFAULT ''` to `users` table (migration 111).
2. New module `src/lib/idp/`:
   - `client.ts` — fetch helper for IdP REST API.
   - `entitlements.ts` — `fetchEntitlementsBySub`, `applyEntitlementsToUser` (writes through to `users.plan` for backward compat).
   - `oidc.ts` — `buildAuthorizationUrl`, `exchangeCode`, `verifyIdToken`, PKCE helpers.
3. New routes:
   - `GET /api/auth/oidc/start?from=...` — generates PKCE pair, redirects to IdP `/oauth2/authorize`.
   - `GET /api/auth/oidc/callback` — exchanges code, verifies ID token, upserts trefolio user (links by `email` if `idp_sub` is empty), writes session cookie via existing `createSessionToken`.
4. Session payload: add `idpSub?: string` to `SessionPayload` in [`src/lib/auth/session.ts`](../../../src/lib/auth/session.ts). Backward-compatible (optional field).
5. Migration script `scripts/migrate-users-to-idp.ts`:
   - Reads existing `users` rows.
   - Calls IdP admin API (`POST /v1/admin/users/import` with `{ email, passwordHash, googleId?, appleId?, plan, proUntil }`) to create or claim each user.
   - Writes returned `sub` back to `users.idp_sub`.
   - Idempotent; safe to re-run.
6. Stripe redirect: when `BILLING_REDIRECT_TO_IDP=true` (deploy **together** with `USE_LEGACY_AUTH=false` per [`unified-accounts-cutover.md`](../../runbooks/unified-accounts-cutover.md) Step 3), the upgrade button on `/profile?section=subscription` links to `https://user.trefolio.com/upgrade?from=trefolio` instead of opening local Stripe checkout.
7. Local [`billing/webhook/route.ts`](../../../src/app/api/billing/webhook/route.ts) becomes a no-op when `USE_LEGACY_AUTH=false` (returns 200, logs); the IdP webhook is the single Stripe consumer.

### Phase 3 — Clara integrates IdP (~3 days, in `kyberis/etracker`)

Spec lives at [`../../design-docs/clara-idp-integration.md`](../../design-docs/clara-idp-integration.md). Summary:

1. Add IdP as the only NextAuth provider (`type: "oauth"`, OIDC discovery URL).
2. Source `dailyAgentMessageLimit` from JWT claim `entitlements.clara_daily_limit` (free=30, pro=200).
3. `/api/chat` 429 payload: change `upsell.url` to `https://user.trefolio.com/upgrade?from=clara`.
4. Telegram webhook: on `/start <code>` call `POST {IDP}/v1/telegram/link`. Resolve user via `GET {IDP}/v1/telegram/by-id/:tgUserId`.
5. Run user migration script (port of trefolio's, same admin API on the IdP).
6. Deprecate local Stripe code under `src/lib/billing/`.

### Phase 4 — Will integrates IdP (~3 days, in `kyberis/notetaker`)

Spec lives at [`../../design-docs/will-idp-integration.md`](../../design-docs/will-idp-integration.md). Summary:

1. Same NextAuth swap as Clara.
2. Wire `dailyAgentMessageLimit` to JWT claim `entitlements.will_daily_limit` (free=30, pro=200).
3. Add a structured 429 upsell payload to `consumeAgentQuota` callers (mirrors Clara) so the future web chat works without further changes.
4. Telegram: mirror Clara's IdP-based linking. Update `bot.quotaExceeded` localized strings to include `https://user.trefolio.com/upgrade?from=will`.
5. Update [`marketing-content.ts`](../../../external/notetaker/src/lib/marketing-content.ts) FAQ entry "Is there a paid tier?" → "Yes, Trefolio Pro unlocks 200/day on Will, Clara, and the trefolio dashboard for €7.99/mo."

### Phase 5 — Trefolio landing redesign (~2 days, this repo)

In [`src/app/landing/page.tsx`](../../../src/app/landing/page.tsx):

1. New section "Tu equipo de agentes financieros" with three cards: **Warren** (portfolio), **Clara** (gastos & finanzas personales), **Will** (notas inteligentes).
2. Update `getPricing(t)`: in the Trefolio (Pro) bullets add "Acceso completo a Clara (200 queries/día)" and "Acceso completo a Will (200 notas/día)". Free tier mentions "30 queries/día en Clara y Will incluidos".
3. Take 3 dark-theme screenshots at 1280×800: `public/screenshots/agents-warren.png`, `agents-clara.png`, `agents-will.png` (per [`landing-page rule`](../../../.cursor/rules/landing-page.mdc)). Where the agent UIs aren't visually ready yet, use the existing Warren screenshot for Warren and stylized cover images for Clara/Will.
4. Add i18n keys to [`src/locales/en.ts`](../../../src/locales/en.ts) and [`es.ts`](../../../src/locales/es.ts) (others fall back to en).
5. Add a release-notes entry in [`src/lib/release-notes.ts`](../../../src/lib/release-notes.ts) (type `feature`, EN + ES).
6. Verify `/demo` per [`demo-page rule`](../../../.cursor/rules/demo-page.mdc) — no functional change required because Warren/Clara/Will are not part of the demo dashboard.

### Phase 6 — Cutover (~2 days, sequenced)

1. Freeze writes to local `users` tables on each app (read-only DB role).
2. Run `migrate-users-to-idp.ts` on each app.
3. Reconcile Stripe: ensure all paid trefolio users have a matching `Entitlement` in the IdP.
4. Flip `USE_LEGACY_AUTH=false` in trefolio, then Clara, then Will.
5. Send transactional email per [`automated-user-comms skill`](../../../.cursor/skills/automated-user-comms/SKILL.md): "Your trefolio account now also signs you in to Clara and Will."
6. Schedule legacy auth route deletion for the next major release.

### Phase 7 — Hardening (~1 week, ongoing)

1. Playwright E2E for OIDC round-trip on each app (`src/e2e/oidc-*.spec.ts`).
2. Security review: PKCE enforced, refresh-token rotation, JWKS rotation policy, CSRF on `/oauth2/authorize`, exact-match redirect URIs only, rate limits on `/oauth2/token`.
3. Observability: log every entitlement check + quota consume with `idp_sub` for cross-app debugging. Grafana dashboard for daily quota 429s by app.
4. Update [`knowledge/QUALITY_SCORE.md`](../../QUALITY_SCORE.md) and product specs in [`knowledge/product-specs/`](../../product-specs/).

## Decisions log

- **2026-05-05**: chose dedicated IdP at `user.trefolio.com` (option A) over trefolio-as-IdP and webhook sync, because future products (e.g. devices, financial-agents v2) need a stable identity layer not bound to one product app.
- **2026-05-05**: chose three sub-brands ("Tu equipo de agentes") on the landing instead of "sister products" or "Pro extension" framing, to make the unified value proposition prominent and visible to investors.
- **2026-05-05**: chose Pro = 200/day (option A) on Clara and Will. Mirrors Clara's existing Supporter limit; no abuse/cost surprises. Free stays 30/day on both.
- **2026-05-05**: chose to keep three Telegram bots (option C) but link `telegramUserId` in the IdP. Avoids a complex multi-agent bot project; preserves per-product UX.

## Risks

- **Stack disparity (Turso vs Postgres x2)** — mitigated by mapping `local_id ↔ idp_sub` in each app; no cross-DB joins.
- **Auth migration regression** — mitigated by `USE_LEGACY_AUTH` flag and incremental cutover per app.
- **Capacitor (iOS/Android) auth** — OIDC redirect inside Capacitor's WebView needs custom URL-scheme handling; allocate engineering buffer in Phase 2.
- **Apple Sign In on web** — historically painful; lean on existing trefolio implementation patterns when porting.
- **Search engines / sitemap drift** — `user.trefolio.com` should NOT be indexed (private auth surface); add `robots.txt` Disallow + noindex meta on every page.

## Follow-ups

- Single Telegram bot ("@warren can ask Clara and Will") — out of scope here.
- Single shared chat surface across the three agents — out of scope.
- Migrating Clara/Will to Turso to align stacks — not necessary; out of scope.
- Enterprise SSO (SAML / SCIM) — future enterprise tier.
