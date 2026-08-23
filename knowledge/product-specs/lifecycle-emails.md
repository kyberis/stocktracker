# lifecycle-emails

> One daily cron for trial invites, activation, and winback emails.

## 1. Summary

`/api/cron/lifecycle-emails` runs at 10:00 UTC and sequentially sends the three lifecycle marketing legs that used to be separate Vercel schedules: 7-day trial invitations, 48–72h welcome-no-stocks activation, and 14-day AI-analysis winback. Eligibility, feature flags, and dedupe are unchanged.

## 2. Status

- **Tier:** system (cron)
- **Feature flag:** `commerce_enabled` + `pro_trial_enabled` (invites); `lifecycle_activation_email_enabled`; `lifecycle_winback_email_enabled`
- **Health:** green
- **Owning skill:** [`engineer-payments-subscriptions`](../../.cursor/skills/engineer-payments-subscriptions/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Cron | [`src/app/api/cron/lifecycle-emails/route.ts`](../../src/app/api/cron/lifecycle-emails/route.ts) | Scheduled in [`cron-registry.ts`](../../src/lib/cron-registry.ts) and `vercel.json`. |
| Library | [`src/lib/cron-lifecycle-emails.ts`](../../src/lib/cron-lifecycle-emails.ts) | Shared job bodies. |
| Alias | [`src/app/api/cron/trial-invitations/route.ts`](../../src/app/api/cron/trial-invitations/route.ts) | Manual/legacy trigger; not scheduled. |
| Alias | [`src/app/api/cron/lifecycle-activation/route.ts`](../../src/app/api/cron/lifecycle-activation/route.ts) | Manual/legacy trigger; not scheduled. |
| Alias | [`src/app/api/cron/lifecycle-winback/route.ts`](../../src/app/api/cron/lifecycle-winback/route.ts) | Manual/legacy trigger; not scheduled. |

## 4. Data model

- Reads `users`, `holdings`, `transactions`, `user_settings`, `email_sends`, email templates.
- Writes: `users.trial_token` / `trial_invited_at`, `email_sends`.

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| GET, POST | `/api/cron/lifecycle-emails` | cron | system | Runs all three legs. |
| GET, POST | `/api/cron/trial-invitations` | cron | system | Invite leg only (alias). |
| GET, POST | `/api/cron/lifecycle-activation` | cron | system | Activation leg only (alias). |
| GET, POST | `/api/cron/lifecycle-winback` | cron | system | Winback leg only (alias). |

## 6. UI surface

- Admin cron list and Email Flows (`cronId: lifecycle-emails`).
- Email claim page `/trial/activate?token=…` for day-7 invitations.

## 7. Business logic

- Sequential legs (invites → activation → winback) to keep Resend/Turso load bounded.
- Each leg no-ops when its flag is off or the template is missing.
- Batch size 100 per leg.

## 8. External dependencies

- Resend, email-i18n / lifecycle templates.
- Optional IdP trial-token sync when `GRANTS_AND_TRIALS_REDIRECT_TO_IDP=true`.

## 9. Currency / FX / tax implications

None.

## 10. i18n

Email locale from `user_settings.language`.

## 11. Permissions / tier gating / rate limits

- Cron auth via `verifyCronAuth` / `CRON_SECRET`.
- Routes are in middleware `PUBLIC_API_ROUTES` so Vercel Cron can GET them.

## 12. Telemetry

- `cron_executions` row for `lifecycle-emails` (aliases log their own names if triggered).

## 13. Edge cases & gotchas

- Activation window is 48–72h; a single daily run still covers the 24h slice.
- Winback uses `feature-ai-analysis` until a dedicated win-back template exists.

## 14. Tests

- [`src/app/api/cron/lifecycle-emails/route.test.ts`](../../src/app/api/cron/lifecycle-emails/route.test.ts)
- [`src/app/api/cron/trial-invitations/route.test.ts`](../../src/app/api/cron/trial-invitations/route.test.ts)
- [`src/app/api/cron/lifecycle-activation/route.test.ts`](../../src/app/api/cron/lifecycle-activation/route.test.ts)
- [`src/app/api/cron/lifecycle-winback/route.test.ts`](../../src/app/api/cron/lifecycle-winback/route.test.ts)

## 15. Related skills and rules

- [`.cursor/rules/cron-jobs.mdc`](../../.cursor/rules/cron-jobs.mdc)
- Related specs: [trial-invitations](trial-invitations.md), [trial-system](trial-system.md), [admin-email-flows](admin-email-flows.md)

## 16. Open questions / planned work

- Per-locale send-time optimization.
