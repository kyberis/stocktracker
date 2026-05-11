# ops-telegram-agent

> Staff-only business ops notifications via Telegram, orchestrated from `user.trefolio.com`, with per-product aggregate metrics.

## 1. Summary

Platform staff link a **dedicated ops bot** from the IdP account hub. The IdP sends production billing/signup heads-ups and a daily digest that merges IdP database stats with `GET /api/internal/ops-metrics` from trefolio (Warren), Clara, and Will. Product bots and consumer `TelegramLink` rows are unchanged.

## 2. Status

- **Tier:** operator / staff only (`users.is_staff` or `IDP_ADMIN_EMAILS` on IdP)
- **Feature flag:** none
- **Health:** new
- **Owning skill:** [`.cursor/skills/integration-trefolio-accounts/SKILL.md`](../../.cursor/skills/integration-trefolio-accounts/SKILL.md) (IdP), [`.cursor/skills/engineer-user-auth/SKILL.md`](../../.cursor/skills/engineer-user-auth/SKILL.md) (Warren)

## 3. Entry points (IdP — `external/accounts`)

| Type | Path |
|------|------|
| API | [`external/accounts/src/app/api/telegram/ops-webhook/route.ts`](../../external/accounts/src/app/api/telegram/ops-webhook/route.ts) |
| API | [`external/accounts/src/app/api/cron/ops-digest/route.ts`](../../external/accounts/src/app/api/cron/ops-digest/route.ts) |
| API | [`external/accounts/src/app/api/account/ops-telegram/code/route.ts`](../../external/accounts/src/app/api/account/ops-telegram/code/route.ts) |
| API | [`external/accounts/src/app/api/account/ops-telegram/disconnect/route.ts`](../../external/accounts/src/app/api/account/ops-telegram/disconnect/route.ts) |
| API | [`external/accounts/src/app/api/v1/internal/ops/snapshot/route.ts`](../../external/accounts/src/app/api/v1/internal/ops/snapshot/route.ts) |
| Lib | [`external/accounts/src/lib/ops-snapshot.ts`](../../external/accounts/src/lib/ops-snapshot.ts) |
| Lib | [`external/accounts/src/lib/staff.ts`](../../external/accounts/src/lib/staff.ts) |

## 4. Entry points (Warren — this repo)

| Type | Path |
|------|------|
| API | [`src/app/api/internal/ops-metrics/route.ts`](../../src/app/api/internal/ops-metrics/route.ts) |
| Lib | [`src/lib/db/ops-metrics.ts`](../../src/lib/db/ops-metrics.ts) |

## 5. Security

- Ops webhook: `X-Telegram-Bot-Api-Secret-Token` must match `TELEGRAM_OPS_WEBHOOK_SECRET` in production.
- Staff linking: session on IdP + `isPlatformStaff()`; one-time codes in `ops_telegram_link_codes`.
- Product metrics: `Authorization: Bearer ${IDP_SERVICE_TOKEN}` only; responses are numeric aggregates (no end-user PII).

## 6. Related

- Design: [`knowledge/design-docs/unified-accounts-and-billing.md`](../design-docs/unified-accounts-and-billing.md)
- Sister repos: Clara / Will implement the same internal metrics path at `src/app/api/internal/ops-metrics/route.ts`.
