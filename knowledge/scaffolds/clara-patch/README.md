# clara-patch

Copy-ready files for the Clara repo (`kyberis/etracker`) to integrate with the IdP at `user.trefolio.com`. Apply these in the Clara repo, NOT here. Read [`../../design-docs/clara-idp-integration.md`](../../design-docs/clara-idp-integration.md) for the full rationale.

## Files

| Path in Clara repo | Source in this scaffold | Action |
|---|---|---|
| `prisma/schema.prisma` (User model edit) | `prisma/schema-edit.prisma` | Apply the snippet inline (add `idpSub` to User). |
| `src/lib/auth.ts` (NextAuth config) | `src/lib/auth.ts` | Replace existing providers + callbacks. |
| `src/lib/idp-client.ts` (new) | `src/lib/idp-client.ts` | Create new file. |
| `src/app/api/chat/route.ts` (upsell URL) | `patches/api-chat-route.diff` | Apply diff. |
| `src/app/api/webhooks/telegram/route.ts` | `patches/telegram-webhook.diff` | Apply diff. |
| `src/lib/telegram/embedded-markdown.ts` | `patches/quota-message.diff` | Apply diff (localized). |
| `scripts/backfill-idp-sub.ts` (new) | `scripts/backfill-idp-sub.ts` | Create new file; add npm script `idp:migrate-users`. |
| `.env.example` | `env.example.append` | Append the IdP block. |

## Required env vars (Vercel)

- `IDP_BASE_URL=https://user.trefolio.com`
- `IDP_CLIENT_ID=clara`
- `IDP_CLIENT_SECRET=<from IdP setup>`
- `IDP_SERVICE_TOKEN=<shared with IdP>`

## Cutover sequence

1. Deploy schema migration (Prisma) — `idpSub` is nullable, safe to ship before code changes.
2. Deploy auth + endpoint changes with `USE_LEGACY_AUTH=true` (Clara still accepts old credentials).
3. Run `npm run idp:migrate-users` to backfill `idpSub` on every existing User.
4. Set `USE_LEGACY_AUTH=false`, redeploy.
5. Remove deprecated local Stripe code in a follow-up PR.
