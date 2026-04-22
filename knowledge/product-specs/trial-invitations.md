# trial-invitations

> Daily cron that invites eligible Free users to a trial.

## 1. Summary

`/api/cron/trial-invitations` runs at 10:00 daily. It queries for Free users who are trial-eligible and have not been invited in the cooldown window, then sends them a localized invitation email with a claim link.

## 2. Status

- **Tier:** system (cron)
- **Feature flag:** _none_
- **Health:** green
- **Owning skill:** [`engineer-payments-subscriptions`](../../.cursor/skills/engineer-payments-subscriptions/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Cron | [`src/app/api/cron/trial-invitations/route.ts`](../../src/app/api/cron/trial-invitations/route.ts) | Registered in [`cron-registry.ts`](../../src/lib/cron-registry.ts) and `vercel.json`. |

## 4. Data model

- Reads `users`, `holdings`, `analytics_events`.
- Writes: `analytics_events` and email-send log.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET | `/api/cron/trial-invitations` | cron | system | Triggered by Vercel cron. |

## 6. UI surface

None (server cron).

## 7. Business logic

- Eligibility: Free, ≥ 7 days old, ≥ 1 holding, not trialed before, not opted-out.
- Batch size limited per run to avoid Resend throttling.
- Wrapped in `withCronLogging()`.

## 8. External dependencies

- Resend, email-i18n templates.

## 9. Currency / FX / tax implications

None.

## 10. i18n

All locales.

## 11. Permissions / tier gating / rate limits

- Cron auth via Vercel signing.
- One invitation per user per 30-day window.

## 12. Telemetry

- Metrics: `trial_invitations_sent_total` pushed via `push-gauges`.

## 13. Edge cases & gotchas

- Unsubscribed users skipped via `unsubscribe_tokens`.
- Tzim: email scheduled at user's preferred locale's business hours (best-effort).

## 14. Tests

- [`src/lib/cron-logging.test.ts`](../../src/lib/cron-logging.test.ts).

## 15. Related skills and rules

- [`.cursor/rules/cron-jobs.mdc`](../../.cursor/rules/cron-jobs.mdc)
- [trial-system](trial-system.md)

## 16. Open questions / planned work

- Per-locale send-time optimization.
