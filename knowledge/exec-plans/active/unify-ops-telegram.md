# Unify ops Telegram

- **Status:** active
- **Owner:** agent
- **Started:** 2026-08-13
- **Target:** 2026-08-13

## Goal

One staff Telegram bot (`@trefoliobot`), one webhook (ProdOps), one recipient. `/agents` and trefolio `/admin/settings` mint the same link. The IdP does not call Telegram.

## Acceptance criteria

- [x] `/api/internal/prodops-link` and `/api/internal/prodops-ingest` on trefolio (Bearer `IDP_SERVICE_TOKEN`)
- [x] ProdOps accepts `sourceApp: accounts` and `/snapshot`
- [x] IdP `/agents` proxies mint/unlink/status to trefolio
- [x] IdP webhook returns 410
- [x] ProdOps config remains the first card on trefolio `/admin/settings`

## Decisions log

- 2026-08-13: ProdOps stays the only Telegram surface. IdP is a producer via trefolio outbox, not a second bot.

## Follow-ups

- Set `TREFOLIO_SERVER_ORIGIN` on trefolio-accounts to the Vercel production alias.
- Confirm `@trefoliobot` webhook is `https://ops.trefolio.com/api/telegram/webhook`.
