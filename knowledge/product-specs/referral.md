# referral

> Referral codes and rewards.

## 1. Summary
Each user has a unique referral code. Referees get a bonus trial; referrers earn credits. Admins can manage overrides.

## 2. Status
- **Tier:** Free (to earn), Pro (to redeem credits beyond one month).
- **Feature flag:** `REFERRAL`
- **Health:** B
- **Owning skill:** [`engineer-payments-subscriptions`](../../.cursor/skills/engineer-payments-subscriptions/SKILL.md)

## 3. Entry points
| Type | Path | Notes |
|------|------|-------|
| API | [`src/app/api/referrals/`](../../src/app/api/referrals) | Read/apply. |
| DB | [`src/lib/db/referrals.ts`](../../src/lib/db/referrals.ts) | Storage. |

## 4. Data model
- `referrals`: code, owner, used_by, reward_state.

## 5. API surface
- GET code; POST redeem.

## 6. UI surface
- Share card in `/account/referral`.

## 7. Business logic
- Prevent self-referral + duplicate redemptions.

## 8. External dependencies
- Stripe (credit).

## 9. Currency / FX / tax implications
- Credits applied to Stripe customer balance.

## 10. i18n
- All locales.

## 11. Permissions / tier gating / rate limits
- Rate-limited redeem.

## 12. Telemetry
- `referrals_redeemed_total`.

## 13. Edge cases & gotchas
- Refund cancels referrer's reward.

## 14. Tests
- DB tests.

## 15. Related skills and rules
- [`engineer-payments-subscriptions`](../../.cursor/skills/engineer-payments-subscriptions/SKILL.md)
- Related specs: [stripe-webhook](stripe-webhook.md).

## 16. Open questions / planned work
- Tiered incentives.
