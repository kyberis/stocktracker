# trefolio-prodops-integration

> `trefolio-prodops` (repo `kyberis/trefolio-prodops`) is the external operational-notifications service for trefolio. It lives under `external/prodops` as a sibling repo, runs as a separate Vercel deployment, and receives signed event payloads from trefolio to fan out staff alerts to Telegram.

## Problem

Trefolio already emits important business and support signals inside the product app: new user registrations, successful membership payments, incoming feedback, broker-integration requests, and 7-day trial activations. Those events are valuable for operators, but they should not be delivered directly from the same request path that processes signup, billing, or feedback because Telegram outages, bot errors, or rate limits would then become user-facing failures.

We want:

1. A staff-facing Telegram notification flow.
2. Admin-managed routing and enablement from trefolio.
3. A hard operational boundary so Telegram delivery failures never break product transactions.
4. A sibling codebase the agent can read and evolve independently of trefolio's main build.

## Decision

1. **`trefolio-prodops` is a sibling repo** under `external/prodops`, following the same context-and-deploy separation used for Clara, Will, and Renata.
2. **Trefolio owns configuration and event production.** Admins configure the ProdOps base URL, bot username, shared secret, enabled event types, and the linked Telegram recipient from trefolio's admin settings.
3. **Trefolio writes an outbox row, not a Telegram message.** Business routes enqueue ops events into `ops_event_outbox`; a cron dispatcher sends them asynchronously.
4. **Runtime integration shape is signed HTTP.** Trefolio posts a signed JSON envelope to `trefolio-prodops` using an HMAC shared secret (`X-ProdOps-Timestamp` + `X-ProdOps-Signature`).
5. **ProdOps owns Telegram delivery and delivery-side dedupe.** The service verifies the signature, deduplicates by `eventId`, formats the operator message, and uses the Telegram Bot API. There is one staff bot (`@trefoliobot`) and one webhook (`ops.trefolio.com`). The IdP does not call Telegram.
6. **IdP is a producer, not a second bot.** `user.trefolio.com/agents` mints the same recipient link via trefolio `/api/internal/prodops-link`. IdP signups, billing, and the daily digest enqueue through `/api/internal/prodops-ingest` (`sourceApp: accounts`). `/snapshot` on the bot asks trefolio, which fetches the IdP digest.
7. **No direct imports across repos.** Trefolio never imports code from `external/prodops`; the boundary is API-only.

## Why this and not X

| Alternative | Why rejected |
|---|---|
| Send Telegram directly from trefolio routes | Couples external bot failures to signup, billing, feedback, and trials. Harder to retry safely. |
| Keep everything inside trefolio as one more API route | Blurs the product/admin boundary and makes it harder to evolve staff tooling separately. |
| Reuse a second IdP Telegram webhook for product events | Telegram allows one webhook per bot. IdP `/agents` now mints the ProdOps link; IdP never owns the webhook. |
| Shared package imported from `external/prodops` | Violates the repo's sister-app rule; build/lint/test boundaries should stay explicit. |

## How to follow it

### Local dev

Trefolio runs on `3010`. `trefolio-prodops` defaults to `3400`.

```bash
cd stocktracker
npm run dev
npm run dev:prodops
```

Then set trefolio admin config:

- base URL: `http://localhost:3400`
- bot username: the Telegram bot username that points at `trefolio-prodops`
- shared secret: same value as `external/prodops/.env.local:PRODOPS_SHARED_SECRET`

On the **ProdOps** Vercel project, set `TREFOLIO_BASE_URL` to a host that reaches the trefolio Next.js origin **without a Cloudflare JS challenge**. `trefolio.com` is orange-clouded; Bot Fight Mode returns 403 "Just a moment..." to Vercel datacenter IPs, so Telegram linking never hits `/api/admin/prodops-config/link/complete`. Use the stable Vercel production alias (`https://trefolio-marcos-projects-0d7207fa.vercel.app`) in production, and `http://localhost:3010` locally. **Do not** point it at `user.trefolio.com` (IdP) or `ops.trefolio.com` (ProdOps itself).

### Event flow

```mermaid
flowchart LR
  businessRoute["signup / billing / feedback / broker / trial route"] --> outbox["ops_event_outbox"]
  outbox --> cronDispatcher["/api/cron/prodops-dispatch"]
  cronDispatcher -->|"HMAC signed POST"| prodops["external/prodops /api/intake"]
  prodops --> telegram["Telegram Bot API"]
```

### Recipient linking flow

