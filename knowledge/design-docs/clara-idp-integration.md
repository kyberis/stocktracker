# clara-idp-integration

> Concrete change list for **Clara** (`kyberis/etracker`) to become an OIDC client of the IdP at `user.trefolio.com`. Companion to [`unified-accounts-and-billing`](unified-accounts-and-billing.md). All edits below land in the `kyberis/etracker` repo, NOT in trefolio. Trefolio only updates the submodule pin afterwards.

## Why this exists in trefolio's knowledge base

Per the [external repo policy](etracker-clara-integration.md), trefolio's coding agent reads `external/etracker/**` but cannot edit it. This spec is the source of truth for **what an engineer (or a Clara-side coding agent) must change** so trefolio knows what to expect when bumping the pin.

## Scope

- Replace NextAuth's local Credentials/Google providers with a single OIDC provider pointing at `user.trefolio.com`.
- Source per-user daily quota from the OIDC ID token claim `entitlements.clara_daily_limit` (free=30, pro=200).
- Update the 429 upsell URL on `/api/chat`.
- Rewire Telegram identity through the IdP.
- Deprecate local Stripe ("Supporter").

## Changes

### 1. Schema (`prisma/schema.prisma`)

Add an `idpSub` column on `User`. Make the existing local-credential columns optional / deprecated.

```prisma
model User {
  id            String   @id @default(cuid())
  /// OIDC subject claim from user.trefolio.com. UNIQUE source of identity.
  idpSub        String?  @unique
  email         String   @unique
  /// Deprecated: kept for migration. New users set passwordHash via the IdP only.
  passwordHash  String?
  ...
}
```

Then a migration script `scripts/backfill-idp-sub.ts`:

1. For each `User` row, call `POST {IDP}/v1/admin/users/import` with `{ email, passwordHash, googleId, dailyAgentMessageLimit }`.
2. The IdP either creates or claims the user and returns `{ sub }`.
3. Write `sub` back to `User.idpSub`.
4. Idempotent.

### 2. NextAuth config (`src/lib/auth.ts`)

Replace existing `providers` array with one OIDC provider:

```ts
providers: [
  {
    id: "trefolio-id",
    name: "Trefolio Account",
    type: "oauth",
    wellKnown: `${process.env.IDP_BASE_URL}/.well-known/openid-configuration`,
    authorization: { params: { scope: "openid email profile entitlements" } },
    clientId: process.env.IDP_CLIENT_ID,
    clientSecret: process.env.IDP_CLIENT_SECRET,
    idToken: true,
    checks: ["pkce", "state"],
    profile(profile) {
      return {
        id: profile.sub,
        email: profile.email,
        name: profile.name,
        emailVerified: profile.email_verified ? new Date() : null,
        // entitlements ride along on the JWT
      };
    },
  },
],
callbacks: {
  async signIn({ profile }) {
    // Lazy-create local User on first sign-in.
    await db.user.upsert({
      where: { idpSub: profile.sub },
      update: {
        email: profile.email,
        dailyAgentMessageLimit: profile.entitlements?.clara_daily_limit ?? 30,
      },
      create: {
        idpSub: profile.sub,
        email: profile.email,
        emailVerifiedAt: profile.email_verified ? new Date() : null,
        dailyAgentMessageLimit: profile.entitlements?.clara_daily_limit ?? 30,
      },
    });
    return true;
  },
  async jwt({ token, profile }) {
    if (profile) {
      token.sub = profile.sub;
      token.entitlements = profile.entitlements;
    }
    return token;
  },
},
```

Drop:

- `CredentialsProvider` (email + password). Login now goes through the IdP.
- `GoogleProvider` (the IdP handles Google federation).
- The local `passwordHash` / Turnstile / IP rate limiter on `/api/auth/register` (registration moves to the IdP).

Keep:

- `PrismaAdapter` for local user persistence (now keyed by `idpSub`).

### 3. Quota source (`src/lib/agent-quota.ts`)

`consumeAgentQuota` already reads `User.dailyAgentMessageLimit`. Two valid implementations:

- **Pull-on-login (recommended for v1):** the NextAuth `signIn` callback above writes the latest `clara_daily_limit` to `User.dailyAgentMessageLimit`. Quota check stays unchanged.
- **Pull-on-check:** `consumeAgentQuota` calls `GET {IDP}/v1/entitlements/:sub` on every request. Adds latency; only use if entitlements drift becomes a real problem.

Choose pull-on-login. The 15-min ID-token TTL gives a small drift window that's acceptable.

### 4. 429 upsell payload (`src/app/api/chat/route.ts`)

Today the route returns:

```json
{
  "kind": "quota_limit",
  "limit": 30,
  "used": 31,
  "resetAtUtc": "...",
  "upsell": { "url": "/upgrade", "headline": "..." }
}
```

Change `upsell.url` to:

```ts
const upsellUrl = `${process.env.IDP_BASE_URL}/upgrade?from=clara&sub=${encodeURIComponent(session.user.idpSub)}`;
```

The existing [`quota-limit-dialog.tsx`](../../external/etracker/src/components/quota-limit-dialog.tsx) needs no change — it follows whatever URL the API returns.

### 5. Telegram (`src/app/api/webhooks/telegram/route.ts`)

Two paths to update:

#### `/start <code>` linking

Replace `completeTelegramLink` (local DB write) with a call to the IdP:

```ts
const res = await fetch(`${process.env.IDP_BASE_URL}/v1/telegram/link`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.IDP_SERVICE_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    telegramUserId: from.id,
    telegramUsername: from.username,
    code,
    appHint: "clara",
  }),
});
```

The IdP validates the code, links Telegram to the IdP `sub`, and the next time Clara sees a message it resolves user via:

```ts
const lookup = await fetch(`${process.env.IDP_BASE_URL}/v1/telegram/by-id/${from.id}`, {
  headers: { Authorization: `Bearer ${process.env.IDP_SERVICE_TOKEN}` },
});
const { sub } = await lookup.json();
const user = await db.user.findUnique({ where: { idpSub: sub } });
```

The local `User.telegramUserId` column becomes a deprecated cache.

#### Quota-exhausted message

Update `quotaLimitMessage()` in `src/lib/telegram/embedded-markdown.ts` to include:

```
Has alcanzado tu límite de hoy (30 mensajes).

Pasa a Trefolio Pro por €7.99/mes y obtén:
- 200 mensajes/día en Clara
- 200 notas/día en Will
- Acceso completo al dashboard de trefolio (Warren, AI análisis, todo)

👉 https://user.trefolio.com/upgrade?from=clara
```

Mirror in EN, FR, DE, IT, PT (whatever Clara supports).

### 6. Stripe (`src/lib/billing/*`)

Deprecate. The `/upgrade` page now redirects to `${IDP_BASE_URL}/upgrade?from=clara`. The local `STRIPE_PRICE_ID_SUPPORTER` env var, the local checkout/portal/webhook routes, and the `Donation` table are all retired.

For existing Supporter subscribers (<10 today): on cutover, mark them Pro in the IdP, then cancel the local Stripe subscriptions and refund pro-rata via support.

### 7. Env vars (Vercel)

Add:

- `IDP_BASE_URL` → `https://user.trefolio.com`
- `IDP_CLIENT_ID` → `clara`
- `IDP_CLIENT_SECRET` → from IdP setup
- `IDP_SERVICE_TOKEN` → for service-to-service REST API calls

Remove (after cutover):

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_SUPPORTER`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (now on the IdP)

## Acceptance criteria

- [ ] Cold sign-up flow goes IdP → Clara without password input on Clara.
- [ ] A user upgraded to Pro on the IdP sees `dailyAgentMessageLimit = 200` on Clara within ≤15 min (next sign-in or token refresh).
- [ ] `/start <code>` on Telegram links to the same IdP `sub` regardless of which app issued the code.
- [ ] Hitting message 31 returns the localized quota-exceeded message with the working `https://user.trefolio.com/upgrade?from=clara` link.
- [ ] No reference to `STRIPE_PRICE_ID_SUPPORTER` remains in the codebase after cutover.
