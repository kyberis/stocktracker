# ops-telegram-agent

> Staff-only Telegram notifications for product operations, with trefolio-managed routing and an external ProdOps delivery service.

## 1. Summary

Trefolio emits operator-relevant events such as new registrations, successful membership payments, feedback submissions, broker integration requests, and 7-day trial activations. Those events are written to a local outbox and dispatched asynchronously to `trefolio-prodops`, which verifies a shared signature, deduplicates the event, and sends the final notification to staff Telegram chats. The older aggregate-only ops metrics endpoint remains in place for ecosystem-wide snapshots and digests.

## 2. Status

- **Tier:** Admin / operator only
- **Feature flag:** _none_ (config-driven via admin settings)
- **Health:** green
- **Owning skill:** [`.cursor/skills/engineer-user-auth/SKILL.md`](../../.cursor/skills/engineer-user-auth/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/admin/prodops-config/route.ts`](../../src/app/api/admin/prodops-config/route.ts) | Admin GET/PUT for ProdOps configuration |
| API | [`src/app/api/admin/prodops-config/link/route.ts`](../../src/app/api/admin/prodops-config/link/route.ts) | Admin mint/unlink flow for the Telegram recipient |
| API | [`src/app/api/admin/prodops-config/link/complete/route.ts`](../../src/app/api/admin/prodops-config/link/complete/route.ts) | Signed callback that redeems the Telegram `/start` token |
| API | [`src/app/api/admin/prodops-config/test/route.ts`](../../src/app/api/admin/prodops-config/test/route.ts) | Queue a test notification from admin |
| API | [`src/app/api/internal/prodops-query/route.ts`](../../src/app/api/internal/prodops-query/route.ts) | Signed internal query endpoint for staff Telegram queries |
| API | [`src/app/api/internal/prodops-action/route.ts`](../../src/app/api/internal/prodops-action/route.ts) | Signed internal action endpoint for Telegram inline buttons |
| API | [`src/app/api/internal/ops-metrics/route.ts`](../../src/app/api/internal/ops-metrics/route.ts) | Aggregate metrics for ecosystem digests |
| Cron | [`src/app/api/cron/prodops-dispatch/route.ts`](../../src/app/api/cron/prodops-dispatch/route.ts) | Sends queued events to the external service |
| Component | [`src/app/(app)/admin/tabs/ProdOpsConfigCard.tsx`](../../src/app/(app)/admin/tabs/ProdOpsConfigCard.tsx) | Admin settings UI |
| Lib | [`src/lib/prodops.ts`](../../src/lib/prodops.ts) | Event builders, signature, dispatcher |
| Lib | [`src/lib/prodops-link.ts`](../../src/lib/prodops-link.ts) | Telegram link token + deep-link helpers |
| Lib | [`src/lib/db/ops-events.ts`](../../src/lib/db/ops-events.ts) | Outbox persistence |
| External API | [`external/prodops/app/api/intake/route.ts`](../../external/prodops/app/api/intake/route.ts) | Signed intake endpoint |
| External API | [`external/prodops/app/api/health/route.ts`](../../external/prodops/app/api/health/route.ts) | Health check for admin testing |
| External API | [`external/prodops/app/api/telegram/webhook/route.ts`](../../external/prodops/app/api/telegram/webhook/route.ts) | Telegram webhook that completes recipient linking and answers supported staff queries |

## 4. Data model

Tables in [`src/lib/db/`](../../src/lib/db) and types in [`src/lib/types.ts`](../../src/lib/types.ts):

- `ops_event_outbox` — async delivery queue with `dedupe_key`, retry counters, next-attempt timestamp, and terminal states (`sent`, `dropped`, `dead`).
- `ProdOpsConfig`, `ProdOpsRecipient`, `ProdOpsPendingLink`, `ProdOpsOutboxEvent` — admin config, verified Telegram recipient metadata, pending one-time link state, and queue shapes used across API + UI.
- Existing aggregate metrics stay in `ops-metrics.ts` and expose counts only (no per-user payload).

Schema source: migration `v114` in [`src/lib/db/migrations.ts`](../../src/lib/db/migrations.ts).

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/admin/prodops-config` | admin | Admin | Fetch effective config + secret status |
| PUT | `/api/admin/prodops-config` | admin | Admin | Save base URL, bot username, enabled events, linked recipient settings, shared secret |
| POST | `/api/admin/prodops-config/link` | admin | Admin | Mint a one-time Telegram deep link for the recipient |
| DELETE | `/api/admin/prodops-config/link` | admin | Admin | Unlink the current Telegram recipient |
| POST | `/api/admin/prodops-config/link/complete` | HMAC signed | Admin | Redeem the `/start` token and persist the linked recipient |
| POST | `/api/admin/prodops-config/test` | admin | Admin | Queue a test notification |
| POST | `/api/cron/prodops-dispatch` | cron bearer | Admin | Dispatch queued outbox items to ProdOps |
| GET | `/api/internal/ops-metrics` | Bearer `IDP_SERVICE_TOKEN` | Admin | Aggregate-only ecosystem metrics |

## 6. UI surface

- Page(s): [`src/app/(app)/admin/settings/page.tsx`](../../src/app/(app)/admin/settings/page.tsx)
- Components: [`src/app/(app)/admin/tabs/ProdOpsConfigCard.tsx`](../../src/app/(app)/admin/tabs/ProdOpsConfigCard.tsx), [`src/app/(app)/admin/tabs/SettingsTab.tsx`](../../src/app/(app)/admin/tabs/SettingsTab.tsx)

## 7. Business logic

- Product routes enqueue events but never call Telegram directly.
- The cron dispatcher resolves the current admin config at send time, so destination changes apply to queued items too.
- Recipient routing is two-layered: global enabled event types plus per-recipient event-type filters.
- Recipient link uses a short-lived Telegram deep link (`t.me/<bot>?start=<token>`). `trefolio-prodops` receives `/start`, then calls back into trefolio with the shared secret to complete the binding.
- Once linked, the same ProdOps Telegram DM can answer a small deterministic set of staff queries (`latest user created`, `latest feedbacks`, `latest user interaction`) by calling back into trefolio over the same signed HMAC boundary.
- Portfolio anomaly alerts may include inline Telegram buttons; `callback_query` is forwarded to trefolio `/api/internal/prodops-action` (ack / apply safe fix / dismiss) with the same HMAC auth.
- Retry policy is exponential-ish with terminal dead-letter state after repeated failures.

## 8. External dependencies

- `trefolio-prodops` — external signed HTTP endpoint (`PRODOPS_BASE_URL`)
- Telegram Bot API — actual operator delivery from the external service
- `PRODOPS_SHARED_SECRET` — HMAC secret used between trefolio and `trefolio-prodops`
- `IDP_SERVICE_TOKEN` — unchanged, still used by `/api/internal/ops-metrics`

## 9. Currency / FX / tax implications

None. This feature is operational only.

## 10. i18n

- Admin UI copy is currently English-only like the rest of the admin settings surface.
- Telegram operator notifications are concise operational messages and currently English-only.

## 11. Permissions / tier gating / rate limits

- All config and test flows require `requireAdmin()`.
- Dispatch route uses cron bearer auth via `verifyCronAuth()`.
- No end-user tier gating; this is staff infrastructure.

## 12. Telemetry

- Existing product events still flow through `analytics_events` where applicable (`signup`, `billing_checkout_completed`, `onboarding_trial_activated`, etc.).
- Outbox status and retries live in `ops_event_outbox`.
- External ProdOps delivery keeps its own delivery log / dedupe store.

## 13. Edge cases & gotchas

- If ProdOps is disabled or misconfigured, events remain queued and do not block the originating business route.
- Telegram link tokens are stored as hashes with a short TTL; admins can mint a fresh link without exposing the previous token. Tokens are 12 hex characters because production Telegram `/start` payloads from `t.me` deep links arrive truncated at 12 characters — a longer hashed token never matches.
- ProdOps `TREFOLIO_BASE_URL` must reach the trefolio origin without a Cloudflare bot challenge. `ops.trefolio.com` and `user.trefolio.com` 404; `trefolio.com` behind Bot Fight returns 403 HTML to Vercel IPs. Use the Vercel production alias for server-to-server calls.
- Trial activation via emailed token now emits the same analytics-style signal and ProdOps event as onboarding activation.
- Full feedback bodies are intentionally not sent to Telegram; only a summary and admin link are forwarded.
- Staff query replies over Telegram also stay intentionally narrow: no raw full feedback body and no unbounded `analytics_events.metadata` dump.
- When the IdP owns signup/billing, a future producer can reuse the same envelope contract.

## 14. Tests

- Unit: route and settings tests covering config persistence, link mint/redeem, outbox behavior, and dispatcher signing/retries.
- E2E: admin settings coverage for reading/updating ProdOps config, minting the Telegram recipient link, and queueing a test notification.
- Manual smoke: generate the admin deep link, press Start in Telegram, confirm the linked recipient appears in admin, queue a test event, run `/api/cron/prodops-dispatch`, verify Telegram delivery.

## 15. Related skills and rules

- Skills: `engineer-user-auth`, `engineer-data`, `legal-advisor`, `qa-tester`
- Rules: release notes, legal compliance, accessibility, demo-page not applicable
- Related specs: [`admin-panel`](admin-panel.md), [`admin-sub-tools`](admin-sub-tools.md), [`analytics-events`](analytics-events.md)

## 16. Open questions / planned work

- Add `external/accounts` as another producer once IdP-owned signups and billing need the same real-time ops stream.
- Decide whether ProdOps should later support Slack, email, or topic-specific formatting beyond Telegram.