```mermaid
flowchart LR
  agentsUI["user.trefolio.com/agents"] -->|"Bearer IDP_SERVICE_TOKEN"| trefolioLink["trefolio /api/internal/prodops-link"]
  adminPanel["trefolio /admin/settings"] --> mint["POST /api/admin/prodops-config/link"]
  trefolioLink --> pending["pending 12-hex token"]
  mint --> pending
  pending --> deepLink["t.me/trefoliobot?start="]
  deepLink --> telegram["Telegram Bot /start"]
  telegram --> prodopsWebhook["external/prodops /api/telegram/webhook"]
  prodopsWebhook -->|"HMAC signed POST"| complete["/api/admin/prodops-config/link/complete"]
  complete --> config["ProdOpsConfig.recipient"]
```

### Staff query flow

```mermaid
flowchart LR
  staffDm["Staff Telegram DM"] --> prodopsWebhook["external/prodops /api/telegram/webhook"]
  prodopsWebhook --> queryMatch["deterministic query matcher"]
  queryMatch -->|"HMAC signed POST"| prodopsQuery["/api/internal/prodops-query"]
  prodopsQuery --> dataReaders["users + feedback + analytics_events"]
  dataReaders --> prodopsQuery
  prodopsQuery --> prodopsWebhook
  prodopsWebhook --> staffDm
```

### Staff action flow (portfolio anomalies)

```mermaid
flowchart LR
  anomalyBtn["Telegram inline button"] --> prodopsWebhook["external/prodops /api/telegram/webhook"]
  prodopsWebhook -->|"HMAC signed POST"| prodopsAction["/api/internal/prodops-action"]
  prodopsAction --> repairs["ack / dismiss / apply_safe_fix"]
  repairs --> prodopsWebhook
  prodopsWebhook --> staffDm["Staff Telegram DM reply"]
```

### Payload contract

Trefolio sends:

- `eventId`
- `eventType`
- `occurredAt`
- `sourceApp`
- `summary`
- `adminUrl`
- `actor`
- `metadata`
- `destinations`

The `destinations` list is resolved in trefolio from the single linked recipient in admin settings, so `prodops` stays delivery-focused and does not own operator configuration.

### Security

- Shared secret is stored in trefolio admin settings (encrypted at rest) or via env.
- Delivery uses HMAC SHA-256 over `timestamp.body`.
- `prodops` rejects unsigned, invalid, or stale payloads.
- Recipient links use a short random Telegram token whose hash and expiry are stored in trefolio; the plaintext token is only returned once to the admin browser.
- Telegram payloads are deliberately minimal: human summary + admin link + selected metadata.
- Staff query replies are also deliberately minimal and fetched on demand from trefolio; `prodops` does not become the source of truth for user/account data.

## How to enforce it

### Trefolio side

| Area | Source |
|---|---|
| Admin config | `src/app/api/admin/prodops-config/route.ts`, `src/app/(app)/admin/tabs/ProdOpsConfigCard.tsx` (first card on `/admin/settings`) |
| Link flow | `src/app/api/admin/prodops-config/link/route.ts`, `src/app/api/admin/prodops-config/link/complete/route.ts`, `src/lib/prodops-link.ts`, IdP mint via `src/app/api/internal/prodops-link/route.ts` |
| IdP ingest | `src/app/api/internal/prodops-ingest/route.ts` |
| Outbox DB | `src/lib/db/ops-events.ts`, migration `v114` |
| Dispatcher cron | `src/app/api/cron/prodops-dispatch/route.ts` |
| Event builders | `src/lib/prodops.ts` |

### ProdOps side

| Area | Source |
|---|---|
| Intake verification | `external/prodops/app/api/intake/route.ts`, `external/prodops/lib/signature.ts` |
| Telegram link + query webhook | `external/prodops/app/api/telegram/webhook/route.ts` |
| Signed trefolio query client | `external/prodops/lib/trefolio.ts` |
| Telegram delivery | `external/prodops/lib/telegram.ts` |
| Dedupe / audit | `external/prodops/lib/store.ts` |
| Health | `external/prodops/app/api/health/route.ts` |

## Review checklist

- [ ] Product routes enqueue to the outbox but never call Telegram directly.
- [ ] `prodops` is called only from the cron dispatcher, never from client code.
- [ ] Event payloads do not include full feedback text or Stripe-sensitive fields.
- [ ] Shared secret is never returned in plaintext from admin APIs.
- [ ] New cron is registered in both `src/lib/cron-registry.ts` and `vercel.json`.
- [ ] The privacy policy covers Telegram as an operational delivery processor for staff alerts as well as user bot features.

## Open questions

- A future phase may add Slack or email destinations; Telegram remains the only staff channel for now.
