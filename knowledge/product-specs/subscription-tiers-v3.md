# subscription-tiers-v3

> Four paid-ready plans (Free / Basic / Pro / Wealth · Ultra), opt-in 7-day Pro trial with restore, and sunset of complimentary local Pro.

## 1. Summary

Retail users get Free (aha + tight AI), Basic (daily Clara×Warren habit), Pro (scale + 2 multi-agent screenings), and Wealth · Ultra (12 Advanced screenings). Stripe is the only payment rail. Complimentary local Pro is ended with a 7-day countdown and email. Trial is opt-in once per account and restores Free or Basic.

## 2. Status

- **Tier:** Free / Basic / Pro / Wealth
- **Feature flag:** `commerce_enabled`, `pro_trial_enabled`
- **Health:** yellow (IdP now emits `trefolio_plan`; confirm live Stripe Basic/Wealth prices)
- **Owning skill:** [`.cursor/skills/engineer-payments-subscriptions/SKILL.md`](../../.cursor/skills/engineer-payments-subscriptions/SKILL.md)

## 3. Entry points

| Type | Path | Notes |
|------|------|-------|
| Library | [`src/lib/plan-rank.ts`](../../src/lib/plan-rank.ts) | Rank, parse, upgrade target, AI layer |
| Library | [`src/lib/platform-config.ts`](../../src/lib/platform-config.ts) | 4-column quotas and soft caps |
| Library | [`src/lib/local-pro-sunset.ts`](../../src/lib/local-pro-sunset.ts) | Sunset candidates + expire persist |
| Script | [`scripts/sunset-local-pro-to-free.ts`](../../scripts/sunset-local-pro-to-free.ts) | Dry-run / apply + email |
| Cron | [`src/app/api/cron/local-pro-sunset/route.ts`](../../src/app/api/cron/local-pro-sunset/route.ts) | Daily persist expired local Pro |
| API | [`src/app/api/trial/activate/route.ts`](../../src/app/api/trial/activate/route.ts) | Token or session-only activate |
| UI | [`src/components/TrialCountdownBanner.tsx`](../../src/components/TrialCountdownBanner.tsx) | Trial/sunset countdown + deferred CTA |
| Page | [`src/app/landing/page.tsx`](../../src/app/landing/page.tsx) | Four pricing cards |

## 4. Data model

- `users.plan` — `free \| basic \| pro \| wealth` (CHECK v155)
- `users.plan_expires_at` — empty = open-ended (Stripe active)
- `users.plan_before_trial` — restore target after trial/sunset
- `users.plan_sunset_notified_at` — complimentary sunset email sent
- `users.trial_activated_at` — one promotional trial per account

## 5. API surface

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | `/api/trial/activate` | user | Free/Basic | Start 7-day Pro trial |
| GET/POST | `/api/cron/local-pro-sunset` | cron | — | Persist expired local Pro |
| GET | `/api/auth/me` | user | — | `stripeManaged`, `planBeforeTrial` |
| POST | IdP `/api/billing/checkout` | IdP session | paid | New Checkout, or prorated `subscriptions.update` when already subscribed |

## 6. UI surface

- Landing pricing: Free / Basic / Pro / Wealth
- Dashboard + mobile: expiry banner and deferred trial CTA
- Quota table: four columns
- Admin user plan select: four plans

## 7. Business logic

- Sunset excludes `stripe_subscription_id` set.
- Complimentary grant/renew is hard-stopped (`LOCAL_PRO_SUNSET_ACTIVE`).
- Trial eligibility: never activated, Free or Basic, no Stripe.
- Expire trial/sunset restores `plan_before_trial` (Free or Basic only).
- Paid upgrade (Basic → Pro/Wealth, Pro → Wealth) updates the existing Stripe
  subscription with `proration_behavior: always_invoice` on the IdP checkout
  route. Unused time is an invoice credit, not a cash refund. New subscribers
  still use Checkout. Downgrades go through the billing portal.
- AI models: Lite / Standard / Standard+ / Advanced via `resolveAiModelForPlan`.
- Agent Office stays out of pricing (beta).

## 8. External dependencies

- Stripe price keys: Basic, Pro, Wealth, screening packs (`src/lib/db/settings.ts`)
- Resend: `sendLocalProSunsetEmail`
- IdP: `trefolio_plan` on entitlements + ID token; `trefolio_pro` = Pro or Wealth

## 9. Currency / FX / tax implications

- Prices in EUR. Stripe handles tax. No new stored money fields.

## 10. i18n

- EN/ES landing + banner keys. Other locales fall back to EN keys.

## 11. Permissions / tier gating / rate limits

- Quotas in `FEATURE_QUOTAS` (screening 0/0/2/12 per month).
- Soft caps in `SOFT_CAPS`.
- `requireTrefolioPro` = plan at least Pro (Office still gated; not marketed).

## 12. Telemetry

- Existing trial events; sunset via email log `local-pro-sunset`.
- Metrics gauges: free / basic / pro / wealth user counts.
- After sunset + trial window, watch `ai_logs` / daily AI caps for Free burst + overlapping Pro trials.

## 13. Edge cases & gotchas

- Do not set `plan_expires_at` on Stripe-active users (lazyDowngrade would fight billing).
- IdP pull without `trefolio_plan` still maps `trefolio_pro` → Pro.
- Demo `/demo` unchanged (no checkout).

## 14. Tests

- Unit: `plan-rank.test.ts`, `local-pro-sunset.test.ts`, `plan-expiry-banner.test.ts`, trial eligibility, feature quotas.
- E2E: existing `e2e/subscription.spec.ts` still covers paywall when commerce is on.

## 15. Related skills and rules

- Skills: engineer-payments-subscriptions, legal-advisor, automated-user-comms
- Related: [trial-system](trial-system.md), [pricing](pricing.md), [subscription-model-v2](subscription-model-v2.md)

## 16. Open questions / planned work

- Create live Stripe prices for Basic/Wealth and screening packs.
- Screening credit packs checkout UI after Wealth GA.
