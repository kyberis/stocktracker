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
| API | [`src/app/api/admin/prodops-config/test/route.ts`](../../src/app/api/admin/prodops-config/test/route.ts) | Queue a test notification from admin |
| API | [`src/app/api/internal/ops-metrics/route.ts`](../../src/app/api/internal/ops-metrics/route.ts) | Aggregate metrics for ecosystem digests |
| Cron | [`src/app/api/cron/prodops-dispatch/route.ts`](../../src/app/api/cron/prodops-dispatch/route.ts) | Sends queued events to the external service |
| Component | [`src/app/(app)/admin/tabs/ProdOpsConfigCard.tsx`](../../src/app/(app)/admin/tabs/ProdOpsConfigCard.tsx) | Admin settings UI |
| Lib | [`src/lib/prodops.ts`](../../src/lib/prodops.ts) | Event builders, signature, dispatcher |
| Lib | [`src/lib/db/ops-events.ts`](../../src/lib/db/ops-events.ts) | Outbox persistence |
| External API | [`external/prodops/app/api/intake/route.ts`](../../external/prodops/app/api/intake/route.ts) | Signed intake endpoint |
| External API | [`external/prodops/app/api/health/route.ts`](../../external/prodops/app/api/health/route.ts) | Health check for admin testing |

## 4. Data model

Tables in [`src/lib/db/`](../../src/lib/db) and types in [`src/lib/types.ts`](../../src/lib/types.ts):

- `ops_event_outbox` — async delivery queue with `dedupe_key`, retry counters, next-attempt timestamp, and terminal states (`sent`, `dropped`, `dead`).
- `ProdOpsConfig`, `ProdOpsDestination`, `ProdOpsOutboxEvent` — admin config and queue shapes used across API + UI.
- Existing aggregate metrics stay in `ops-metrics.ts` and expose counts only (no per-user payload).

Schema source: migration `v114` in [`src/lib/db/migrations.ts`](../../src/lib/db/migrations.ts).

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/admin/prodops-config` | admin | Admin | Fetch effective config + secret status |
| PUT | `/api/admin/prodops-config` | admin | Admin | Save base URL, enabled events, destinations, shared secret |
| POST | `/api/admin/prodops-config/test` | admin | Admin | Queue a test notification |
| POST | `/api/cron/prodops-dispatch` | cron bearer | Admin | Dispatch queued outbox items to ProdOps |
| GET | `/api/internal/ops-metrics` | Bearer `IDP_SERVICE_TOKEN` | Admin | Aggregate-only ecosystem metrics |

## 6. UI surface

- Page(s): [`src/app/(app)/admin/settings/page.tsx`](../../src/app/(app)/admin/settings/page.tsx)
- Components: [`src/app/(app)/admin/tabs/ProdOpsConfigCard.tsx`](../../src/app/(app)/admin/tabs/ProdOpsConfigCard.tsx), [`src/app/(app)/admin/tabs/SettingsTab.tsx`](../../src/app/(app)/admin/tabs/SettingsTab.tsx)

## 7. Business logic

- Product routes enqueue events but never call Telegram directly.
- The cron dispatcher resolves the current admin config at send time, so destination changes apply to queued items too.
- Destination routing is two-layered: global enabled event types plus per-destination event-type filters.
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
- Trial activation via emailed token now emits the same analytics-style signal and ProdOps event as onboarding activation.
- Full feedback bodies are intentionally not sent to Telegram; only a summary and admin link are forwarded.
- When the IdP owns signup/billing, a future producer can reuse the same envelope contract.

## 14. Tests

- Unit: route and settings tests covering config persistence, outbox behavior, and dispatcher signing/retries.
- E2E: admin settings coverage for reading/updating ProdOps config and queueing a test notification.
- Manual smoke: enable config, queue a test event, run `/api/cron/prodops-dispatch`, verify Telegram delivery.

## 15. Related skills and rules

- Skills: `engineer-user-auth`, `engineer-data`, `legal-advisor`, `qa-tester`
- Rules: release notes, legal compliance, accessibility, demo-page not applicable
- Related specs: [`admin-panel`](admin-panel.md), [`admin-sub-tools`](admin-sub-tools.md), [`analytics-events`](analytics-events.md)

## 16. Open questions / planned work

- Add `external/accounts` as another producer once IdP-owned signups and billing need the same real-time ops stream.
- Decide whether ProdOps should later support Slack, email, or topic-specific formatting beyond Telegram.
