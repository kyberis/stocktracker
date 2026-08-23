# trial-system

> Trials for Pro features.

## 1. Summary
New users and invitees can run a time-limited Pro trial. Admins issue trial invitations. Trial state merges with normal tier resolution.

## 2. Status
- **Tier:** Pro (via trial)
- **Feature flag:** `TRIALS`
- **Health:** B
- **Owning skill:** [`engineer-payments-subscriptions`](../../.cursor/skills/engineer-payments-subscriptions/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/trial/`](../../src/app/api/trial) | Accept/check. |
| Cron | [`src/app/api/cron/trial-expiration/route.ts`](../../src/app/api/cron/trial-expiration/route.ts) | Daily backup downgrade + email. |
| Library | [`src/lib/trial-expiration.ts`](../../src/lib/trial-expiration.ts) | Shared expire + check-on-login. |
| DB | [`src/lib/db/trials.ts`](../../src/lib/db/trials.ts), `trial-invitations.ts` | Storage. |

## 4. Data model
- `trials`: user, tier, started_at, ends_at.
- `trial_invitations`: code → issuer + tier.

## 5. API surface
- POST accept.

## 6. UI surface
- "Start trial" CTA on paywall.

## 7. Business logic
- Merges into tier resolver with higher precedence than free.
- Expires → automatic downgrade + notification via daily `trial-expiration` cron and check-on-login (`maybeExpireTrialOnLogin`). Entitlement reads already treat a past `plan_expires_at` as free.

## 8. External dependencies
- None.

## 9. Currency / FX / tax implications
- N/A.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- One trial per user per tier.

## 12. Telemetry
- `trials_started_total`, `trials_expired_total`.

## 13. Edge cases & gotchas
- Race condition: trial expiring during a checkout.

## 14. Tests
- DB + unit.

## 15. Related skills and rules
- [`engineer-payments-subscriptions`](../../.cursor/skills/engineer-payments-subscriptions/SKILL.md)
- Related specs: [trial-invitations](trial-invitations.md) (see earlier), [paywall](paywall.md).

## 16. Open questions / planned work
- Card-on-file required after X days.
