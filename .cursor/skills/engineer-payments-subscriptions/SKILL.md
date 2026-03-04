---
name: engineer-payments-subscriptions
description: Implements subscription billing and tier enforcement with Stripe checkout, webhook synchronization, billing portal flows, and paywall logic. Use when working on payment, billing, Stripe, subscription, plan, checkout, portal, webhook, or paywall features.
---

# Payments and Subscriptions Engineer

## Scope

Own billing and subscription capabilities end-to-end:
- Stripe checkout and billing portal
- Stripe webhook synchronization
- plan/tier storage and entitlement checks
- paywall behavior and upgrade UX

## Primary Files

- `src/app/api/billing/checkout/route.ts`
- `src/app/api/billing/webhook/route.ts`
- `src/app/api/billing/portal/route.ts`
- `src/lib/stripe.ts`
- `src/lib/subscription.ts`
- `src/lib/auth/guards.ts`
- `src/lib/db/index.ts`
- `src/components/ProfilePage.tsx`
- `src/components/SettingsModal.tsx`
- `.env.local.example`

## Core Rules

- Webhook handlers must be idempotent and safe on duplicate delivery.
- Plan source of truth is in DB (`users.plan` and Stripe linkage fields).
- API must enforce entitlements server-side; UI prompts are additive.
- Free tier defaults to `free`; Pro must never be granted without verified Stripe lifecycle.
- Never trust client-provided billing state.

## Stripe Workflow

1. Authenticated user starts checkout with monthly/annual interval.
2. Server creates/reuses Stripe customer and checkout session.
3. Stripe sends webhook events.
4. Webhook updates local plan and subscription fields.
5. App guards enforce access immediately.

## Entitlement Expectations

- Free:
  - Pro endpoints blocked with structured 403 response.
  - AI limited to 5/month.
- Pro:
  - Pro endpoints allowed.
  - AI unlimited.

## Failure-Mode Checklist

```md
Billing Safety Checklist
- [ ] Missing env vars return explicit 501/400 errors
- [ ] Webhook signature is always verified
- [ ] Duplicate webhook deliveries do not corrupt state
- [ ] Downgrade path preserves user data
- [ ] Paywall responses are machine-readable for UI handling
```

## Additional Resource

- Detailed reference: [reference.md](reference.md)
