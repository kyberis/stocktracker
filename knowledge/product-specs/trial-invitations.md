# trial-invitations

> Daily cron that invites eligible Free users to a trial.

## 1. Summary

`/api/cron/lifecycle-emails` runs at 10:00 daily and includes the trial-invite leg (legacy alias `/api/cron/trial-invitations`). It queries for Free users who are trial-eligible and have not been invited in the cooldown window, then sends them a localized invitation email with a claim link.

## 2. Status

- **Tier:** system (cron)
- **Feature flag:** `pro_trial_enabled` (shared with onboarding trial step and expiration cron)
- **Health:** green
- **Owning skill:** [`engineer-payments-subscriptions`](../../.cursor/skills/engineer-payments-subscriptions/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Cron | [`src/app/api/cron/lifecycle-emails/route.ts`](../../src/app/api/cron/lifecycle-emails/route.ts) | Scheduled job. Invite logic in [`cron-lifecycle-emails.ts`](../../src/lib/cron-lifecycle-emails.ts). |
| Alias | [`src/app/api/cron/trial-invitations/route.ts`](../../src/app/api/cron/trial-invitations/route.ts) | Manual/legacy invite-only trigger. |
| UI | [`src/app/onboarding/page.tsx`](../../src/app/onboarding/page.tsx) | Last onboarding step when `pro_trial_enabled` — tokenless activation via [`POST /api/auth/onboarding`](../../src/app/api/auth/onboarding/route.ts). |
| API | [`POST /api/auth/onboarding/trial-shown`](../../src/app/api/auth/onboarding/trial-shown/route.ts) | Tracks `onboarding_trial_shown` and sets `trial_invited_at`. |

## 4. Data model

- Reads `users`, `holdings`, `analytics_events`.
- Writes: `analytics_events` and email-send log.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET, POST | `/api/cron/lifecycle-emails` | cron | system | Daily merged lifecycle job. |
| GET, POST | `/api/cron/trial-invitations` | cron | system | Invite-only alias (not scheduled). |

## 6. UI surface

- **Onboarding (primary for new signups):** step 4 of `/onboarding` offers a 7-day Pro trial; import is proposed after activate/skip.
- **Email claim page:** `/trial/activate?token=…` for day-7 cron invitations.

## 7. Business logic

- **Onboarding channel:** eligible new users (`plan=free`, `trial_activated_at` empty, flag on) see the offer at signup. Activation is tokenless during incomplete onboarding. `trial_invited_at` is set on view to suppress the day-7 email cron.
- **Email channel (cron):** Free, ≥ 7 days old, ≥ 1 holding or transaction, `trial_invited_at` and `trial_activated_at` empty, email verified.
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
- Analytics events: `onboarding_trial_shown`, `onboarding_trial_activated`, `onboarding_trial_skipped` (admin funnel).

## 13. Edge cases & gotchas

- Unsubscribed users skipped via `unsubscribe_tokens`.
- Tzim: email scheduled at user's preferred locale's business hours (best-effort).

## 14. Tests

- [`src/lib/cron-logging.test.ts`](../../src/lib/cron-logging.test.ts).
- [`src/lib/trial-activation.test.ts`](../../src/lib/trial-activation.test.ts).
- [`src/app/api/auth/onboarding/trial-shown/route.test.ts`](../../src/app/api/auth/onboarding/trial-shown/route.test.ts).

## 15. Related skills and rules

- [`.cursor/rules/cron-jobs.mdc`](../../.cursor/rules/cron-jobs.mdc)
- [trial-system](trial-system.md)

## 16. Open questions / planned work

- Per-locale send-time optimization.
