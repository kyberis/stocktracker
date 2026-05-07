# will-patch

Copy-ready files for the Will repo (`kyberis/notetaker`) to integrate with the IdP at `user.trefolio.com`. Apply these in the Will repo, NOT here. Read [`../../design-docs/will-idp-integration.md`](../../design-docs/will-idp-integration.md) for the full rationale.

## Files

| Path in Will repo | Source in this scaffold | Action |
|---|---|---|
| `prisma/schema.prisma` (User model edit) | `prisma/schema-edit.prisma` | Apply the snippet inline (add `idpSub` to User). |
| `src/lib/auth/index.ts` (NextAuth config) | `src/lib/auth.ts` | Replace existing providers + callbacks. |
| `src/lib/idp-client.ts` (new) | `src/lib/idp-client.ts` | Create new file. |
| `src/lib/agent-quota.ts` (return 429 upsell payload) | `patches/agent-quota.diff` | Apply diff. |
| `src/app/api/webhooks/telegram/route.ts` | `patches/telegram-webhook.diff` | Apply diff. |
| `src/lib/i18n/dictionaries/*.ts` (`bot.quotaExceeded`) | `patches/quota-message.diff` | Apply diff to every locale. |
| `src/lib/marketing-content.ts` (FAQ) | `patches/marketing-faq.diff` | Apply diff. |
| `scripts/backfill-idp-sub.ts` (new) | `scripts/backfill-idp-sub.ts` | Create new file; add npm script `idp:migrate-users`. |
| `.env.example` | `env.example.append` | Append the IdP block. |

## Required env vars (Vercel)

- `IDP_BASE_URL=https://user.trefolio.com`
- `IDP_CLIENT_ID=will`
- `IDP_CLIENT_SECRET=<from IdP setup>`
- `IDP_SERVICE_TOKEN=<shared with IdP>`

## Cutover sequence

Same shape as Clara:

1. Deploy schema migration (`idpSub` nullable).
2. Deploy auth + endpoint changes with `USE_LEGACY_AUTH=true`.
3. Run `npm run idp:migrate-users` to backfill.
4. Set `USE_LEGACY_AUTH=false`, redeploy.
