# will-idp-integration

> Concrete change list for **Will** (`kyberis/notetaker`) to become an OIDC client of the IdP at `user.trefolio.com`. Companion to [`unified-accounts-and-billing`](unified-accounts-and-billing.md). All edits below land in the `kyberis/notetaker` repo, NOT in trefolio. Trefolio only updates the submodule pin afterwards.

## Why this exists in trefolio's knowledge base

Per the [external repo policy](notetaker-will-integration.md), trefolio's coding agent reads `external/notetaker/**` but cannot edit it. This spec is the source of truth for **what an engineer (or a Will-side coding agent) must change** so trefolio knows what to expect when bumping the pin.

## Scope

- Replace NextAuth's local Credentials/Google providers with a single OIDC provider pointing at `user.trefolio.com`.
- Source per-user daily quota from the OIDC ID token claim `entitlements.will_daily_limit` (free=30, pro=200).
- Add a structured 429 upsell payload to `consumeAgentQuota` so the upcoming web chat ships with paywall UX day one.
- Update Telegram quota-exceeded copy to include the IdP upgrade URL.
- Update marketing copy.

## Changes

### 1. Schema (`prisma/schema.prisma`)

Add `idpSub` (`String? @unique`) to `User`. Same pattern as Clara — see [`clara-idp-integration`](clara-idp-integration.md).

Migration script `scripts/backfill-idp-sub.ts` mirrors Clara's: walk every `User`, call IdP admin import, write back the returned `sub`.

### 2. NextAuth config (`src/lib/auth/index.ts`)

Replace existing `providers` with a single OIDC provider `id: "trefolio-id"` exactly like Clara's. The `signIn` callback upserts a local `User` keyed by `idpSub`, copying `entitlements.will_daily_limit` to the local `dailyAgentMessageLimit` column.

Drop:

- `CredentialsProvider`.
- `GoogleProvider`.
- The Turnstile/IP-rate-limited `/api/auth/register` route.

### 3. Quota source and upsell payload (`src/lib/agent-quota.ts`)

Today `consumeAgentQuota` returns `{ ok: false, reason: "limit", limit, used, resetAtUtc }` when over budget. Currently only the Telegram webhook calls it, but Will's web chat is on the roadmap. Refactor to return:

```ts
type QuotaResult =
  | { ok: true; used: number; limit: number }
  | {
      ok: false;
      reason: "limit";
      used: number;
      limit: number;
      resetAtUtc: string;
      upsell: {
        url: string;
        headline: string;
        body: string;
      };
    };
```

Where:

```ts
upsell: {
  url: `${process.env.IDP_BASE_URL}/upgrade?from=will&sub=${encodeURIComponent(userId)}`,
  headline: t("upgrade.willHeadline"), // "Pasa a Trefolio Pro"
  body: t("upgrade.willBody"),         // "200 notas/día en Will, 200 queries/día en Clara, ..."
}
```

Future web `/api/chat` route can return this verbatim as a 429 JSON body. The Telegram webhook can read `upsell.url` and append it to the localized message.

### 4. Telegram (`src/app/api/webhooks/telegram/route.ts`)

#### Linking

Same as Clara: `/start <code>` calls `POST {IDP}/v1/telegram/link` with `appHint: "will"`. Subsequent inbound messages resolve user via `GET {IDP}/v1/telegram/by-id/:tgUserId`.

#### Quota-exceeded message

Update `bot.quotaExceeded(limit)` localized strings (see [`src/lib/i18n/dictionaries/en.ts`](../../external/notetaker/src/lib/i18n/dictionaries/en.ts) and other locales) to:

```
You've reached today's limit ({limit} messages, resets at 00:00 UTC).

Upgrade to Trefolio Pro for €7.99/mo:
- 200 messages/day on Will
- 200 messages/day on Clara
- Full access to the trefolio portfolio dashboard

👉 https://user.trefolio.com/upgrade?from=will
```

Use the [`ux-writer skill`](../../.cursor/skills/ux-writer/SKILL.md) to keep tone consistent across locales.

### 5. Marketing copy ([`src/lib/marketing-content.ts`](../../external/notetaker/src/lib/marketing-content.ts))

Replace the FAQ entry:

```ts
{
  q: "Is there a paid tier?",
  a: "Not in v1. Will is free and MIT-licensed. A small Pro tier may come later for higher daily quotas or longer voice notes.",
},
```

With:

```ts
{
  q: "Is there a paid tier?",
  a: "Yes. Trefolio Pro (€7.99/mo or €59.99/yr) raises Will's daily message limit from 30 to 200, and unlocks the same on Clara plus the full trefolio portfolio dashboard. Free Will users keep the 30 messages/day quota forever.",
},
```

Localize for every language Will supports.

### 6. Env vars (Vercel)

Add: `IDP_BASE_URL`, `IDP_CLIENT_ID=will`, `IDP_CLIENT_SECRET`, `IDP_SERVICE_TOKEN`.

Remove (after cutover): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. (No Stripe vars existed.)

## Acceptance criteria

- [ ] Cold sign-up flow goes IdP → Will without password input on Will.
- [ ] A user upgraded to Pro on the IdP sees `dailyAgentMessageLimit = 200` on Will within ≤15 min.
- [ ] `/start <code>` on Telegram links to the same IdP `sub` regardless of which app issued the code.
- [ ] Hitting message 31 on Telegram returns the localized quota-exceeded message with the working `https://user.trefolio.com/upgrade?from=will` link.
- [ ] When the web chat ships, returning the structured 429 payload above is enough to render a paywall dialog.
- [ ] `marketing-content.ts` FAQ reflects the new pricing reality.
